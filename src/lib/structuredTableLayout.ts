import type { FieldRow } from './structuredEditor'

type LabelDescriptor = {
  labelKey: string
  defaultLabel: string
  options?: Record<string, number | string>
}

export type StructuredRowGroup = {
  id: string
  domain: FieldRow['domain']
  groupKey: string
  rows: FieldRow[]
  title: LabelDescriptor
  defaultCollapsed: boolean
}

export type StructuredDomainSection = {
  id: FieldRow['domain']
  domain: FieldRow['domain']
  title: LabelDescriptor
  rows: FieldRow[]
  groups: StructuredRowGroup[]
}

export const STRUCTURED_DOMAIN_PAGE_SIZE = 32

const DOMAIN_LABELS: Record<FieldRow['domain'], LabelDescriptor> = {
  playState: {
    labelKey: 'structuredEditor.domain.playState',
    defaultLabel: 'Play state',
  },
  units: {
    labelKey: 'structuredEditor.domain.units',
    defaultLabel: 'Units',
  },
  inventory: {
    labelKey: 'structuredEditor.domain.inventory',
    defaultLabel: 'Inventory',
  },
  progressFlags: {
    labelKey: 'structuredEditor.domain.progressFlags',
    defaultLabel: 'Progress flags',
  },
  technical: {
    labelKey: 'structuredEditor.domain.technical',
    defaultLabel: 'Technical',
  },
}

const GROUP_LABELS: Record<string, LabelDescriptor> = {
  playst: {
    labelKey: 'structuredEditor.group.playState',
    defaultLabel: 'Play state',
  },
  'inventory.convoy': {
    labelKey: 'structuredEditor.group.inventoryConvoy',
    defaultLabel: 'Convoy',
  },
  'progressFlags.chapter': {
    labelKey: 'structuredEditor.group.progressChapter',
    defaultLabel: 'Chapter flags',
  },
  'progressFlags.support': {
    labelKey: 'structuredEditor.group.progressSupport',
    defaultLabel: 'Support flags',
  },
  'progressFlags.world': {
    labelKey: 'structuredEditor.group.progressWorld',
    defaultLabel: 'World flags',
  },
  unknown: {
    labelKey: 'structuredEditor.group.unknown',
    defaultLabel: 'Raw bytes',
  },
}

function describeGroup(rows: readonly FieldRow[], groupKey: string): LabelDescriptor {
  const directLabel = GROUP_LABELS[groupKey]
  if (directLabel) {
    return directLabel
  }

  const unitIndex =
    rows.find((row) => row.unitIndex !== undefined)?.unitIndex ??
    (/^units\.(\d+)$/.exec(groupKey)?.[1]
      ? Number(/^units\.(\d+)$/.exec(groupKey)?.[1])
      : undefined)

  if (unitIndex !== undefined) {
    return {
      labelKey: 'structuredEditor.group.unit',
      defaultLabel: `Unit ${unitIndex + 1}`,
      options: {
        index: unitIndex + 1,
      },
    }
  }

  return {
    labelKey: `structuredEditor.group.${groupKey.replace(/[^\w]+/g, '_')}`,
    defaultLabel: groupKey,
  }
}

export function groupRowsByDomainAndGroup(
  rows: readonly FieldRow[],
): StructuredDomainSection[] {
  const sections: StructuredDomainSection[] = []
  const sectionIndex = new Map<FieldRow['domain'], StructuredDomainSection>()
  const groupIndex = new Map<string, StructuredRowGroup>()

  for (const row of rows) {
    let section = sectionIndex.get(row.domain)
    if (!section) {
      section = {
        id: row.domain,
        domain: row.domain,
        title: DOMAIN_LABELS[row.domain],
        rows: [],
        groups: [],
      }
      sectionIndex.set(row.domain, section)
      sections.push(section)
    }
    section.rows.push(row)

    const id = `${row.domain}:${row.groupKey}`
    let group = groupIndex.get(id)
    if (!group) {
      group = {
        id,
        domain: row.domain,
        groupKey: row.groupKey,
        rows: [],
        title: describeGroup([row], row.groupKey),
        defaultCollapsed: row.domain === 'technical',
      }
      groupIndex.set(id, group)
      section.groups.push(group)
    }

    group.rows.push(row)
    if (group.title.defaultLabel === group.groupKey) {
      group.title = describeGroup(group.rows, group.groupKey)
    }
  }

  return sections
}

export function paginateStructuredRows(
  rows: readonly FieldRow[],
  pageIndex: number,
  pageSize = STRUCTURED_DOMAIN_PAGE_SIZE,
) {
  const safePageSize = Math.max(1, Math.trunc(pageSize) || STRUCTURED_DOMAIN_PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(rows.length / safePageSize))
  const currentPage = Math.min(Math.max(0, Math.trunc(pageIndex) || 0), totalPages - 1)
  const startIndex = currentPage * safePageSize
  const endIndex = Math.min(startIndex + safePageSize, rows.length)

  return {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    rows: rows.slice(startIndex, endIndex),
  }
}
