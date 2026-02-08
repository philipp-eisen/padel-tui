# padel-tui

TUI-first terminal app for searching and booking padel courts on Playtomic.

## What it does today

- Search availabilities (TUI + CLI)
- Book available slots (TUI + CLI)
- List active matches (TUI + CLI)
- Cancel active matches (TUI + CLI)

## Planned next

- List existing bookings
- Cancel bookings

## Install

```bash
bun install
```

## Run (TUI)

```bash
# default entrypoint (TUI)
bun run start

# explicit TUI command
bun run tui
```

## Use Prebuilt Binaries

Download the archive for your platform from GitHub Releases (currently Linux + macOS arm64), extract it, then run:

```bash
# macOS / Linux
tar -xzf padel-tui-<version>-<platform>.tar.gz
chmod +x padel-tui
./padel-tui

# CLI examples with binary
./padel-tui auth login --email you@example.com
./padel-tui search --near berlin --date 2026-02-11
```

## TUI Quick Guide

- Login: `Tab` switches email/password, `Enter` submits.
- Search area:
  - Type in `location` or `venue` depending on mode.
  - `Tab` switches mode.
  - `Left/Right` changes date.
  - `Enter` runs search.
- Results area:
  - `Down` from search moves focus to the list.
  - `Up/Down` navigates places and expanded slots.
  - `Enter` or `Right` expands a place.
  - `Left` collapses expanded slots.
- Booking confirmation (inline under selected slot):
  - `Enter` opens confirm row.
  - Default is `No`.
  - `Left/Right` toggles `No`/`Yes`.
  - `Enter` applies choice, `Esc` cancels.
- Global: `Ctrl+L` logs out.
- Matches view:
  - Press `M` in search view to open active matches.
  - `R` refreshes, `C` then `C` cancels selected match.
  - `Esc` returns to search.

## CLI (from source)

```bash
# login (password prompt is hidden if --password is omitted)
bun run cli auth login --email you@example.com

# logout
bun run cli auth logout

# search (requires either --near or --name)
bun run cli search --near berlin --date 2026-02-11
bun run cli search --name "Berlin venue" --date 2026-02-11

# list active matches
bun run cli matches --size 30

# cancel a match
bun run cli match-cancel --match-id <match-id>

# book
bun run cli book --tenant-id <tenant-id> --resource-id <resource-id> --start 2026-02-16T21:00:00 --duration 60 --players 4
```

## Session File

Session is stored at:

- `~/.config/padel-tui/session.json`

Override with `PADEL_TUI_SESSION_FILE`.
