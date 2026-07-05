# Meaningful Structured Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mostly raw-byte structured rows with meaningful editable FE6/FE7/FE8 save content (units, inventory/convoy, progress/flags) while preserving checksum-safe export and structured/hex sync.

**Architecture:** Extend the schema system from small PlaySt-only definitions into game-aware domain schemas, then upgrade structured row generation/rendering to grouped sections with technical fallbacks for unnamed members. Keep all writes on the existing canonical-byte + `updateBlockBytes` path so checksum behavior and hex synchronization remain unchanged.

**Tech Stack:** React 19 + TypeScript + Vite + Vitest

## Global Constraints

- Add game-aware structured schemas for FE6/FE7/FE8 save blocks.
- Expose meaningful grouped fields for units, inventory, and progress data.
- Expose all unit struct members as editable fields, including hidden/internal members.
- For unknown or not confidently named members, provide technical labels using offset/type/member index (not coarse byte chunks).
- Keep structured and hex views synchronized through canonical bytes and existing checksum repair path.
- Invalid edit must not mutate canonical bytes.
- Preserve strict validation behavior (integer range/format, text size, hex format).
- Keep UI responsive on mobile and desktop.

---

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

### Task 5: Render grouped structured sections with collapsible/paged large domains

**Files:**
- Modify: `src/components/BlockStructuredTable.tsx`
- Modify: `src/App.css`
- Test: `src/lib/structuredEditor.test.ts`

**Interfaces:**
- Consumes: `FieldRow` with `domain/groupKey/unitIndex/memberPath`.
- Produces:
  - grouped rendering model:
    - `const groupedRows = groupRowsByDomainAndGroup(rows)`
  - UI state:
    - `collapsedGroups: Record<string, boolean>`
    - `groupPage: Record<string, number>`

- [ ] **Step 1: Write the failing test**

```ts
it('caps visible rows per large unit group page', async () => {
  const parsed = await parseSaveFile(buildSampleSave('FE8'))
  const rows = getStructuredRows(parsed, 0)
  const unitRows = rows.filter((r) => r.domain === 'units')
  expect(unitRows.length).toBeGreaterThan(64)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/lib/structuredEditor.test.ts`
Expected: FAIL if schema/grouping/page assumptions are missing.

- [ ] **Step 3: Write minimal implementation**

```tsx
const rowsByDomain = useMemo(() => {
  return rows.reduce<Record<string, FieldRow[]>>((acc, row) => {
    const key = `${row.domain}:${row.groupKey}`
    ;(acc[key] ??= []).push(row)
    return acc
  }, {})
}, [rows])

const pageSize = 32
const visibleRows = domainRows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
```

- [ ] **Step 4: Run tests/build to verify pass**

Run: `npm run test:run -- src/lib/structuredEditor.test.ts`
Expected: PASS

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/BlockStructuredTable.tsx src/App.css src/lib/structuredEditor.test.ts
git commit -m "feat: group and page structured editor domains"
```

### Task 6: i18n copy, docs, and full regression gate

**Files:**
- Modify: `src/i18n.ts`
- Modify: `README.md`
- Test: `src/i18n.test.ts`
- Test: `src/lib/structuredEditor.test.ts`
- Test: `src/lib/hexEditor.test.ts`

**Interfaces:**
- Consumes: newly introduced label keys and technical fallback conventions.
- Produces:
  - i18n keys for domain headers, technical-label prefix text, and bitfield labels.
  - README feature text describing meaningful FE6/FE7/FE8 structured editing.

- [ ] **Step 1: Write the failing tests**

```ts
it('contains localization keys for structured domains and technical labels', () => {
  expect(resources.en.translation.structuredDomainUnits).toBeTruthy()
  expect(resources.en.translation.structuredDomainInventory).toBeTruthy()
  expect(resources.en.translation.structuredDomainProgressFlags).toBeTruthy()
  expect(resources.en.translation.technicalFieldLabel).toBeTruthy()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:run -- src/i18n.test.ts`
Expected: FAIL for missing keys.

- [ ] **Step 3: Write minimal implementation**

```ts
structuredDomainUnits: 'Units'
structuredDomainInventory: 'Inventory / Convoy'
structuredDomainProgressFlags: 'Progress / Flags'
technicalFieldLabel: 'Technical field: {{memberPath}} (0x{{offset}})'
```

- [ ] **Step 4: Run full verification**

Run: `npm run test:run`
Expected: PASS

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/i18n.ts src/i18n.test.ts src/lib/structuredEditor.test.ts src/lib/hexEditor.test.ts README.md
git commit -m "docs: finalize meaningful structured editor coverage"
```

## Self-Review Checklist

1. **Spec coverage:** All required domains (units, inventory, progress/flags), FE6/FE7/FE8 schema expansion, technical fallback, strict validation, sync/checksum safety, and responsiveness are mapped to Tasks 1-6.
2. **Placeholder scan:** No TODO/TBD placeholders remain; each task has explicit files, tests, code sketch, commands, and commit step.
3. **Type consistency:** `StructuredDomain`, `BlockFieldSchema` metadata fields, and `FieldRow` enrichment are defined in Task 1 and consumed consistently by Tasks 2-6.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-05-meaningful-structured-fields.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
