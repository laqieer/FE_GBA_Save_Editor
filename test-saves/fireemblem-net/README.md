# fireemblem.net SAVE archives

This fixture source crawls the `SAVE` section at:

`http://www.fireemblem.net/fe/download/index.htm`

## FE numbering

The site labels the relevant archives as `FE07`, `FE08`, and `FE09`, which map to the editor's supported games as:

- `FE07` → `FE6`
- `FE08` → `FE7`
- `FE09` → `FE8`

## Refresh workflow

From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\tools\download_fireemblem_net_saves.ps1 -Force
```

The downloader writes:

- `test-saves/fireemblem-net/sources/index.html`
- `test-saves/fireemblem-net/sources/archives/*`
- `test-saves/fireemblem-net/sources/download-metadata.json`

## Notes

- The downloader writes archives and also extracts real `.sav` fixtures into the fixture root using deterministic names such as `fireemblem-net-fe8-fe0901.sav`.
- `.rar` extraction is mandatory: the script requires either `7z` or `tar` for `.rar` archives, records the extraction result in `sources/download-metadata.json`, and exits non-zero if any archive cannot be extracted.
- Each downloaded archive has extraction metadata recorded in `sources/download-metadata.json` under each `archiveAttempts[].extraction`, including `archiveEntries`, `fixtureFiles`, and the extractor used.
