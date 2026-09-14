import { Entry } from '../../types'
import { createItem, listAllItems, updateItem } from './client'
import { entryToListItemFields, listItemToEntry } from './mapping'

/** Every entry currently in the configured SharePoint list, mapped to our Entry shape. */
export async function pullEntriesFromSharePoint(): Promise<Entry[]> {
  const items = await listAllItems()
  return items.map(listItemToEntry)
}

/**
 * Pushes local entries to SharePoint: updates items that already exist there
 * (matched on our own EntryId column, not SharePoint's numeric Id) and
 * creates the rest. Never deletes — a local entry removed from the app
 * still exists in SharePoint until removed there too.
 */
export async function pushEntriesToSharePoint(entries: Entry[], onProgress?: (done: number, total: number) => void): Promise<void> {
  const existing = await listAllItems()
  const spIdByEntryId = new Map(existing.map((item) => [item.EntryId as string, item.Id as number]))

  let done = 0
  for (const entry of entries) {
    const fields = entryToListItemFields(entry)
    const spId = spIdByEntryId.get(entry.id)
    if (spId) {
      await updateItem(spId, fields)
    } else {
      await createItem(fields)
    }
    done += 1
    onProgress?.(done, entries.length)
  }
}
