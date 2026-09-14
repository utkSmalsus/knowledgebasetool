# SharePoint connectivity

This app's data lives in `localStorage` by default — nothing below changes
that. What's here is a connectivity layer, wired into **Admin → SharePoint**,
that can **provision** the target list and its columns, **pull** entries from
SharePoint into the browser, and **push** local entries back out, on demand.
It's a bridge, not a replacement for the local store — see "Going further" at
the bottom if you want SharePoint to become the live source of truth for
every read/write.

The code lives in `src/kb/sharepoint/`:

| File | What it does |
| --- | --- |
| `config.ts` | Reads `VITE_*` env vars into a typed config, and whether enough is set to attempt a connection. |
| `authMsal.ts` | `msal` mode — Azure AD sign-in via `@azure/msal-browser` (redirect-based), returns a bearer token. |
| `authTraditional.ts` | `traditional` mode — no separate login; fetches a request digest using the browser's existing SharePoint session cookie. |
| `client.ts` | The SharePoint REST wrapper — list/create/update/delete items, create the list and its columns, resolve lookups and users — picking whichever auth mode is configured. |
| `provision.ts` | Defines the knowledgebase list's column schema and creates whatever's missing (idempotent). |
| `mapping.ts` | Converts between our `Entry` type and SharePoint list item fields. |
| `sync.ts` | The operations the Admin UI calls: `pullEntriesFromSharePoint`, `pushEntriesToSharePoint`. |

## Which auth mode should I use?

- **`msal`** — the app is hosted somewhere other than SharePoint itself (e.g.
  Azure Static Web Apps, an internal server, even `localhost` during
  development) and needs its own sign-in flow. Users get a standard
  Microsoft sign-in redirect the first time, then it's silent. This is
  almost certainly what you want for a standalone app like this one — it's
  also the only mode that works from `localhost` during development, since
  SharePoint Online won't accept cookie-based cross-origin requests from
  there.
- **`traditional`** — the app is served from an origin SharePoint already
  trusts as the same site (for example, uploaded into the site's own Site
  Assets library, or the origin is on the tenant's CORS allow-list) so the
  browser's existing SharePoint session cookie can be reused directly. No
  separate app registration, but it only works in that narrow hosting
  scenario.

Set `VITE_SP_AUTH_MODE` to whichever applies. Everything else about the two
modes (the REST calls, the field mapping) is identical.

## 1. Configure the app

Copy `.env.example` to `.env.local`, then set:

```
VITE_SP_AUTH_MODE=msal
VITE_SP_SITE_URL=https://yourtenant.sharepoint.com/sites/yoursite
VITE_SP_LIST_NAME=knowledgebase
VITE_MSAL_CLIENT_ID=...
VITE_MSAL_TENANT_ID=...
VITE_MSAL_REDIRECT_URI=http://localhost:5173
```

### `msal` mode — Azure AD app registration

1. Azure Portal → **App registrations → New registration**.
2. **Authentication** → **Add a platform → Single-page application** →
   redirect URI matching wherever this app is served from (e.g.
   `http://localhost:5173` for local dev).
3. **API permissions** → **Add a permission → APIs my organization uses** →
   search for **"SharePoint"** (the classic API — **not** "Microsoft Graph",
   which is a different token audience and won't work for these direct
   `_api/web` REST calls) → **Delegated permissions** → `AllSites.Write` →
   **Grant admin consent**.
4. Copy the **Application (client) ID** and **Directory (tenant) ID** into
   `VITE_MSAL_CLIENT_ID` / `VITE_MSAL_TENANT_ID`.

`traditional` mode needs no app registration — just make sure you're signed
into SharePoint in the same browser before using Provision/Pull/Push.

## 2. Provision the list

Open **Admin → SharePoint** and click **Provision "knowledgebase" list**.
Safe to click more than once — it only creates the list (if missing) and
whichever columns from `provision.ts` aren't already there. It never touches
`Master Tasks`, only reads that list's id to wire up the two Lookup columns
below.

### The schema it creates

Simple fields get real columns; anything nested (tags, versions, comments,
verification history, evidence, etc.) round-trips as a JSON string in a Note
column — see `mapping.ts` for exactly what's serialized into each.

| Column (internal name) | Type | Notes |
| --- | --- | --- |
| `Title` | (built-in) | Set from `entry.title`. |
| `EntryId` | Single line of text | Our own id, **not** SharePoint's numeric `Id`. |
| `EntryType`, `Category`, `Stage`, `EntryStatus`, `Visibility`, `Author`, `Reviewer` | Single line of text | `EntryStatus` is kept off "Status" to avoid clashing with any built-in field. |
| `Summary`, `Content` | Multiple lines of text (plain) | |
| `CreatedAtIso`, `UpdatedAtIso` | Single line of text | ISO 8601 — kept separate from SharePoint's own `Created`/`Modified`. |
| `Views` | Number | |
| `Portfolio` | **Lookup → Master Tasks** (`ShowField=Title`) | Our app's own picker filters the options to Master Tasks rows where `Item_x0020_Type eq 'Component'` — the column itself can't filter by a second field, so this happens in the app, not the schema. |
| `Project` | **Lookup → Master Tasks** (`ShowField=Title`) | Same idea, filtered to `Item_x0020_Type eq 'Project'`. |
| `Task` | Single line of text | A ticket/reference id, kept as free text. |
| `TaskListTitle`, `TaskItemId` | Single line of text, Number | Reserved for linking to an *existing* task item — tasks live across several separate per-team "Tasks list"-type lists (`ILF`, `QA`, `Offshore Tasks`, etc.; same pattern the Meeting tool uses), which a single Lookup column can't span. Left blank until a cross-list task picker resolves them; `Task` (above) is what's shown/searched today. |
| `TaggedUsers` | Person or Group, allow multiple | Native people field, resolved via each local `User.upn` (see below). |
| `TagsJson`, `TechJson`, `DetailsJson`, `AttachmentsJson`, `EvidenceJson`, `RelatedEntryIdsJson`, `CommentsJson`, `VersionsJson`, `FeedbackJson`, `VerificationJson` | Multiple lines of text (plain), no length limit | JSON-serialized. |

### Why Portfolio/Project point at "Master Tasks"

This tenant already has a full portfolio/project hierarchy living in a list
called **Master Tasks** (`Component` → `SubComponent` → `Feature` for the
portfolio branch, `Project` → `Sprint`/`Cycle` for the project branch,
distinguished by the `Item_x0020_Type` field). Rather than duplicating that
data, our Portfolio/Project columns are real Lookup columns into it — pick
`Provision`, and they're wired up automatically. Nothing is ever created or
changed in Master Tasks itself.

### Tagging people

`TaggedUsers` resolves against real SharePoint accounts via
`ensureSiteUser`, which needs each local `User`'s `upn` (email/login) —
see `src/types.ts`. The seed/demo users don't have real UPNs (they're
fictional), so tagging them won't resolve to an actual SharePoint account
until real UPNs are set.

## 3. Use it

- **Pull from SharePoint** — fetches every item in the list and upserts it
  into this browser's local entries, matched by `EntryId`.
- **Push to SharePoint** — creates or updates a list item for every local
  entry, matched the same way. Resolves each entry's `portfolio`/`project`
  string against Master Tasks by title (leaving the Lookup blank if nothing
  matches — it never creates rows there). It never deletes items in
  SharePoint, even if the local entry was removed here.

All three (Provision/Pull/Push) trigger a sign-in prompt the first time, per
the configured auth mode.

### Inspecting real data before changing the mapping

Two read-only tools in the same Admin panel:

- **Inspect a list's schema** — real columns (name, type, lookup target) for
  any list by title.
- **Sample a field's real values** — distinct values (with counts) of one
  field across every item in a list, e.g. what `Item_x0020_Type` actually
  contains, instead of guessing from application code.

## Going further

This intentionally stops short of making SharePoint the live backing store
for every read and write (every action in `src/kb/store.tsx` — save, revert,
approve, add a comment, and so on — currently updates `localStorage`
synchronously). Turning that into an async, SharePoint-backed store touches
most of the app's state logic. Also still open: a cross-list task picker
that actually searches the various per-team Tasks lists and fills in
`TaskListTitle`/`TaskItemId` (today `Task` is free text only), and real UPNs
for the demo users so tagging resolves to actual accounts.
