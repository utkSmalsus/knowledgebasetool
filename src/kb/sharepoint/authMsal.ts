import type { PublicClientApplication as PublicClientApplicationType } from '@azure/msal-browser'
import { sharepointConfig } from './config'

/**
 * 'msal' mode — for an app hosted anywhere (not necessarily inside
 * SharePoint), authenticating as the signed-in user via Azure AD and
 * calling SharePoint REST with a bearer token. Needs an Azure AD app
 * registration; see SHAREPOINT.md.
 *
 * Uses a full-page redirect rather than a popup: popups are unreliable in
 * some browsers/embedded contexts (blocked outright, or the opener/popup
 * handshake fails under third-party-storage partitioning), while redirect
 * has no such failure mode. The tradeoff is that signing in navigates away
 * and back — see completeMsalRedirect().
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

/**
 * Call once at app startup. If the page just came back from a redirect
 * sign-in (there's an auth response in the URL hash), this consumes it,
 * sets the signed-in account, and cleans the hash off the URL. A no-op
 * otherwise, and only touches @azure/msal-browser (dynamic import) when
 * msal mode is actually configured, so it costs nothing the rest of the time.
 */
export async function completeMsalRedirect(): Promise<void> {
  if (sharepointConfig.authMode !== 'msal' || !sharepointConfig.msal.clientId) return
  const app = await getPca()
  await ensureInitialized(app)
  const result = await app.handleRedirectPromise()
  if (result?.account) app.setActiveAccount(result.account)
}

/**
 * Returns a bearer token for SharePoint REST calls, signing the user in via
 * a full-page redirect if needed. On the redirect branch this never
 * resolves — the page navigates away — so callers naturally just stop, and
 * pick back up when the user retries the action after landing back here.
 */
export async function getMsalToken(): Promise<string> {
  const app = await getPca()
  await ensureInitialized(app)

  const account = app.getActiveAccount() ?? app.getAllAccounts()[0]
  if (account) {
    const { InteractionRequiredAuthError } = await import('@azure/msal-browser')
    try {
      const result = await app.acquireTokenSilent({ scopes: scopes(), account })
      return result.accessToken
    } catch (e) {
      if (!(e instanceof InteractionRequiredAuthError)) throw e
    }
  }

  await app.loginRedirect({ scopes: scopes() })
  return new Promise<string>(() => {}) // navigation is already underway
}

export function msalCurrentAccountName(): string | undefined {
  const app = pca
  return (app?.getActiveAccount() ?? app?.getAllAccounts()[0])?.name
}

export async function msalSignOut(): Promise<void> {
  const app = await getPca()
  await ensureInitialized(app)
  const account = app.getActiveAccount() ?? app.getAllAccounts()[0]
  if (account) await app.logoutRedirect({ account })
}
