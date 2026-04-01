import Anthropic from '@anthropic-ai/sdk'
import { KNOWLEDGE_BASE, CATEGORIES, KBEntry } from './knowledge-base'
import { semanticRetrieval } from './retrieval'
import { parseTicket, assembleMultiAnswer } from './parser'
import { getQueue } from './queue'
import { withRetry } from './retry'

const client = new Anthropic()

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW'

export interface ConfidenceResult {
  level: ConfidenceLevel
  reasoning: string
}

const AUTO_APPROVE_CATEGORIES = new Set(['training', 'login', 'printer'])

const SYSTEM_PROMPT = `You are a MOOV support assistant. MOOV is a K-12 school ID, attendance, and hall pass system.

Your job is to draft support responses. Rules:
- Direct and helpful. Like a knowledgeable colleague, not a bot.
- Short paragraphs. Get to the answer fast.
- If you don't know something for certain, say so and offer to follow up.
- Never use filler phrases, em dashes, or corporate speak.
- Sign off simply: "Let us know if anything else comes up."
- If answering multiple questions, number them to match the original.
- Steps should be numbered, not bulleted.
- Keep it concise. Teachers are busy.`

export async function classifyTicket(question: string): Promise<string> {
  const categoriesList = Object.entries(CATEGORIES)
    .map(([k, v]) => `${k} (${v})`)
    .join(', ')

  const response = await withRetry(() =>
    client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 50,
      messages: [{
        role: 'user',
        content: `Classify this support question into one category.
Categories: ${categoriesList}
Question: "${question}"
Return only the category key (e.g., "hardware"). Nothing else.`
      }]
    })
  )

  return (response.content[0] as { text: string }).text.trim()
}

export async function findRelevantEntries(question: string, topK = 3): Promise<KBEntry[]> {
  return semanticRetrieval(question, topK)
}

export async function scoreConfidence(
  question: string,
  relevantEntries: KBEntry[],
  draft: string
): Promise<ConfidenceResult> {
  const hasStrongMatch = relevantEntries.length > 0

  const response = await withRetry(() =>
    client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `Evaluate the confidence of this support response.

QUESTION:
"${question}"

KB ENTRIES USED: ${hasStrongMatch ? relevantEntries.map(e => e.id).join(', ') : 'none'}

DRAFT RESPONSE (first 300 chars):
"${draft.slice(0, 300)}"

Rate confidence as HIGH, MEDIUM, or LOW:
- HIGH: question closely matches KB, answer is clear and specific
- MEDIUM: partial KB match, some uncertainty or hedging in response
- LOW: no strong KB match, response relies heavily on general knowledge

Return JSON with two fields:
- level: "HIGH" | "MEDIUM" | "LOW"
- reasoning: one short sentence

Return only JSON. Example: {"level": "HIGH", "reasoning": "Question directly maps to login_001 entry."}`
      }]
    })
  )

  const raw = (response.content[0] as { text: string }).text.trim()
  try {
    const parsed = JSON.parse(raw) as { level: ConfidenceLevel; reasoning: string }
    return { level: parsed.level, reasoning: parsed.reasoning }
  } catch {
    return { level: 'MEDIUM', reasoning: 'Could not parse confidence score' }
  }
}

async function draftSingleResponse(
  question: string,
  relevantEntries: KBEntry[],
  districtContext?: string
): Promise<string> {
  const context = relevantEntries.map(e =>
    `Q: ${e.question}\nA: ${e.answer}`
  ).join('\n\n')

  const districtSection = districtContext
    ? `\nDISTRICT HISTORY CONTEXT:\n${districtContext}\n`
    : ''

  const response = await withRetry(() =>
    client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Draft a support response for this incoming question:

QUESTION:
${question}
${districtSection}
RELEVANT KNOWLEDGE BASE CONTEXT:
${context}

Write the response directly. No subject line, no preamble. Just the response body.`
      }]
    })
  )

  return (response.content[0] as { text: string }).text.trim()
}

function buildDistrictContext(district: string): string | undefined {
  const allTickets = getQueue()
  const districtTickets = allTickets
    .filter(t => t.district === district && t.status === 'approved')
    .slice(-5)

  if (districtTickets.length === 0) return undefined

  const summary = districtTickets.map(t =>
    `- [${t.category}] ${t.question.slice(0, 80)}`
  ).join('\n')

  return `This message is from ${district}. Their recent approved tickets:\n${summary}`
}

export async function draftResponse(
  question: string,
  relevantEntries: KBEntry[],
  districtContext?: string
): Promise<string> {
  return draftSingleResponse(question, relevantEntries, districtContext)
}

export async function processTicket(question: string, district?: string) {
  const parsed = parseTicket(question)

  let districtContext: string | undefined
  if (district?.trim()) {
    districtContext = buildDistrictContext(district.trim())
  }

  const [category, topEntries] = await Promise.all([
    classifyTicket(question),
    semanticRetrieval(question, 3)
  ])

  let draft: string
  let relevantKbIds: string[]

  if (parsed.isMulti) {
    const perQuestionResults = await Promise.all(
      parsed.questions.map(q => semanticRetrieval(q, 3))
    )

    const allEntries = [...new Map(
      perQuestionResults.flat().map(e => [e.id, e])
    ).values()]

    const answers = await Promise.all(
      parsed.questions.map((q, i) =>
        draftSingleResponse(q, perQuestionResults[i], districtContext)
      )
    )

    draft = assembleMultiAnswer(answers)
    relevantKbIds = allEntries.map(e => e.id)
  } else {
    draft = await draftSingleResponse(question, topEntries, districtContext)
    relevantKbIds = topEntries.map(e => e.id)
  }

  const confidence = await scoreConfidence(question, topEntries, draft)

  const canAutoApprove =
    confidence.level === 'HIGH' && AUTO_APPROVE_CATEGORIES.has(category)

  return {
    category,
    draft,
    relevantKbIds,
    confidence,
    autoApproved: canAutoApprove
  }
}

// Re-export KB references for external use
export { KNOWLEDGE_BASE }
