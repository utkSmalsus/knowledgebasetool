import { getTaskSiteLists, getTaskUserListGuid, searchListItemsByGuid, searchListItemsByTitle } from './client'
import { MASTER_TASKS_LIST, PORTFOLIO_ITEM_TYPES, PROJECT_ITEM_TYPES } from './provision'

export interface LookupResult {
  id: string
  title: string
  subtitle?: string
}

export interface MasterTaskLookupResult extends LookupResult {
  /** PortfolioStructureID, e.g. "C001" (Component), "C001-S3" (SubComponent), "P001-X2" (Sprint). */
  code?: string
  /** How deep this row sits under its parent (0 = top level) — used to indent it under its parent, same as the Meeting tool's expandable rows. */
  depth: number
  dueDate?: string
  percentComplete?: number
}

/**
 * Orders items so each parent is immediately followed by its own children (recursively),
 * annotating depth for indentation — the same Component→SubComponent→Feature /
 * Project→Sprint/Cycle grouping the Meeting tool's pickers show via their expand arrows,
 * rather than one flat alphabetical list.
 */
function orderByHierarchy<T extends { id: string; parentId?: string; title: string }>(items: T[]): (T & { depth: number })[] {
  const byId = new Map(items.map((i) => [i.id, i]))
  const childrenOf = new Map<string, T[]>()
  const roots: T[] = []
  for (const item of items) {
    if (item.parentId && byId.has(item.parentId)) {
      const siblings = childrenOf.get(item.parentId)
      if (siblings) siblings.push(item)
      else childrenOf.set(item.parentId, [item])
    } else {
      roots.push(item)
    }
  }
  const byTitle = (a: T, b: T) => a.title.localeCompare(b.title)
  const out: (T & { depth: number })[] = []
  const walk = (item: T, depth: number) => {
    out.push({ ...item, depth })
    for (const child of (childrenOf.get(item.id) ?? []).sort(byTitle)) walk(child, depth + 1)
  }
  for (const root of roots.sort(byTitle)) walk(root, 0)
  return out
}

/** itemTypes is a small set of known Item_x0020_Type constants (see provision.ts), never user input. */
async function searchMasterTasksByTypes(itemTypes: string[], query: string): Promise<MasterTaskLookupResult[]> {
  const typeClause = itemTypes.map((t) => `Item_x0020_Type eq '${t}'`).join(' or ')
  const items = await searchListItemsByTitle(MASTER_TASKS_LIST, query, {
    extraFilter: `(${typeClause})`,
    select: 'Id,Title,Item_x0020_Type,DueDate,PercentComplete,PortfolioStructureID,Parent/Id',
    expand: 'Parent',
    // Portfolio branch alone (Component/SubComponent/Feature) runs ~2,700 rows in the real
    // tenant — a low cap here would silently orphan children whose parent fell outside it.
    top: 3000,
  })
  const flat = items
    .filter((i: any) => !!i.Title)
    .map((i: any) => ({
      id: String(i.Id),
      parentId: i.Parent?.Id != null ? String(i.Parent.Id) : undefined,
      title: i.Title,
      subtitle: i.Item_x0020_Type,
      code: i.PortfolioStructureID ?? undefined,
      dueDate: i.DueDate ?? undefined,
      percentComplete: typeof i.PercentComplete === 'number' ? i.PercentComplete : undefined,
    }))
  return orderByHierarchy(flat)
}

export const searchPortfolios = (query: string) => searchMasterTasksByTypes(PORTFOLIO_ITEM_TYPES, query)
export const searchProjects = (query: string) => searchMasterTasksByTypes(PROJECT_ITEM_TYPES, query)

export interface TaskLookupResult extends LookupResult {
  listTitle: string
  itemId: number
}

/**
 * Real tasks live across several separate per-team lists on the same site (same pattern the
 * Meeting tool uses — see SHAREPOINT.md), discovered dynamically via getTaskSiteLists() rather
 * than a hardcoded set of names, so a task lookup searches all of them and tags each hit with
 * which team list it came from.
 */
export async function searchTasks(query: string): Promise<TaskLookupResult[]> {
  const siteLists = await getTaskSiteLists()
  const perList = await Promise.all(
    siteLists.map(async ({ title, listGuid }) => {
      try {
        const items = await searchListItemsByGuid(listGuid, query, { select: 'Id,Title', top: 30 })
        return items
          .filter((i: any) => !!i.Title) // some items in these lists (e.g. section headers) have no Title
          .map((i: any) => ({ id: `${listGuid}:${i.Id}`, title: i.Title, subtitle: title, listTitle: title, itemId: i.Id as number }))
      } catch {
        return [] // one list failing (e.g. deleted, permissions) shouldn't break the others
      }
    }),
  )
  return perList.flat().sort((a, b) => a.title.localeCompare(b.title))
}

export interface TeamMemberLookupResult extends LookupResult {
  email: string
}

/**
 * Real people to tag — from the same "Task Users" list the Meeting tool's Create Meeting
 * attendee picker uses. That list also holds team/group placeholder rows (e.g. "Developers
 * Team") with no Email — those aren't real people, so they're filtered out.
 */
export async function searchTeamMembers(query: string): Promise<TeamMemberLookupResult[]> {
  const listGuid = await getTaskUserListGuid()
  if (!listGuid) return []
  const items = await searchListItemsByGuid(listGuid, query, {
    select: 'Id,Title,Email,Company,Status,isDeleted',
    top: 200,
  })
  // Filtered client-side, not via $filter: this list's Status/isDeleted are Yes/No columns and
  // SharePoint's classic REST OData doesn't reliably accept `eq true`/`eq false` for those.
  return items
    .filter((i: any) => !!i.Title && !!i.Email && i.Status !== false && i.isDeleted !== true)
    .map((i: any) => ({ id: String(i.Id), title: i.Title, subtitle: i.Company, email: i.Email }))
}

/** Exact-title lookup used when resolving a tagged name back to a real email for Push — see mapping.ts. */
export async function findTeamMemberEmailByTitle(title: string): Promise<string | undefined> {
  const listGuid = await getTaskUserListGuid()
  if (!listGuid) return undefined
  const items = await searchListItemsByGuid(listGuid, title, { select: 'Id,Title,Email', top: 10 })
  const match = items.find((i: any) => i.Title === title && !!i.Email)
  return match ? ((match as any).Email as string) : undefined
}
