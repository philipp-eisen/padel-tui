# padel-tui

Terminal app (TUI + CLI) for Playtomic.

## Current features

- Search availabilities
- Book slots
- List active matches
- Cancel active matches

## Install

```bash
bun install
```

## Run

```bash
# default: opens TUI
bun run start

# CLI examples
bun run src/main.ts auth login --email you@example.com
bun run src/main.ts search --near berlin --date 2026-02-11
bun run src/main.ts search --name "Berlin venue" --date 2026-02-11
bun run src/main.ts matches --size 30
bun run src/main.ts match-cancel --match-id <match-id>
bun run src/main.ts book --tenant-id <tenant-id> --resource-id <resource-id> --start 2026-02-16T21:00:00 --duration 60 --players 4
```

## Prebuilt binaries

Download release assets (currently Linux + macOS arm64), extract, then run:

```bash
tar -xzf padel-tui-<version>-<platform>.tar.gz
chmod +x padel-tui
./padel-tui
```

## TUI keys (quick)

- Search: `Tab` mode, `Left/Right` date, `Enter` search
- Navigation: `Up/Down` move focus and rows
- Booking: `Enter` / `Right` expand, `Enter` confirm prompt, `Left` collapse
- Matches panel: `Delete` cancel prompt, `R` refresh
- Global: `Ctrl+L` logout

## Session file

- `~/.config/padel-tui/session.json`
- Override with `PADEL_TUI_SESSION_FILE`
