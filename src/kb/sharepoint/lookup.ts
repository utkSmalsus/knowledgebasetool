import { searchListItemsByTitle } from './client'
import { MASTER_TASKS_LIST, PORTFOLIO_ITEM_TYPE, PROJECT_ITEM_TYPE } from './provision'

export interface LookupResult {
  id: string
  title: string
  subtitle?: string
}

async function searchMasterTasksByType(itemType: string, query: string): Promise<LookupResult[]> {
  const items = await searchListItemsByTitle(MASTER_TASKS_LIST, query, {
    extraFilter: `Item_x0020_Type eq '${itemType}'`,
    select: 'Id,Title',
  })
  return items.map((i: any) => ({ id: String(i.Id), title: i.Title }))
}

export const searchPortfolios = (query: string) => searchMasterTasksByType(PORTFOLIO_ITEM_TYPE, query)
export const searchProjects = (query: string) => searchMasterTasksByType(PROJECT_ITEM_TYPE, query)

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
        const items = await searchListItemsByTitle(listTitle, query, { select: 'Id,Title', top: 8 })
        return items.map((i: any) => ({ id: `${listTitle}:${i.Id}`, title: i.Title, subtitle: listTitle, listTitle, itemId: i.Id as number }))
      } catch {
        return [] // a list that doesn't exist on this tenant/site shouldn't break the others
      }
    }),
  )
  return perList.flat().sort((a, b) => a.title.localeCompare(b.title))
}
