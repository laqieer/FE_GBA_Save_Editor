# Task 2 Report

## Scope

Implement structured field schema + row generation for the full-block editor model in `C:\Projects\FE_GBA_Save_Editor`, following RED-first TDD and preserving checksum-safe immutable edits.

## Files Changed

- `src/lib/blockSchema.ts` (new)
- `src/lib/structuredEditor.ts` (new)
- `src/lib/structuredEditor.test.ts` (new)
- `.superpowers/sdd/task-2-report.md` (updated)

## Implementation Summary

### 1. Added block schema registry

Created `src/lib/blockSchema.ts` with:

- `FieldType`
- `BlockFieldSchema`
- `PLAYST_FIELD_SCHEMA`
- `getBlockSchema(gameCode, blockKind)`

Current schema support is intentionally focused on known PlaySt offsets for block kinds `0` and `1`, while keeping the registry shape extensible for future game/block-specific labels and fields.

Known PlaySt rows added:

- `gold`
- `saveSlot`
- `chapterIndex`
- `chapterTurn`
- `chapterStateBits`
- `playthroughId`
- `chapterMode`
- `playerName`

All labels are stored as i18n-ready `labelKey` strings (for example, `field.playst.gold`).

### 2. Added structured row generation

Created `src/lib/structuredEditor.ts` with:

- `FieldRow`
- `getStructuredRows(parsed, blockIndex)`
- `applyStructuredEdit(parsed, blockIndex, rowKey, nextValue)`
- `STRUCTURED_EDITOR_ERROR_KEYS`

`getStructuredRows` behavior:

- Uses `readBlockBytes` from `saveCodec.ts` as the canonical source
- Expands known schema rows for game/suspend blocks
- Generates generic `bytes` rows for every uncovered byte offset
- Sorts output by block offset for stable rendering

This guarantees full editable coverage for every block, including non-PlaySt blocks.

### 3. Added structured edit validation and immutable patching

`applyStructuredEdit` validates input before patching:

- `u8`, `s8`, `u16`, `u32`: strict integer parsing + bounds checks
- `bytes`: strict hex parsing
- `text`: UTF-8 length check against field byte length

On valid input:

- Encodes the patch
- Calls `updateBlockBytes(...)`
- Returns a new `ParsedSaveFile`

On invalid input:

- Throws stable error keys
- Does **not** mutate canonical `parsed.bytes`

### 4. saveCodec changes

No `saveCodec.ts` changes were necessary. Existing `readBlockBytes` and `updateBlockBytes` exports were sufficient, so the change stayed focused per the brief.

## TDD Evidence

### RED

Created `src/lib/structuredEditor.test.ts` first, then ran:

```powershell
npm run test:run -- src/lib/structuredEditor.test.ts
```

Observed expected failure:

- `Cannot find module './structuredEditor'`

This confirmed the new tests were truly exercising missing functionality before implementation.

### GREEN

After implementing `blockSchema.ts` and `structuredEditor.ts`, ran:

```powershell
npm run test:run -- src/lib/structuredEditor.test.ts
```

Outcome:

- PASS (`3/3`)

## Test Coverage Added

`src/lib/structuredEditor.test.ts` verifies:

1. Known PlaySt rows exist for block kinds `0` and `1`
2. Unknown regions are exposed as generic byte rows
3. Non-PlaySt block `#6` is fully represented by generic rows
4. Structured edits update known numeric fields
5. Structured edits update known text fields
6. Generic byte-row edits update canonical block bytes
7. Edited blocks still report valid checksums
8. Invalid structured edits throw stable error keys
9. Invalid structured edits do not mutate canonical bytes

## Verification Commands and Outcomes

### Targeted RED/GREEN command

```powershell
npm run test:run -- src/lib/structuredEditor.test.ts
```

- RED: expected failure due to missing module
- GREEN: PASS (`3/3`)

### Required regression suite

```powershell
npm run test:run -- src/lib/blockCodec.test.ts src/lib/saveCodec.test.ts src/lib/structuredEditor.test.ts
```

- PASS (`13/13`)

### Required build

```powershell
npm run build
```

- PASS

## Requirement Checklist

- [x] All block types `#0-#6` remain editable through structured row coverage
- [x] Known PlaySt fields appear for game/suspend blocks
- [x] Unknown regions are represented by generic editable byte rows
- [x] Invalid input does not mutate canonical bytes
- [x] Edits flow through checksum-updating codec helpers
- [x] i18n support is preserved via `labelKey` and stable error keys
- [x] `.sav` upload restriction remains untouched (no `App.tsx`/file validation changes)
- [x] `saveCodec.ts` was left unchanged because helper exports were already sufficient

## Notes

- The exported `FieldRow.size` remains within the required `1 | 2 | 4` union. For text rows, actual encoded length is tracked internally via schema `byteLength`, allowing `playerName` to stay editable without changing the requested row shape.
- Generic rows are emitted one byte at a time to guarantee complete block coverage with straightforward validation and editing semantics.
