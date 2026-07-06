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

