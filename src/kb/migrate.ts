import { Details, Entry } from '../types'
import { EntryTypeKey } from './schema'

/** Human labels for legacy fields that no longer have a home on the new type — used so migrated content is still readable, not just present. */
const LEGACY_FIELD_LABELS: Record<string, string> = {
  handoverFrom: 'Handed over by',
  handoverTo: 'Handed over to',
  system: 'System / project',
  handoverDate: 'Handover date',
  scope: 'What is covered',
  notCovered: 'What is NOT covered',
  openRisks: 'Open risks / known issues',
  contacts: 'Escalation contacts',
  sessionLinks: 'Recordings & session notes',
  severity: 'Severity',
  incidentDate: 'Incident date',
  timeline: 'Timeline',
  language: 'Language',
  runtime: 'Runtime / version',
  gotchas: 'Gotchas',
  recommendedWhen: 'Recommended when',
  avoidWhen: 'Avoid when',
  limitations: 'Known limitations',
  timeEstimate: 'Typical time',
  lastVerified: 'Last verified',
  references: 'Reference links',
}

/** Appends any of `keys` present in `details` to `content` as a labelled section — nothing gets silently dropped. */
function carryOverLegacyFields(content: string, details: Details, keys: string[]): string {
  const parts: string[] = []
  for (const key of keys) {
    const value = details[key]
    if (value === undefined || value === '') continue
    const text = Array.isArray(value) ? value.join(', ') : value
    parts.push(`**${LEGACY_FIELD_LABELS[key] ?? key}:** ${text}`)
  }
  return parts.length ? `${content}\n\n---\n${parts.join('\n\n')}` : content
}

/**
 * The old taxonomy had 7 overlapping types (article, howto, research, kt,
 * decision, snippet, postmortem). This maps a raw stored entry — of any
 * vintage — onto the current 6-type taxonomy (article, research, ai_research,
 * decision, solution, runbook), carrying every field forward either into a
 * matching new field or, failing that, as a labelled section appended to the
 * body. Never throws, never drops data. Idempotent: an entry already on the
 * new taxonomy passes through unchanged.
 */
export function migrateEntryType(raw: any): Entry {
  const oldType = raw?.type
  const details: Details = raw?.details ?? {}
  const tech: string[] = Array.isArray(raw?.tech) ? raw.tech : []

  let type: EntryTypeKey
  let newDetails: Details = details
  let content: string = raw?.content ?? ''
  let stage: string | undefined = raw?.stage

  switch (oldType) {
    case 'howto':
      type = 'runbook'
      newDetails = { prerequisites: details.prerequisites, steps: details.steps, rollback: details.rollback }
      content = carryOverLegacyFields(content, details, ['recommendedWhen', 'avoidWhen', 'limitations', 'timeEstimate', 'lastVerified'])
      stage = undefined // runbook has no stage vocabulary of its own — the real Verification system covers this now
      break

    case 'kt':
      type = 'article'
      newDetails = {}
      content = carryOverLegacyFields(content, details, [
        'handoverFrom', 'handoverTo', 'system', 'handoverDate', 'scope', 'notCovered', 'openRisks', 'contacts', 'sessionLinks',
      ])
      stage = undefined // article has no stage vocabulary
      break

    case 'snippet':
      type = 'solution'
      newDetails = { code: details.code, resolution: details.usage, recommendedWhen: details.recommendedWhen, avoidWhen: details.avoidWhen }
      content = carryOverLegacyFields(content, details, ['language', 'runtime', 'gotchas'])
      stage = undefined
      break

    case 'postmortem':
      type = 'solution'
      newDetails = { problem: details.impact, rootCause: details.rootCause, resolution: details.actionItems }
      content = carryOverLegacyFields(content, details, ['severity', 'incidentDate', 'timeline'])
      stage = undefined
      break

    case 'research':
      // Research keeps its shape either way — it only splits by domain.
      type = tech.includes('ai') ? 'ai_research' : 'research'
      newDetails = {
        question: details.objective,
        method: details.method,
        findings: details.outcome,
        conclusion: details.conclusion,
        period: details.period,
        collaborators: details.collaborators,
        effort: details.effort,
      }
      content = carryOverLegacyFields(content, details, ['references'])
      break

    case 'article':
    case 'decision':
    case 'ai_research':
    case 'solution':
    case 'runbook':
      type = oldType // already on the new taxonomy — nothing to do
      break

    default:
      type = 'article' // unrecognised/corrupt legacy value — fall back to the safest generic type rather than crash
  }

  return { ...raw, type, details: newDetails, content, stage }
}
