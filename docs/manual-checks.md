# Desktop acceptance checks

Run these on Windows, macOS and Linux X11 before treating the app as production-ready:

1. New note: type a title/body, resize from all edges, move and toggle pin. Switch to another app and confirm stacking.
2. Type rapidly and immediately close or quit. Relaunch and check the final characters and geometry.
3. Duplicate and edit the copy; confirm the original is unchanged and timestamps are independent.
4. Archive from both note and dashboard; verify the window closes and Restore recovers all content.
5. Cancel permanent deletion; verify nothing changes. Confirm deletion and restart; verify it stays deleted.
6. Search title/body, use every sort mode, switch Active/Archive, and check empty results.
7. Hide/reopen a note; close the dashboard while notes remain; use the note Dashboard button.
8. Unplug an external display and restart; verify notes are reachable on the remaining display.
9. Make the data directory unwritable and edit: verify a save error is visible and close does not silently discard edits.

Wayland: pinning/placement are known platform limitations; repeat with X11/XWayland.
