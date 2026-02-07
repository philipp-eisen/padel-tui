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

## TUI design decisions
- Added explicit dark palette to avoid low-contrast defaults.
- Inputs now use custom background/text/placeholder/cursor colors for readability.
- Submission hotkeys supported globally in screens:
  - `Enter` / `Return`
  - `Ctrl+S` fallback

## Purchase flow design
- Added CLI-first purchase orchestration in `PurchaseService`.
- Implemented captured state machine:
  - create payment intent
  - select payment method
  - confirm via `/v1/payment_intents/{id}/confirmation` when status is `REQUIRES_CONFIRMATION`
  - fetch final state
- Full raw payment intent is preserved on domain object for debugging non-terminal outcomes.
