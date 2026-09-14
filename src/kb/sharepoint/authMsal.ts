import type { PublicClientApplication as PublicClientApplicationType } from '@azure/msal-browser'
import { sharepointConfig } from './config'

/**
 * 'msal' mode — for an app hosted anywhere (not necessarily inside
 * SharePoint), authenticating as the signed-in user via Azure AD and
 * calling SharePoint REST with a bearer token. Needs an Azure AD app
 * registration; see SHAREPOINT.md.
 *
 * @azure/msal-browser is dynamically imported so it never lands in the main
 * bundle for the (far more common) case where SharePoint isn't configured.
 */

let pca: PublicClientApplicationType | null = null
let initialized: Promise<void> | null = null

async function getPca(): Promise<PublicClientApplicationType> {
  if (!pca) {
    const { PublicClientApplication } = await import('@azure/msal-browser')
    pca = new PublicClientApplication({
      auth: {
        clientId: sharepointConfig.msal.clientId,
        authority: `https://login.microsoftonline.com/${sharepointConfig.msal.tenantId}`,
        redirectUri: sharepointConfig.msal.redirectUri,
      },
      cache: { cacheLocation: 'sessionStorage' },
    })
  }
  return pca
}

async function ensureInitialized(app: PublicClientApplicationType) {
  if (!initialized) initialized = app.initialize()
  await initialized
}

/** The site's own origin is the SharePoint REST resource — request its default scope. */
const scopes = () => [`${new URL(sharepointConfig.siteUrl).origin}/.default`]

/** Signs the user in via popup if needed, and returns a bearer token for SharePoint REST calls. */
export async function getMsalToken(): Promise<string> {
  const { InteractionRequiredAuthError } = await import('@azure/msal-browser')
  const app = await getPca()
  await ensureInitialized(app)

  const account = app.getAllAccounts()[0]
  if (account) {
    try {
      const result = await app.acquireTokenSilent({ scopes: scopes(), account })
      return result.accessToken
    } catch (e) {
      if (!(e instanceof InteractionRequiredAuthError)) throw e
    }
  }

  const result = await app.loginPopup({ scopes: scopes() })
  return result.accessToken
}

export function msalCurrentAccountName(): string | undefined {
  return pca?.getAllAccounts()[0]?.name ?? pca?.getAllAccounts()[0]?.username
}

export async function msalSignOut(): Promise<void> {
  const app = await getPca()
  await ensureInitialized(app)
  const account = app.getAllAccounts()[0]
  if (account) await app.logoutPopup({ account })
}
