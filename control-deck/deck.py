#!/usr/bin/env python3
"""Control Deck: one local dashboard that observes and commands every agent system on a machine.

Standard library only. Reads a registry (deck.json) of systems, each with a status probe,
a health probe, optional links, a log file, and a whitelist of named actions. The browser UI
and the command bar can only invoke actions that exist in the registry; no free-form shell
reaches the server.

Usage:
    python3 deck.py                       # serve on 127.0.0.1:8900 using ./deck.json
    python3 deck.py --config my.json --port 9000
    CONTROL_DECK_TOKEN=... python3 deck.py   # fixed action token instead of a generated one
"""

from __future__ import annotations

import argparse
import json
import os
import secrets
import shutil
import signal
import subprocess
import sys
import threading
import time
import urllib.request
from dataclasses import dataclass, field
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

HERE = Path(__file__).resolve().parent
LOG_DIR = HERE / "logs"
TOKEN_FILE = Path.home() / ".control-deck" / "token"
MAX_TAIL_BYTES = 64_000


# --------------------------------------------------------------------------- registry


def expand(value: str) -> str:
    return os.path.expandvars(os.path.expanduser(value))


def load_registry(path: Path) -> dict[str, Any]:
    # ${DECK_ROOT} is the directory that holds the managed checkouts; defaults to the home directory.
    os.environ.setdefault("DECK_ROOT", str(Path.home()))
    data = json.loads(path.read_text(encoding="utf-8"))
    seen: set[str] = set()
    for system in data.get("systems", []):
        sid = system.get("id", "")
        if not sid or not all(c.isalnum() or c in "-_" for c in sid):
            raise ValueError(f"system id must be alphanumeric/dash/underscore: {sid!r}")
        if sid in seen:
            raise ValueError(f"duplicate system id: {sid}")
        seen.add(sid)
        system["cwd"] = expand(system.get("cwd", str(Path.home())))
        for name, action in system.get("actions", {}).items():
            if not all(c.isalnum() or c in "-_" for c in name):
                raise ValueError(f"action name must be alphanumeric/dash/underscore: {name!r}")
            if "cmd" not in action:
                raise ValueError(f"action {sid}/{name} has no cmd")
            action.setdefault("risk", "low")
            action.setdefault("detach", False)
            action.setdefault("timeout", 120)
    return data


def load_token() -> str:
    env_token = os.environ.get("CONTROL_DECK_TOKEN")
    if env_token:
        return env_token
    TOKEN_FILE.parent.mkdir(parents=True, exist_ok=True)
    if TOKEN_FILE.exists():
        return TOKEN_FILE.read_text(encoding="utf-8").strip()
    token = secrets.token_urlsafe(24)
    TOKEN_FILE.write_text(token, encoding="utf-8")
    os.chmod(TOKEN_FILE, 0o600)
    return token


# --------------------------------------------------------------------------- host metrics


def read_loadavg() -> list[float]:
    try:
        parts = Path("/proc/loadavg").read_text().split()
        return [float(parts[0]), float(parts[1]), float(parts[2])]
    except (OSError, ValueError, IndexError):
        try:
            return list(os.getloadavg())
        except (OSError, AttributeError):
            return [0.0, 0.0, 0.0]


def read_meminfo() -> dict[str, int]:
    info: dict[str, int] = {}
    try:
        for line in Path("/proc/meminfo").read_text().splitlines():
            key, _, rest = line.partition(":")
            value = rest.strip().split()
            if value:
                info[key] = int(value[0]) * 1024
    except OSError:
        pass
    total = info.get("MemTotal", 0)
    avail = info.get("MemAvailable", 0)
    return {"total": total, "available": avail, "used": max(total - avail, 0)}


def read_uptime() -> float:
    try:
        return float(Path("/proc/uptime").read_text().split()[0])
    except (OSError, ValueError, IndexError):
        return 0.0


def top_processes(limit: int = 8) -> list[dict[str, Any]]:
    try:
        out = subprocess.run(
            ["ps", "-eo", "pid,pcpu,pmem,etime,comm", "--sort=-pcpu"],
            capture_output=True, text=True, timeout=5, check=False,
        ).stdout.splitlines()[1:]
    except (OSError, subprocess.SubprocessError):
        return []
    rows = []
    for line in out[:limit]:
        parts = line.split(None, 4)
        if len(parts) == 5:
            rows.append({"pid": int(parts[0]), "cpu": float(parts[1]), "mem": float(parts[2]),
                         "elapsed": parts[3], "command": parts[4]})
    return rows


def listening_ports() -> list[dict[str, Any]]:
    if not shutil.which("ss"):
        return []
    try:
        out = subprocess.run(["ss", "-ltnp"], capture_output=True, text=True, timeout=5, check=False).stdout
    except (OSError, subprocess.SubprocessError):
        return []
    ports = []
    for line in out.splitlines()[1:]:
        parts = line.split()
        if len(parts) >= 4:
            local = parts[3]
            proc = parts[5] if len(parts) > 5 else ""
            ports.append({"local": local, "process": proc.replace("users:((", "").rstrip("))")})
    return ports


def host_snapshot() -> dict[str, Any]:
    disk = shutil.disk_usage("/")
    return {
        "hostname": os.uname().nodename,
        "platform": f"{os.uname().sysname} {os.uname().release}",
        "cpus": os.cpu_count() or 0,
        "load": read_loadavg(),
        "memory": read_meminfo(),
        "disk": {"total": disk.total, "used": disk.used, "free": disk.free},
        "uptime_seconds": read_uptime(),
        "processes": top_processes(),
        "ports": listening_ports(),
        "time": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
    }


# --------------------------------------------------------------------------- probes


def probe(spec: dict[str, Any] | None, cwd: str) -> dict[str, Any]:
    if not spec:
        return {"state": "unknown", "detail": "no probe configured"}
    kind = spec.get("type")
    timeout = float(spec.get("timeout", 5))
    try:
        if kind == "http":
            req = urllib.request.Request(spec["url"], headers={"User-Agent": "control-deck"})
            with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310 (local URLs from registry)
                body = resp.read(2000).decode("utf-8", "replace")
                return {"state": "up", "detail": f"HTTP {resp.status}\n{body.strip()}"[:2000]}
        if kind == "command":
            proc = subprocess.run(spec["cmd"], shell=True, cwd=cwd, capture_output=True, text=True,  # noqa: S602
                                  timeout=timeout, check=False)
            text = (proc.stdout + proc.stderr).strip()
            return {"state": "up" if proc.returncode == 0 else "down",
                    "detail": text[-2000:] or f"exit {proc.returncode}"}
        if kind == "file_exists":
            ok = (Path(cwd) / spec["path"]).exists()
            return {"state": "up" if ok else "down", "detail": f"{spec['path']} {'present' if ok else 'absent'}"}
        if kind == "dir_exists":
            ok = (Path(cwd) / spec["path"]).is_dir()
            return {"state": "up" if ok else "down", "detail": f"{spec['path']}/ {'present' if ok else 'absent'}"}
        return {"state": "unknown", "detail": f"unsupported probe type {kind!r}"}
    except subprocess.TimeoutExpired:
        return {"state": "down", "detail": f"probe timed out after {timeout:g}s"}
    except Exception as exc:  # noqa: BLE001 (probe failures are data, not crashes)
        return {"state": "down", "detail": f"{type(exc).__name__}: {exc}"[:500]}


def tail_file(path: Path, lines: int) -> str:
    try:
        with path.open("rb") as handle:
            handle.seek(0, os.SEEK_END)
            size = handle.tell()
            handle.seek(max(size - MAX_TAIL_BYTES, 0))
            chunk = handle.read().decode("utf-8", "replace")
    except OSError as exc:
        return f"(no log: {exc.strerror or exc})"
    return "\n".join(chunk.splitlines()[-lines:])


# --------------------------------------------------------------------------- jobs


@dataclass
class Job:
    id: str
    system: str
    action: str
    cmd: str
    started: float
    detach: bool
    pid: int | None = None
    status: str = "running"
    exit_code: int | None = None
    output: str = ""
    log_path: str | None = None
    finished: float | None = None
    extra: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id, "system": self.system, "action": self.action, "cmd": self.cmd,
            "started": self.started, "finished": self.finished, "detach": self.detach,
            "pid": self.pid, "status": self.status, "exit_code": self.exit_code,
            "log_path": self.log_path, "output": self.output[-4000:],
        }


JOBS_FILE = LOG_DIR / "jobs.json"


def pid_alive(pid: int | None) -> bool:
    if not pid:
        return False
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


class JobRunner:
    def __init__(self) -> None:
        self.jobs: dict[str, Job] = {}
        self.procs: dict[str, subprocess.Popen[bytes]] = {}
        self.lock = threading.Lock()
        self._load()

    def _load(self) -> None:
        """Reload job records from disk so a deck restart keeps the history and detached processes."""
        try:
            records = json.loads(JOBS_FILE.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return
        for rec in records[-200:]:
            job = Job(id=rec["id"], system=rec["system"], action=rec["action"], cmd=rec["cmd"],
                      started=rec["started"], detach=rec.get("detach", False), pid=rec.get("pid"),
                      status=rec.get("status", "unknown"), exit_code=rec.get("exit_code"),
                      log_path=rec.get("log_path"), finished=rec.get("finished"))
            if job.status == "running":
                job.status = "detached" if pid_alive(job.pid) else "lost"
            self.jobs[job.id] = job

    def _save(self) -> None:
        try:
            LOG_DIR.mkdir(parents=True, exist_ok=True)
            with self.lock:
                records = [j.to_dict() for j in sorted(self.jobs.values(), key=lambda j: j.started)[-200:]]
            for rec in records:
                rec.pop("output", None)
            JOBS_FILE.write_text(json.dumps(records), encoding="utf-8")
        except OSError:
            pass

    def start(self, system: dict[str, Any], action_name: str) -> Job:
        action = system["actions"][action_name]
        job_id = f"{int(time.time())}-{secrets.token_hex(3)}"
        job = Job(id=job_id, system=system["id"], action=action_name, cmd=action["cmd"],
                  started=time.time(), detach=bool(action.get("detach")))
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        log_path = LOG_DIR / f"{system['id']}-{action_name}-{job_id}.log"
        job.log_path = str(log_path)
        env = os.environ.copy()
        env["CONTROL_DECK_JOB"] = job_id
        handle = log_path.open("wb")
        proc = subprocess.Popen(  # noqa: S602 (command text comes from the operator's registry file)
            action["cmd"], shell=True, cwd=system["cwd"], stdout=handle, stderr=subprocess.STDOUT,
            stdin=subprocess.DEVNULL, start_new_session=True, env=env,
        )
        handle.close()
        job.pid = proc.pid
        with self.lock:
            self.jobs[job_id] = job
            self.procs[job_id] = proc
        self._save()
        threading.Thread(target=self._wait, args=(job, proc, float(action.get("timeout", 120))),
                         daemon=True).start()
        return job

    def _wait(self, job: Job, proc: subprocess.Popen[bytes], timeout: float) -> None:
        try:
            proc.wait(timeout=None if job.detach else timeout)
        except subprocess.TimeoutExpired:
            self._terminate(proc)
            job.status = "timeout"
        else:
            job.status = "finished" if proc.returncode == 0 else "failed"
        job.exit_code = proc.returncode
        job.finished = time.time()
        if job.log_path:
            job.output = tail_file(Path(job.log_path), 200)
        with self.lock:
            self.procs.pop(job.id, None)
        self._save()

    @staticmethod
    def _terminate(proc: subprocess.Popen[bytes]) -> None:
        try:
            os.killpg(proc.pid, signal.SIGTERM)
        except ProcessLookupError:
            return
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            try:
                os.killpg(proc.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass

    def stop(self, job_id: str) -> bool:
        with self.lock:
            proc = self.procs.get(job_id)
            job = self.jobs.get(job_id)
        if job and not proc and job.status == "detached" and pid_alive(job.pid):
            try:
                os.killpg(job.pid, signal.SIGTERM)  # type: ignore[arg-type]
            except (ProcessLookupError, PermissionError):
                return False
            job.status = "stopped"
            job.finished = time.time()
            self._save()
            return True
        if not proc or not job:
            return False
        self._terminate(proc)
        job.status = "stopped"
        self._save()
        return True

    def list(self) -> list[dict[str, Any]]:
        with self.lock:
            jobs = sorted(self.jobs.values(), key=lambda j: j.started, reverse=True)
        return [j.to_dict() for j in jobs[:100]]


# --------------------------------------------------------------------------- http


class DeckServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, address: tuple[str, int], handler: type[BaseHTTPRequestHandler],
                 registry: dict[str, Any], token: str) -> None:
        super().__init__(address, handler)
        self.registry = registry
        self.token = token
        self.runner = JobRunner()
        self.systems = {s["id"]: s for s in registry.get("systems", [])}


class DeckHandler(BaseHTTPRequestHandler):
    server: DeckServer  # type: ignore[assignment]
    server_version = "ControlDeck/1.0"

    def log_message(self, fmt: str, *args: Any) -> None:  # quieter console
        if os.environ.get("CONTROL_DECK_VERBOSE"):
            super().log_message(fmt, *args)

    # helpers
    def _json(self, payload: Any, code: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _error(self, message: str, code: int) -> None:
        self._json({"error": message}, code)

    def _authorized(self) -> bool:
        supplied = self.headers.get("X-Deck-Token", "")
        return secrets.compare_digest(supplied, self.server.token)

    def _read_json(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            return {}
        raw = self.rfile.read(min(length, 65536))
        try:
            data = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return {}
        return data if isinstance(data, dict) else {}

    def _public_system(self, system: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": system["id"], "name": system.get("name", system["id"]), "kind": system.get("kind", ""),
            "cwd": system["cwd"], "cwd_exists": Path(system["cwd"]).is_dir(),
            "links": system.get("links", {}), "note": system.get("note", ""),
            "has_log": bool(system.get("log")),
            "actions": [{"name": n, "risk": a.get("risk", "low"), "detach": bool(a.get("detach"))}
                        for n, a in system.get("actions", {}).items()],
        }

    # routes
    def do_GET(self) -> None:  # noqa: N802
        url = urlparse(self.path)
        path = url.path
        query = parse_qs(url.query)
        if path in ("/", "/index.html"):
            page = HERE / "static" / "index.html"
            body = page.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if path == "/api/config":
            reg = self.server.registry
            self._json({"title": reg.get("title", "Control Deck"),
                        "refresh_seconds": reg.get("refresh_seconds", 5),
                        "systems": [self._public_system(s) for s in self.server.systems.values()]})
            return
        if path == "/api/host":
            self._json(host_snapshot())
            return
        if path == "/api/status":
            wanted = query.get("system", [])
            systems = [self.server.systems[s] for s in wanted if s in self.server.systems] \
                if wanted else list(self.server.systems.values())
            results: dict[str, Any] = {}
            threads = []

            def run(system: dict[str, Any]) -> None:
                results[system["id"]] = {
                    "health": probe(system.get("health"), system["cwd"]),
                    "status": probe(system.get("status"), system["cwd"]),
                    "checked": time.time(),
                }

            for system in systems:
                thread = threading.Thread(target=run, args=(system,), daemon=True)
                thread.start()
                threads.append(thread)
            for thread in threads:
                thread.join(timeout=30)
            self._json(results)
            return
        if path.startswith("/api/systems/") and path.endswith("/log"):
            sid = path[len("/api/systems/"):-len("/log")]
            system = self.server.systems.get(sid)
            if not system:
                self._error("unknown system", 404)
                return
            if not system.get("log"):
                self._json({"log": "(no log file configured)"})
                return
            lines = max(1, min(int(query.get("lines", ["200"])[0]), 2000))
            self._json({"log": tail_file(Path(system["cwd"]) / system["log"], lines)})
            return
        if path == "/api/jobs":
            self._json(self.server.runner.list())
            return
        if path.startswith("/api/jobs/") and path.endswith("/log"):
            job_id = path[len("/api/jobs/"):-len("/log")]
            job = self.server.runner.jobs.get(job_id)
            if not job or not job.log_path:
                self._error("unknown job", 404)
                return
            lines = max(1, min(int(query.get("lines", ["200"])[0]), 2000))
            self._json({"log": tail_file(Path(job.log_path), lines), "job": job.to_dict()})
            return
        self._error("not found", 404)

    def do_POST(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if not self._authorized():
            self._error("missing or invalid X-Deck-Token", HTTPStatus.UNAUTHORIZED)
            return
        body = self._read_json()
        if path == "/api/command":
            text = str(body.get("text", "")).strip()
            parts = text.split()
            if len(parts) != 2:
                self._error("command format: <system-id> <action>", 400)
                return
            self._run_action(parts[0], parts[1], body)
            return
        if path.startswith("/api/systems/") and "/action/" in path:
            rest = path[len("/api/systems/"):]
            sid, _, action = rest.partition("/action/")
            self._run_action(sid, action, body)
            return
        if path.startswith("/api/jobs/") and path.endswith("/stop"):
            job_id = path[len("/api/jobs/"):-len("/stop")]
            ok = self.server.runner.stop(job_id)
            self._json({"stopped": ok}, 200 if ok else 404)
            return
        self._error("not found", 404)

    def _run_action(self, sid: str, action: str, body: dict[str, Any]) -> None:
        system = self.server.systems.get(sid)
        if not system:
            self._error(f"unknown system {sid!r}", 404)
            return
        spec = system.get("actions", {}).get(action)
        if not spec:
            self._error(f"unknown action {action!r} for {sid}", 404)
            return
        if spec.get("risk") in ("medium", "high") and not body.get("confirm"):
            self._json({"needs_confirm": True, "risk": spec["risk"], "cmd": spec["cmd"]}, 409)
            return
        if not Path(system["cwd"]).is_dir():
            self._error(f"working directory missing: {system['cwd']}", 400)
            return
        job = self.server.runner.start(system, action)
        self._json(job.to_dict(), 202)


# --------------------------------------------------------------------------- main


def main() -> int:
    parser = argparse.ArgumentParser(description="Control Deck: one dashboard for every agent system on this machine")
    parser.add_argument("--config", default=str(HERE / "deck.json"))
    parser.add_argument("--bind", default=None, help="bind address (default from config, else 127.0.0.1)")
    parser.add_argument("--port", type=int, default=None, help="port (default from config, else 8900)")
    parser.add_argument("--print-token", action="store_true", help="print the action token and exit")
    args = parser.parse_args()

    registry = load_registry(Path(args.config))
    token = load_token()
    if args.print_token:
        print(token)
        return 0
    bind = args.bind or registry.get("bind", "127.0.0.1")
    port = args.port or int(registry.get("port", 8900))
    if bind not in ("127.0.0.1", "localhost", "::1"):
        print(f"[deck] WARNING: binding to {bind}; actions run shell commands on this host. Keep the token secret.",
              file=sys.stderr)
    server = DeckServer((bind, port), DeckHandler, registry, token)
    print(f"[deck] {registry.get('title', 'Control Deck')} on http://{bind}:{port}")
    print(f"[deck] {len(server.systems)} systems registered from {args.config}")
    print(f"[deck] action token: {token}  (also in {TOKEN_FILE})")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[deck] bye")
    return 0


if __name__ == "__main__":
    sys.exit(main())
