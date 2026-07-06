import type { StructuredDomainSection } from './structuredTableLayout'

export function clampPageIndex(pageIndex: number, totalPages: number): number {
  const last = Math.max(0, Math.trunc(totalPages) - 1)
  const normalized = Math.trunc(pageIndex) || 0
  return Math.min(Math.max(0, normalized), last)
}

export function parsePageJump(input: string, totalPages: number): number | null {
  const trimmed = input.trim()
  if (!/^[0-9]+$/.test(trimmed)) return null
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
