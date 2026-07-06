### Task 4: Add bitfield-aware structured editing for hidden/internal flags

**Files:**
- Modify: `src/lib/structuredEditor.ts`
- Test: `src/lib/structuredEditor.test.ts`
- Test: `src/lib/saveCodec.test.ts`

**Interfaces:**
- Consumes: `FieldRow` with `memberPath` and bitfield metadata from schema.
- Produces:
  - bitfield row convention: `memberPath + '.bitN'`
  - helper:
    - `parseBitPatch(row: ResolvedFieldRow, nextValue: string, blockBytes: Uint8Array): Uint8Array`

- [ ] **Step 1: Write the failing tests**

```ts
it('applies single-bit edits without clobbering sibling bits', async () => {
  const parsed = await parseSaveFile(buildSampleSave('FE8'))
  const bitRow = getStructuredRows(parsed, 0).find((r) => r.memberPath === 'units[0].stateFlags.bit3')
  const next = applyStructuredEdit(parsed, 0, bitRow!.key, '1')
  const sameByteRaw = getStructuredRows(next, 0).find((r) => r.memberPath === 'units[0].stateFlags.raw')
  expect(Number(sameByteRaw!.value) & 0x08).toBe(0x08)
  expect(next.blocks[0].checksumValid).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/lib/structuredEditor.test.ts`
Expected: FAIL because bitfield member rows are not yet handled.

- [ ] **Step 3: Write minimal implementation**

```ts
function parseBitPatch(row: ResolvedFieldRow, nextValue: string, currentByte: number): Uint8Array {
  if (!/^(0|1|true|false)$/i.test(nextValue.trim())) {
    throw new Error(STRUCTURED_EDITOR_ERROR_KEYS.invalidInteger)
  }
  const setBit = /^(1|true)$/i.test(nextValue.trim())
  const bit = row.bitIndex!
  const nextByte = setBit ? (currentByte | (1 << bit)) : (currentByte & ~(1 << bit))
  return Uint8Array.from([nextByte])
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/lib/structuredEditor.test.ts src/lib/saveCodec.test.ts`
Expected: PASS with checksum-safe bit edits.

- [ ] **Step 5: Commit**

```bash
git add src/lib/structuredEditor.ts src/lib/structuredEditor.test.ts src/lib/saveCodec.test.ts
git commit -m "feat: support bitfield editing in structured rows"
```

