import { Category, Entry, Evidence, Feedback, ReviewEvent, User, Verification } from '../types'
import { EntryTypeKey } from '../kb/schema'

export const seedCategories: Category[] = [
  { id: 'eng', name: 'Engineering' },
  { id: 'eng-sharepoint', name: 'SharePoint & M365', parentId: 'eng' },
  { id: 'eng-frontend', name: 'Frontend', parentId: 'eng' },
  { id: 'eng-cloud', name: 'Azure & Cloud', parentId: 'eng' },
  { id: 'eng-data', name: 'Data & AI', parentId: 'eng' },
  { id: 'delivery', name: 'Delivery & Process' },
  { id: 'clients', name: 'Client Projects' },
  { id: 'ops', name: 'Internal Operations' },
]

export const seedPortfolios: string[] = [
  'Client Delivery',
  'Internal Platform',
  'R&D & Innovation',
  'Managed Services',
]

export const seedUsers: User[] = [
  { id: 'u1', name: 'Utkarsh (You)', role: 'admin', team: 'Engineering' },
  { id: 'u2', name: 'Priya Sharma', role: 'editor', team: 'Engineering' },
  { id: 'u3', name: 'Jonas Weber', role: 'viewer', team: 'Delivery' },
  { id: 'u4', name: 'Müller AG — B. Keller', role: 'client', team: 'Client' },
]

let seq = 0
const ts = (iso: string) => new Date(iso).toISOString()
const days = (n: number) => n * 86400000

/** Builds a Verification record from a short description — every date/actor below traces back to something already in the entry's own narrative, nothing invented. */
function verif(o: {
  state: Verification['state']
  verifiedBy?: string
  verifiedAt?: string
  reviewer?: string
  submittedAt?: string
  reviewIntervalDays?: number
  history: { action: ReviewEvent['action']; by: string; at: string; note?: string }[]
}): Verification {
  const nextReviewAt =
    o.verifiedAt && o.reviewIntervalDays
      ? new Date(new Date(ts(o.verifiedAt)).getTime() + days(o.reviewIntervalDays)).toISOString()
      : undefined
  return {
    state: o.state,
    verifiedBy: o.verifiedBy,
    verifiedAt: o.verifiedAt ? ts(o.verifiedAt) : undefined,
    reviewer: o.reviewer,
    submittedAt: o.submittedAt ? ts(o.submittedAt) : undefined,
    reviewIntervalDays: o.reviewIntervalDays,
    nextReviewAt,
    checks:
      o.state === 'verified' || o.state === 'partially_verified'
        ? {
            contentReviewed: true,
            evidenceChecked: o.state === 'verified',
            approachValidated: o.state === 'verified',
          }
        : undefined,
    history: o.history.map((h) => ({ id: `rv${++seq}`, action: h.action, by: h.by, at: ts(h.at), note: h.note })),
  }
}

function make(e: {
  id: string
  type: EntryTypeKey
  title: string
  summary: string
  content?: string
  details?: Entry['details']
  stage?: string
  category: string
  portfolio?: string
  project?: string
  tech?: string[]
  tags?: string[]
  status?: Entry['status']
  visibility?: Entry['visibility']
  author?: string
  reviewer?: string
  createdAt: string
  updatedAt?: string
  views?: number
  relatedEntryIds?: string[]
  comments?: Entry['comments']
  attachments?: Entry['attachments']
  evidence?: Evidence[]
  feedback?: Feedback[]
  verification?: Verification
}): Entry {
  const created = ts(e.createdAt)
  const updated = ts(e.updatedAt ?? e.createdAt)
  return {
    id: e.id,
    type: e.type,
    title: e.title,
    summary: e.summary,
    content: e.content ?? '',
    details: e.details ?? {},
    stage: e.stage,
    category: e.category,
    portfolio: e.portfolio,
    project: e.project,
    tech: e.tech ?? [],
    tags: e.tags ?? [],
    status: e.status ?? 'published',
    visibility: e.visibility ?? 'internal',
    author: e.author ?? 'Utkarsh (You)',
    reviewer: e.reviewer,
    createdAt: created,
    updatedAt: updated,
    attachments: e.attachments ?? [],
    evidence: e.evidence ?? [],
    relatedEntryIds: e.relatedEntryIds ?? [],
    comments: e.comments ?? [],
    feedback: e.feedback ?? [],
    verification: e.verification ?? { state: 'unverified', history: [] },
    versions: [
      {
        id: `sv${++seq}`,
        editedBy: e.author ?? 'Utkarsh (You)',
        editedAt: created,
        summary: 'Created',
        snapshot: {
          title: e.title,
          summary: e.summary,
          content: e.content ?? '',
          details: e.details ?? {},
          stage: e.stage,
          tags: e.tags ?? [],
          tech: e.tech ?? [],
          status: e.status ?? 'published',
          visibility: e.visibility ?? 'internal',
          portfolio: e.portfolio,
          project: e.project,
        },
      },
    ],
    views: e.views ?? 0,
  }
}

const ev = (type: Evidence['type'], label: string, url: string): Evidence => ({
  id: `ev${Math.random().toString(36).slice(2, 8)}`,
  type,
  label,
  url,
})

const fb = (by: string, verdict: Feedback['verdict'], at: string, reason?: Feedback['reason'], note?: string): Feedback => ({
  id: `fb${Math.random().toString(36).slice(2, 8)}`,
  by,
  verdict,
  reason,
  note,
  createdAt: ts(at),
})

export const seedEntries: Entry[] = [
  // ---------- Knowledge transfer ----------
  make({
    id: 'kt-mueller-spfx',
    type: 'kt',
    title: 'KT: Müller AG intranet — SPFx web parts handover',
    summary: 'Handover of the five custom web parts on the Müller AG intranet from Priya to Jonas ahead of parental leave.',
    category: 'clients',
    portfolio: 'Client Delivery',
    project: 'Müller AG Intranet',
    tech: ['spfx', 'sharepoint', 'react'],
    tags: ['mueller-ag', 'handover', 'intranet'],
    stage: 'verified',
    author: 'Priya Sharma',
    createdAt: '2026-07-28T09:00:00Z',
    updatedAt: '2026-08-12T15:20:00Z',
    views: 64,
    relatedEntryIds: ['howto-spfx-new', 'pm-mueller-secret'],
    content:
      'Two 90-minute sessions, recordings linked below. Jonas has shipped one change end-to-end since (ticket MUE-412), so this handover counts as verified.',
    details: {
      handoverFrom: 'Priya Sharma',
      handoverTo: ['Jonas Weber'],
      system: 'Müller AG intranet (tenant muellerag.sharepoint.com)',
      handoverDate: '2026-08-12',
      scope:
        '- All five web parts in `mueller-intranet-webparts` (news, directory, canteen menu, KPI tile, document finder)\n- Build & release pipeline in Azure DevOps (`MUE-Intranet-CI`)\n- Tenant app catalog deployment procedure\n- Secrets live in Key Vault `kv-mue-prod`, access via the `sp-mue-deploy` service principal\n- Local dev setup: `.env.sample` in the repo root, ask IT for the dev tenant invite',
      notCovered:
        '- The **legacy classic pages** under `/sites/intranet-old` — nobody owns these, Müller IT is supposed to retire them in Q4\n- Power Automate flows behind the leave-request form (owned by Müller IT, not us)\n- The Figma design source (client-owned)',
      openRisks:
        '1. The app registration secret expires **2027-02-18** — calendar reminder set, see the postmortem for why this matters.\n2. Document finder web part still uses the deprecated `sp-search` REST endpoint; works, but will need migrating.\n3. No automated tests on the KPI tile — it reads from a hand-maintained Excel file on the client side.',
      contacts: ['Priya Sharma (until 2026-08-15)', 'B. Keller — Müller AG IT lead', 'Utkarsh (escalation)'],
      sessionLinks: [
        'https://hochhuth.sharepoint.com/kt/mueller-session-1',
        'https://hochhuth.sharepoint.com/kt/mueller-session-2',
      ],
    },
    evidence: [
      ev('reference', 'KT session recording — architecture walkthrough', 'https://hochhuth.sharepoint.com/kt/mueller-session-1'),
      ev('reference', 'KT session recording — deployment dry-run', 'https://hochhuth.sharepoint.com/kt/mueller-session-2'),
    ],
    comments: [
      {
        id: 'c-kt1',
        author: 'Utkarsh (You)',
        body: 'Add a note about CORS setup.',
        createdAt: '2026-07-30T08:00:00Z',
      },
    ],
    feedback: [fb('Jonas Weber', 'yes', '2026-08-12T15:18:00Z', undefined, 'Shipped MUE-412 on my own, deployment steps were accurate.')],
    verification: verif({
      state: 'verified',
      verifiedBy: 'Jonas Weber',
      verifiedAt: '2026-08-12T15:18:00Z',
      reviewIntervalDays: 90,
      history: [
        { action: 'submitted', by: 'Priya Sharma', at: '2026-08-12T09:00:00Z', note: 'Handover sessions complete, ready for sign-off.' },
        { action: 'approved', by: 'Jonas Weber', at: '2026-08-12T15:18:00Z', note: 'Shipped MUE-412 on my own, deployment steps were accurate.' },
      ],
    }),
  }),
  make({
    id: 'kt-billing-pipeline',
    type: 'kt',
    title: 'KT: Azure Functions billing export pipeline',
    summary: 'Handing the nightly billing export (Functions + Service Bus + Blob) over to the delivery team for L2 support.',
    category: 'eng-cloud',
    portfolio: 'Internal Platform',
    project: 'Billing Automation',
    tech: ['azure', 'dotnet', 'devops'],
    tags: ['billing', 'handover', 'on-call'],
    stage: 'in_progress',
    status: 'draft',
    reviewer: 'Priya Sharma',
    createdAt: '2026-09-04T08:00:00Z',
    updatedAt: '2026-09-09T16:40:00Z',
    views: 11,
    content: 'Session 1 done (architecture walkthrough). Session 2 — the runbook dry-run — still to schedule.',
    details: {
      handoverFrom: 'Utkarsh (You)',
      handoverTo: ['Jonas Weber', 'Delivery on-call rota'],
      system: 'billing-export (rg-billing-prod)',
      handoverDate: '2026-09-18',
      scope:
        '- `func-billing-export` timer trigger, runs 02:00 CET\n- Service Bus queue `billing-retry` and its dead-letter handling\n- Output container `exports/` in `stbillingprod`\n- Alert rules already route to the on-call Teams channel',
      notCovered: '- Invoice PDF generation (separate team)\n- Anything in the sandbox subscription',
      openRisks:
        '- Dead-letter queue has **no** automated drain; someone has to look at it after a failed night.\n- The retry policy is 3 attempts with a fixed 5-minute delay — a long client-side outage will still drop the export for that day.',
      contacts: ['Utkarsh (You)'],
      sessionLinks: ['https://hochhuth.sharepoint.com/kt/billing-session-1'],
    },
    evidence: [ev('reference', 'KT session recording — architecture walkthrough', 'https://hochhuth.sharepoint.com/kt/billing-session-1')],
  }),

  // ---------- Research / R&D ----------
  make({
    id: 'rd-ai-doc-summaries',
    type: 'research',
    title: 'Research: LLM summarisation of client SharePoint document libraries',
    summary:
      'Can we generate reliable executive summaries of client document sets with a hosted LLM, without shipping client data outside the tenant?',
    category: 'eng-data',
    portfolio: 'R&D & Innovation',
    project: 'AI Assist for Delivery',
    tech: ['ai', 'sharepoint', 'azure'],
    tags: ['llm', 'summarisation', 'data-residency'],
    stage: 'implemented',
    createdAt: '2026-05-14T09:00:00Z',
    updatedAt: '2026-06-30T11:00:00Z',
    views: 138,
    relatedEntryIds: ['dr-ai-search', 'rd-rag-sharepoint'],
    content:
      'Full write-up below. Headline: viable, but only with Azure OpenAI in the EU region and only for documents already classified non-confidential.',
    details: {
      objective:
        'Determine whether an LLM can produce client-presentable summaries of SharePoint document libraries at acceptable cost and with data staying inside EU boundaries.',
      method:
        '1. Sampled 240 documents across three client libraries (contracts, project reports, technical specs).\n2. Extracted text via Graph API + `docx`/`pdf` parsing.\n3. Ran three configurations: Azure OpenAI (Sweden Central), the same model via the public API, and a local 8B model on a dev box.\n4. Two consultants blind-rated 60 summaries each on accuracy and usefulness (1–5).',
      outcome:
        '| Config | Mean usefulness | Mean accuracy | Cost / 1k docs |\n| --- | --- | --- | --- |\n| Azure OpenAI (EU) | 4.3 | 4.1 | ~€14 |\n| Public API | 4.4 | 4.2 | ~€11 |\n| Local 8B | 2.9 | 2.6 | compute only |\n\nThe local model lost the thread on anything over ~8 pages. Both hosted configs were rated usable with light editing. **Hallucinated figures appeared in 4 of 120 hosted summaries** — always numbers pulled from adjacent tables, which is why we require a human check.',
      conclusion:
        'Shipped as an internal-only assist: consultant triggers a summary, edits it, then decides whether it goes to the client. Azure OpenAI EU region only. Never auto-published, never run over anything classified Confidential.\n\n**Next:** measure editing time saved over the next two engagements before offering it as a billable service.',
      period: 'May–Jun 2026',
      collaborators: ['Utkarsh (You)', 'Priya Sharma'],
      effort: '9 person-days',
      references: [
        'https://learn.microsoft.com/azure/ai-services/openai/concepts/data-privacy',
        'https://learn.microsoft.com/graph/api/resources/driveitem',
      ],
    },
    evidence: [
      ev('doc', 'Azure OpenAI data privacy & residency docs', 'https://learn.microsoft.com/azure/ai-services/openai/concepts/data-privacy'),
      ev('doc', 'Microsoft Graph driveItem reference', 'https://learn.microsoft.com/graph/api/resources/driveitem'),
      ev('benchmark', 'Blind-rated summary accuracy — 3 configs, 240 docs', 'https://hochhuth.sharepoint.com/research/ai-doc-summary-benchmark'),
    ],
    comments: [
      {
        id: 'c-rd1',
        author: 'Priya Sharma',
        body: 'The 4/120 hallucination rate is the number clients will ask about. Worth putting on the first slide, not buried.',
        createdAt: '2026-07-01T09:12:00Z',
      },
    ],
    feedback: [fb('Jonas Weber', 'yes', '2026-07-10T10:00:00Z')],
    verification: verif({
      state: 'verified',
      verifiedBy: 'Priya Sharma',
      verifiedAt: '2026-07-02T09:00:00Z',
      reviewIntervalDays: 90,
      history: [
        { action: 'submitted', by: 'Utkarsh (You)', at: '2026-06-30T11:00:00Z' },
        { action: 'approved', by: 'Priya Sharma', at: '2026-07-02T09:00:00Z', note: 'Hallucination rate now called out up front — good to ship.' },
      ],
    }),
  }),
  make({
    id: 'rd-react19-spfx',
    type: 'research',
    title: 'Research: React 19 upgrade path for our SPFx web parts',
    summary: 'SPFx 1.19 still bundles React 17. Working out what it costs us to move, and whether we can move at all.',
    category: 'eng-frontend',
    portfolio: 'R&D & Innovation',
    project: 'Frontend Platform 2027',
    tech: ['react', 'spfx', 'typescript'],
    tags: ['upgrade', 'react19', 'tech-debt'],
    stage: 'in_progress',
    author: 'Priya Sharma',
    reviewer: 'Utkarsh (You)',
    createdAt: '2026-08-25T09:00:00Z',
    updatedAt: '2026-09-08T14:00:00Z',
    views: 47,
    relatedEntryIds: ['dr-spfx-vs-standalone', 'howto-spfx-new'],
    content:
      'Blocking question: SPFx ships its own React in the page. Bringing our own is possible but unsupported and breaks Fluent UI theming.',
    details: {
      objective:
        'Decide whether to (a) wait for Microsoft to ship React 19 in SPFx, (b) bundle our own React per web part, or (c) keep new UI work in standalone apps.',
      method:
        '- Built the same web part three ways in a dev tenant.\n- Measured bundle size, first render, and whether Fluent theming survived.\n- Checked the SPFx roadmap and the community issues for React 19 support signals.',
      outcome:
        '- **Bundling our own React 19** works in isolation but two web parts on one page then load two Reacts — bundle up from 180KB to 430KB gzipped, and `useId` collisions broke Fluent dialogs.\n- Fluent UI v9 needs React 18+; on SPFx-provided React 17 we are stuck on v8.\n- No dated commitment from Microsoft yet.',
      conclusion:
        'Leaning (a) wait + (c) for greenfield. Still to do: check whether the `@microsoft/sp-adaptive-card-extension` route sidesteps this entirely.',
      period: 'Aug 2026 – ongoing',
      collaborators: ['Priya Sharma', 'Utkarsh (You)'],
      effort: '4 person-days so far',
      references: ['https://learn.microsoft.com/sharepoint/dev/spfx/release-notes', 'https://react.dev/blog'],
    },
    evidence: [
      ev('doc', 'SPFx release notes', 'https://learn.microsoft.com/sharepoint/dev/spfx/release-notes'),
      ev('doc', 'React blog — release announcements', 'https://react.dev/blog'),
      ev('benchmark', 'Bundle size comparison — 3 approaches', 'https://hochhuth.sharepoint.com/research/react19-bundle-comparison'),
    ],
    verification: verif({
      state: 'in_review',
      reviewer: 'Utkarsh (You)',
      submittedAt: '2026-09-08T14:00:00Z',
      history: [{ action: 'submitted', by: 'Priya Sharma', at: '2026-09-08T14:00:00Z', note: 'Ready for a second pair of eyes before we commit to option (a).' }],
    }),
  }),
  make({
    id: 'rd-rag-sharepoint',
    type: 'research',
    title: 'Research: RAG over client SharePoint content with Azure AI Search',
    summary: 'Proposal: retrieval-augmented Q&A scoped to one client tenant, with permissions respected at query time.',
    category: 'eng-data',
    portfolio: 'R&D & Innovation',
    project: 'AI Assist for Delivery',
    tech: ['ai', 'azure', 'sharepoint', 'security'],
    tags: ['rag', 'ai-search', 'proposal'],
    stage: 'proposed',
    status: 'draft',
    createdAt: '2026-09-10T07:30:00Z',
    views: 9,
    relatedEntryIds: ['rd-ai-doc-summaries', 'dr-ai-search'],
    content: 'Not started. Parking the shape of it here so we do not re-derive it next time a client asks.',
    details: {
      objective:
        'Establish whether we can answer natural-language questions over a client document set while honouring per-user SharePoint permissions — the part every vendor demo skips.',
      method:
        'Planned: index with Azure AI Search, carry the SharePoint ACL trimming tokens into the index, filter at query time by the caller\'s group membership. Validate with a deliberately mixed-permission test library.',
      conclusion: '',
      period: 'Proposed Q4 2026',
      collaborators: ['Utkarsh (You)'],
      effort: 'est. 10 person-days',
      references: ['https://learn.microsoft.com/azure/search/search-security-trimming-for-azure-search'],
    },
    evidence: [ev('doc', 'Azure AI Search — security trimming', 'https://learn.microsoft.com/azure/search/search-security-trimming-for-azure-search')],
  }),

  // ---------- Decision records ----------
  make({
    id: 'dr-spfx-vs-standalone',
    type: 'decision',
    title: 'Use SPFx for anything embedded in SharePoint; standalone React only when it must live outside',
    summary: 'Settles the recurring "why not just build a React app?" question for in-SharePoint tooling.',
    category: 'eng-frontend',
    portfolio: 'R&D & Innovation',
    project: 'Frontend Platform 2027',
    tech: ['spfx', 'react', 'sharepoint'],
    tags: ['architecture', 'adr'],
    stage: 'accepted',
    createdAt: '2026-03-11T09:00:00Z',
    views: 96,
    relatedEntryIds: ['rd-react19-spfx'],
    details: {
      context:
        'Every second project starts with someone proposing a standalone React app talking to SharePoint via PnPjs, because the SPFx toolchain is dated and painful. We kept re-litigating this per project.',
      decision:
        'If the UI belongs on a SharePoint page, it is an **SPFx web part**. A standalone React app + Azure AD app registration is only justified when the tool must live outside SharePoint entirely (client-facing portals, anything with non-M365 users).',
      alternatives:
        '- **Standalone everywhere:** rejected — we pay for hosting, auth, CORS and theming on every project, and lose SharePoint context for free.\n- **Case by case:** rejected — that is what we were already doing, and it cost a week of debate per project.',
      consequences:
        '- We are tied to the SPFx React version, which is why the React 19 question is currently blocked.\n- Onboarding needs the SPFx toolchain documented properly (see the how-to).\n- Client-facing portals are explicitly out of scope for this rule.',
      deciders: ['Utkarsh (You)', 'Priya Sharma'],
      decidedOn: '2026-03-11',
    },
    feedback: [fb('Priya Sharma', 'yes', '2026-03-12T09:00:00Z')],
    verification: verif({
      state: 'verified',
      verifiedBy: 'Priya Sharma',
      verifiedAt: '2026-03-11T09:00:00Z',
      reviewIntervalDays: 365,
      history: [
        { action: 'submitted', by: 'Utkarsh (You)', at: '2026-03-11T09:00:00Z' },
        { action: 'approved', by: 'Priya Sharma', at: '2026-03-11T09:00:00Z', note: 'Matches what we already do in practice — good to write down.' },
      ],
    }),
  }),
  make({
    id: 'dr-ai-search',
    type: 'decision',
    title: 'Standardise on Azure AI Search for retrieval; no self-hosted vector databases',
    summary: 'One retrieval stack across AI engagements, chosen for EU data residency and because it is already in the client subscription.',
    category: 'eng-data',
    portfolio: 'R&D & Innovation',
    project: 'AI Assist for Delivery',
    tech: ['ai', 'azure', 'data'],
    tags: ['architecture', 'adr', 'vector-search'],
    stage: 'accepted',
    createdAt: '2026-07-02T09:00:00Z',
    views: 58,
    relatedEntryIds: ['rd-ai-doc-summaries', 'rd-rag-sharepoint'],
    details: {
      context:
        'Two AI proposals in parallel each picked a different vector store (one pgvector, one Qdrant on a VM). Neither had an answer for who patches it or where the data sits.',
      decision:
        'Azure AI Search is the default retrieval layer for client AI work. Self-hosted vector stores need a written exception.',
      alternatives:
        '- **pgvector on Azure Postgres:** cheaper, but we own the tuning and there is no ACL trimming story.\n- **Qdrant / Weaviate on a VM:** best raw performance, worst operational fit — it becomes our patching problem inside a client subscription.',
      consequences:
        '- Higher per-month floor cost; hard to justify on very small engagements.\n- Lock-in to Azure, which matches where our clients already are.\n- ACL trimming becomes a first-class option (see the RAG research).',
      deciders: ['Utkarsh (You)'],
      decidedOn: '2026-07-02',
    },
    verification: verif({
      state: 'verified',
      verifiedBy: 'Utkarsh (You)',
      verifiedAt: '2026-07-02T09:00:00Z',
      reviewIntervalDays: 365,
      history: [{ action: 'approved', by: 'Utkarsh (You)', at: '2026-07-02T09:00:00Z', note: 'Sole decider — recording the decision as final.' }],
    }),
  }),

  // ---------- How-tos ----------
  make({
    id: 'howto-spfx-new',
    type: 'howto',
    title: 'Spin up a new SPFx web part project',
    summary: 'From empty folder to a web part rendering in the dev tenant workbench.',
    category: 'eng-sharepoint',
    portfolio: 'Internal Platform',
    tech: ['spfx', 'react', 'typescript'],
    tags: ['onboarding', 'scaffold'],
    stage: 'verified',
    author: 'Priya Sharma',
    createdAt: '2026-06-02T09:00:00Z',
    updatedAt: '2026-08-30T10:30:00Z',
    views: 212,
    relatedEntryIds: ['howto-spfx-deploy', 'dr-spfx-vs-standalone'],
    details: {
      prerequisites:
        '- Node **18.x** (SPFx 1.19 does not work on 22 — use `nvm`)\n- `npm i -g yo @microsoft/generator-sharepoint gulp-cli`\n- Dev tenant access (ask IT for an invite to `hochhuthdev.sharepoint.com`)',
      steps:
        '1. `mkdir my-webpart && cd my-webpart`\n2. `yo @microsoft/sharepoint` — pick **WebPart**, **React**, and *no* Fluent scaffold if you plan to theme it yourself.\n3. `gulp trust-dev-cert` (once per machine).\n4. Set `initialPage` in `config/serve.json` to the dev tenant workbench URL.\n5. `gulp serve --nobrowser`, then open the workbench and add your web part.\n6. Copy the CI pipeline YAML from the template repo into `.azure/pipelines.yml` before your first PR.',
      rollback:
        'Nothing to roll back — but if `gulp serve` fails with a certificate error, re-run `gulp trust-dev-cert` and restart the terminal. On an SSL error in the workbench only, the cert is trusted for the wrong Node version.',
      recommendedWhen: 'Any new SPFx web part, from a greenfield tenant or an existing one already on the standard toolchain.',
      avoidWhen: 'The client tenant is still on classic pages only — see the legacy onboarding article instead.',
      limitations: 'Assumes Node 18 and the standard SPFx 1.19 toolchain. Does not cover Fluent UI v9 (blocked — see the React 19 research).',
      timeEstimate: '20–30 min on a machine that already has Node 18',
      lastVerified: '2026-08-30',
    },
    content: 'Boilerplate lives in the internal `spfx-template` repo — start there if the web part looks like one we have built before.',
    comments: [
      {
        id: 'c-h1',
        author: 'Utkarsh (You)',
        body: 'Added the Node 18 warning after losing an afternoon to it. Please keep it at the top.',
        createdAt: '2026-08-30T10:31:00Z',
      },
    ],
    feedback: [fb('Jonas Weber', 'yes', '2026-08-31T09:00:00Z')],
    verification: verif({
      state: 'verified',
      verifiedBy: 'Utkarsh (You)',
      verifiedAt: '2026-08-30T10:30:00Z',
      reviewIntervalDays: 182,
      history: [
        { action: 'submitted', by: 'Priya Sharma', at: '2026-06-02T09:00:00Z' },
        { action: 'approved', by: 'Utkarsh (You)', at: '2026-08-30T10:30:00Z', note: 'Added the Node 18 warning, re-ran the steps end to end — accurate.' },
      ],
    }),
  }),
  make({
    id: 'howto-spfx-deploy',
    type: 'howto',
    title: 'Deploy an SPFx package to a client tenant app catalog',
    summary: 'The release path we use for every client tenant, including the approval step people forget.',
    category: 'eng-sharepoint',
    portfolio: 'Internal Platform',
    tech: ['spfx', 'devops', 'sharepoint'],
    tags: ['release', 'deployment'],
    stage: 'stale',
    createdAt: '2026-04-18T09:00:00Z',
    updatedAt: '2026-05-02T09:00:00Z',
    views: 154,
    relatedEntryIds: ['howto-spfx-new'],
    details: {
      prerequisites: '- Tenant admin (client side) has to approve API permissions — book this **before** release day\n- Access to the client Azure DevOps project',
      steps:
        '1. `gulp bundle --ship && gulp package-solution --ship`\n2. Upload the `.sppkg` from `sharepoint/solution/` to the tenant app catalog.\n3. Tick **Make this solution available to all sites** only if the web part is genuinely tenant-wide.\n4. In the SharePoint admin centre, go to **Advanced → API access** and approve the pending requests.\n5. Bump the version in `package-solution.json` — SharePoint caches aggressively and will serve the old bundle otherwise.\n6. Hard-refresh a page using the web part and confirm the new version renders.',
      rollback: 'Re-upload the previous `.sppkg` (keep the last two in the release folder) and bump the version again. The app catalog keeps no history you can rely on.',
      recommendedWhen: 'Every client tenant release on the standard SPFx toolchain — this is the one true path, not a suggestion.',
      limitations: 'Step 4 describes the pre-August admin centre layout. The client tenant UI moved and this needs re-verifying against the new layout.',
      timeEstimate: '45 min, plus however long the client admin takes to approve',
      lastVerified: '2026-05-02',
    },
    content: '> Marked **needs review**: the SharePoint admin centre UI moved in the August tenant update, so step 4 may not match what you see.',
    feedback: [fb('Jonas Weber', 'no', '2026-09-01T10:00:00Z', 'outdated', 'Step 4 does not match the current admin centre at all — had to hunt for the new location.')],
    verification: verif({
      state: 'needs_update',
      verifiedBy: 'Utkarsh (You)',
      verifiedAt: '2026-05-02T09:00:00Z',
      reviewIntervalDays: 90,
      history: [
        { action: 'submitted', by: 'Utkarsh (You)', at: '2026-04-18T09:00:00Z' },
        { action: 'approved', by: 'Utkarsh (You)', at: '2026-05-02T09:00:00Z' },
        { action: 'marked_needs_update', by: 'Jonas Weber', at: '2026-09-01T10:00:00Z', note: 'Step 4 does not match the current admin centre layout.' },
      ],
    }),
  }),

  // ---------- Snippets ----------
  make({
    id: 'snip-pnp-batch',
    type: 'snippet',
    title: 'PnPjs: batch list item updates instead of a loop',
    summary: 'Turns 200 sequential REST calls into one request. The difference between 40 seconds and under two.',
    category: 'eng-sharepoint',
    portfolio: 'Internal Platform',
    tech: ['spfx', 'typescript', 'sharepoint'],
    tags: ['pnpjs', 'performance'],
    createdAt: '2026-06-21T09:00:00Z',
    views: 187,
    details: {
      language: 'TypeScript',
      runtime: 'PnPjs 4.x, SPFx 1.19',
      code: `import { spfi } from "@pnp/sp";
import "@pnp/sp/batching";
import "@pnp/sp/lists";
import "@pnp/sp/items";

const sp = spfi(/* your context */);
const list = sp.web.lists.getByTitle("Projects");

const [batchedSp, execute] = await sp.batched();
const batchedList = batchedSp.web.lists.getByTitle("Projects");

for (const row of rows) {
  batchedList.items.getById(row.id).update({ Status: row.status });
}

await execute();`,
      usage:
        'Use it anywhere you are updating more than ~5 items. Note the batched client is a *separate* instance — calls on the original `sp` are not part of the batch, which is the mistake everyone makes first.',
      gotchas:
        '- A batch is capped at 100 requests server-side; chunk larger sets.\n- One failing item does **not** roll the batch back. Check each response if partial success matters.\n- `getById().update()` inside a batch still needs the item to exist — a deleted id fails that one request only.',
      recommendedWhen: 'Updating more than ~5 list items in one operation.',
      avoidWhen: 'A single item update, or when you need all-or-nothing semantics — batching does not roll back partial failures.',
    },
    feedback: [fb('Jonas Weber', 'yes', '2026-07-01T09:00:00Z')],
    verification: verif({
      state: 'verified',
      verifiedBy: 'Priya Sharma',
      verifiedAt: '2026-06-25T09:00:00Z',
      history: [
        { action: 'submitted', by: 'Utkarsh (You)', at: '2026-06-21T09:00:00Z' },
        { action: 'approved', by: 'Priya Sharma', at: '2026-06-25T09:00:00Z', note: 'Used this on the Müller AG project, confirmed the numbers.' },
      ],
      // no reviewIntervalDays: a stable code pattern doesn't need a scheduled re-check
    }),
  }),
  make({
    id: 'snip-kql-failed-funcs',
    type: 'snippet',
    title: 'KQL: failed Azure Function executions in the last 24h, grouped by cause',
    summary: 'First query to run when the on-call channel lights up.',
    category: 'eng-cloud',
    portfolio: 'Managed Services',
    project: 'Billing Automation',
    tech: ['azure', 'data', 'devops'],
    tags: ['kql', 'monitoring', 'on-call'],
    createdAt: '2026-08-07T09:00:00Z',
    views: 73,
    details: {
      language: 'KQL',
      runtime: 'Application Insights',
      code: `requests
| where timestamp > ago(24h)
| where success == false
| extend fn = tostring(customDimensions["FunctionName"])
| summarize failures = count(),
            firstSeen = min(timestamp),
            lastSeen  = max(timestamp)
        by fn, resultCode
| order by failures desc`,
      usage: 'Run it in the Logs blade of the Function App\'s Application Insights resource. Widen `ago(24h)` if the incident started earlier.',
      gotchas: '- `customDimensions["FunctionName"]` is missing on cold-start failures — those show up with an empty `fn`.\n- Sampling is on by default at high volume, so `failures` is an estimate, not a count.',
    },
  }),

  // ---------- Postmortem ----------
  make({
    id: 'pm-mueller-secret',
    type: 'postmortem',
    title: 'Müller AG intranet outage — expired app registration secret',
    summary: 'Four web parts showed an empty state for 6 hours because a client-side app registration secret expired with no alerting.',
    category: 'clients',
    portfolio: 'Client Delivery',
    project: 'Müller AG Intranet',
    tech: ['azure', 'security', 'spfx'],
    tags: ['mueller-ag', 'incident', 'secrets'],
    stage: 'closed',
    createdAt: '2026-02-19T08:00:00Z',
    updatedAt: '2026-03-04T12:00:00Z',
    views: 121,
    relatedEntryIds: ['kt-mueller-spfx'],
    details: {
      severity: 'Sev2 — major',
      incidentDate: '2026-02-18',
      impact:
        'All ~900 Müller AG staff saw empty news, directory, canteen and KPI web parts from 07:10 to 13:25 CET. No data loss. The client noticed before we did, which is the actual problem here.',
      timeline:
        '- **07:10** — secret expires, Graph calls start returning 401.\n- **07:40** — first user report to Müller IT.\n- **09:55** — Müller IT emails us. No alert had fired on our side.\n- **10:30** — cause identified from Application Insights 401s.\n- **12:50** — new secret created; deployment blocked waiting on tenant admin approval.\n- **13:25** — deployed, web parts recovered.',
      rootCause:
        'The app registration client secret had a 24-month expiry set at project start in 2024 and was never tracked anywhere. Nothing monitored token failures, so the first signal was a human complaining.',
      actionItems:
        '1. ~~Alert rule on 401/403 rates per web part~~ — done 2026-02-24.\n2. ~~Move all client secrets to Key Vault with expiry monitoring~~ — done 2026-03-02.\n3. ~~Expiry dates recorded in the handover record for every client system~~ — done, now a required field on KT entries.\n4. Prefer certificate credentials or managed identity on new registrations — **standing guidance**, not yet enforced.',
    },
    content:
      'The fix was quick once found. The six hours were: nobody was alerted, and the redeploy needed a client admin who was in a meeting. Both addressed.',
    verification: verif({
      state: 'verified',
      verifiedBy: 'Utkarsh (You)',
      verifiedAt: '2026-03-04T12:00:00Z',
      // no scheduled re-review: a closed incident record is a historical fact, not a living doc
      history: [
        { action: 'submitted', by: 'Utkarsh (You)', at: '2026-02-20T09:00:00Z' },
        { action: 'approved', by: 'Utkarsh (You)', at: '2026-03-04T12:00:00Z', note: 'All four action items closed, root cause confirmed.' },
      ],
    }),
  }),

  // ---------- Articles ----------
  make({
    id: 'art-client-access',
    type: 'article',
    title: 'What clients can see in our knowledge base',
    summary: 'The access rules for client accounts, in plain language — safe to share with clients.',
    category: 'clients',
    portfolio: 'Client Delivery',
    tech: ['process', 'security'],
    tags: ['policy', 'clients', 'access'],
    visibility: 'client',
    createdAt: '2026-05-10T09:00:00Z',
    views: 34,
    content:
      '## What you can see\n\nYour account sees only entries we have explicitly marked **client-visible** and **published**. That is normally:\n\n- documentation for systems we built for you\n- handover and training material for your team\n- release notes and access policies\n\n## What you cannot see\n\n- internal drafts and archived material\n- our internal discussion threads and edit history\n- anything relating to other clients\n- internal research that has not been cleared for sharing\n\n## Asking for access\n\nIf something you need is not visible, ask your engagement lead — we can mark individual entries client-visible on request.',
    details: { appliesTo: 'All client accounts' },
    feedback: [fb('Müller AG — B. Keller', 'yes', '2026-05-20T09:00:00Z')],
    verification: verif({
      state: 'verified',
      verifiedBy: 'Utkarsh (You)',
      verifiedAt: '2026-05-10T09:00:00Z',
      reviewIntervalDays: 182,
      history: [{ action: 'approved', by: 'Utkarsh (You)', at: '2026-05-10T09:00:00Z', note: 'Client-visible policy — reviewed before publishing externally.' }],
    }),
  }),
  make({
    id: 'art-versioning',
    type: 'article',
    title: 'How we version and release SPFx solutions',
    summary: 'Version numbering, release branches, and what goes in release notes.',
    category: 'delivery',
    portfolio: 'Internal Platform',
    tech: ['spfx', 'devops', 'process'],
    tags: ['release', 'versioning', 'process'],
    createdAt: '2026-01-15T09:00:00Z',
    updatedAt: '2026-06-11T09:00:00Z',
    views: 88,
    relatedEntryIds: ['howto-spfx-deploy'],
    content:
      '## Numbering\n\n`MAJOR.MINOR.PATCH.BUILD` in `package-solution.json`. SharePoint compares these as four integers, so **never** use a pre-release suffix — it will not install.\n\n- **MAJOR** — breaking change to a web part\'s properties or stored data\n- **MINOR** — new web part or new feature\n- **PATCH** — bug fix\n- **BUILD** — set by CI, never by hand\n\n## Branches\n\n`main` is always deployable. Release branches (`release/1.4`) exist only when a client is pinned to an old version and needs a backport.\n\n## Release notes\n\nEvery release gets an entry here as a knowledge article, tagged `release` and the client tag. Include: version, what changed, whether a tenant admin approval is needed, and the rollback version.',
    details: { appliesTo: 'All SPFx client solutions' },
    verification: verif({
      state: 'partially_verified',
      verifiedBy: 'Priya Sharma',
      verifiedAt: '2026-06-11T09:00:00Z',
      reviewIntervalDays: 182,
      history: [
        {
          action: 'partially_approved',
          by: 'Priya Sharma',
          at: '2026-06-11T09:00:00Z',
          note: 'Numbering and branching confirmed. Release-notes process still needs a real example to point to.',
        },
      ],
    }),
  }),
  make({
    id: 'art-archived-onboarding',
    type: 'article',
    title: 'Onboarding: classic SharePoint customisation (retired)',
    summary: 'Superseded by the SPFx how-to. Kept for the two clients still on classic pages.',
    category: 'eng-sharepoint',
    portfolio: 'Internal Platform',
    tech: ['sharepoint'],
    tags: ['onboarding', 'legacy'],
    status: 'archived',
    createdAt: '2025-09-01T09:00:00Z',
    updatedAt: '2026-03-12T09:00:00Z',
    views: 19,
    content: 'Archived. Use the SPFx how-to instead unless you are working on `/sites/intranet-old` for Müller AG.',
    details: { appliesTo: 'Legacy classic sites only' },
    verification: verif({
      state: 'deprecated',
      verifiedBy: 'Utkarsh (You)',
      verifiedAt: '2026-03-12T09:00:00Z',
      history: [{ action: 'deprecated', by: 'Utkarsh (You)', at: '2026-03-12T09:00:00Z', note: 'Superseded by the SPFx how-to — kept only for the two remaining classic-page clients.' }],
    }),
  }),
]
