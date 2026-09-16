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
 * Maps a raw stored entry — of any taxonomy vintage — onto the current 6-type
 * taxonomy (kt, research, decision, solution, runbook, skill), carrying every
 * field forward either into a matching new field or, failing that, as a
 * labelled section appended to the body. Never throws, never drops data.
 * Idempotent: an entry already on the new taxonomy passes through unchanged.
 *
 * Two taxonomy generations back: article/howto/research/kt/decision/
 * snippet/postmortem. One generation back: article/research/ai_research/
 * decision/solution/runbook — Article was later retired in favour of a
 * proper Knowledge Transfer type (Article had no fields of its own, so
 * nothing is lost), and AI Research was folded into Research's own Topic
 * field rather than kept as a separate type.
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
      type = 'kt'
      newDetails = {
        handoverFrom: details.handoverFrom,
        handoverTo: details.handoverTo,
        system: details.system,
        handoverDate: details.handoverDate,
        scope: details.scope,
        notCovered: details.notCovered,
        openRisks: details.openRisks,
        contacts: details.contacts,
        sessionLinks: details.sessionLinks,
      }
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
      type = 'research'
      newDetails = {
        topic: details.topic ?? (tech.includes('ai') ? 'AI' : undefined),
        question: details.objective ?? details.question,
        method: details.method,
        findings: details.outcome ?? details.findings,
        conclusion: details.conclusion,
        period: details.period,
        collaborators: details.collaborators,
        effort: details.effort,
      }
      content = carryOverLegacyFields(content, details, ['references'])
      break

    case 'ai_research':
      // AI Research was merged into Research — same fields already, just record the domain it was.
      type = 'research'
      newDetails = { ...details, topic: details.topic ?? 'AI' }
      break

    case 'article':
      type = 'kt'
      newDetails = {}
      break

    case 'decision':
    case 'solution':
    case 'runbook':
    case 'skill':
      type = oldType // already on the new taxonomy — nothing to do
      break

    default:
      type = 'kt' // unrecognised/corrupt legacy value — fall back to the safest generic type rather than crash
  }

  return { ...raw, type, details: newDetails, content, stage }
}
