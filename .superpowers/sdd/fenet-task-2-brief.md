### Task 2: Extract all `.sav` payloads from `.rar`/`.zip` archives

**Files:**
- Modify: `scripts/tools/download_fireemblem_net_saves.ps1`
- Create: `test-saves/fireemblem-net/.gitkeep`
- Modify: `test-saves/fireemblem-net/README.md`

**Interfaces:**
- Consumes: downloaded archives from Task 1
- Produces:
  - extracted `.sav` files under `test-saves/fireemblem-net/`
  - per-archive extraction result in metadata

- [ ] **Step 1: Write the failing test**

```ts
it('includes extracted fireemblem.net .sav fixtures', async () => {
  const files = await readdir('test-saves/fireemblem-net')
  expect(files.some((name) => name.toLowerCase().endsWith('.sav'))).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/lib/saveCodec.test.ts`
Expected: FAIL because no extracted `.sav` fixtures exist.

- [ ] **Step 3: Write minimal implementation**

```powershell
# zip fallback
Expand-Archive -Path $archivePath -DestinationPath $tempExtract -Force

# rar extraction if 7z exists
& 7z x -y "-o$tempExtract" $archivePath | Out-Null

# copy all .sav files
Get-ChildItem -Path $tempExtract -Recurse -File -Filter *.sav | ForEach-Object {
  Copy-Item $_.FullName (Join-Path $fixtureRoot $_.Name) -Force
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/lib/saveCodec.test.ts`
Expected: PASS with at least one `.sav` extracted.

- [ ] **Step 5: Commit**

```bash
git add scripts/tools/download_fireemblem_net_saves.ps1 test-saves/fireemblem-net/README.md test-saves/fireemblem-net/*.sav
git commit -m "test: extract all fireemblem.net sav fixtures"
```

