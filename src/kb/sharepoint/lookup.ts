import { searchListItemsByTitle } from './client'
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

/**
 * Real tasks live across several separate per-team lists on the same site (same pattern the
 * Meeting tool uses — see SHAREPOINT.md) rather than one shared list, so a task lookup searches
 * all of them and tags each hit with which list it came from.
 */
export const TASK_LISTS = ['Gruene', 'Health', 'ILF', 'KathaBeck', 'Migration', 'Offshore Tasks', 'QA', 'Shareweb']

export interface TaskLookupResult extends LookupResult {
  listTitle: string
  itemId: number
}

export async function searchTasks(query: string): Promise<TaskLookupResult[]> {
  const perList = await Promise.all(
    TASK_LISTS.map(async (listTitle) => {
      try {
        const items = await searchListItemsByTitle(listTitle, query, { select: 'Id,Title', top: 30 })
        return items
          .filter((i: any) => !!i.Title) // some items in these lists (e.g. section headers) have no Title
          .map((i: any) => ({ id: `${listTitle}:${i.Id}`, title: i.Title, subtitle: listTitle, listTitle, itemId: i.Id as number }))
      } catch {
        return [] // a list that doesn't exist on this tenant/site shouldn't break the others
      }
    }),
  )
  return perList.flat().sort((a, b) => a.title.localeCompare(b.title))
}
