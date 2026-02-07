# Design Notes

## Current architecture
- Single Bun/TypeScript project with two entry modes:
  - CLI via `src/main.ts` and `src/cli/*`
  - TUI via `src/tui/*` (OpenTUI Solid)
- Shared services so CLI/TUI use same behavior:
  - `AuthService`
  - `AvailabilityService`
- Adapters isolate infrastructure:
  - Playtomic HTTP client (`src/adapters/playtomic/*`)
  - Local session persistence (`src/adapters/storage/session-store.ts`)
- Playtomic HTTP integration is centralized in `src/adapters/playtomic/live-playtomic-api.ts`.
- Foundation libraries used to reduce boilerplate:
  - `cac` for command parsing and help generation
  - `zod` for CLI and API payload validation
  - `ky` for HTTP client ergonomics (timeouts, headers, JSON)
- CLI command registration is split by domain:
  - `src/cli/commands/auth-command.ts`
  - `src/cli/commands/availability-command.ts`
  - `src/cli/commands/payment-command.ts`
  - wired from `src/cli/router.ts`
- Build/distribution uses Bun single-file executable compilation via `scripts/build-executable.ts`
  with `bun build --compile`.
- Executable build disables runtime bunfig autoload for deterministic startup (`autoloadBunfig: false`).
- Release executable mode currently uses minify + linked sourcemap (bytecode left off for compatibility).
- macOS targets support post-build codesign + verify via `codesign --entitlements scripts/macos-entitlements.plist`.
- macOS build scripts (`build:exe:darwin-*`) invoke `--codesign` automatically.

## API fingerprint decisions
- Requests mirror captured client headers by default:
  - `user-agent: Android 11`
  - `x-requested-with: com.playtomic.app 6.59.0`
  - `accept-language: en`
- Refresh request uses observed token endpoint profile:
  - `POST /v3/auth/token`
  - body: `{ refresh_token }`
  - user-agent override: `okhttp/4.12.0`
  - omits `x-requested-with` to match capture

## Location search strategy
- Added location-based tenant discovery: geocode free-text location via Open-Meteo Geocoding API.
- Then query Playtomic tenants with coordinate + radius to match app-style nearby search semantics.
- Retains text tenant-name search for direct name lookups.

## TUI design decisions
- Added explicit dark palette to avoid low-contrast defaults.
- Inputs now use custom background/text/placeholder/cursor colors for readability.
- Submission hotkeys supported globally in screens:
  - `Enter` / `Return`
  - `Ctrl+S` fallback

## Purchase flow design
- Added CLI-first purchase orchestration in `PurchaseService`.
- Implemented captured state machine:
  1. `POST /v1/payment_intents`
  2. `PATCH /v1/payment_intents/{id}`
  3. `POST /v1/payment_intents/{id}/confirmation` (when status is `REQUIRES_CONFIRMATION`)
  4. `GET /v1/payment_intents/{id}`
- Full raw payment intent is preserved on domain object for debugging non-terminal outcomes.

## TUI booking flow design
- Search results are flattened into a bookable slot list (tenant/resource/date-time/duration/price).
- Search supports optional tenant-id restriction directly in the form.
- Date field supports quick day navigation with Left/Right arrows (auto-refreshes availability).
- Keyboard actions in search mode:
  - `Up/Down` (or `j/k`) to select slot
  - first `B` arms confirmation for selected slot
  - second `B` confirms booking charge
  - `Esc` cancels pending booking confirmation
- Booking action reuses shared `PurchaseService` so TUI and CLI execute identical payment flow.
- UI displays booking progress and success message with `payment_id` after completion.

## Error handling design
- Shared formatter in `src/errors/format-error.ts` standardizes user-facing errors for CLI and TUI.
- API errors include HTTP status + full response body; validation errors are rendered as concise issue lists.
