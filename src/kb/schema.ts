// The whole point of this file: adding a new kind of knowledge = one entry in
// ENTRY_TYPES. No new components, no `if (type === ...)` anywhere in the app.
// Forms, detail pages, filters and badges all render from these definitions.

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

export const ENTRY_TYPES = {
  article: {
    label: 'Knowledge article',
    plural: 'Knowledge articles',
    monogram: 'KA',
    tone: 'blue',
    blurb: 'How something works, a policy, a project write-up, client-facing docs.',
    fields: [{ key: 'appliesTo', label: 'Applies to', kind: 'text', half: true, hint: 'System, client or product this covers' }],
  },

  howto: {
    label: 'How-to / runbook',
    plural: 'How-tos & runbooks',
    monogram: 'HT',
    tone: 'teal',
    blurb: 'Repeatable procedure someone else has to follow without you in the room.',
    stageLabel: 'Freshness',
    stages: [
      { key: 'unverified', label: 'Unverified', tone: 'gray' },
      { key: 'verified', label: 'Verified', tone: 'green' },
      { key: 'stale', label: 'Needs review', tone: 'amber' },
    ],
    fields: [
      { key: 'prerequisites', label: 'Prerequisites', kind: 'markdown', hint: 'Access, tooling or approvals needed first' },
      { key: 'steps', label: 'Steps', kind: 'markdown', required: true, hint: 'Numbered list — one action per step' },
      { key: 'rollback', label: 'Rollback / if it goes wrong', kind: 'markdown' },
      { key: 'recommendedWhen', label: 'Recommended when', kind: 'markdown', hint: 'The situation this is actually the right call' },
      { key: 'avoidWhen', label: 'Avoid when', kind: 'markdown', hint: 'When to reach for something else instead' },
      { key: 'limitations', label: 'Known limitations', kind: 'markdown' },
      { key: 'timeEstimate', label: 'Typical time', kind: 'text', half: true },
      { key: 'lastVerified', label: 'Last verified', kind: 'date', half: true },
    ],
  },

  research: {
    label: 'Research / R&D',
    plural: 'Research & R&D',
    monogram: 'RD',
    tone: 'violet',
    blurb: 'What we investigated, how, what came out of it, and what we decided to do.',
    stageLabel: 'Research status',
    stages: [
      { key: 'proposed', label: 'Proposed', tone: 'gray' },
      { key: 'in_progress', label: 'In progress', tone: 'blue' },
      { key: 'implemented', label: 'Implemented', tone: 'green' },
      { key: 'rejected', label: 'Rejected', tone: 'red' },
      { key: 'on_hold', label: 'On hold', tone: 'amber' },
    ],
    fields: [
      { key: 'objective', label: 'Objective / hypothesis', kind: 'markdown', required: true },
      { key: 'method', label: 'Method / approach', kind: 'markdown' },
      { key: 'outcome', label: 'Outcome / findings', kind: 'markdown' },
      { key: 'conclusion', label: 'Conclusion & next steps', kind: 'markdown' },
      { key: 'period', label: 'Time period', kind: 'text', half: true, hint: 'e.g. Aug–Sep 2026' },
      { key: 'collaborators', label: 'Collaborators', kind: 'list', half: true },
      { key: 'effort', label: 'Effort spent', kind: 'text', half: true, hint: 'e.g. 6 person-days' },
      { key: 'references', label: 'Reference links', kind: 'links', hint: 'One URL per line' },
    ],
  },

  kt: {
    label: 'Knowledge transfer',
    plural: 'Knowledge transfers',
    monogram: 'KT',
    tone: 'amber',
    blurb: 'Handover record: who handed what to whom, what is covered, what is still open.',
    stageLabel: 'Handover status',
    stages: [
      { key: 'scheduled', label: 'Scheduled', tone: 'gray' },
      { key: 'in_progress', label: 'In progress', tone: 'blue' },
      { key: 'handed_over', label: 'Handed over', tone: 'teal' },
      { key: 'verified', label: 'Verified by receiver', tone: 'green' },
    ],
    fields: [
      { key: 'handoverFrom', label: 'Handed over by', kind: 'text', half: true, required: true },
      { key: 'handoverTo', label: 'Handed over to', kind: 'list', half: true, required: true },
      { key: 'system', label: 'System / project', kind: 'text', half: true },
      { key: 'handoverDate', label: 'Handover date', kind: 'date', half: true },
      { key: 'scope', label: 'What is covered', kind: 'markdown', hint: 'Components, environments, credentials location, deploy path' },
      { key: 'notCovered', label: 'What is NOT covered', kind: 'markdown', hint: 'The part that bites people six months later' },
      { key: 'openRisks', label: 'Open risks / known issues', kind: 'markdown' },
      { key: 'contacts', label: 'Escalation contacts', kind: 'list' },
      { key: 'sessionLinks', label: 'Recordings & session notes', kind: 'links' },
    ],
  },

  decision: {
    label: 'Decision record',
    plural: 'Decision records',
    monogram: 'DR',
    tone: 'blue',
    blurb: 'An architectural or process decision, why it was made, and what it cost us.',
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

  snippet: {
    label: 'Code snippet / pattern',
    plural: 'Snippets & patterns',
    monogram: '{ }',
    tone: 'gray',
    blurb: 'Reusable code we keep re-typing, with the gotchas attached.',
    fields: [
      {
        key: 'language',
        label: 'Language',
        kind: 'select',
        half: true,
        options: ['TypeScript', 'JavaScript', 'C#', 'PowerShell', 'Python', 'KQL', 'Bash', 'JSON', 'YAML', 'SQL'],
      },
      { key: 'runtime', label: 'Runtime / version', kind: 'text', half: true, hint: 'e.g. SPFx 1.19, .NET 8' },
      { key: 'code', label: 'Code', kind: 'code', required: true },
      { key: 'usage', label: 'How to use it', kind: 'markdown' },
      { key: 'gotchas', label: 'Gotchas', kind: 'markdown' },
      { key: 'recommendedWhen', label: 'Recommended when', kind: 'markdown' },
      { key: 'avoidWhen', label: 'Avoid when', kind: 'markdown', hint: 'When to reach for something else instead' },
    ],
  },

  postmortem: {
    label: 'Incident postmortem',
    plural: 'Incident postmortems',
    monogram: 'PM',
    tone: 'red',
    blurb: 'What broke, why, and what we changed so it does not happen twice.',
    stageLabel: 'Incident status',
    stages: [
      { key: 'investigating', label: 'Investigating', tone: 'amber' },
      { key: 'mitigated', label: 'Mitigated', tone: 'blue' },
      { key: 'actions_open', label: 'Actions open', tone: 'violet' },
      { key: 'closed', label: 'Closed', tone: 'green' },
    ],
    fields: [
      { key: 'severity', label: 'Severity', kind: 'select', half: true, options: ['Sev1 — outage', 'Sev2 — major', 'Sev3 — minor'] },
      { key: 'incidentDate', label: 'Incident date', kind: 'date', half: true },
      { key: 'impact', label: 'Impact', kind: 'markdown', required: true, hint: 'Who was affected, for how long' },
      { key: 'timeline', label: 'Timeline', kind: 'markdown' },
      { key: 'rootCause', label: 'Root cause', kind: 'markdown' },
      { key: 'actionItems', label: 'Action items', kind: 'markdown' },
    ],
  },
} satisfies Record<string, EntryTypeDef>

export type EntryTypeKey = keyof typeof ENTRY_TYPES

export const ENTRY_TYPE_KEYS = Object.keys(ENTRY_TYPES) as EntryTypeKey[]

export const typeDef = (key: EntryTypeKey): EntryTypeDef => ENTRY_TYPES[key]

export const stagesFor = (key: EntryTypeKey): Stage[] => typeDef(key).stages ?? []

export const stageFor = (key: EntryTypeKey, stage?: string): Stage | undefined =>
  stage ? stagesFor(key).find((s) => s.key === stage) : undefined

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
