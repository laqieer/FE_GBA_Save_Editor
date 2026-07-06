### Task 2: Add `.sps` normalization/decoding in save codec

**Files:**
- Modify: `src/lib/saveCodec.ts`
- Modify: `src/lib/saveCodec.test.ts`

**Interfaces:**
- Consumes: `parseSaveFile(file: File): Promise<ParsedSaveFile>`
- Produces:
  - `normalizeSaveBytes(fileName: string, bytes: Uint8Array): Uint8Array`
  - `decodeSpsBytes(bytes: Uint8Array): Uint8Array`
  - parse path: `parseSaveFile -> normalizeSaveBytes -> parseFromBytes`

- [ ] **Step 1: Write the failing tests**

```ts
it('parses valid SRAM wrapped in SPS container', async () => {
  const sps = buildSpsFixtureFromSram(buildValidSampleSramBytes())
  const parsed = await parseSaveFile(new File([sps], 'sample.sps'))
  expect(parsed.blocks.length).toBe(7)
})
```

```ts
it('rejects malformed SPS payload', async () => {
  const malformed = new Uint8Array([0x53, 0x50, 0x53, 0x00, 0x01])
  await expect(parseSaveFile(new File([malformed], 'broken.sps'))).rejects.toThrow()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:run -- src/lib/saveCodec.test.ts`
Expected: FAIL because `.sps` decode path does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
function normalizeSaveBytes(fileName: string, bytes: Uint8Array): Uint8Array {
  if (/\.sps$/i.test(fileName)) {
    return decodeSpsBytes(bytes)
  }
  return bytes
}

export async function parseSaveFile(file: File): Promise<ParsedSaveFile> {
  const rawBytes = new Uint8Array(await file.arrayBuffer())
  const normalized = normalizeSaveBytes(file.name, rawBytes)
  return parseFromBytes(file.name, normalized)
}
```

```ts
function decodeSpsBytes(bytes: Uint8Array): Uint8Array {
  // Recognize supported SPS signature/layout and extract SRAM payload.
  // Throw on unknown layout or out-of-range payload.
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/lib/saveCodec.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/saveCodec.ts src/lib/saveCodec.test.ts
git commit -m "feat: decode sps saves before parsing"
```

