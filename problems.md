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
- Updated to print full API response body for API failures and clearer validation errors for input failures.

### 5) TUI booking discoverability
- Search results originally showed availability only and did not provide booking action.
- Added slot selection + booking in TUI (`Up/Down` select, `B` book), with in-app progress and success feedback.

### 6) CLI/API boilerplate
- Hand-rolled arg parsing and ad-hoc response assumptions were getting noisy and brittle.
- Introduced `cac` + `zod` + `ky` to centralize parsing, validation, and request mechanics.

### 7) CLI error UX
- `cac` default missing-arg errors were too stack-trace heavy for normal user mistakes.
- Added explicit usage output for incomplete commands (`auth`, `availability`, `payment`) and concise error lines without stack traces.

### 11) TUI booking safety
- Single-key booking (`B`) was too easy to trigger accidentally.
- Added two-step confirmation (press `B` twice on selected slot) with `Esc` cancellation.

### 8) Distribution ergonomics
- Needed a portable way to run without local source checkout + Bun runtime commands.
- Added Bun compile workflow to produce single-file executables for local and cross-platform targets.
- Compiled binary initially failed by autoloading `bunfig.toml` preload; fixed by disabling `autoloadBunfig` in compile options.
- Bytecode mode caused compile failure in this stack; release mode currently avoids bytecode.

### 9) macOS distribution friction
- Unsigned macOS binaries can trigger Gatekeeper warnings.
- Added automated codesign + verify step for darwin build scripts using JIT-friendly entitlements.

### 10) Cross-target OpenTUI native package availability
- Some cross-target executable builds fail if the matching `@opentui/core-<os>-<arch>` package is absent.
- Added explicit preflight check with a clear actionable error message.

## Evidence still useful from captures
- Refresh failure examples (expired/invalid token) to improve error mapping.
- Any endpoint variant used by other client versions.
- Payment failure examples for `/confirmation` (decline, insufficient funds, lock timeout).
