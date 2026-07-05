# Full Block Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full view/edit support for all content in save blocks #0-#6 using synchronized structured and hex editors with checksum-safe export.

**Architecture:** Keep `ParsedSaveFile.bytes` as the single source of truth and derive UI views (structured rows + hex rows) from that byte buffer. All edits flow through typed patch helpers that validate input, mutate an immutable byte snapshot, and recompute block/global checksums. The app UI swaps the current 4-field editor for tabbed block editors that stay in sync.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, i18next/react-i18next.

## Global Constraints

- All block types (#0-#6) must be editable and exported with valid checksums.
- UI must provide both Structured and Hex editor modes for the selected block.
- Structured and Hex edits must stay synchronized through canonical bytes.
- Invalid input must not mutate canonical bytes.
- Existing selection behavior (no forced block jump) must remain intact.
- Keep i18n support for all new labels/errors.
- Preserve `.sav`-only upload restriction.

---

### Task 1: Extend codec to support generic byte-range edits for any block

**Files:**
- Modify: `src/lib/saveCodec.ts`
- Modify: `src/lib/saveCodec.test.ts`
- Create: `src/lib/blockCodec.test.ts`

**Interfaces:**
- Consumes: `ParsedSaveFile`, `computeChecksum16`, `computeChecksum32`
- Produces:
  - `updateBlockBytes(parsed: ParsedSaveFile, blockIndex: number, offsetInBlock: number, patch: Uint8Array): ParsedSaveFile`
  - `readBlockBytes(parsed: ParsedSaveFile, blockIndex: number): Uint8Array`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/blockCodec.test.ts
import { describe, expect, it } from 'vitest'
import { parseSaveFile, readBlockBytes, updateBlockBytes } from './saveCodec'

it('updates arbitrary bytes in block #6 and keeps checksum valid', async () => {
  const file = /* reuse sample save fixture builder */
  const parsed = await parseSaveFile(file)
  const original = readBlockBytes(parsed, 6)
  const patch = Uint8Array.from([0xaa, 0xbb, 0xcc, 0xdd])
  const changed = updateBlockBytes(parsed, 6, 0x10, patch)

  expect(readBlockBytes(changed, 6).slice(0x10, 0x14)).toEqual(patch)
  expect(changed.blocks[6].checksumValid).toBe(true)
  expect(readBlockBytes(changed, 6).slice(0, 0x10)).toEqual(original.slice(0, 0x10))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/lib/blockCodec.test.ts`  
Expected: FAIL with missing `readBlockBytes` / `updateBlockBytes`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/saveCodec.ts
export function readBlockBytes(parsed: ParsedSaveFile, blockIndex: number): Uint8Array {
  const block = parsed.blocks[blockIndex]
  if (!block || block.size <= 0 || block.offset + block.size > parsed.bytes.length) {
    throw new Error('Invalid block.')
  }
  return parsed.bytes.slice(block.offset, block.offset + block.size)
}

export function updateBlockBytes(
  parsed: ParsedSaveFile,
  blockIndex: number,
  offsetInBlock: number,
  patch: Uint8Array,
): ParsedSaveFile {
  const block = parsed.blocks[blockIndex]
  if (!block) throw new Error('Invalid block.')
  if (offsetInBlock < 0 || offsetInBlock + patch.length > block.size) {
    throw new Error('Patch out of range.')
  }

  const bytes = parsed.bytes.slice()
  bytes.set(patch, block.offset + offsetInBlock)
  const body = bytes.slice(block.offset, block.offset + block.size)
  writeU32(bytes, BLOCK_INFO_START + blockIndex * BLOCK_INFO_SIZE + 0x0c, computeChecksum32(body))
  writeU16(bytes, GENERAL_CHECKSUM_OFFSET, computeChecksum16(bytes.slice(0, GENERAL_CHECKSUM_SIZE)))
  return parseFromBytes(parsed.fileName, bytes)
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm run test:run -- src/lib/blockCodec.test.ts src/lib/saveCodec.test.ts`  
Expected: PASS for new and existing codec tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/saveCodec.ts src/lib/saveCodec.test.ts src/lib/blockCodec.test.ts
git commit -m "feat: add generic block byte editing codec"
```

### Task 2: Build structured field schema + row generation for full-block view

**Files:**
- Create: `src/lib/blockSchema.ts`
- Create: `src/lib/structuredEditor.ts`
- Create: `src/lib/structuredEditor.test.ts`
- Modify: `src/lib/saveCodec.ts`

**Interfaces:**
- Consumes: `ParsedSaveFile`, `readBlockBytes`
- Produces:
  - `type FieldRow = { key: string; offset: number; size: 1|2|4; type: 'u8'|'s8'|'u16'|'u32'|'bytes'|'text'; labelKey: string; value: number|string }`
  - `getStructuredRows(parsed: ParsedSaveFile, blockIndex: number): FieldRow[]`
  - `applyStructuredEdit(parsed: ParsedSaveFile, blockIndex: number, rowKey: string, nextValue: string): ParsedSaveFile`

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/structuredEditor.test.ts
it('returns rows covering known and unknown block regions', () => {
  const rows = getStructuredRows(parsed, 0)
  expect(rows.some(r => r.labelKey === 'field.playst.gold')).toBe(true)
  expect(rows.some(r => r.type === 'bytes')).toBe(true) // unknown fallback coverage
})

it('edits u32 structured field and updates canonical bytes', () => {
  const gold = rows.find(r => r.labelKey === 'field.playst.gold')!
  const changed = applyStructuredEdit(parsed, 0, gold.key, '77777')
  expect(readU32FromBlock(changed, 0, 0x08)).toBe(77777)
})
```

- [ ] **Step 2: Run tests to verify fail**

Run: `npm run test:run -- src/lib/structuredEditor.test.ts`  
Expected: FAIL due to missing `structuredEditor` module.

- [ ] **Step 3: Implement minimal schema + row generation**

```ts
// src/lib/blockSchema.ts
export const PLAYST_FIELDS = [
  { key: 'playst.gold', offset: 0x08, size: 4, type: 'u32', labelKey: 'field.playst.gold' },
  { key: 'playst.chapterIndex', offset: 0x0e, size: 1, type: 's8', labelKey: 'field.playst.chapterIndex' },
  // ...
] as const
```

```ts
// src/lib/structuredEditor.ts
export function getStructuredRows(parsed: ParsedSaveFile, blockIndex: number): FieldRow[] {
  // merge known schema rows + generic "bytes" rows for uncovered ranges
}

export function applyStructuredEdit(...) {
  // parse value by type -> build patch bytes -> call updateBlockBytes(...)
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm run test:run -- src/lib/structuredEditor.test.ts src/lib/blockCodec.test.ts`  
Expected: PASS with schema + edit behavior.

- [ ] **Step 5: Commit**

```bash
git add src/lib/blockSchema.ts src/lib/structuredEditor.ts src/lib/structuredEditor.test.ts src/lib/saveCodec.ts
git commit -m "feat: add structured full-block row model"
```

### Task 3: Add editable hex model and sync pipeline

**Files:**
- Create: `src/lib/hexEditor.ts`
- Create: `src/lib/hexEditor.test.ts`
- Modify: `src/lib/structuredEditor.ts`

**Interfaces:**
- Consumes: `readBlockBytes`, `updateBlockBytes`
- Produces:
  - `toHexRows(blockBytes: Uint8Array, bytesPerRow?: number): { rowOffset: number; hex: string[]; ascii: string }[]`
  - `applyHexEdit(parsed: ParsedSaveFile, blockIndex: number, absoluteByteOffset: number, nextHexPair: string): ParsedSaveFile`

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/hexEditor.test.ts
it('applies hex byte edit and keeps block checksum valid', () => {
  const changed = applyHexEdit(parsed, 5, 0x2a, '7F')
  expect(readBlockBytes(changed, 5)[0x2a]).toBe(0x7f)
  expect(changed.blocks[5].checksumValid).toBe(true)
})

it('rejects invalid hex pair without changing bytes', () => {
  expect(() => applyHexEdit(parsed, 5, 0x2a, 'GG')).toThrow('Invalid hex byte')
})
```

- [ ] **Step 2: Run test to verify fail**

Run: `npm run test:run -- src/lib/hexEditor.test.ts`  
Expected: FAIL with missing `hexEditor` exports.

- [ ] **Step 3: Implement minimal hex helpers**

```ts
// src/lib/hexEditor.ts
const HEX_PAIR = /^[0-9a-fA-F]{2}$/
export function applyHexEdit(...) {
  if (!HEX_PAIR.test(nextHexPair)) throw new Error('Invalid hex byte')
  const value = parseInt(nextHexPair, 16)
  return updateBlockBytes(parsed, blockIndex, absoluteByteOffset, Uint8Array.from([value]))
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm run test:run -- src/lib/hexEditor.test.ts src/lib/structuredEditor.test.ts`  
Expected: PASS and no regression in structured pipeline tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/hexEditor.ts src/lib/hexEditor.test.ts src/lib/structuredEditor.ts
git commit -m "feat: add hex editor model and edit pipeline"
```

### Task 4: Replace block editor UI with synchronized Structured/Hex tabs

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css`
- Modify: `src/i18n.ts`
- Create: `src/components/BlockStructuredTable.tsx`
- Create: `src/components/BlockHexEditor.tsx`
- Create: `src/components/BlockEditorTabs.tsx`
- Test: `src/lib/editorState.test.ts`

**Interfaces:**
- Consumes:
  - `getStructuredRows(parsed, blockIndex)`
  - `applyStructuredEdit(parsed, blockIndex, rowKey, value)`
  - `toHexRows(blockBytes)`
  - `applyHexEdit(parsed, blockIndex, offset, pair)`
- Produces:
  - Tabbed block editor that edits all blocks (#0-#6)
  - Inline validation display for structured/hex input

- [ ] **Step 1: Write failing UI behavior test (logic-level)**

```ts
// extend src/lib/editorState.test.ts
it('keeps selected block and allows non-PlaySt blocks to enter editor mode', () => {
  const state = resolveEditorState(6, [0,1,2,3,4,5,6])
  expect(state.selectedBlock).toBe(6)
  expect(state.editingBlock).toBe(6)
})
```

- [ ] **Step 2: Run test to verify fail**

Run: `npm run test:run -- src/lib/editorState.test.ts`  
Expected: FAIL before editor-state behavior is updated.

- [ ] **Step 3: Implement UI components and wire app**

```tsx
// src/components/BlockEditorTabs.tsx
type BlockEditorTabsProps = {
  parsed: ParsedSaveFile
  blockIndex: number
  onParsedChange: (next: ParsedSaveFile) => void
}
```

```tsx
// src/App.tsx (integration)
<BlockEditorTabs parsed={parsed} blockIndex={selectedBlock} onParsedChange={setParsed} />
```

- [ ] **Step 4: Run tests/build to verify pass**

Run: `npm run test:run -- src/lib/editorState.test.ts src/lib/hexEditor.test.ts src/lib/structuredEditor.test.ts src/lib/blockCodec.test.ts`  
Expected: PASS.

Run: `npm run build`  
Expected: successful TypeScript + Vite build.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/App.css src/i18n.ts src/components/BlockStructuredTable.tsx src/components/BlockHexEditor.tsx src/components/BlockEditorTabs.tsx src/lib/editorState.test.ts
git commit -m "feat: add synchronized structured and hex block editors"
```

### Task 5: Final integration hardening and docs refresh

**Files:**
- Modify: `README.md`
- Modify: `src/i18n.ts`
- Test: `src/lib/*.test.ts` (all related suites)

**Interfaces:**
- Consumes: completed Tasks 1-4
- Produces:
  - Updated feature documentation for full block editing
  - Final localization coverage for editor labels/errors

- [ ] **Step 1: Write failing docs assertion test (if used) or checklist test**

```txt
Check README includes:
- structured editor mention
- hex editor mention
- all blocks editable
```

- [ ] **Step 2: Run verification command to confirm missing docs (manual)**

Run: `rg "hex|structured|all blocks" README.md`  
Expected: missing one or more required lines before update.

- [ ] **Step 3: Update docs and i18n keys**

```md
// README.md features section
- Full-block editing for block #0-#6
- Structured + hex synchronized editor
```

- [ ] **Step 4: Run full targeted verification**

Run: `npm run test:run -- src/lib/blockCodec.test.ts src/lib/structuredEditor.test.ts src/lib/hexEditor.test.ts src/lib/editorState.test.ts src/lib/saveCodec.test.ts`  
Expected: PASS.

Run: `npm run build`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add README.md src/i18n.ts
git commit -m "docs: describe full block editing and hex/structured modes"
```
