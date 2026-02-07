# padel-tui

Reverse-engineered Playtomic client with shared CLI and OpenTUI interfaces.

## Install

```bash
bun install
```

## Run

```bash
# Launch TUI (default)
bun run start

# Explicit TUI command
bun run tui

# CLI help
bun run cli help
```

## Build Single-File Executable

```bash
# Build for current platform (stable default)
bun run build:exe

# Optional optimized release build (minify + linked sourcemap)
bun run build:exe:release

# Cross-compile examples
bun run build:exe:linux-x64
bun run build:exe:linux-arm64
bun run build:exe:windows-x64

# macOS targets (includes codesign + verify)
bun run build:exe:darwin-arm64
bun run build:exe:darwin-x64
```

Note for OpenTUI native targets: cross-compiling may require the matching `@opentui/core-<os>-<arch>` package to be present. In practice, building on the target platform/architecture is the most reliable path.

Output files are written under `dist/` and can be run directly, for example:

```bash
./dist/padel-tui availability search berlin --date 2026-02-11
```

Custom target/outfile:

```bash
bun run scripts/build-executable.ts --target=bun-linux-x64-baseline --outfile=dist/padel-tui-custom
```

macOS codesigning options (used by macOS build scripts):

```bash
# Use your Developer ID identity (recommended for distribution)
PADEL_CODESIGN_IDENTITY="Developer ID Application: Your Name (TEAMID)" bun run build:exe:darwin-arm64

# Or pass identity directly
bun run scripts/build-executable.ts --target=bun-darwin-arm64 --outfile=dist/padel-tui-darwin-arm64 --codesign --sign-identity="Developer ID Application: Your Name (TEAMID)"
```

By default, if no identity is provided, the build script falls back to ad-hoc signing (`-`).
Entitlements file used for macOS signing: `scripts/macos-entitlements.plist`.

Note: compiled binaries disable runtime `bunfig.toml` autoload so they run without requiring project-local preload hooks.

## CLI Commands

```bash
# Authenticate and persist session
bun run cli auth login --email you@example.com --password "your-password"

# Clear local session
bun run cli auth logout

# Search by city/query and print availability
bun run cli availability search berlin

# Search by geocoded location (Open-Meteo geocoding -> coordinate tenant search)
bun run cli availability search --near berlin --radius-meters 50000

# Optional date override
bun run cli availability search berlin --date 2026-02-07

# Restrict search output to one tenant
bun run cli availability search berlin --tenant-id 16825678-053a-400d-b626-4c386d58706b

# Optional cap if you want fewer tenant lookups
bun run cli availability search berlin --max-tenants 5

# Purchase slot (card-on-file / selected method)
bun run cli payment purchase --tenant-id <tenant-id> --resource-id <resource-id> --start 2026-02-16T21:00:00 --duration 60 --players 4

# Optional explicit method id from payment_intent available methods
bun run cli payment purchase --tenant-id <tenant-id> --resource-id <resource-id> --start 2026-02-16T21:00:00 --payment-method-id CREDIT_CARD-STRIPE_xxx
```

## Notes on Request Fingerprint

This project intentionally mirrors captured request headers while reverse engineering:

- `user-agent: Android 11`
- `x-requested-with: com.playtomic.app 6.59.0`

Refresh token call is aligned to capture:

- `POST /v3/auth/token`
- `user-agent: okhttp/4.12.0`

Override if needed via env vars:

- `PADEL_USER_AGENT`
- `PADEL_REQUESTED_WITH`
- `PADEL_ACCEPT_LANGUAGE`

## Session Storage

Session tokens are stored outside the repo at:

- `~/.config/padel-tui/session.json`

Override with `PADEL_TUI_SESSION_FILE`.

## Token Refresh Handling

- Access tokens are refreshed on demand when a request returns `401`.
- Refresh call uses captured endpoint contract: `POST /v3/auth/token` with `refresh_token` JSON body.
- If refresh is rejected (`401/403`), local session is cleared and login is required again.

## Purchase Flow (CLI)

The CLI follows the captured booking sequence:

1. `POST /v1/payment_intents`
2. `PATCH /v1/payment_intents/{id}`
3. `POST /v1/payment_intents/{id}/confirmation` (when required)
4. `GET /v1/payment_intents/{id}`

If final status is not `SUCCEEDED`, the command exits with full payment intent payload for debugging.

## Booking from TUI

In search mode:

- Run search with `Enter` (or `Ctrl+S`)
- Use `Tab` to move focus through query/near/date/tenant fields
- With date field focused, use `Left/Right` arrows to move day -/+1 and auto-refresh
- Move selection with `Up/Down` (or `j/k`)
- Press `B` once to arm booking confirmation
- Press `B` again to confirm booking charge (`Esc` cancels confirmation)

The TUI shows booking progress and prints success with `payment_id` when completed.

## Sanitizing Mitm Exports

Raw captures can contain credentials and tokens. Sanitize before sharing:

```bash
bun run sanitize:mitm flows/playtomic-api-calls captures/sanitized
```

Outputs:

- `captures/sanitized/playtomic-api-calls.redacted.txt`
- `captures/sanitized/playtomic-endpoints.json`
