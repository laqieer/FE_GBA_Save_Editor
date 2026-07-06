Task 3 report

Change:
- Removed FE6 from the automated real-fixture checksum assertion in `src/lib/saveCodec.test.ts` so the suite no longer carries a no-op FE6 case.
- Added a guard test in `src/lib/saveCodec.test.ts` that fails if any future real-fixture case uses `minimumValidBlocks: 0` or `expectedGeneralChecksumValid: null`.
- Documented the FE6 exclusion in `test-saves/gamefaqs/README.md` with concrete evidence from the committed metadata plus the reachable Archive.org FE6 fixture probes.

Files:
- `src/lib/saveCodec.test.ts`
- `test-saves/gamefaqs/README.md`
- `.superpowers/sdd/sps-task-3-report.md`

Behavior:
- Automated real-fixture assertions now cover only fixtures with explicit checksum expectations and at least one checksum-valid block.
- FE6 remains available as a manual investigation fixture, but is no longer treated as meaningful automated checksum coverage.
- The README now records why FE6 is excluded: GameFAQs access is blocked (`403 Forbidden`), and the reachable Archive.org FE6 candidates either produce `generalChecksumValid === false` with `0` valid blocks (`17515`, `11187`, `8090`, `5846`) or fail SPS decoding as malformed (`4114`, `4202`).

Validation:
- `npm run test:run -- src/lib/saveCodec.test.ts` -> PASS (`13` tests)
- `npm run test:run` -> PASS (`48` tests)
- `npm run build` -> PASS

Concerns:
- FE6 automated checksum coverage is still absent until a reachable FE6 fixture exists that parses with an explicit global checksum result and at least one checksum-valid block.

Report path: `C:\Projects\FE_GBA_Save_Editor\.superpowers\sdd\sps-task-3-report.md`
