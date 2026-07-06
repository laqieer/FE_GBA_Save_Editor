### Task 3: Implement FE6/FE7 meaningful schemas with technical labels for unnamed members

**Files:**
- Modify: `src/lib/blockSchema.ts`
- Modify: `src/lib/structuredEditor.ts`
- Test: `src/lib/structuredEditor.test.ts`

**Interfaces:**
- Consumes: schema builder pattern from Task 2.
- Produces:
  - `buildFe6SaveSchema()` and `buildFe7SaveSchema()` for block kinds `0` and `1`.
  - Technical labels for unnamed fields: e.g. `field.tech.units.member` + memberPath fallback text.

- [ ] **Step 1: Write the failing tests**

```ts
it('FE6 and FE7 structured rows are not byte-chunk-only', async () => {
  for (const gameCode of ['FE6', 'FE7'] as const) {
    const parsed = await parseSaveFile(buildSampleSave(gameCode))
    const rows = getStructuredRows(parsed, 0)
    expect(rows.some((r) => r.domain === 'units')).toBe(true)
    expect(rows.some((r) => r.type !== 'bytes')).toBe(true)
  }
})
```

```ts
it('unnamed FE6/FE7 members use deterministic technical labels', async () => {
  const parsed = await parseSaveFile(buildSampleSave('FE6'))
  const row = getStructuredRows(parsed, 0).find((r) => r.memberPath.includes('units['))
  expect(row?.labelKey).toMatch(/^field\.(unit|tech)\./)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:run -- src/lib/structuredEditor.test.ts`
Expected: FAIL because FE6/FE7 currently fall back to generic bytes.

- [ ] **Step 3: Write minimal implementation**

```ts
function createTechnicalLabel(memberPath: string): string {
  return `field.tech.${memberPath.replace(/[.[\]]+/g, '_').replace(/_+$/, '')}`
}

function makeTechnicalField(prefix: string, index: number, offset: number, byteLength: number): BlockFieldSchema {
  const memberPath = `${prefix}[${index}].raw_${offset.toString(16)}`
  return {
    key: `${prefix}.${index}.${offset}`,
    domain: 'units',
    groupKey: `${prefix}.${index}`,
    memberPath,
    offset,
    size: byteLength === 1 ? 1 : byteLength === 2 ? 2 : 4,
    byteLength,
    type: byteLength === 1 ? 'u8' : byteLength === 2 ? 'u16' : 'u32',
    labelKey: createTechnicalLabel(memberPath),
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/lib/structuredEditor.test.ts`
Expected: PASS with FE6/FE7 non-byte-only and deterministic technical-label assertions.

- [ ] **Step 5: Commit**

```bash
git add src/lib/blockSchema.ts src/lib/structuredEditor.ts src/lib/structuredEditor.test.ts
git commit -m "feat: add FE6 FE7 meaningful and technical structured schemas"
```

