Task 2 report

Change: Added `.sps` normalization in `saveCodec` so SharkPort-wrapped saves decode to raw SRAM before parsing, with fail-closed rejection for malformed payloads.
Files modified: `src/lib/saveCodec.ts`, `src/lib/saveCodec.test.ts`

Behavior:
- `.sav` parsing path is unchanged.
- `.sps` files are normalized through `decodeSpsBytes()` before `parseFromBytes()`.
- Malformed `.sps` files reject with an error.

Tests:
- Focused: `npm run test:run -- src/lib/saveCodec.test.ts`
- Full suite: `npm run test:run`
- Build: `npm run build`

Commit: pending

Concerns: None.

Report path: C:\Projects\FE_GBA_Save_Editor\.superpowers\sdd\sps-task-2-report.md
