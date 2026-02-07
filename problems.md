# Problems / Learnings

## Known issues and status

### 1) Refresh endpoint contract
- Confirmed from capture: `POST /v3/auth/token` with JSON body `{ "refresh_token": "..." }`.
- Previous behavior used an assumed endpoint and was incorrect.
- Current behavior uses fixed captured contract (no extra config).

### 1b) Purchase finalization endpoint
- Confirmed from capture: `POST /v1/payment_intents/{id}/confirmation` with `{}` body.
- This transitions `REQUIRES_CONFIRMATION` -> `SUCCEEDED` in successful card-on-file path.

### 2) TUI visibility/readability
- Default rendering looked low-contrast in some terminals.
- Added explicit dark panel/input colors and brighter text.

### 3) Enter key behavior in inputs
- Some terminals/input focus combos may not propagate Enter as expected.
- Added submit fallback via `Ctrl+S` and broadened submit key detection (`enter`, `return`, `\r`, `\n`).

### 4) Error visibility
- Previous top-level error handling only printed `error.message`.
- Updated to print full API response body and stack for debugging payment/auth failures.

## Evidence still useful from captures
- Refresh failure examples (expired/invalid token) to improve error mapping.
- Any endpoint variant used by other client versions.
- Payment failure examples for `/confirmation` (decline, insufficient funds, lock timeout).
