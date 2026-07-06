# GameFAQs Fixture Download + SPS Save Support Design

## Objective

Enable real-world save testing from GameFAQs sources and support `.sps` save uploads by decoding them into raw SRAM before normal parsing.

## Scope

### In scope

- Accept `.sav` and `.sps` as known save file extensions.
- Add `.sps` decode path before existing save parse/checksum logic.
- Keep `.sav` behavior unchanged.
- Add GameFAQs fixture download workflow under `test-saves/gamefaqs/`.
- Add deterministic tests for extension checks and SPS decode behavior.

### Out of scope

- Supporting every historical container format beyond `.sps` and raw `.sav`.
- Changing core checksum/block parsing semantics.

## Architecture

### 1. Save normalization layer

Add a normalization step in `saveCodec`:

- `normalizeSaveBytes(fileName: string, bytes: Uint8Array): Uint8Array`
- If `.sav` → return bytes as-is.
- If `.sps` → detect supported SPS layout and extract embedded SRAM payload.
- If `.sps` decode fails → throw explicit parse error key used by existing UI error handling.

`parseSaveFile` will call normalize first, then pass normalized SRAM bytes into the existing `parseFromBytes`.

### 2. File acceptance and UX

- Extend file validation to accept `.sps` in addition to `.sav`.
- Update upload input `accept` list to `.sav,.sps`.
- Keep strict rejection of unrelated executable/script extensions.

### 3. GameFAQs fixture ingestion

- Add script/tooling to fetch source pages/files from the 3 provided GameFAQs URLs.
- Save fetched artifacts under `test-saves/gamefaqs/` (source archives/pages + extraction notes).
- Keep extracted normalized SRAM fixtures for automated tests.
- If a source is blocked, retain traceable metadata (URL and blocker evidence) and continue with available files.

## Error handling

- Decoder must fail closed: unknown or malformed `.sps` is rejected.
- Invalid decode must not mutate any parsed save state.
- Existing `loadError` UI path remains the fallback surface for parse failures.

## Testing

Add/extend tests for:

1. `isSupportedSaveFile` accepts `.sav` and `.sps`, rejects non-save types.
2. SPS decoding success with representative fixture payload.
3. SPS decoding failure on malformed file.
4. Existing save parsing/checksum tests still pass on normalized bytes.

## Success criteria

- Users can upload `.sps` from GameFAQs and parse as a normal save when payload is valid.
- `.sav` flow remains unchanged.
- Test fixtures include real-world samples fetched from provided GameFAQs links where accessible.
- Repo contains reproducible fixture workflow and passing tests.
