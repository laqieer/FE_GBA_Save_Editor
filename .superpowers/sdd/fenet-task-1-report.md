# Task 1 Report: fireemblem.net crawler/downloader

## Status

Completed.

## What changed

- Added `scripts/tools/download_fireemblem_net_saves.ps1`.
- Added `test-saves/fireemblem-net/README.md`.
- Added a regression test for `test-saves/fireemblem-net/sources/download-metadata.json`.
- Generated and committed fixture-source artifacts under `test-saves/fireemblem-net/sources/`:
  - `index.html`
  - `archives/FE0701.rar`
  - `archives/FE0702.rar`
  - `archives/FE0801.zip`
  - `archives/FE0901.rar`
  - `download-metadata.json`

## Validation

- Focused test: passed.
- Full test suite: passed.

## Notes

- Metadata includes FE07→FE6, FE08→FE7, FE09→FE8 mapping.
- The downloader records all archive attempts and writes provenance metadata.
