# padel-tui

Terminal app (TUI + CLI) for Playtomic.

## Current features

- Search availabilities
- Book slots
- List active matches
- Cancel active matches

## Install

### Homebrew (macOS / Linux)

```bash
brew install philipp-eisen/tap/padel-tui
```

### Prebuilt binaries

Download from [releases](https://github.com/philipp-eisen/padel-tui/releases), extract, and run:

```bash
tar -xzf padel-tui-<version>-<platform>.tar.gz
chmod +x padel-tui
./padel-tui
```

### From source

```bash
bun install
bun run start
```

## Usage

```bash
# default: opens TUI
padel-tui

# CLI examples
padel-tui auth login --email you@example.com
padel-tui search --near berlin --date 2026-02-11
padel-tui search --name "Berlin venue" --date 2026-02-11
padel-tui matches --size 30
padel-tui match-cancel --match-id <match-id>
padel-tui book --tenant-id <tenant-id> --resource-id <resource-id> --start 2026-02-16T21:00:00 --duration 60 --players 4
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
