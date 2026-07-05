# Meaningful Structured Field Expansion Design

## Objective

Upgrade the structured editor from mostly raw-byte rows to meaningful, editable game-save content for FE6/FE7/FE8, with priority on:

1. Unit data (full struct, including hidden/internal members and flags)
2. Convoy and inventory data
3. World/chapter progress and flags

Hex editing remains available and synchronized with structured edits.

## Current Gap

- FE6/FE7 currently render structured rows as generic raw bytes only.
- FE8 currently has limited named PlaySt fields, but most bytes still fall back to generic rows.
- This is insufficient for a game-save editor workflow where users expect unit-level and progression-level editing.

## Scope

### In scope

- Add game-aware structured schemas for FE6/FE7/FE8 save blocks.
- Expose meaningful grouped fields for units, inventory, and progress data.
- Expose all unit struct members as editable fields, including hidden/internal members.
- For unknown or not confidently named members, provide technical labels using offset/type/member index (not coarse byte chunks).
- Keep structured and hex views synchronized through canonical bytes and existing checksum repair path.

### Out of scope

- New game support beyond FE6/FE7/FE8.
- Save-file migration between games/regions.
- Semantic validation of game logic (e.g., “legal class for character”) beyond binary/size/range validation.

## Architecture

### 1. Schema registry by game + block kind + domain

Extend `blockSchema.ts` into domain-oriented schema definitions:

- Domains: `playState`, `units`, `inventory`, `progressFlags`
- Key selector: `{ gameCode, blockKind }`
- Schema entry includes:
  - `domain`
  - `groupKey` (for UI grouping)
  - `offset`, `byteLength`, `type`
  - `labelKey` (human-readable where known)
  - `memberPath` (technical fallback path, e.g., `units[12].ai.flags`)
  - optional enum/bit metadata for rendering

### 2. Structured row model upgrade

Extend `FieldRow` derivation in `structuredEditor.ts`:

- Add grouping metadata to support sectioned rendering.
- Expand unit arrays into per-unit groups and per-member fields.
- Expand bitfields into per-bit rows when metadata exists.
- Preserve raw numeric row for each bitfield container as fallback.

For uncovered regions:

- Replace coarse generic chunk rows as primary fallback with technical per-member/per-offset rows where structurally known.
- Keep true unknown bytes editable via compact technical byte rows as final fallback.

### 3. UI rendering model

`BlockStructuredTable` evolves into grouped views:

- Domain sections in this order: Play State → Units → Inventory/Convoy → Progress/Flags → Remaining Technical Bytes
- Collapsible sections for large groups (especially units and flags)
- Paging/virtualized rendering for large row sets to preserve performance on mobile/desktop

Hex tab (`BlockHexEditor`) remains unchanged except for synchronization expectations.

## Data Flow

1. `parseSaveFile` produces canonical immutable bytes and block metadata.
2. `getStructuredRows` resolves schema for selected `{gameCode, blockKind}`.
3. Structured rows render grouped meaningful entries + technical fallback entries.
4. `applyStructuredEdit` validates input, serializes patch bytes, and calls `updateBlockBytes`.
5. `updateBlockBytes` writes patch, recomputes block checksum and general checksum, reparses.
6. Updated parsed state refreshes both structured and hex views.

## Validation & Error Handling

- Keep existing strict validation behavior:
  - integer format/range checks
  - text size checks
  - byte/hex format checks
- Invalid edit must not mutate canonical bytes.
- Hidden/internal fields use typed validation by declared field type.
- Bit rows validate to `0/1` (or boolean input mapped to bit value).
- Unknown field labels must still be deterministic and stable across rerenders.

## Performance Strategy

- Keep row explosion under control by:
  - section-level lazy expansion
  - page/chunk windowing for unit tables and large flag groups
  - avoiding full-table rerender on single-field draft changes
- Preserve existing hex pagination behavior.

## Testing Strategy

Add/extend tests to cover:

1. Schema coverage
   - FE6/FE7/FE8 save block schemas produce meaningful non-byte-only rows
   - unit/inventory/progress domains exist where expected
2. Unit struct completeness
   - all declared unit members render editable rows
   - hidden/internal fields render with technical labels
3. Edit correctness
   - structured edits update canonical bytes and keep checksums valid
   - bitfield edits update only intended bits
4. Safety
   - invalid edits do not mutate bytes
5. Regression
   - structured and hex synchronization remains intact
   - block selection/save-switch behavior remains stable

## Implementation Notes

- Reuse existing codec update path (`updateBlockBytes`) and checksum logic; do not create parallel write pipelines.
- Prefer additive schema expansion and grouped rendering over invasive parser rewrites.
- Keep i18n keys for known labels; technical fallback labels can be generated deterministically without translation when needed.

## Success Criteria

- FE6/FE7 no longer show structured view as only coarse raw byte chunks.
- FE8 structured view exposes significantly more meaningful content than current PlaySt-only subset.
- Users can edit units, inventory/convoy, and progress/flags directly in structured mode.
- Exported saves remain checksum-valid and loadable.
- UI remains responsive on mobile and desktop.
