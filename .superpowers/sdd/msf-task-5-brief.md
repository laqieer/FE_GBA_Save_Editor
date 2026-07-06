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

