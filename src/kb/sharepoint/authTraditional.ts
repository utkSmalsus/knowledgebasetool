import { sharepointConfig } from './config'

/**
 * 'traditional' mode — no MSAL, no separate OAuth. Relies on the browser
 * already holding a valid SharePoint session cookie, which only works when
 * this app is served from an origin SharePoint treats as trusted/same-site
 * (e.g. hosted in the site's own Site Assets, or added to the tenant's CORS
 * allow-list) — see SHAREPOINT.md. GET requests just need the cookie; writes
 * additionally need a short-lived request digest.
 */

let cachedDigest: { value: string; expiresAt: number } | null = null

export async function getRequestDigest(): Promise<string> {
  if (cachedDigest && cachedDigest.expiresAt > Date.now()) return cachedDigest.value

  const res = await fetch(`${sharepointConfig.siteUrl}/_api/contextinfo`, {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json;odata=verbose' },
  })
  if (!res.ok) {
    throw new Error(`Could not get a SharePoint request digest (${res.status}). Are you signed into SharePoint in this browser?`)
  }
  const data = await res.json()
  const info = data.d.GetContextWebInformation
  // refresh a little early rather than racing the exact expiry
  cachedDigest = { value: info.FormDigestValue, expiresAt: Date.now() + (info.FormDigestTimeoutSeconds - 30) * 1000 }
  return cachedDigest.value
}
