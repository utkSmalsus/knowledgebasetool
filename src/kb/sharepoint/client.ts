import { getMsalToken } from './authMsal'
import { getRequestDigest } from './authTraditional'
import { isSharePointConfigured, sharepointConfig } from './config'

type Method = 'GET' | 'POST' | 'MERGE' | 'DELETE'

/** SharePoint REST list items need the list's own entity type name on create — fetched once and cached. */
let entityTypeCache: string | null = null

async function authHeaders(method: Method): Promise<Record<string, string>> {
  if (sharepointConfig.authMode === 'msal') {
    const token = await getMsalToken()
    return { Authorization: `Bearer ${token}` }
  }
  if (method === 'GET') return {}
  return { 'X-RequestDigest': await getRequestDigest() }
}

async function spFetch(path: string, init: RequestInit & { method: Method }) {
  if (!isSharePointConfigured()) {
    throw new Error('SharePoint is not configured — set VITE_SP_SITE_URL (and the VITE_MSAL_* vars, if using msal mode). See SHAREPOINT.md.')
  }
  const headers: Record<string, string> = {
    Accept: 'application/json;odata=verbose',
    'Content-Type': 'application/json;odata=verbose',
    ...(await authHeaders(init.method)),
    ...(init.headers as Record<string, string> | undefined),
  }
  const res = await fetch(`${sharepointConfig.siteUrl}/_api/web${path}`, {
    ...init,
    method: init.method === 'MERGE' ? 'POST' : init.method, // MERGE/DELETE ride on POST + X-HTTP-Method for browser fetch compatibility
    headers,
    credentials: sharepointConfig.authMode === 'traditional' ? 'include' : 'same-origin',
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`SharePoint request failed (${res.status} ${res.statusText}): ${body.slice(0, 300)}`)
  }
  if (res.status === 204) return null
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

/** SharePoint OData string literals escape a single quote by doubling it. */
const odataLiteral = (s: string) => s.replace(/'/g, "''")

const listPath = () => `/lists/getbytitle('${encodeURIComponent(odataLiteral(sharepointConfig.listName))}')`
const listPathByTitle = (title: string) => `/lists/getbytitle('${encodeURIComponent(odataLiteral(title))}')`

async function getListEntityType(): Promise<string> {
  if (entityTypeCache) return entityTypeCache
  const data = await spFetch(`${listPath()}?$select=ListItemEntityTypeFullName`, { method: 'GET' })
  entityTypeCache = data.d.ListItemEntityTypeFullName as string
  return entityTypeCache
}

/**
 * Every item in the configured list, paging through $skiptoken as needed.
 * $select/$expand default to pulling Portfolio/Project's display Title
 * alongside every other field — both are Lookup columns (see mapping.ts).
 */
export async function listAllItems(
  query = '$select=*,Portfolio/Title,Project/Title,TaggedUsers/Title&$expand=Portfolio,Project,TaggedUsers',
): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = []
  let path: string | undefined = `${listPath()}/items?$top=200&${query}`
  while (path) {
    const data: any = await spFetch(path, { method: 'GET' })
    items.push(...(data.d.results ?? []))
    const next: string | undefined = data.d.__next
    path = next ? next.slice(next.indexOf('/_api/web') + '/_api/web'.length) : undefined
  }
  return items
}

export async function createItem(fields: Record<string, unknown>): Promise<Record<string, unknown>> {
  const entityType = await getListEntityType()
  const data = await spFetch(`${listPath()}/items`, {
    method: 'POST',
    body: JSON.stringify({ __metadata: { type: entityType }, ...fields }),
  })
  return data.d
}

export async function updateItem(spItemId: number, fields: Record<string, unknown>): Promise<void> {
  const entityType = await getListEntityType()
  await spFetch(`${listPath()}/items(${spItemId})`, {
    method: 'MERGE',
    headers: { 'X-HTTP-Method': 'MERGE', 'IF-MATCH': '*' },
    body: JSON.stringify({ __metadata: { type: entityType }, ...fields }),
  })
}

export interface SpFieldInfo {
  title: string
  internalName: string
  type: string
  required: boolean
  hidden: boolean
  readOnly: boolean
  lookupList?: string
  lookupField?: string
}

/**
 * Reads a list's real column schema — used to inspect an existing list (e.g.
 * "Master Tasks", "Task Users") before deciding how our own list's lookup
 * fields should be wired, rather than guessing.
 */
export async function getListFields(listTitle: string): Promise<SpFieldInfo[]> {
  const data = await spFetch(
    `${listPathByTitle(listTitle)}/fields?$select=Title,InternalName,TypeAsString,Required,Hidden,ReadOnlyField,LookupList,LookupField&$filter=Hidden eq false`,
    { method: 'GET' },
  )
  return (data.d.results ?? []).map((f: any) => ({
    title: f.Title,
    internalName: f.InternalName,
    type: f.TypeAsString,
    required: !!f.Required,
    hidden: !!f.Hidden,
    readOnly: !!f.ReadOnlyField,
    lookupList: f.LookupList || undefined,
    lookupField: f.LookupField || undefined,
  }))
}

/** Every item in an arbitrary list (by title), paging through $skiptoken as needed. */
async function listAllItemsByTitle(listTitle: string, query: string): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = []
  let path: string | undefined = `${listPathByTitle(listTitle)}/items?${query}`
  while (path) {
    const data: any = await spFetch(path, { method: 'GET' })
    items.push(...(data.d.results ?? []))
    const next: string | undefined = data.d.__next
    path = next ? next.slice(next.indexOf('/_api/web') + '/_api/web'.length) : undefined
  }
  return items
}

/**
 * Distinct values (with counts) of one field across every item in a list —
 * used to see real data (e.g. what Item_x0020_Type values actually exist)
 * instead of guessing from application code.
 */
export async function getDistinctFieldValues(listTitle: string, fieldInternalName: string): Promise<{ value: string; count: number }[]> {
  const items = await listAllItemsByTitle(listTitle, `$select=${encodeURIComponent(fieldInternalName)}&$top=2000`)
  const counts = new Map<string, number>()
  for (const item of items) {
    const raw = (item as Record<string, unknown>)[fieldInternalName]
    const value = raw === null || raw === undefined || raw === '' ? '(blank)' : String(raw)
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Live title search on an arbitrary list — used by the Portfolio/Project/Task lookup pickers.
 * An empty query lists everything (still respecting extraFilter/top) so the picker can show the
 * full set scrollable, same as the Meeting tool, rather than requiring a search first.
 */
export async function searchListItemsByTitle(
  listTitle: string,
  query: string,
  opts: { extraFilter?: string; top?: number; select?: string } = {},
): Promise<Record<string, unknown>[]> {
  const clauses: string[] = []
  if (query.trim()) clauses.push(`substringof('${odataLiteral(query.trim())}',Title)`)
  if (opts.extraFilter) clauses.push(opts.extraFilter)
  const filter = clauses.length ? `&$filter=${encodeURIComponent(clauses.join(' and '))}` : ''
  const data = await spFetch(
    `${listPathByTitle(listTitle)}/items?$select=${encodeURIComponent(opts.select ?? 'Id,Title')}${filter}&$top=${opts.top ?? 25}&$orderby=Title`,
    { method: 'GET' },
  )
  return data.d.results ?? []
}

export async function deleteItem(spItemId: number): Promise<void> {
  await spFetch(`${listPath()}/items(${spItemId})`, {
    method: 'DELETE',
    headers: { 'X-HTTP-Method': 'DELETE', 'IF-MATCH': '*' },
  })
}

// -------------------- provisioning (create the list + columns) --------------------

export async function listExists(title: string): Promise<boolean> {
  try {
    await spFetch(`${listPathByTitle(title)}?$select=Id`, { method: 'GET' })
    return true
  } catch {
    return false
  }
}

/** Creates a generic custom list (BaseTemplate 100) if one with this title doesn't already exist. */
export async function ensureList(title: string, description = ''): Promise<void> {
  if (await listExists(title)) return
  await spFetch('/lists', {
    method: 'POST',
    body: JSON.stringify({ __metadata: { type: 'SP.List' }, Title: title, Description: description, BaseTemplate: 100 }),
  })
}

export async function getListGuid(title: string): Promise<string> {
  const data = await spFetch(`${listPathByTitle(title)}?$select=Id`, { method: 'GET' })
  return data.d.Id as string
}

async function existingFieldNames(listTitle: string): Promise<Set<string>> {
  const data = await spFetch(`${listPathByTitle(listTitle)}/fields?$select=InternalName`, { method: 'GET' })
  return new Set((data.d.results ?? []).map((f: any) => f.InternalName as string))
}

/** Adds a field from raw CAML schema XML — the one primitive every specific field-type helper below builds on. */
async function addFieldFromXml(listTitle: string, schemaXml: string): Promise<void> {
  await spFetch(`${listPathByTitle(listTitle)}/fields/createfieldasxml`, {
    method: 'POST',
    body: JSON.stringify({
      parameters: { __metadata: { type: 'SP.XmlSchemaFieldCreationInformation' }, SchemaXml: schemaXml, Options: 8 }, // 8 = AddFieldToDefaultView
    }),
  })
}

const xmlEscape = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export interface FieldDef {
  internalName: string
  displayName?: string
  kind: 'Text' | 'Note' | 'Number' | 'Lookup' | 'UserMulti'
  /** 'Lookup' only — the target list's GUID and the field to show (defaults to Title). */
  lookupListGuid?: string
  lookupShowField?: string
}

function fieldXml(def: FieldDef): string {
  const name = xmlEscape(def.internalName)
  const display = xmlEscape(def.displayName ?? def.internalName)
  switch (def.kind) {
    case 'Text':
      return `<Field Type="Text" DisplayName="${display}" Name="${name}" MaxLength="255" />`
    case 'Note':
      return `<Field Type="Note" DisplayName="${display}" Name="${name}" RichText="FALSE" NumLines="6" />`
    case 'Number':
      return `<Field Type="Number" DisplayName="${display}" Name="${name}" />`
    case 'Lookup':
      return `<Field Type="Lookup" DisplayName="${display}" Name="${name}" List="{${def.lookupListGuid}}" ShowField="${xmlEscape(
        def.lookupShowField ?? 'Title',
      )}" />`
    case 'UserMulti':
      return `<Field Type="UserMulti" DisplayName="${display}" Name="${name}" Mult="TRUE" UserSelectionMode="PeopleOnly" />`
  }
}

/** Adds every field in `defs` that isn't already on the list — safe to call repeatedly. */
export async function ensureFields(listTitle: string, defs: FieldDef[], onProgress?: (done: number, total: number) => void): Promise<void> {
  const existing = await existingFieldNames(listTitle)
  const missing = defs.filter((d) => !existing.has(d.internalName))
  let done = 0
  for (const def of missing) {
    await addFieldFromXml(listTitle, fieldXml(def))
    done += 1
    onProgress?.(done, missing.length)
  }
}

/** Finds one item's SharePoint Id by exact Title + a second field matching any of typeValues — used to resolve our local Portfolio/Project strings against Master Tasks, without creating anything there. */
export async function findItemIdByTitleAndType(
  listTitle: string,
  title: string,
  typeFieldInternalName: string,
  typeValues: string[],
): Promise<number | undefined> {
  const typeClause = typeValues.map((v) => `${typeFieldInternalName} eq '${odataLiteral(v)}'`).join(' or ')
  const filter = `Title eq '${odataLiteral(title)}' and (${typeClause})`
  const data = await spFetch(`${listPathByTitle(listTitle)}/items?$select=Id&$filter=${encodeURIComponent(filter)}&$top=1`, { method: 'GET' })
  return (data.d.results ?? [])[0]?.Id as number | undefined
}

/** Resolves a user's login name/email to their SharePoint user Id (adding them to the site's user info list if needed — this does not grant any permission, SharePoint does this for any valid org account). */
export async function ensureSiteUser(loginNameOrEmail: string): Promise<number | undefined> {
  try {
    const data = await spFetch('/ensureuser', { method: 'POST', body: JSON.stringify({ logonName: loginNameOrEmail }) })
    return data.d.Id as number
  } catch {
    return undefined
  }
}
