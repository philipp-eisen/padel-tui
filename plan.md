# Plan Notes

## Completed
- Base CLI/TUI wiring with shared services.
- `auth login`, `auth logout`, and `availability search` commands.
- Session storage in `~/.config/padel-tui/session.json`.
- Mitm sanitization script (`scripts/sanitize-mitm.ts`).
- Token refresh wired to captured contract: `POST /v3/auth/token`.
- Added purchase CLI building blocks:
  - payment intent creation
  - payment method selection
  - confirmation endpoint support (`/v1/payment_intents/{id}/confirmation`)
- Added TUI slot booking from search results using keyboard selection.
- Replaced custom CLI arg parsing with `cac` command definitions.
- Added `zod` validation for CLI inputs and key Playtomic API responses.
- Migrated Playtomic transport from raw `fetch` boilerplate to `ky`.

## Next
1. Add service-level tests for purchase success/failure paths.
2. Add command for listing available payment methods before charging.
3. Add an optional confirmation prompt before TUI booking charge.
