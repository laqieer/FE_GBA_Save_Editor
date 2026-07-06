# fireemblem.net `.sav` Fixture Ingestion Design

## Objective

Add a second real-world fixture source that provides raw `.sav` files (via archives) from `http://www.fireemblem.net/fe/download/index.htm` so `.sav` testing is covered alongside GameFAQs `.sps`.

## Scope

### In scope

- Parse fireemblem.net download index.
- Select SAVE links matching FE07/FE08/FE09 archive entries (`.rar` and `.zip`).
- Download all matching archives.
- Extract every `.sav` file from those archives into test fixtures.
- Record mapping metadata: FE07→FE6, FE08→FE7, FE09→FE8.
- Add deterministic tests over extracted `.sav` fixtures.
- Add docs/provenance for this fixture source.

### Out of scope

- Non-SAVE sections on the page (cheat/zb/etc.).
- Container-format support changes in the app parser itself (this is fixture ingestion only).

## Architecture

### 1. Dedicated fireemblem.net downloader

Create `scripts/tools/download_fireemblem_net_saves.ps1`:

1. Fetch index page HTML.
2. Extract `SAVE/FE07*`, `SAVE/FE08*`, `SAVE/FE09*` archive links.
3. Download all discovered archives to `test-saves/fireemblem-net/sources/archives/`.
4. Extract each archive and copy every `.sav` payload to `test-saves/fireemblem-net/`.
5. Emit `download-metadata.json` with:
   - source URL
   - archive URL/name
   - extracted file list
   - mapped game code (`FE07->FE6`, `FE08->FE7`, `FE09->FE8`)
   - fetch/extract errors (if any)

### 2. Archive extraction strategy

- Prefer native tools available in environment (e.g., `7z` if installed).
- For `.zip`, use built-in PowerShell extraction fallback.
- For `.rar`, require a supported extractor and fail with explicit metadata if missing.
- Never silently skip archive failures.

### 3. Fixture and test integration

- Add tests in `src/lib/saveCodec.test.ts` to load every extracted fireemblem.net `.sav` fixture and assert:
  - parse succeeds
  - parsed game code matches mapped expectation from metadata
  - blocks array structure is valid

### 4. Documentation

- Add `test-saves/fireemblem-net/README.md` with:
  - source page
  - FE number mapping note (+1 numbering on site)
  - extraction workflow
  - current fixture counts
- Update root `README.md` testing references to include fireemblem.net `.sav` fixture source.

## Error handling

- Save all download/extract failures to metadata.
- If some archives fail, keep successful fixtures and surface partial-failure report.
- Do not overwrite provenance logs.

## Success criteria

- All FE07/FE08/FE09 SAVE archives from the index are attempted.
- All extractable `.sav` files are present under `test-saves/fireemblem-net/`.
- Fixture metadata clearly maps FE07/08/09 to FE6/7/8.
- Automated tests include fireemblem.net `.sav` fixtures and pass.
