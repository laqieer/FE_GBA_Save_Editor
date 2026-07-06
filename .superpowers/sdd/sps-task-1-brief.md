### Task 1: Extend file acceptance for `.sps`

**Files:**
- Modify: `src/lib/fileValidation.ts`
- Modify: `src/lib/fileValidation.test.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `isSupportedSaveFile(fileName: string): boolean`
- Produces:
  - `KNOWN_SAVE_EXTENSIONS = ['.sav', '.sps']`
  - upload input `accept=".sav,.sps"`

- [ ] **Step 1: Write the failing test**

```ts
it('accepts .sav and .sps files only', () => {
  expect(isSupportedSaveFile('fe8.sav')).toBe(true)
  expect(isSupportedSaveFile('fe8.sps')).toBe(true)
  expect(isSupportedSaveFile('FE7.SPS')).toBe(true)
  expect(isSupportedSaveFile('payload.exe')).toBe(false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/lib/fileValidation.test.ts`
Expected: FAIL because `.sps` is not accepted.

- [ ] **Step 3: Write minimal implementation**

```ts
const KNOWN_SAVE_EXTENSION_PATTERN = /\.(sav|sps)$/i

export function isSupportedSaveFile(fileName: string): boolean {
  return KNOWN_SAVE_EXTENSION_PATTERN.test(fileName)
}
```

```tsx
<input type="file" accept=".sav,.sps" onChange={(e) => onFileChange(e.target.files?.[0])} />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/lib/fileValidation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/fileValidation.ts src/lib/fileValidation.test.ts src/App.tsx
git commit -m "feat: accept sps save extension"
```

