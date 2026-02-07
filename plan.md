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

## Next
1. Add service-level tests for purchase success/failure paths.
2. Add command for listing available payment methods before charging.
3. Improve TUI feedback for auth transitions and loading/errors.
