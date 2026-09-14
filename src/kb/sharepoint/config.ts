export type SpAuthMode = 'msal' | 'traditional'

export interface SharePointConfig {
  /** Which auth strategy to use when talking to SharePoint — see SHAREPOINT.md. */
  authMode: SpAuthMode
  /** e.g. https://yourtenant.sharepoint.com/sites/yoursite — no trailing slash. */
  siteUrl: string
  /** Display name of the SharePoint list that stores knowledge entries. */
  listName: string
  /** Azure AD app registration, used only in 'msal' mode. */
  msal: {
    clientId: string
    tenantId: string
    redirectUri: string
  }
}

const env = import.meta.env

export const sharepointConfig: SharePointConfig = {
  authMode: (env.VITE_SP_AUTH_MODE as SpAuthMode) === 'msal' ? 'msal' : 'traditional',
  siteUrl: (env.VITE_SP_SITE_URL ?? '').replace(/\/+$/, ''),
  listName: env.VITE_SP_LIST_NAME || 'KnowledgeEntries',
  msal: {
    clientId: env.VITE_MSAL_CLIENT_ID ?? '',
    tenantId: env.VITE_MSAL_TENANT_ID || 'common',
    redirectUri: env.VITE_MSAL_REDIRECT_URI || (typeof window !== 'undefined' ? window.location.origin : ''),
  },
}

/** Whether enough config is present to attempt a connection — not a guarantee it's *correct*. */
export function isSharePointConfigured(): boolean {
  if (!sharepointConfig.siteUrl) return false
  if (sharepointConfig.authMode === 'msal') return !!sharepointConfig.msal.clientId
  return true
}
