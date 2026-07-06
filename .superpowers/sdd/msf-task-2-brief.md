### Task 2: Implement FE8 meaningful schemas (units, inventory, progress)

**Files:**
- Modify: `src/lib/blockSchema.ts`
- Test: `src/lib/structuredEditor.test.ts`
- Test: `src/lib/blockCodec.test.ts`

**Interfaces:**
- Consumes: `BlockFieldSchema` with `domain/groupKey/memberPath`.
- Produces:
  - FE8 schema builders for block kinds `0` and `1`:
    - `buildFe8UnitSchema()`
    - `buildFe8InventorySchema()`
    - `buildFe8ProgressSchema()`
  - `getBlockSchema('FE8', kind)` returns combined meaningful fields + technical fallback coverage map.

- [ ] **Step 1: Write the failing tests**

```ts
it('returns FE8 unit and inventory rows for save block', async () => {
  const parsed = await parseSaveFile(buildSampleSave('FE8'))
  const rows = getStructuredRows(parsed, 0)
  expect(rows.some((r) => r.domain === 'units')).toBe(true)
  expect(rows.some((r) => r.domain === 'inventory')).toBe(true)
  expect(rows.some((r) => r.domain === 'progressFlags')).toBe(true)
})
```

```ts
it('edits FE8 unit member and keeps checksum valid', async () => {
  const parsed = await parseSaveFile(buildSampleSave('FE8'))
  const unitLevelRow = getStructuredRows(parsed, 0).find((r) => r.memberPath === 'units[0].level')
  const next = applyStructuredEdit(parsed, 0, unitLevelRow!.key, '20')
  expect(next.blocks[0].checksumValid).toBe(true)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:run -- src/lib/structuredEditor.test.ts src/lib/blockCodec.test.ts`
Expected: FAIL because FE8 schemas do not yet expose those domains/member paths.

- [ ] **Step 3: Write minimal implementation**

```ts
function buildFe8UnitSchema(): readonly BlockFieldSchema[] {
  // Example: repeat for all unit members/slots in save block layout.
  return [
    { key: 'unit.0.level', domain: 'units', groupKey: 'units.0', memberPath: 'units[0].level', offset: 0x200, size: 1, byteLength: 1, type: 'u8', labelKey: 'field.unit.level' },
    { key: 'unit.0.exp', domain: 'units', groupKey: 'units.0', memberPath: 'units[0].exp', offset: 0x201, size: 1, byteLength: 1, type: 'u8', labelKey: 'field.unit.exp' },
  ]
}
```

```ts
const BLOCK_SCHEMA_BY_GAME = {
  FE8: {
    0: [...PLAYST_FIELD_SCHEMA, ...buildFe8UnitSchema(), ...buildFe8InventorySchema(), ...buildFe8ProgressSchema()],
    1: [...PLAYST_FIELD_SCHEMA, ...buildFe8UnitSchema(), ...buildFe8InventorySchema(), ...buildFe8ProgressSchema()],
  },
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/lib/structuredEditor.test.ts src/lib/blockCodec.test.ts`
Expected: PASS with domain and checksum assertions green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/blockSchema.ts src/lib/structuredEditor.test.ts src/lib/blockCodec.test.ts
git commit -m "feat: add FE8 unit inventory and progress structured schemas"
```

