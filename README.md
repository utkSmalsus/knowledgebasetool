# Hochhuth Knowledge Base — prototype

React + TypeScript + Vite + Tailwind + React Router. Frontend-only prototype with an in-memory mock data layer (see `src/data/mockData.ts`) — no backend/auth wired up yet, by design, so you can evaluate the UI and feature set before committing to a hosting/backend approach.

## Run it

```bash
npm install
npm run dev
```

(`npm install` could not be run in the sandbox this was built in — its network access to the npm registry was blocked — so dependencies have not been verified to install cleanly. They're standard, current versions as of Sept 2026 and should install fine on a normal machine or in Claude Code.)

## Where things are

- `src/types.ts` — data model (Entry, Category, User, statuses)
- `src/data/mockData.ts` — seed content (edit or replace this to change what you see)
- `src/context/AppContext.tsx` — in-memory state + role-based visibility filtering
- `src/components/Layout.tsx` — sidebar/topbar shell, role switcher (demo only), dark mode toggle
- `src/pages/` — Dashboard, Browse (search/filter), EntryDetail, EntryForm (create/edit), Admin

## What's mocked vs real

Real: all UI, filtering/search logic, role-based visibility logic (client role only sees `visibility: 'client'` + `status: 'published'` entries), form validation, in-memory CRUD.

Mocked / not yet built: authentication, a real database/API, file upload storage, email notifications. See `SPEC.md` for the full feature spec and what's deferred to the backend decision.

## Continuing this in Claude Code

See the prompt provided alongside this project for a ready-to-paste continuation instruction.
