# GameFAQs real-world fixtures

These fixtures exercise the `.sps` import path with real Fire Emblem saves sourced from the three GameFAQs pages requested in Task 3:

- FE6: <https://gamefaqs.gamespot.com/gba/563015-fire-emblem-fuuin-no-tsurugi/saves>
- FE7: <https://gamefaqs.gamespot.com/gba/468480-fire-emblem/saves>
- FE8: <https://gamefaqs.gamespot.com/gba/921183-fire-emblem-the-sacred-stones/saves>

## Provenance

`scripts/tools/download_gamefaqs_saves.ps1` attempts the requested GameFAQs pages and the matching direct save download URLs first, then falls back to the Archive.org mirror of `gba_savegames.zip` when GameFAQs blocks the request.

Latest recorded attempt: `test-saves/gamefaqs/sources/download-metadata.json`

### GameFAQs access status

All three requested page fetches and all three direct save download URLs returned HTTP `403 Forbidden` on `2026-07-06T12:27:25.3178813+08:00`. The blocked evidence is stored in `test-saves/gamefaqs/sources/download-metadata.json`.

### Selected deterministic fixtures

| Local file | Requested page | Archive mirror | Notes |
| --- | --- | --- | --- |
| `fe6-17515.sps` | FE6 saves page | `Fire Emblem_ Fuuin no Tsurugi/.../17515.sps` | "All battle maps, all secret characters, One save on Beyond the Darkness and 2 other on Chapter 22". Retained as the reachable FE6 decode-path sample; its mirrored contents do not currently produce a clean checksum-valid block table in this parser. |
| `fe7-10530.sps` | FE7 saves page | `Fire Emblem/.../10530.sps` | "Fire Emblem Save with all the characters and all the modes unlocked" |
| `fe8-27399.sps` | FE8 saves page | `Fire Emblem_ Seima no Kouseki/.../27399.sps` | "Creature campaign ready file. 250,000+ gold and legendary weapons. All characters base classes, need to get post game characters. 100% support log and sound room. Bonus content enabled in English!!" |

Raw Archive.org description snapshots are stored under `test-saves/gamefaqs/sources/`.

## Refresh workflow

From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\tools\download_gamefaqs_saves.ps1 -Force
```

The script refreshes:

- `test-saves/gamefaqs/*.sps`
- `test-saves/gamefaqs/sources/*-archive-description.txt`
- `test-saves/gamefaqs/sources/download-metadata.json`
