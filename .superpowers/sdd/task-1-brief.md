### Task 1: Add domain-aware paging helpers (rows vs one-unit-per-page)

**Files:**
- Modify: `src/lib/structuredTableLayout.ts`
- Modify: `src/lib/structuredTableLayout.test.ts`

**Interfaces:**
- Consumes: `StructuredDomainSection`, `StructuredRowGroup`, `FieldRow`
- Produces:
  - `export type StructuredDomainPage = { currentPage: number; totalPages: number; rows: FieldRow[]; visibleGroupIds: string[] }`
  - `export function paginateStructuredSection(section: StructuredDomainSection, pageIndex: number): StructuredDomainPage`
  - `export function getUnitGroupIndexes(section: StructuredDomainSection): number[]`

- [ ] **Step 1: Write the failing tests for unit-centric section paging**

```ts
it('paginates units domain as one full unit-group per page', () => {
  const rows: FieldRow[] = [
    makeRow({ key: 'u0.a', domain: 'units', groupKey: 'units.0', unitIndex: 0 }),
    makeRow({ key: 'u0.b', domain: 'units', groupKey: 'units.0', unitIndex: 0 }),
    makeRow({ key: 'u1.a', domain: 'units', groupKey: 'units.1', unitIndex: 1 }),
  ]
  const section = groupRowsByDomainAndGroup(rows)[0]!
  const page0 = paginateStructuredSection(section, 0)
  const page1 = paginateStructuredSection(section, 1)

  expect(page0.totalPages).toBe(2)
  expect(page0.visibleGroupIds).toEqual(['units:units.0'])
  expect(page0.rows.map((r) => r.key)).toEqual(['u0.a', 'u0.b'])
  expect(page1.visibleGroupIds).toEqual(['units:units.1'])
  expect(page1.rows.map((r) => r.key)).toEqual(['u1.a'])
})
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test:run -- src/lib/structuredTableLayout.test.ts`
Expected: FAIL with `paginateStructuredSection is not defined` (or assertion failure because units still paginate by row chunks).

- [ ] **Step 3: Implement `paginateStructuredSection` and `getUnitGroupIndexes`**

```ts
export type StructuredDomainPage = {
  currentPage: number
  totalPages: number
  rows: FieldRow[]
  visibleGroupIds: string[]
}

function isUnitsSection(section: StructuredDomainSection): boolean {
  return section.domain === 'units'
}

export function getUnitGroupIndexes(section: StructuredDomainSection): number[] {
  if (!isUnitsSection(section)) return []
  return section.groups
    .map((group) => /^units\.(\d+)$/.exec(group.groupKey)?.[1])
    .filter((value): value is string => value !== undefined)
    .map((value) => Number(value))
}

export function paginateStructuredSection(
  section: StructuredDomainSection,
  pageIndex: number,
): StructuredDomainPage {
  if (!isUnitsSection(section)) {
    const page = paginateStructuredRows(section.rows, pageIndex)
    const visibleGroups = groupRowsByDomainAndGroup(page.rows).find((s) => s.id === section.id)?.groups ?? []
    return {
      currentPage: page.currentPage,
      totalPages: page.totalPages,
      rows: page.rows,
      visibleGroupIds: visibleGroups.map((group) => group.id),
    }
  }

  const totalPages = Math.max(1, section.groups.length)
  const currentPage = Math.min(Math.max(0, Math.trunc(pageIndex) || 0), totalPages - 1)
  const selectedGroup = section.groups[currentPage]
  return {
    currentPage,
    totalPages,
    rows: selectedGroup?.rows ?? [],
    visibleGroupIds: selectedGroup ? [selectedGroup.id] : [],
  }
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm run test:run -- src/lib/structuredTableLayout.test.ts`
Expected: PASS with all layout tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/structuredTableLayout.ts src/lib/structuredTableLayout.test.ts
git commit -m "feat: add unit-centric structured section pagination helpers"
```

---

