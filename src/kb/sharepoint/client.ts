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

const listPath = () => `/lists/getbytitle('${encodeURIComponent(sharepointConfig.listName)}')`

async function getListEntityType(): Promise<string> {
  if (entityTypeCache) return entityTypeCache
  const data = await spFetch(`${listPath()}?$select=ListItemEntityTypeFullName`, { method: 'GET' })
  entityTypeCache = data.d.ListItemEntityTypeFullName as string
  return entityTypeCache
}

/** Every item in the configured list, paging through $skiptoken as needed. */
export async function listAllItems(): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = []
  let path: string | undefined = `${listPath()}/items?$top=200`
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

export async function deleteItem(spItemId: number): Promise<void> {
  await spFetch(`${listPath()}/items(${spItemId})`, {
    method: 'DELETE',
    headers: { 'X-HTTP-Method': 'DELETE', 'IF-MATCH': '*' },
  })
}
