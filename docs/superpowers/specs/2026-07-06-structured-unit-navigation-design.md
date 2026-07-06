# Structured Editor Navigation & Unit-Centric Paging Design

## Objective

Improve structured editor navigation so users can jump directly to target pages and switch units quickly, while ensuring all fields for a selected unit are visible on one page.

## Problem Summary

- Current domain paging relies on Previous/Next clicks, which is inefficient for large datasets.
- Unit data spans multiple pages, making it hard to review or edit a single unit holistically.
- Unit switching is slow because there is no direct unit selector.

## Scope

### In scope

1. Add direct page jump controls (page number input + Go) for structured sections that have multiple pages.
2. Make the Units domain unit-centric: one page per unit, with all fields for that unit shown together.
3. Add a searchable unit dropdown for fast unit switching.
4. Keep existing draft/error reconciliation and checksum-safe edit pipeline.
5. Add regression tests for new navigation behavior.

### Out of scope

1. Redesigning Hex editor pagination.
2. Changing save codec or schema semantics beyond navigation-driven presentation.
3. Adding new game formats or block types.

## Selected Approach

Chosen approach: **unit-centric mode only for Units domain**, while keeping existing domain-based structured layout elsewhere.

Why:

- Solves the core UX pain directly (unit switch + one-unit view) without disruptive full UI rewrite.
- Limits risk by keeping Play State / Inventory / Technical domains on current model.
- Reuses existing grouping model (`units.N`) and i18n labels.

## Architecture & Component Design

### 1) Domain paging model split

- Non-Units domains continue using row-count pagination.
- Units domain switches to **group-count pagination**:
  - Each page corresponds to exactly one group `units.<index>`.
  - Render all rows from that selected unit group on that page.
  - Unit group remains expanded by default in this mode.

### 2) New navigation controls in `BlockStructuredTable`

- **Page jump control** (all multi-page domains):
  - numeric page input (1-based)
  - Go button
  - validates integer input and navigates to clamped page range
- **Searchable unit dropdown** (Units domain only):
  - options: Unit 1..N (from available grouped unit indexes)
  - selecting an option updates Units domain page immediately

Existing Previous/Next controls remain as secondary navigation.

### 3) Layout helper updates (`structuredTableLayout.ts`)

- Add unit-aware helpers to:
  1. discover unit groups from `groupRowsByDomainAndGroup`
  2. map unit index to page index
  3. derive units-domain page metadata based on group count instead of row count

These helpers are additive and do not break existing non-unit pagination behavior.

## Data Flow

1. `getStructuredRows` provides canonical rows.
2. `groupRowsByDomainAndGroup` derives grouped domains.
3. `BlockStructuredTable` computes page model:
   - Units domain: per-unit page
   - other domains: row-chunk page
4. User navigation event (page jump / dropdown / prev-next) updates `domainPages`.
5. Visible rows re-render for target page while draft state remains intact.
6. Edit apply path remains unchanged: `applyStructuredEdit` -> `updateBlockBytes`.

## Validation & Error Handling

- Page jump input:
  - reject non-integer text
  - clamp numeric values to valid range `[1, totalPages]`
  - keep current page unchanged on invalid parse
- Unit selector:
  - only shows available unit groups found in current block rows
  - fallback to first unit if previous selection no longer exists after block/game changes
- Existing per-row edit validation/errors remain unchanged.

## Testing Strategy

Add tests in structured table/component and layout test suites for:

1. **Unit-centric paging**
   - Units domain page shows one and only one unit group.
   - All rows for selected unit are present on that page.
2. **Direct page jump**
   - Valid input navigates to expected page.
   - Out-of-range values clamp correctly.
   - Invalid input does not navigate.
3. **Searchable unit dropdown**
   - Selecting unit N navigates to that unit page.
   - Dropdown labels and ordering are correct.
4. **Regression safety**
   - Non-Units domains still paginate correctly.
   - Draft values and errors persist across page navigation.

## Success Criteria

1. Users can jump to a page directly without repeated Previous/Next clicking.
2. Units domain shows complete data for one unit per page.
3. Users can switch units quickly via searchable dropdown.
4. Existing edit application behavior and save validity remain unchanged.
