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
- Added single-file executable build path (`scripts/build-executable.ts` + `build:exe*` scripts).
- Verified compiled binary execution via `./dist/padel-tui help`.
- Added macOS codesign integration for darwin build targets (with entitlements and verify step).
- Added target-package preflight check for OpenTUI native runtime package availability.
- Split CLI router into modular command registration files.
- Added shared error formatting utility used by CLI and TUI.
- Added service-level tests for auth refresh and purchase orchestration.
- Added TUI booking confirmation guard (double-press `B`, cancel with `Esc`).

## Next
1. Add command for listing available payment methods before charging.
2. Add integration-style replay tests from sanitized capture fixtures.
3. Add optional price/tenant whitelist safety checks before purchase confirmation.
