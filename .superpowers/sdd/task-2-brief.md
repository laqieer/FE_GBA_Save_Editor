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

