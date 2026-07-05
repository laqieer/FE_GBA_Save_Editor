# Full Block Editor Design (FE GBA Save Editor)

## Objective

Extend the save editor from 4 simple PlaySt fields to full **view/edit coverage for all content in every block (#0-#6)**, with synchronized structured and hex editing, and checksum-safe export.

## Scope

- In scope:
  - All block types editable
  - Two synchronized editing modes:
    - Structured field grid
    - Raw hex editor
  - Block-level checksum recomputation after edits
  - Global metadata checksum recomputation on export
  - i18n labels/errors for new editor surfaces
- Out of scope:
  - Full reverse-engineered semantic naming for all unknown fields
  - Cross-block business-rule validation beyond format-level correctness

## Architecture

### Canonical data model

- Keep `ParsedSaveFile.bytes` as canonical source of truth.
- Every edit produces a new immutable snapshot derived from current bytes.
- Derived views:
  - `blockBytes`: selected block byte slice
  - `hexRows`: grouped bytes for hex rendering
  - `fieldRows`: structured rows generated from schemas + generic fallback rows

### Schema model

- Introduce per-game/per-kind field schema registry.
- Known fields (e.g., PlaySt offsets) are defined with:
  - offset
  - type (`u8`, `s8`, `u16`, `u32`, byte-array, text)
  - display name key (i18n)
- Unknown regions are represented by generated generic rows so the full block remains editable.

### Edit pipeline

1. User edits a structured cell or hex byte.
2. Input is parsed and validated for the target type.
3. On valid input, patch canonical bytes.
4. Recompute checksum32 for the selected block.
5. Regenerate both structured and hex views from canonical bytes.

## UI/UX

### Block editor layout

- Keep existing block selector.
- Replace current 4-field editor card with tabbed editor:
  - `Structured` tab
  - `Hex` tab

### Structured tab

- Table columns:
  - Offset
  - Field name
  - Type
  - Value (editable)
  - Raw bytes
- Search/filter by field name or offset.
- All rows editable where type supports write.

### Hex tab

- Editable hex grid with ASCII preview.
- Byte-level edits validate hex pair format.
- Immediate synchronization with structured table.

### Editing affordances

- Dirty indicator for current block.
- Reset current block action to last loaded snapshot.
- Inline error messages at row/cell level.

## Data Integrity

- All edits are little-endian aware.
- Invalid edits are rejected and do not mutate canonical bytes.
- On any successful block edit:
  - recompute that block’s checksum32
- On export:
  - recompute global metadata checksum16

## Error Handling

- Unsupported parse paths keep current top-level error behavior.
- New validation errors are localized and shown inline.
- Hex parse failures and numeric overflow/underflow are explicit, non-silent failures.

## Testing Strategy

- Codec tests:
  - Update arbitrary bytes in each block type and verify checksum remains valid.
  - Export/reload roundtrip equivalence for unchanged regions.
- Editor-state tests:
  - Structured edit updates corresponding hex bytes.
  - Hex edit updates structured value.
  - Invalid input does not mutate bytes.
  - Block selection remains stable.
- Build smoke:
  - existing TypeScript build + targeted vitest suites.

## i18n Additions

- New keys for:
  - Structured/Hex tab labels
  - Field table headers
  - Validation errors
  - Dirty/reset actions

## Delivery Plan Boundaries

- Phase 1: core schema + generic row generation + full-block update codec APIs.
- Phase 2: structured editor UI.
- Phase 3: hex editor UI + synchronization.
- Phase 4: validation/i18n/tests hardening.

