Task 1 report

Change: Preserve original file extension when downloading edited save files.
File modified: src/App.tsx

Behavior: download filename now uses <base>-edited<original-extension> (supports .sav and .sps). Falls back to appending -edited.sav if extension not recognized.

Tests: Ran full test suite (vitest). All tests passed: 42 passed across 11 files.

Commit: Updated src/App.tsx and committed on branch main.

Concerns: None. Change is localized; no other code paths rely on download naming.

Report path: C:\Projects\FE_GBA_Save_Editor\.superpowers\sdd\sps-task-1-report.md
