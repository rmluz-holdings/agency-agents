# Control Deck

One local dashboard that observes and commands every agent system on a machine: Auto-Company, CC GodMode, Grok Build, solvent-agent, platform-core, the PlumoAI Docker stack, the Affiliate Marketing Hub, and the Docker engine itself. Standard library Python, no dependencies, single file.

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

## Use it from your iPhone

The deck is a web app, so the phone needs to reach the machine that runs it. Pick a route:

**Route 1: home-screen app from Safari (no Mac, no developer account).**

1. Install [Tailscale](https://tailscale.com) on the machine and on the phone, or make sure both are on the same Wi‑Fi.
2. Get a certificate and start the deck over HTTPS, bound to the machine's Tailscale address:
   ```bash
   tailscale cert my-mac.tailnet-name.ts.net
   python3 deck.py --bind 0.0.0.0 --port 8900 \
     --tls-cert my-mac.tailnet-name.ts.net.crt --tls-key my-mac.tailnet-name.ts.net.key
   ```
   Same Wi‑Fi only: `python3 deck.py --bind 0.0.0.0` and open `http://<machine-ip>:8900` instead (HTTP works for browsing; the offline shell needs HTTPS).
3. On the phone open the address in Safari, tap **Share → Add to Home Screen**. The deck opens full-screen with its own icon. Tap **Token** once and paste the action token.

**Route 2: native app on your phone via Xcode (Mac required, free Apple ID).**

`ios-app/` is a Capacitor project with a generated Xcode project. It ships a launcher page that asks for the deck URL and token once, then opens the deck.

```bash
cd control-deck/ios-app
npm install
npx cap sync ios
npx cap open ios          # opens ios/App/App.xcodeproj in Xcode
```

In Xcode: select the App target → Signing & Capabilities → pick your team (a free Apple ID works), plug in the phone, press Run. Free-account builds expire after 7 days; rebuild to renew. On the phone allow the developer profile under Settings → General → VPN & Device Management the first time.

**Route 3: TestFlight (Mac plus a paid Apple Developer membership).**

Same project. In Xcode choose Product → Archive, then Distribute App → TestFlight & App Store. In App Store Connect add yourself as an internal tester; the TestFlight app installs the build. Internal testing does not require App Review. The bundle id is `dev.controldeck.app`; change it in `ios-app/capacitor.config.json` and re-run `npx cap sync ios` if you want your own.

What cannot be done for you from a Linux sandbox: signing and uploading. Both need Xcode on macOS and your Apple credentials.

## Grok Build with Claude Fable 5.1

xAI's Grok Build CLI is registered as a deck system and configured to use Claude Fable 5.1 through the Anthropic Messages API. `~/.grok/config.toml` defines `[model.fable]` (`claude-fable-5-1`) and `[model.opus5]`, reads the key from `ANTHROPIC_API_KEY` at session start, and sets `fable` as the default model.

```bash
export ANTHROPIC_API_KEY=sk-ant-...
grok-fable -p "hello"          # wrapper: satisfies Grok's sign-in gate, selects -m fable
grok -m opus5 -p "hello"       # same, with Opus 5 (needs XAI_API_KEY=local-placeholder or a real sign-in)
```

Grok refuses to start without an xAI sign-in or `XAI_API_KEY` even when the model is a custom endpoint; the wrapper exports a placeholder so the gate passes and the Anthropic key does the real authentication.

Building from source on a host without GitHub release access needs three variables: `PROTOC=/usr/bin/protoc` (apt `protobuf-compiler`), and `GROK_TOOLS_BUNDLE_RG_PATH` plus `GROK_SHELL_BUNDLE_RG_PATH` pointing at a local `rg`. The deck's `rebuild-release` action carries the first; add the other two if your host cannot reach GitHub releases.

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
