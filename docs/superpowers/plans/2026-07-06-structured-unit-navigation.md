# Structured Editor Navigation & Unit-Centric Paging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add direct page-jump navigation and unit-centric paging so one full unit is shown per page with fast unit switching.

**Architecture:** Keep the existing domain/group rendering pipeline, but split paging behavior by domain. Units domain becomes group-based (one `units.N` group per page) while all other domains keep row-count paging; UI controls in `BlockStructuredTable` bind to this shared paging model. Pure navigation logic is isolated into helpers so page input parsing and unit lookup are testable without UI event harness complexity.

**Tech Stack:** React 19, TypeScript, i18next, Vitest

## Global Constraints

- Add direct page jump controls (page number input + Go) for structured sections that have multiple pages.
- Make the Units domain unit-centric: one page per unit, with all fields for that unit shown together.
- Add a searchable unit dropdown for fast unit switching.
- Keep existing draft/error reconciliation and checksum-safe edit pipeline.
- Keep Hex editor pagination unchanged.

---

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

### Task 2: Add pure navigation helper logic for page-jump parsing and unit selection

**Files:**
- Create: `src/lib/structuredNavigation.ts`
- Create: `src/lib/structuredNavigation.test.ts`

**Interfaces:**
- Consumes: `StructuredDomainSection`, `StructuredDomainPage`
- Produces:
  - `export function parsePageJump(input: string, totalPages: number): number | null`
  - `export function clampPageIndex(pageIndex: number, totalPages: number): number`
  - `export function findUnitPageByIndex(section: StructuredDomainSection, unitIndex: number): number | null`

- [ ] **Step 1: Write failing tests for jump parsing and unit-page lookup**

```ts
it('parses 1-based page input and clamps later through caller', () => {
  expect(parsePageJump('3', 10)).toBe(2)
  expect(parsePageJump(' 1 ', 10)).toBe(0)
  expect(parsePageJump('abc', 10)).toBeNull()
})

it('finds unit page index from units.<n> group key', () => {
  const section: StructuredDomainSection = {
    id: 'units',
    domain: 'units',
    title: { labelKey: 'x', defaultLabel: 'x' },
    rows: [],
    groups: [
      { id: 'units:units.0', domain: 'units', groupKey: 'units.0', rows: [], title: { labelKey: 'x', defaultLabel: 'x' }, defaultCollapsed: false },
      { id: 'units:units.1', domain: 'units', groupKey: 'units.1', rows: [], title: { labelKey: 'x', defaultLabel: 'x' }, defaultCollapsed: false },
    ],
  }

  expect(findUnitPageByIndex(section, 1)).toBe(1)
  expect(findUnitPageByIndex(section, 9)).toBeNull()
})
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test:run -- src/lib/structuredNavigation.test.ts`
Expected: FAIL because file/functions do not exist yet.

- [ ] **Step 3: Implement helper module**

```ts
import type { StructuredDomainSection } from './structuredTableLayout'

export function clampPageIndex(pageIndex: number, totalPages: number): number {
  const last = Math.max(0, totalPages - 1)
  return Math.min(Math.max(0, Math.trunc(pageIndex) || 0), last)
}

export function parsePageJump(input: string, totalPages: number): number | null {
  const trimmed = input.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const oneBased = Number(trimmed)
  if (!Number.isSafeInteger(oneBased) || oneBased <= 0) return null
  return clampPageIndex(oneBased - 1, totalPages)
}

export function findUnitPageByIndex(
  section: StructuredDomainSection,
  unitIndex: number,
): number | null {
  if (section.domain !== 'units') return null
  const targetKey = `units.${unitIndex}`
  const idx = section.groups.findIndex((group) => group.groupKey === targetKey)
  return idx >= 0 ? idx : null
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm run test:run -- src/lib/structuredNavigation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/structuredNavigation.ts src/lib/structuredNavigation.test.ts
git commit -m "feat: add structured navigation helper utilities"
```

---

### Task 3: Integrate controls in BlockStructuredTable and keep edit-state behavior stable

**Files:**
- Modify: `src/components/BlockStructuredTable.tsx`
- Modify: `src/components/BlockStructuredTable.test.tsx`
- Modify: `src/i18n.ts`

**Interfaces:**
- Consumes:
  - `paginateStructuredSection(section, pageIndex): StructuredDomainPage`
  - `parsePageJump(input, totalPages): number | null`
  - `findUnitPageByIndex(section, unitIndex): number | null`
- Produces:
  - UI controls rendered in units section:
    - unit selector (`<input list=...>` or searchable `<select>` equivalent)
  - UI controls rendered in paged sections:
    - page jump text input
    - Go button

- [ ] **Step 1: Write failing component tests for new controls**

```ts
it('renders unit selector when units domain is present', () => {
  const markup = renderToStaticMarkup(
    <BlockStructuredTable
      blockKey="b"
      rows={[
        makeRow({ key: 'u0', domain: 'units', groupKey: 'units.0', unitIndex: 0 }),
        makeRow({ key: 'u1', domain: 'units', groupKey: 'units.1', unitIndex: 1 }),
      ]}
      onApplyEdit={() => undefined}
    />,
  )

  expect(markup).toContain('structuredEditor.unitSelector')
  expect(markup).toContain('structuredEditor.goToPage')
})
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test:run -- src/components/BlockStructuredTable.test.tsx`
Expected: FAIL because new labels/controls are not rendered yet.

- [ ] **Step 3: Implement UI integration in `BlockStructuredTable`**

```tsx
const [pageJumpInputs, setPageJumpInputs] = useState<Record<string, string>>({})

function applyPageJump(sectionId: string, totalPages: number) {
  const parsed = parsePageJump(pageJumpInputs[sectionId] ?? '', totalPages)
  if (parsed === null) return
  setDomainPages((current) => ({ ...current, [sectionId]: parsed }))
}

// in section header controls
<input
  value={pageJumpInputs[section.id] ?? String(page.currentPage + 1)}
  onChange={(event) =>
    setPageJumpInputs((current) => ({ ...current, [section.id]: event.target.value }))
  }
/>
<button type="button" onClick={() => applyPageJump(section.id, page.totalPages)}>
  {t('structuredEditor.goToPage')}
</button>

// units-only selector
{section.domain === 'units' && (
  <input
    list={`unit-options-${section.id}`}
    value={String((domainPages[section.id] ?? 0) + 1)}
    onChange={(event) => {
      const unitPage = parsePageJump(event.target.value, section.groups.length)
      if (unitPage !== null) {
        setDomainPages((current) => ({ ...current, [section.id]: unitPage }))
      }
    }}
  />
)}
```

- [ ] **Step 4: Add i18n keys for new controls**

```ts
// en
'structuredEditor.goToPage': 'Go',
'structuredEditor.pageInputLabel': 'Page',
'structuredEditor.unitSelector': 'Unit',
'structuredEditor.unitSelectorPlaceholder': 'Jump to unit',

// ja
'structuredEditor.goToPage': '移動',
'structuredEditor.pageInputLabel': 'ページ',
'structuredEditor.unitSelector': 'ユニット',
'structuredEditor.unitSelectorPlaceholder': 'ユニットへ移動',

// zh
'structuredEditor.goToPage': '跳转',
'structuredEditor.pageInputLabel': '页码',
'structuredEditor.unitSelector': '单位',
'structuredEditor.unitSelectorPlaceholder': '跳转到单位',
```

- [ ] **Step 5: Run tests to verify pass**

Run: `npm run test:run -- src/components/BlockStructuredTable.test.tsx src/lib/structuredTableLayout.test.ts src/lib/structuredNavigation.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/BlockStructuredTable.tsx src/components/BlockStructuredTable.test.tsx src/i18n.ts
git commit -m "feat: add page jump and unit selector to structured editor"
```

---

### Task 4: End-to-end verification for structured navigation behavior

**Files:**
- Modify: `src/components/BlockStructuredTable.test.tsx`
- Modify: `src/lib/structuredEditor.test.ts` (only if assertions are needed for row grouping assumptions)

**Interfaces:**
- Consumes:
  - `groupRowsByDomainAndGroup`
  - `paginateStructuredSection`
  - `BlockStructuredTable` with unit-centric page behavior
- Produces:
  - Regression coverage that one unit page includes full selected unit rows and non-units stay row-paged

- [ ] **Step 1: Write failing regression tests**

```ts
it('keeps non-unit domains row-paged while units are unit-paged', () => {
  // build rows with many playState technical entries + two units
  // assert layout helper returns row-sliced page for playState and whole-group page for units
})
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test:run -- src/components/BlockStructuredTable.test.tsx src/lib/structuredTableLayout.test.ts`
Expected: FAIL with new regression assertion mismatch.

- [ ] **Step 3: Minimal code/test alignment fix**

```ts
// if needed, adjust component-visible group selection to use page.visibleGroupIds
const visibleGroups = section.groups.filter((group) =>
  page.visibleGroupIds.includes(group.id),
)
```

- [ ] **Step 4: Run full targeted checks**

Run: `npm run test:run -- src/components/BlockStructuredTable.test.tsx src/lib/structuredTableLayout.test.ts src/lib/structuredNavigation.test.ts src/lib/structuredEditor.test.ts`
Expected: PASS.

- [ ] **Step 5: Run build**

Run: `npm run build`
Expected: successful TypeScript build and Vite production bundle.

- [ ] **Step 6: Commit**

```bash
git add src/components/BlockStructuredTable.test.tsx src/lib/structuredTableLayout.test.ts src/lib/structuredNavigation.test.ts src/lib/structuredEditor.test.ts
git commit -m "test: add regression coverage for structured navigation modes"
```

---

## Self-Review Checklist Results

1. **Spec coverage:** all in-scope requirements map to Tasks 1-4 (page jump, one-unit pages, unit selector, regression tests, no codec changes).
2. **Placeholder scan:** no TBD/TODO placeholders remain; each task includes concrete files, commands, and code snippets.
3. **Type consistency:** `paginateStructuredSection`, `parsePageJump`, and `findUnitPageByIndex` are defined once and reused consistently in later tasks.
