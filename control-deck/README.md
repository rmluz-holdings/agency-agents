# Control Deck

One local dashboard that observes and commands every agent system on a machine: Auto-Company, CC GodMode, solvent-agent, platform-core, the PlumoAI Docker stack, the Affiliate Marketing Hub, and the Docker engine itself. Standard library Python, no dependencies, single file.

## Run

```bash
cd control-deck
python3 deck.py            # http://127.0.0.1:8900
DECK_ROOT=/srv/agents python3 deck.py   # repos checked out somewhere other than ~
python3 deck.py --print-token
```

The server prints an action token on start (also stored in `~/.control-deck/token`). Read-only views need no token. Every action needs it: click **Token** in the header once and paste it.

## What it shows

- Host: load, memory, disk, uptime, listening ports, top processes.
- One card per registered system: health dot, live status output, links to the system's own dashboard, its action buttons, and a log tail.
- A command bar: type `<system-id> <action>`, for example `auto-company cycles` or `plumoai logs`.
- Jobs: every action becomes a job with its own output file under `control-deck/logs/`; running jobs can be stopped.

## Registry

`deck.json` is the whole configuration. Each system has:

| Field | Meaning |
|---|---|
| `cwd` | Working directory; `${DECK_ROOT}` (defaults to your home directory) and other environment variables expand |
| `status` | Probe shown on the card: `http`, `command`, `file_exists`, or `dir_exists` |
| `health` | Probe that colors the dot |
| `actions` | Named commands. `risk: medium` or `high` asks for confirmation. `detach: true` keeps the process alive after the request |
| `log` | File to tail, relative to `cwd` |
| `links` | Buttons that open the system's own UI |

The UI and the command bar can only run actions that exist in this file. There is no free-form shell endpoint.

## Safety posture

- Binds to `127.0.0.1` by default. Binding elsewhere prints a warning; every action runs a shell command on the host, so treat the token as a password.
- Starting Auto-Company's autonomous loop is deliberately not an action. The deck observes it, requests a stop after the current cycle, stops it outright, and opens its own dashboard. Start it from a terminal with `make start` in the Auto-Company directory so that choice stays human.
- Paths in the shipped `deck.json` mirror the layout used during setup (`~/maxmiksa/auto-company`, `~/solvent-agent`, `~/platform-core`, `~/plumoai/plumoai`, `~/agency-agents/affiliate-marketing-hub`). Cards for missing directories show "(missing)". Set `DECK_ROOT=/path/to/checkouts` when the repos live somewhere other than your home directory, or edit the paths.

## Add a system

Append to `systems` in `deck.json`:

```json
{
  "id": "my-service",
  "name": "My Service",
  "kind": "service",
  "cwd": "${HOME}/my-service",
  "status": {"type": "http", "url": "http://127.0.0.1:9000/health", "timeout": 3},
  "health": {"type": "http", "url": "http://127.0.0.1:9000/health", "timeout": 3},
  "actions": {
    "serve": {"cmd": "npm start", "detach": true, "risk": "medium"},
    "tests": {"cmd": "npm test", "risk": "low", "timeout": 600}
  },
  "log": "logs/serve.log"
}
```

Restart `deck.py` to load it.
