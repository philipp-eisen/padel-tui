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

## CLI Commands

```bash
# Authenticate and persist session
bun run cli auth login --email you@example.com --password "your-password"

# Clear local session
bun run cli auth logout

# Search by city/query and print availability
bun run cli availability search berlin

# Optional date override
bun run cli availability search berlin --date 2026-02-07

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

## Sanitizing Mitm Exports

Raw captures can contain credentials and tokens. Sanitize before sharing:

```bash
bun run sanitize:mitm flows/playtomic-api-calls captures/sanitized
```

Outputs:

- `captures/sanitized/playtomic-api-calls.redacted.txt`
- `captures/sanitized/playtomic-endpoints.json`
