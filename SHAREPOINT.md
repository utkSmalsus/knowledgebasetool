# SharePoint connectivity

This app's data lives in `localStorage` by default — nothing below changes
that. What's here is a connectivity layer, wired into **Admin → SharePoint**,
that can **pull** entries from a SharePoint list into the browser and **push**
local entries back out, on demand. It's a bridge, not a replacement for the
local store — see "Going further" at the bottom if you want SharePoint to
become the live source of truth for every read/write.

The code lives in `src/kb/sharepoint/`:

| File | What it does |
| --- | --- |
| `config.ts` | Reads `VITE_*` env vars into a typed config, and whether enough is set to attempt a connection. |
| `authMsal.ts` | `msal` mode — Azure AD sign-in via `@azure/msal-browser`, returns a bearer token. |
| `authTraditional.ts` | `traditional` mode — no separate login; fetches a request digest using the browser's existing SharePoint session cookie. |
| `client.ts` | The SharePoint REST wrapper (list/create/update/delete items), picking whichever auth mode is configured. |
| `mapping.ts` | Converts between our `Entry` type and SharePoint list item fields. |
| `sync.ts` | The two operations the Admin UI calls: `pullEntriesFromSharePoint`, `pushEntriesToSharePoint`. |

## Which auth mode should I use?

- **`msal`** — the app is hosted somewhere other than SharePoint itself (e.g.
  Azure Static Web Apps, an internal server, even `localhost` during
  development) and needs its own sign-in flow. Users get a standard
  Microsoft login popup the first time, then it's silent. This is almost
  certainly what you want for a standalone app like this one.
- **`traditional`** — the app is served from an origin SharePoint already
  trusts as the same site (for example, uploaded into the site's own Site
  Assets library, or the origin is on the tenant's CORS allow-list) so the
  browser's existing SharePoint session cookie can be reused directly. No
  separate app registration, but it only works in that narrow hosting
  scenario — most standalone deployments should use `msal` instead.

Set `VITE_SP_AUTH_MODE` to whichever applies. Everything else about the two
modes (the REST calls, the field mapping) is identical.

## 1. Create the SharePoint list

Create a list (any name — put it in `VITE_SP_LIST_NAME`) with these columns.
Simple fields get real columns; anything nested (tags, versions, comments,
verification history, etc.) round-trips as a JSON string in a plain-text
column — see `mapping.ts` for exactly what's serialized.

| Column (internal name) | Type |
| --- | --- |
| `EntryId` | Single line of text — our own id, **not** SharePoint's numeric `Id`. Make it indexed. |
| `EntryType` | Single line of text |
| `Summary` | Multiple lines of text (plain) |
| `Content` | Multiple lines of text (plain) |
| `Category` | Single line of text |
| `Stage` | Single line of text |
| `Portfolio` | Single line of text |
| `Project` | Single line of text |
| `Task` | Single line of text |
| `EntryStatus` | Single line of text (kept off "Status" to avoid clashing with any built-in field) |
| `Visibility` | Single line of text |
| `Author` | Single line of text |
| `Reviewer` | Single line of text |
| `CreatedAtIso` | Single line of text (ISO 8601 — kept separate from SharePoint's own `Created`) |
| `UpdatedAtIso` | Single line of text |
| `Views` | Number |
| `TagsJson`, `TechJson`, `TaggedUsersJson`, `DetailsJson`, `AttachmentsJson`, `EvidenceJson`, `RelatedEntryIdsJson`, `CommentsJson`, `VersionsJson`, `FeedbackJson`, `VerificationJson` | Multiple lines of text (plain), no length limit |

(The list's built-in `Title` column is used too — it's set from `entry.title`.)

## 2. Configure the app

Copy `.env.example` to `.env.local`, then set at minimum:

```
VITE_SP_AUTH_MODE=msal
VITE_SP_SITE_URL=https://yourtenant.sharepoint.com/sites/yoursite
VITE_SP_LIST_NAME=KnowledgeEntries
```

## 3. `msal` mode — register an Azure AD app

1. Azure Portal → **Azure Active Directory → App registrations → New registration**.
2. Redirect URI: **Single-page application (SPA)**, pointing at wherever this
   app is served from (e.g. `http://localhost:5173` for local dev).
3. **API permissions** → add **SharePoint** → **Delegated** → `AllSites.Write`
   (or a narrower permission if your tenant restricts it) → grant admin
   consent if your tenant requires it.
4. Copy the **Application (client) ID** and **Directory (tenant) ID** into
   `VITE_MSAL_CLIENT_ID` / `VITE_MSAL_TENANT_ID`.

`traditional` mode needs no app registration — just make sure you're signed
into SharePoint in the same browser before using Pull/Push.

## 4. Use it

Sign in as an admin, open **Admin**, scroll to the **SharePoint** panel. It
shows whether enough config is present, then:

- **Pull from SharePoint** — fetches every item in the list and upserts it
  into this browser's local entries, matched by `EntryId`.
- **Push to SharePoint** — creates or updates a list item for every local
  entry, matched the same way. It never deletes items in SharePoint, even if
  the local entry was removed here.

Both trigger a sign-in prompt the first time, per the configured mode.

## Going further

This intentionally stops short of making SharePoint the live backing store
for every read and write (every action in `src/kb/store.tsx` — save, revert,
approve, add a comment, and so on — currently updates `localStorage`
synchronously). Turning that into an async, SharePoint-backed store touches
most of the app's state logic and needs a real tenant to develop and test
against — a good next project once the connectivity above is validated
against your actual list.
