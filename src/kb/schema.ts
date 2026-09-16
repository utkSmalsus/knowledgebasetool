// The whole point of this file: adding a new kind of knowledge = one entry in
// ENTRY_TYPES. No new components, no `if (type === ...)` anywhere in the app.
// Forms, detail pages, filters and badges all render from these definitions.
//
// Taxonomy: exactly six top-level types, chosen so every entry answers one
// question — "what is the PURPOSE of this knowledge?" — without overlap:
//   Knowledge Transfer -> hand a system/project off to someone else
//   Research           -> investigate something (its own Topic field says what domain)
//   Decision           -> explain why we chose something
//   Solution           -> explain how we solved a problem
//   Runbook            -> explain how to perform an operational task
//   Skill              -> a reusable skill file, tagged with what it's for
// Don't add a 7th type for an edge case — stretch the closest of these six
// plus tags/category instead. See src/kb/migrate.ts for how the previous
// (more fragmented) taxonomy maps onto this one.

export type Tone = 'gray' | 'blue' | 'green' | 'red' | 'amber' | 'violet' | 'teal'

export type FieldKind =
  | 'text' // single line
  | 'textarea' // short prose
  | 'markdown' // long prose, rendered as markdown
  | 'select'
  | 'date'
  | 'list' // comma separated -> string[]
  | 'links' // one URL per line -> string[]
  | 'code'
  | 'person' // one real team member, picked from SharePoint Task Users (falls back to free text when SharePoint isn't configured)
  | 'people' // same, multi-select -> string[]

export interface FieldDef {
  key: string
  label: string
  kind: FieldKind
  hint?: string
  options?: string[]
  required?: boolean
  half?: boolean // sits in a 2-up grid instead of full width
}

export interface Stage {
  key: string
  label: string
  tone: Tone
}

export interface EntryTypeDef {
  label: string
  plural: string
  monogram: string
  tone: Tone
  blurb: string
  stageLabel?: string
  stages?: Stage[]
  fields: FieldDef[]
}

const RESEARCH_FIELDS: FieldDef[] = [
  { key: 'topic', label: 'Topic', kind: 'text', required: true, hint: 'e.g. AI, Azure, SharePoint — what domain this research is about' },
  { key: 'question', label: 'Question / hypothesis', kind: 'markdown', required: true, hint: 'What were you trying to find out?' },
  { key: 'method', label: 'Methodology', kind: 'markdown', hint: 'How did you investigate it?' },
  { key: 'findings', label: 'Findings', kind: 'markdown', hint: 'What did you actually find?' },
  { key: 'conclusion', label: 'Conclusion & next steps', kind: 'markdown' },
  { key: 'period', label: 'Time period', kind: 'text', half: true, hint: 'e.g. Aug–Sep 2026' },
  { key: 'collaborators', label: 'Collaborators', kind: 'list', half: true },
  { key: 'effort', label: 'Effort spent', kind: 'text', half: true, hint: 'e.g. 6 person-days' },
]

const RESEARCH_STAGES: Stage[] = [
  { key: 'proposed', label: 'Proposed', tone: 'gray' },
  { key: 'in_progress', label: 'In progress', tone: 'blue' },
  { key: 'implemented', label: 'Implemented', tone: 'green' },
  { key: 'rejected', label: 'Rejected', tone: 'red' },
  { key: 'on_hold', label: 'On hold', tone: 'amber' },
]

export const ENTRY_TYPES = {
  kt: {
    label: 'Knowledge Transfer',
    plural: 'Knowledge Transfer',
    monogram: 'KT',
    tone: 'blue',
    blurb: 'Handing a system or project off to someone else.',
    fields: [
      { key: 'handoverFrom', label: 'Handed over by', kind: 'person', half: true },
      { key: 'handoverTo', label: 'Handed over to', kind: 'people', half: true },
      { key: 'system', label: 'System / project', kind: 'text', half: true },
      { key: 'handoverDate', label: 'Handover date', kind: 'date', half: true },
      { key: 'scope', label: 'What is covered', kind: 'markdown' },
      { key: 'notCovered', label: 'What is NOT covered', kind: 'markdown' },
      { key: 'openRisks', label: 'Open risks / known issues', kind: 'markdown' },
      { key: 'contacts', label: 'Escalation contacts', kind: 'people' },
      { key: 'sessionLinks', label: 'Recordings & session notes', kind: 'links' },
    ],
  },

  research: {
    label: 'Research',
    plural: 'Research',
    monogram: 'R',
    tone: 'teal',
    blurb: 'Technical investigation, experiments and findings — any domain, say which in Topic.',
    stageLabel: 'Research status',
    stages: RESEARCH_STAGES,
    fields: RESEARCH_FIELDS,
  },

  decision: {
    label: 'Decision',
    plural: 'Decisions',
    monogram: 'D',
    tone: 'gray',
    blurb: 'An important decision and the reasoning behind it.',
    stageLabel: 'Decision status',
    stages: [
      { key: 'proposed', label: 'Proposed', tone: 'gray' },
      { key: 'accepted', label: 'Accepted', tone: 'green' },
      { key: 'superseded', label: 'Superseded', tone: 'amber' },
      { key: 'rejected', label: 'Rejected', tone: 'red' },
    ],
    fields: [
      { key: 'context', label: 'Context / problem', kind: 'markdown', required: true },
      { key: 'decision', label: 'Decision', kind: 'markdown', required: true },
      { key: 'alternatives', label: 'Alternatives considered', kind: 'markdown' },
      { key: 'consequences', label: 'Consequences / trade-offs', kind: 'markdown' },
      { key: 'deciders', label: 'Deciders', kind: 'list', half: true },
      { key: 'decidedOn', label: 'Decided on', kind: 'date', half: true },
    ],
  },

  solution: {
    label: 'Solution',
    plural: 'Solutions',
    monogram: 'S',
    tone: 'green',
    blurb: 'A problem, its fix, and the proven pattern that solved it.',
    fields: [
      { key: 'problem', label: 'Problem', kind: 'markdown', required: true, hint: 'What was going wrong?' },
      { key: 'rootCause', label: 'Root cause', kind: 'markdown' },
      { key: 'resolution', label: 'Solution', kind: 'markdown', required: true, hint: 'What fixed it?' },
      { key: 'code', label: 'Code', kind: 'code' },
      { key: 'verification', label: 'How we verified it worked', kind: 'markdown' },
      { key: 'recommendedWhen', label: 'Recommended when', kind: 'markdown' },
      { key: 'avoidWhen', label: 'Avoid when', kind: 'markdown', hint: 'When to reach for something else instead' },
    ],
  },

  runbook: {
    label: 'Runbook',
    plural: 'Runbooks',
    monogram: 'RB',
    tone: 'amber',
    blurb: 'A repeatable, step-by-step operational procedure.',
    fields: [
      { key: 'prerequisites', label: 'Prerequisites', kind: 'markdown', hint: 'Access, tooling or approvals needed first' },
      { key: 'steps', label: 'Steps', kind: 'markdown', required: true, hint: 'Numbered list — one action per step' },
      { key: 'verification', label: 'How to verify it worked', kind: 'markdown' },
      { key: 'rollback', label: 'Rollback / notes', kind: 'markdown' },
    ],
  },

  skill: {
    label: 'Skill',
    plural: 'Skills',
    monogram: 'SK',
    tone: 'violet',
    blurb: 'A reusable skill file — upload it as an attachment and say what it is for.',
    fields: [
      { key: 'skillName', label: 'Skill name', kind: 'text', required: true, half: true, hint: 'What is this skill for?' },
      { key: 'skillDomain', label: 'Domain', kind: 'text', half: true, hint: 'e.g. SPFx, Azure, Data — where it applies' },
      { key: 'usage', label: 'How to use it', kind: 'markdown', hint: 'What it does and when to reach for it' },
    ],
  },
} satisfies Record<string, EntryTypeDef>

export type EntryTypeKey = keyof typeof ENTRY_TYPES

export const ENTRY_TYPE_KEYS = Object.keys(ENTRY_TYPES) as EntryTypeKey[]

export const typeDef = (key: EntryTypeKey): EntryTypeDef => ENTRY_TYPES[key]

export const stagesFor = (key: EntryTypeKey): Stage[] => typeDef(key).stages ?? []

export const stageFor = (key: EntryTypeKey, stage?: string): Stage | undefined =>
  stage ? stagesFor(key).find((s) => s.key === stage) : undefined

/** "I did X" -> "use type Y" — the self-service decision helper shown in the create flow. */
export const TYPE_DECISION_HELPER: { prompt: string; type: EntryTypeKey }[] = [
  { prompt: 'I am handing a system or project off to someone else', type: 'kt' },
  { prompt: 'I investigated or tested something', type: 'research' },
  { prompt: 'I need to document why we chose something', type: 'decision' },
  { prompt: 'I solved a specific problem', type: 'solution' },
  { prompt: 'Someone needs to follow steps to perform a task', type: 'runbook' },
  { prompt: 'I have a reusable skill file to share', type: 'skill' },
]

/** Technology / domain facet — the "is this an AI thing or an SPFx thing" axis. */
export const TECH = [
  { key: 'ai', label: 'AI & LLM' },
  { key: 'spfx', label: 'SPFx' },
  { key: 'react', label: 'React' },
  { key: 'typescript', label: 'TypeScript' },
  { key: 'sharepoint', label: 'SharePoint' },
  { key: 'power-platform', label: 'Power Platform' },
  { key: 'azure', label: 'Azure' },
  { key: 'm365', label: 'Microsoft 365' },
  { key: 'dotnet', label: '.NET' },
  { key: 'node', label: 'Node.js' },
  { key: 'devops', label: 'DevOps & CI/CD' },
  { key: 'data', label: 'Data & reporting' },
  { key: 'security', label: 'Security & identity' },
  { key: 'process', label: 'Process & delivery' },
] as const

export const techLabel = (key: string) => TECH.find((t) => t.key === key)?.label ?? key

export const ENTRY_STATUSES = [
  { key: 'draft', label: 'Draft', tone: 'gray' as Tone },
  { key: 'published', label: 'Published', tone: 'green' as Tone },
  { key: 'archived', label: 'Archived', tone: 'gray' as Tone },
]

/** Evidence types a contributor can attach — kept generic, no fake API integration. */
export const EVIDENCE_TYPES: { key: string; label: string; icon: string }[] = [
  { key: 'url', label: 'Link', icon: '🔗' },
  { key: 'pr', label: 'GitHub PR', icon: '🔀' },
  { key: 'issue', label: 'GitHub issue', icon: '🐛' },
  { key: 'benchmark', label: 'Benchmark', icon: '📊' },
  { key: 'doc', label: 'Documentation', icon: '📄' },
  { key: 'screenshot', label: 'Screenshot', icon: '🖼️' },
  { key: 'reference', label: 'Internal reference', icon: '📎' },
]

export const evidenceTypeLabel = (key: string) => EVIDENCE_TYPES.find((t) => t.key === key)?.label ?? 'Link'
export const evidenceTypeIcon = (key: string) => EVIDENCE_TYPES.find((t) => t.key === key)?.icon ?? '🔗'

/**
 * The trust ladder. One source of truth for label/tone/icon/description so the
 * badge on a card, the panel on a detail page, and the review queue all agree.
 */
export const VERIFICATION_META: Record<
  string,
  { label: string; tone: Tone; icon: string; description: string }
> = {
  unverified: { label: 'Unverified', tone: 'gray', icon: '○', description: 'Nobody has reviewed this yet.' },
  in_review: { label: 'Under review', tone: 'blue', icon: '◐', description: 'Waiting for a reviewer to look at it.' },
  verified: { label: 'Verified', tone: 'green', icon: '✓', description: 'Reviewed and confirmed accurate.' },
  partially_verified: {
    label: 'Partially verified',
    tone: 'amber',
    icon: '◑',
    description: 'Some parts confirmed, some not yet checked.',
  },
  needs_update: { label: 'Needs update', tone: 'amber', icon: '⚠', description: 'Flagged as possibly out of date.' },
  deprecated: { label: 'Deprecated', tone: 'red', icon: '✕', description: 'No longer recommended — kept for history.' },
}
