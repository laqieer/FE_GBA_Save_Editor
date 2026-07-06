# FE GBA Save Editor

Browser-based save editor for **Fire Emblem 6 / 7 / 8** (`.sav`, plus GameFAQs/GameShark `.sps`) with automatic checksum repair and GitHub Pages deployment.

## Features

- Load `.sav` and GameFAQs/GameShark `.sps` files directly in browser (no server upload)
- Parse global metadata + 7 save block headers
- Validate metadata checksum and block checksums
- Edit every present save block (`#0`-`#6`)
- Switch between synchronized structured and hex editors for each block
- Known FE6/FE7/FE8 structured fields provide meaningful labeled rows; FE6/FE7 unnamed members fall back to deterministic technical labels while uncovered regions remain editable as raw bytes
- Recompute block checksums after every edit and repair the global checksum on export
- Export patched `.sav` with updated checksums
- Responsive UI for desktop/mobile
- i18n: English, Japanese, Chinese

## References

- Source code: <https://github.com/laqieer/FE_GBA_Save_Editor>
- GameFAQs saves: <https://gamefaqs.gamespot.com/search?game=fire+emblem>
- FE maps: <https://github.com/laqieer/fe-maps>
- SaveMetadata: <https://github.com/StanHash/DOC/blob/master/SaveMetadata.txt>
- Decomp projects:
  - FE6J: <https://github.com/FireEmblemUniverse/fireemblem6j>
  - FE7J: <https://github.com/MokhaLeee/FireEmblem7J>
  - FE7U: <https://github.com/StanHash/fe7_us>
  - FE8U: <https://github.com/FireEmblemUniverse/fireemblem8u>
  - FE8J: <https://github.com/laqieer/fireemblem8j>

## Local development

```bash
npm ci
npm run dev
```

## Build and test

```bash
npm run test:run
npm run build
```

## Real-world fixture workflow

Deterministic `.sps` regression fixtures live in `test-saves/gamefaqs/`.

- Refresh them with `powershell -ExecutionPolicy Bypass -File .\scripts\tools\download_gamefaqs_saves.ps1 -Force`
- The script tries the three requested GameFAQs save pages first, then records `403 Forbidden` evidence and falls back to Archive.org's `gba_savegames.zip` mirror when direct access is blocked
- Provenance, selected fixture notes, and refresh details are documented in `test-saves/gamefaqs/README.md`

## GitHub Pages

Live site: <https://laqieer.github.io/FE_GBA_Save_Editor/>

1. Push to `main`.
2. In repository settings, set **Pages** source to **GitHub Actions**.
3. Workflow `.github/workflows/deploy-pages.yml` builds and deploys `dist/`.
