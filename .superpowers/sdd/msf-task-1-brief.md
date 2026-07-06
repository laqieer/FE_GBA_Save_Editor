### Task 1: Expand schema types for domain/group/member metadata

**Files:**
- Modify: `src/lib/blockSchema.ts`
- Modify: `src/lib/structuredEditor.ts`
- Test: `src/lib/structuredEditor.test.ts`

**Interfaces:**
- Consumes: existing `FieldType`, `BlockFieldSchema`, `getBlockSchema(gameCode, blockKind)`.
- Produces:
  - `type StructuredDomain = 'playState' | 'units' | 'inventory' | 'progressFlags' | 'technical'`
  - `interface BlockFieldSchema { domain: StructuredDomain; groupKey: string; memberPath: string; ... }`
  - `interface FieldRow { domain: StructuredDomain; groupKey: string; memberPath: string; unitIndex?: number; ... }`

- [ ] **Step 1: Write the failing test**

```ts
it('includes domain/group metadata on structured rows', async () => {
  const parsed = await parseSaveFile(buildSampleSave('FE8'))
  const row = getStructuredRows(parsed, 0)[0]
  expect(row).toHaveProperty('domain')
  expect(row).toHaveProperty('groupKey')
  expect(row).toHaveProperty('memberPath')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/lib/structuredEditor.test.ts`
Expected: FAIL with missing `domain/groupKey/memberPath` properties.

- [ ] **Step 3: Write minimal implementation**

```ts
export type StructuredDomain = 'playState' | 'units' | 'inventory' | 'progressFlags' | 'technical'

export interface BlockFieldSchema {
  key: string
  offset: number
  byteLength: number
  size: 1 | 2 | 4
  type: FieldType
  labelKey: string
  domain: StructuredDomain
  groupKey: string
  memberPath: string
}
```

```ts
export type FieldRow = {
  key: string
  domain: StructuredDomain
  groupKey: string
  memberPath: string
  unitIndex?: number
  offset: number
  size: number
  type: FieldType
  labelKey: string
  value: number | string
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/lib/structuredEditor.test.ts`
Expected: PASS for metadata presence test.

- [ ] **Step 5: Commit**

```bash
git add src/lib/blockSchema.ts src/lib/structuredEditor.ts src/lib/structuredEditor.test.ts
git commit -m "feat: add domain metadata to structured schema rows"
```

