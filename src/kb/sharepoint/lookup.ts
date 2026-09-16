import { getTaskSiteLists, searchListItemsByGuid, searchListItemsByTitle } from './client'
import { MASTER_TASKS_LIST, PORTFOLIO_ITEM_TYPES, PROJECT_ITEM_TYPES } from './provision'

export interface LookupResult {
  id: string
  title: string
  subtitle?: string
}

export interface MasterTaskLookupResult extends LookupResult {
  dueDate?: string
  percentComplete?: number
}

/** itemTypes is a small set of known Item_x0020_Type constants (see provision.ts), never user input. */
async function searchMasterTasksByTypes(itemTypes: string[], query: string): Promise<MasterTaskLookupResult[]> {
  const typeClause = itemTypes.map((t) => `Item_x0020_Type eq '${t}'`).join(' or ')
  const items = await searchListItemsByTitle(MASTER_TASKS_LIST, query, {
    extraFilter: `(${typeClause})`,
    select: 'Id,Title,Item_x0020_Type,DueDate,PercentComplete',
    top: 300,
  })
  return items
    .filter((i: any) => !!i.Title)
    .map((i: any) => ({
      id: String(i.Id),
      title: i.Title,
      subtitle: i.Item_x0020_Type,
      dueDate: i.DueDate ?? undefined,
      percentComplete: typeof i.PercentComplete === 'number' ? i.PercentComplete : undefined,
    }))
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
