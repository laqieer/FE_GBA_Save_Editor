Task 3 report

Change:
- Added `scripts/tools/download_gamefaqs_saves.ps1` to attempt the three requested GameFAQs pages plus direct save download URLs, record blocked/traceability metadata, and fall back to Archive.org mirror fixtures when GameFAQs returns `403 Forbidden`.
- Added deterministic real-world `.sps` fixtures under `test-saves/gamefaqs/` with provenance docs and raw metadata snapshots.
- Updated `README.md` with `.sps` support and fixture refresh workflow.
- Extended `src/lib/saveCodec.test.ts` to parse committed real-world fixtures and fixed `src/lib/saveCodec.ts` SharkPort checksum validation so real GameFAQs-derived `.sps` files load correctly.

Files:
- `scripts/tools/download_gamefaqs_saves.ps1`
- `README.md`
- `src/lib/saveCodec.ts`
- `src/lib/saveCodec.test.ts`
- `test-saves/gamefaqs/README.md`
- `test-saves/gamefaqs/fe6-17515.sps`
- `test-saves/gamefaqs/fe7-10530.sps`
- `test-saves/gamefaqs/fe8-27399.sps`
- `test-saves/gamefaqs/sources/download-metadata.json`
- `test-saves/gamefaqs/sources/fe6-archive-description.txt`
- `test-saves/gamefaqs/sources/fe7-archive-description.txt`
- `test-saves/gamefaqs/sources/fe8-archive-description.txt`

Behavior:
- Real `.sps` fixtures from the requested Fire Emblem save pages are now committed for deterministic CI coverage.
- The download workflow records both page-level and direct-download `403` failures from GameFAQs, then saves traceable Archive.org fallback provenance and fixture descriptions.
- SharkPort checksum validation now matches real-world files instead of only the synthetic test fixture format.

Validation:
- `npm run test:run` -> PASS (`48` tests)
- `npm run build` -> PASS

Concerns:
- GameFAQs currently blocks automated page and direct file requests in this environment; the committed Archive.org mirror fixtures and `download-metadata.json` are the supported deterministic fallback until direct GameFAQs automation becomes reachable again.

Report path: `C:\Projects\FE_GBA_Save_Editor\.superpowers\sdd\sps-task-3-report.md`
