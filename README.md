# StickyNotesPro

A first working Electron desktop app for Windows, macOS and Linux. Offline notes and a separate management dashboard, with presentation and backend code kept separate.

## Run

Install Node.js LTS and Git. In the repository folder:

```sh
npm ci
npm start
```

## Interactions

- Create independent native windows. Drag the title bar and resize any edge/corner (minimum 260 × 200).
- Notes start pinned above normal windows; toggle Pin to change this.
- Title/body save automatically. Window size and position survive restart.
- Duplicate creates an independent copy with a new ID and creation date.
- Hide removes a window from the desktop; Open brings it back.
- Archive hides a note and moves it into the dashboard Archive view. Restore brings it back.
- Delete requires a native confirmation and is permanent.
- Dashboard searches title/content and sorts by edited time, created time in either direction, or title in either direction.
- Ctrl/Cmd+N creates a note. Ctrl/Cmd+Shift+D opens the dashboard.
- Closing with the native X closes the window for this session; visible notes return at next launch. Use Hide to keep a note closed on restart. Closing the last window exits on Windows/Linux; use the application menu to quit on macOS.

## Code map

| Path | Responsibility |
| --- | --- |
| `src/main/index.cjs` | App lifecycle, menu, validated IPC actions |
| `src/main/windows.cjs` | Native windows, pinning, placement and close handling |
| `src/main/note-store.cjs` | Note rules and atomic local JSON persistence |
| `src/preload/bridge.cjs` | Limited interface between UI and backend |
| `src/renderer/dashboard.js` | Dashboard controls and rendering |
| `src/renderer/note.js` | Note editing and save state |
| `src/renderer/styles/app.css` | Visual design and responsive layout |
| `tests/` | Persistence and lifecycle tests |

## Data and platform details

Notes are stored in `notes.json` inside Electron's userData directory, outside this repository. Data is plain local JSON, not encrypted or synced. Failed writes report an error; malformed existing data prevents startup rather than silently overwriting it. Before using this early version for important work, keep a separate copy of important notes.

Linux Wayland does not support Electron's always-on-top API or reliable programmatic placement. On an X11 session use `npm start`; if XWayland is available, try `npm run start:x11`. Window-manager behavior can vary. Windows/macOS support pinning above ordinary windows; this does not override secure desktops or every fullscreen app.

## Validation

`npm test` runs storage tests. See `docs/manual-checks.md` for native interaction acceptance checks. Installers, signing, cloud sync, rich text, and automatic updates are not part of this initial version.
