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

- This task only downloads the archives and records provenance metadata.
- Archive extraction into `.sav` fixtures is handled by the next task.
