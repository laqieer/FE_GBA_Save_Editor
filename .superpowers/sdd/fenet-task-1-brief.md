### Task 1: Build fireemblem.net crawler and archive downloader

**Files:**
- Create: `scripts/tools/download_fireemblem_net_saves.ps1`
- Modify: `test-saves/fireemblem-net/README.md`

**Interfaces:**
- Consumes: source URL `http://www.fireemblem.net/fe/download/index.htm`
- Produces:
  - `test-saves/fireemblem-net/sources/index.html`
  - `test-saves/fireemblem-net/sources/archives/*`
  - `test-saves/fireemblem-net/sources/download-metadata.json`

- [ ] **Step 1: Write the failing test**

```ts
it('has fireemblem.net metadata file with at least one FE07/08/09 archive attempt', async () => {
  const metadata = JSON.parse(await readFile('test-saves/fireemblem-net/sources/download-metadata.json', 'utf8'))
  expect(metadata.archiveAttempts.some((x: { titleCode: string }) => /^FE0[789]/.test(x.titleCode))).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/lib/saveCodec.test.ts`
Expected: FAIL because metadata file does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```powershell
# parse SAVE/FE07*, SAVE/FE08*, SAVE/FE09* links from index
$matches = [regex]::Matches($html, 'SAVE/(FE0[789][^"''\s>]+?\.(rar|zip))', 'IgnoreCase')
```

```powershell
# record all attempts with FE mapping
@{
  titleCode = 'FE07'
  mappedGameCode = 'FE6'
  archiveUrl = $url
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/lib/saveCodec.test.ts`
Expected: PASS for metadata existence/shape test.

- [ ] **Step 5: Commit**

```bash
git add scripts/tools/download_fireemblem_net_saves.ps1 test-saves/fireemblem-net/README.md
git commit -m "test: add fireemblem.net archive crawler"
```

