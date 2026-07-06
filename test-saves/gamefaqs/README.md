# GameFAQs real-world fixtures

These fixtures exercise the `.sps` import path with real Fire Emblem saves sourced from the three GameFAQs pages requested in Task 3:

- FE6: <https://gamefaqs.gamespot.com/gba/563015-fire-emblem-fuuin-no-tsurugi/saves>
- FE7: <https://gamefaqs.gamespot.com/gba/468480-fire-emblem/saves>
- FE8: <https://gamefaqs.gamespot.com/gba/921183-fire-emblem-the-sacred-stones/saves>

## Provenance

`scripts/tools/download_gamefaqs_saves.ps1` attempts the requested GameFAQs pages and the matching direct save download URLs first, then falls back to the Archive.org mirror of `gba_savegames.zip` when GameFAQs blocks the request.

Latest recorded attempt: `test-saves/gamefaqs/sources/download-metadata.json`

### GameFAQs access status

GameFAQs page and direct-save URLs are still probed on every run and currently return `403 Forbidden` in this environment. The script records all attempts in `test-saves/gamefaqs/sources/download-metadata.json`.

### Downloaded fixture coverage

The downloader now fetches **all archive IDs listed in each title's Archive.org description** (not just one sample per game):

- FE6: all IDs from `sources/fe6-archive-description.txt` (`6` fixtures)
- FE7: all IDs from `sources/fe7-archive-description.txt` (`11` fixtures)
- FE8: all IDs from `sources/fe8-archive-description.txt` (`13` fixtures)

Current fixture count: **30 `.sps` files** in `test-saves/gamefaqs/`.

Raw description snapshots and per-URL probe evidence are stored under `test-saves/gamefaqs/sources/`.

## FE6 automation status

FE6 is intentionally excluded from the automated "real fixture must have valid checksums" assertion in `src/lib/saveCodec.test.ts`.

Concrete evidence gathered on `2026-07-06`:

- `test-saves/gamefaqs/sources/download-metadata.json` shows the requested FE6 GameFAQs page and direct save URL (`https://gamefaqs.gamespot.com/gba/563015-fire-emblem-fuuin-no-tsurugi/saves` and `https://gamefaqs.gamespot.com/a/saves/17515`) both returned `403 Forbidden`, so direct GameFAQs retrieval is not reachable from this environment.
- The reachable Archive.org FE6 candidates listed in `test-saves/gamefaqs/sources/fe6-archive-description.txt` were probed by archive ID:
  - `17515`, `11187`, `8090`, and `5846` decode as FE6 `.sps` files, but each currently yields `generalChecksumValid === false` and `0` checksum-valid blocks in `parseSaveFile`.
  - `4114` and `4202` currently fail earlier as `Malformed .sps save file`.

Until a reachable FE6 fixture is found that produces at least one checksum-valid block and an explicit general checksum result, FE6 remains documented here instead of being covered by that automated checksum-valid regression assertion.

## Refresh workflow

From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\tools\download_gamefaqs_saves.ps1 -Force
```

The script refreshes:

- `test-saves/gamefaqs/*.sps`
- `test-saves/gamefaqs/sources/*-archive-description.txt`
- `test-saves/gamefaqs/sources/download-metadata.json`
