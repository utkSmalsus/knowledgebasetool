Paste this into Claude Code once you've unzipped `hochhuth-kb-source.zip` into a folder and opened it there:

---

I have a Vite + React + TypeScript + Tailwind + React Router prototype for an internal/client-facing knowledge base and R&D log (see SPEC.md for the full feature spec — data model, screens, roles). It currently runs entirely on in-memory mock data (`src/data/mockData.ts`, wired up via `src/context/AppContext.tsx`) with no backend.

First: run `npm install` and `npm run dev` and confirm it starts cleanly — dependencies were never installed in the environment that generated this code, so fix any version mismatches you hit.

Then help me evolve it in this order:
1. Keep the current mock-data version working as a `--mock` mode or a feature flag, so I always have a working demo even while the backend is being built.
2. Replace the in-memory data layer with a real backend. I haven't picked one yet — options on the table are (a) a small Node/Express or similar API backed by Postgres, (b) Azure Static Web Apps + Azure Functions + Cosmos DB or Postgres, since my team already works in the Microsoft/Azure ecosystem. Ask me which before you start, and design `src/context/AppContext.tsx`'s interface so swapping the data source doesn't require touching the page components.
3. Add real authentication: internal staff via our Azure AD tenant, external clients via a separate flow (Azure AD B2B guest, or Azure AD B2C — help me weigh these) — the key requirement is that a client account can only ever see entries with `visibility: 'client'` AND `status: 'published'`, enforced server-side, not just hidden in the UI.
4. Add real file attachment upload/storage (currently just a placeholder field).
5. Replace the demo-only "role switcher" dropdown in the top bar with real session-based role detection.
6. Add basic tests around the visibility-filtering logic (client role must never see internal-only or draft/archived entries) since that's the one piece of this app that's a security boundary, not just UX.

Don't add any AI/semantic-search features — this is explicitly meant to be a plain structured tool, no AI.
