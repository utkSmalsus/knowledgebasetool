# Hochhuth Consulting — Knowledge Base & R&D Repository
Spec v1 — prototype scope

## Note on research
Live web search was unavailable in this session (search tool was blocked by the network proxy), so this spec is built from well-established patterns used by mainstream internal-KB and R&D/lessons-learned systems (Confluence, Notion, BookStack, Wiki.js, Document360, GitLab/Azure DevOps wikis) rather than fresh search results. These patterns are stable and not time-sensitive, but flagging it since you asked for research first.

## 1. What it does
A single system that captures two kinds of knowledge side by side:
- **Company knowledge articles** — how-tos, policies, processes, project write-ups, client-facing documentation.
- **R&D / research entries** — what was researched, what was implemented, and what the outcome was, with a clear status per initiative.

Every entry can be marked **Internal only** or **Visible to clients**, so the same system safely serves both audiences (per your requirement: your company + your clients, no AI features, just a structured tool).

## 2. Core data model
**Entry** (shared base fields)
- id, title, summary, content (rich text)
- type: `Article` | `Research`
- category (hierarchical, e.g. Engineering > Backend), tags (free-form)
- status: Draft | Published | Archived
- visibility: Internal | Client-visible
- author, createdAt, updatedAt
- attachments (files/images/PDF placeholders)
- relatedEntries (links to other entries)
- version history (who changed what, when; revert)
- comments (internal discussion thread — never shown to clients)

**Research entry adds:**
- Objective / hypothesis
- Method / approach
- Outcome / result
- Research status: Proposed → In Progress → Implemented | Rejected | On Hold
- Project/initiative name, date range, collaborators
- Reference links (external sources, papers, vendor docs)
- Conclusion & next steps

**Users & roles**
- Admin — full control (users, categories, all entries)
- Editor — create/edit entries in assigned categories
- Viewer — internal, read-only
- Client — external, read-only, sees **only** entries marked Client-visible

## 3. How it works
1. Editors/Admins create an entry, pick type (Article or Research), fill the relevant fields, tag it, set visibility, and publish.
2. Everyone browses via a searchable, filterable list (by category, tag, type, status, visibility, author, date).
3. Opening an entry shows full content, metadata, attachments, related entries, and (internal users only) the comment thread and version history.
4. Admins manage the category tree and user roles from an Admin area.
5. Client-visible entries are exactly what external client accounts can see when they log in — everything else is invisible to them, not just hidden in the UI.

No AI, no chatbot, no semantic search — just structured content, tags, and filters, per your requirement.

## 4. Screens
- **Dashboard** — recent activity, counts by type/status, quick links, global search bar.
- **Browse & Search** — left-hand filter panel (type, category, tag, status, visibility, date) + result list.
- **Entry Detail** — full content, metadata sidebar, related entries, comments (internal), version history (internal).
- **New / Edit Entry** — type toggle (Article/Research) reveals the right fields; markdown editor with live preview; tag input; visibility switch.
- **Admin → Categories & Tags** — manage the taxonomy.
- **Admin → Users & Roles** — manage who has Admin/Editor/Viewer/Client access.
- **Activity Log** — audit trail of who created/edited/published what (internal only).

## 5. Look & feel
Clean, professional, low-noise: left sidebar navigation (logo, Dashboard, Browse, R&D Log, Categories, Admin), top bar with global search + "New Entry" button + current-role indicator, card/table hybrid list views, color-coded status badges (Proposed = gray, In Progress = blue, Implemented = green, Rejected = red, On Hold = amber), a small lock/globe badge for Internal vs Client-visible. Light theme by default with a dark-mode toggle.

## 6. Tech stack for this prototype
React + TypeScript + Vite, Tailwind CSS, React Router. Data layer is in-memory/mock for now (seeded sample entries) so you can evaluate the UI and feature set before any backend/hosting decision is made — that decision (SharePoint vs. custom Azure app vs. SaaS, from our earlier discussion) plugs in later without changing these screens.

## 7. Explicitly out of scope for v1 prototype
Real authentication, a real database/API, file storage, email notifications, AI/semantic search — all deferred until the hosting/backend approach is chosen.
