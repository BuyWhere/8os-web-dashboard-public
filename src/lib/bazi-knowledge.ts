/**
 * BaZi knowledge-base loader (OS-2543).
 *
 * Parses docs/bazi-knowledge.md — shipped as the generated module
 * ./bazi-knowledge-content (see scripts/generate-bazi-knowledge.mjs) so it
 * survives the Next standalone build — into its `## SECTION:` blocks and
 * returns the blocks relevant to a question topic, for retrieval-injection
 * into the assistant's BaZi tool results.
 */
import { BAZI_KNOWLEDGE_MD } from './bazi-knowledge-content'

export type KnowledgeSectionName =
  | 'TEN_GODS'
  | 'USEFUL_GOD'
  | 'INTERACTIONS'
  | 'RELATIONSHIPS_DATING'
  | 'COMPATIBILITY'
  | 'LIFE_DIRECTION'
  | 'ANSWERING_STYLE'

// Module-scope cache: parse once per server process.
let sectionCache: Map<string, string> | null = null

function parseSections(): Map<string, string> {
  if (sectionCache) return sectionCache
  const map = new Map<string, string>()
  const parts = BAZI_KNOWLEDGE_MD.split(/^## SECTION: /m)
  // parts[0] is the preamble before the first section header — skip it.
  for (const part of parts.slice(1)) {
    const nameMatch = part.match(/^([A-Z_]+)/)
    if (!nameMatch) continue
    let body = part
    // The SOURCES master list after the final section belongs to no section.
    const sourcesIdx = body.indexOf('\n## SOURCES')
    if (sourcesIdx !== -1) body = body.slice(0, sourcesIdx)
    map.set(nameMatch[1], ('## SECTION: ' + body).trim())
  }
  sectionCache = map
  return map
}

/**
 * Return the requested knowledge sections (by name, e.g. ['TEN_GODS',
 * 'ANSWERING_STYLE']) concatenated for prompt injection. Unknown names are
 * ignored; duplicates are de-duplicated; order follows the request.
 */
export function getKnowledgeSections(topics: string[]): string {
  const sections = parseSections()
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of topics) {
    const key = t.toUpperCase().trim()
    if (seen.has(key)) continue
    seen.add(key)
    const body = sections.get(key)
    if (body) out.push(body)
  }
  return out.join('\n\n---\n\n')
}

/** List the section names available (diagnostics). */
export function listKnowledgeSections(): string[] {
  return Array.from(parseSections().keys())
}
