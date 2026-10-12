# StickyNotesPro

A cross-platform Electron sticky-notes desktop app for Windows, macOS, and Linux. Notes run in independent resizable windows, while a separate dashboard manages active and archived notes.

## Run

Install Node.js LTS and Git. In the repository folder:

```sh
npm ci
npm start
```

For an X11/XWayland Electron session on Linux:

```sh
npm run start:x11
```

## Core interactions

- Create independent native note windows.
- Resize notes freely from their native window edges and corners.
- Notes start pinned above normal windows; toggle Pin to change always-on-top state.
- Title and body save automatically.
- Window size and position survive restart.
- Duplicate creates an independent copy with a new ID and creation date.
- Hide removes a note window from the desktop; Open brings it back from the dashboard.
- Closing a sticky note with the native window close button also records it as hidden.
- Archive moves a note into the dashboard Archive view; Restore makes it active again.
- Delete requires native confirmation and permanently removes the note.
- Dashboard searches title/content and sorts by edited time, creation time, or title.
- Ctrl/Cmd+N creates a note.
- Ctrl/Cmd+Shift+D opens the dashboard.

## Strict interface separation

The renderer follows one rule:

- **HTML = structure and visible interface content**
- **CSS = all visual design and responsive styling**
- **JavaScript = behavior, state, data binding, saving, sorting, and actions**

Renderer JavaScript does not inject CSS, set inline styles, build UI with `innerHTML`, or create visual elements with `document.createElement`. Dynamic dashboard cards are cloned from the HTML `<template>` in `dashboard.html`.

## Code map

| Path | Responsibility |
| --- | --- |
| `src/main/index.cjs` | App lifecycle, menus, validated IPC actions |
| `src/main/windows.cjs` | Native windows, resizing, pinning, placement, hide/close behavior |
| `src/main/note-store.cjs` | Note rules and atomic local JSON persistence |
| `src/preload/bridge.cjs` | Restricted interface between renderer and Electron backend |
| `src/renderer/dashboard.html` | Complete dashboard markup and note-card template |
| `src/renderer/note.html` | Complete sticky-note editor markup |
| `src/renderer/styles/base.css` | Shared visual system and reusable controls |
| `src/renderer/styles/dashboard.css` | Dashboard-only design |
| `src/renderer/styles/note.css` | Sticky-note-only design |
| `src/renderer/scripts/shared.js` | Shared behavior/error helpers |
| `src/renderer/scripts/dashboard.js` | Dashboard actions, filtering, sorting, and data binding |
| `src/renderer/scripts/note.js` | Note editing, autosave, pinning, and note actions |
| `tests/` | Persistence and lifecycle tests |

## Editing the interface

To change the dashboard layout, edit `src/renderer/dashboard.html`.

To change the sticky-note layout, edit `src/renderer/note.html`.

To change colors, spacing, typography, sizing, visibility rules, responsive behavior, or any other presentation, edit files under `src/renderer/styles/`.

Only edit files under `src/renderer/scripts/` when changing functionality. Keep existing IDs plus `data-action` and `data-field` attributes when redesigning the HTML because those attributes connect existing markup to application behavior.

## Data and platform details

Notes are stored in `notes.json` inside Electron's userData directory, outside this repository. Data is local JSON and is not encrypted or synced. Failed writes report an error; malformed existing data prevents startup rather than silently overwriting the file.

Window placement and always-on-top behavior can vary by Linux compositor. Fedora KDE commonly runs Plasma on Wayland, where the compositor may restrict application-controlled window placement. The included `start:x11` command is available when an X11/XWayland session is preferred for testing native window behavior.

## Validation

```sh
npm test
```

See `docs/manual-checks.md` for native interaction acceptance checks.
