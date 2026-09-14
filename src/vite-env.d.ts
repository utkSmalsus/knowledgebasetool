/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 'msal' or 'traditional' — see SHAREPOINT.md. Defaults to 'traditional' when unset. */
  readonly VITE_SP_AUTH_MODE?: string
  /** e.g. https://yourtenant.sharepoint.com/sites/yoursite */
  readonly VITE_SP_SITE_URL?: string
  /** Display name of the SharePoint list that stores knowledge entries. */
  readonly VITE_SP_LIST_NAME?: string
  /** Azure AD app registration client (application) ID — 'msal' mode only. */
  readonly VITE_MSAL_CLIENT_ID?: string
  /** Azure AD tenant ID, or 'common' / 'organizations'. */
  readonly VITE_MSAL_TENANT_ID?: string
  /** Redirect URI registered on the Azure AD app. Defaults to the page's own origin. */
  readonly VITE_MSAL_REDIRECT_URI?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
