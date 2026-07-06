Task 2 report

Change: Added `.sps` normalization in `saveCodec` so SharkPort-wrapped saves decode to raw SRAM before parsing, with fail-closed rejection for malformed payloads.
Files modified: `src/lib/saveCodec.ts`, `src/lib/saveCodec.test.ts`, `src/App.tsx`

Behavior:
- `.sav` parsing path is unchanged.
- `.sps` files are normalized through `decodeSpsBytes()` before `parseFromBytes()` and the UI download now always exports normalized `.sav` files.
- Malformed `.sps` files reject with an error.

UI Fix (Task2 High):
- src/App.tsx: onDownload now strips any trailing .sav or .sps (case-insensitive) from the original file name and always exports as `<basename>-edited.sav`. This prevents exporting SharkPort `.sps` wrapper files when the underlying data is raw SRAM.

Tests / Verification:
- Existing focused codec tests (src/lib/saveCodec.test.ts) remain the primary verification for decoding behavior.
- No UI automated tests found for download filename behavior; manual verification recommended:
  1. Load an `.sps` file in the app UI.
  2. Click Download -> confirm downloaded file is named `<original-basename>-edited.sav` and not `.sps`.
- Commands to run tests/build:
  - npm run test:run -- src/lib/saveCodec.test.ts
  - npm run test:run
  - npm run build

Commit:
- Message: "Always export normalized .sav; strip .sav/.sps from base name (fix Task2 High)\n\nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

Status: Patch applied and committed to repository.

Concerns:
- If external workflows expect to preserve original extension, this change intentionally normalizes output; document this behavior in release notes.
- Suggest adding an automated UI/integration test for download filename in future.

Report path: C:\Projects\FE_GBA_Save_Editor\.superpowers\sdd\sps-task-2-report.md

## Controller verification after fix
- npm run test:run -- src/lib/saveCodec.test.ts (PASS)
- npm run test:run (PASS, 45 tests)
- npm run build (PASS)
