# Task 4 Implementation Report

## Summary
Implemented the Task 4 block editor replacement on `copilot/task1-generic-block-codec` by replacing the old four-field form with synchronized Structured and Hex editors. All valid blocks are now selectable/editable through the tabbed UI, edits flow through canonical parsed bytes, and checksum regeneration stays centralized in the codec layer.

## Requirements Coverage
- Replaced the old editor in `src/App.tsx` with a tabbed block editor surface.
- Added `src/components/BlockStructuredTable.tsx` for structured row editing.
- Added `src/components/BlockHexEditor.tsx` for byte-wise hex editing.
- Added `src/components/BlockEditorTabs.tsx` to keep both editors synchronized from shared parsed state.
- Updated `src/App.css` for the new editor layout, tables, tabs, and inline validation styles.
- Updated `src/i18n.ts` with tab labels, field labels, action labels, and validation/error copy in `en`, `ja`, and `zh`.
- Preserved stable selection by continuing to use `resolveEditorState` and by not forcing post-edit block jumps.
- Ensured invalid input does not mutate canonical bytes by keeping draft/error state local to the editor components and only calling codec/editor mutators on explicit apply/blur actions.
- Kept checksum correctness by routing successful edits through `applyStructuredEdit`, `applyHexEdit`, and `updateBlockBytes`.

## TDD / Test Work
### Red-Green cycle 1: all-block editable mode
- Extended `src/lib/editorState.test.ts` with coverage for generic all-block editing.
- Verified the new test failed before implementing the editable-block resolution helper changes.
- Implemented present-block filtering in `src/lib/editorState.ts` so all valid blocks remain editable while absent blocks stay read-only.
- Re-ran the targeted test to green.

### Red-Green cycle 2: draft reconciliation
- Added `src/lib/editorDraftState.test.ts` for draft/error reconciliation behavior.
- Verified failures before implementation.
- Added `src/lib/editorDraftState.ts` and wired both editor components to preserve unrelated dirty drafts after successful edits while resetting state on block changes.
- Re-ran the new targeted tests to green.

### Red-Green cycle 3: structured size display
- Extended `src/lib/structuredEditor.test.ts` to assert multi-byte/text fields show their real byte width.
- Verified the test failed before the production change.
- Updated `src/lib/structuredEditor.ts` to expose actual byte length in row size metadata.
- Re-ran the targeted test to green.

## Implementation Notes
### `src/App.tsx`
- Removed the legacy gold/chapter/name form state.
- Switched editable block resolution to the new helper so all present blocks are handled.
- Added `BlockEditorTabs` integration and kept download/export behavior intact.
- Default selection now prefers the first editable/present block on load.

### `src/components/BlockStructuredTable.tsx`
- Renders structured rows with offset/type/size/value/action columns.
- Holds draft input + inline validation errors in component state.
- Applies edits explicitly per row and leaves invalid drafts local.

### `src/components/BlockHexEditor.tsx`
- Renders canonical bytes as grouped hex rows with ASCII preview.
- Tracks per-byte drafts and inline errors locally.
- Applies edits on blur / Enter, with invalid hex staying local until corrected.

### `src/components/BlockEditorTabs.tsx`
- Derives structured rows and block bytes from the same parsed state.
- Keeps both tab panels mounted so switching tabs does not discard in-progress drafts/errors.
- Routes successful edits back to the parent through canonical parsed state updates.

### `src/lib/editorDraftState.ts`
- Centralizes draft/error reconciliation logic used by both editors.
- Preserves dirty state only within the same block and resets on block changes.

### `src/lib/editorState.ts`
- Added editable-block resolution based on present/valid block metadata instead of save/suspend-only logic.

### `src/lib/structuredEditor.ts`
- Row size now reflects actual byte width so text/byte fields display accurate sizes.

## Review / Bug Fix Follow-ups
Ran iterative code review during implementation and fixed:
- crash risk when selecting absent blocks,
- loss of unrelated dirty drafts after successful applies,
- draft leakage across block switches,
- incorrect displayed byte width for multi-byte fields,
- tab switches discarding in-progress draft/error state.

## Verification Evidence
Passed:
- `npm run test:run -- src/lib/editorState.test.ts`
- `npm run test:run -- src/lib/editorState.test.ts src/lib/editorDraftState.test.ts`
- `npm run test:run -- src/lib/editorDraftState.test.ts src/lib/structuredEditor.test.ts`
- `npm run test:run -- src/lib/editorState.test.ts src/lib/hexEditor.test.ts src/lib/structuredEditor.test.ts src/lib/blockCodec.test.ts src/lib/saveCodec.test.ts src/lib/editorDraftState.test.ts`
- `npm run test:run -- src/lib/editorState.test.ts src/lib/hexEditor.test.ts src/lib/structuredEditor.test.ts src/lib/blockCodec.test.ts src/lib/saveCodec.test.ts`
- `npm run build`

Final fresh verification before commit:
- `npm run test:run -- src/lib/editorState.test.ts src/lib/hexEditor.test.ts src/lib/structuredEditor.test.ts src/lib/blockCodec.test.ts src/lib/saveCodec.test.ts`
- `npm run build`

Both final commands passed successfully.
