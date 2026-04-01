import Anthropic from '@anthropic-ai/sdk'
import { KNOWLEDGE_BASE, CATEGORIES, KBEntry } from './knowledge-base'

const client = new Anthropic()

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

  const response = await client.messages.create({
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

  return (response.content[0] as { text: string }).text.trim()
}

export async function findRelevantEntries(question: string, topK = 3): Promise<KBEntry[]> {
  const kbSummary = KNOWLEDGE_BASE.map(e =>
    `[${e.id}] ${e.category.toUpperCase()}: ${e.question}`
  ).join('\n')

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Given this support question:
"${question}"

Here are the available knowledge base entries:
${kbSummary}

Return the IDs of the ${topK} most relevant entries, comma-separated.
Only return the IDs, nothing else. Example: reader_001,attendance_001,rooms_001`
    }]
  })

  const raw = (response.content[0] as { text: string }).text.trim()
  const ids = raw.split(',').map(id => id.trim())
  const kbById: Record<string, KBEntry> = {}
  KNOWLEDGE_BASE.forEach(e => { kbById[e.id] = e })
  return ids.filter(id => id in kbById).map(id => kbById[id])
}

export async function draftResponse(question: string, relevantEntries: KBEntry[]): Promise<string> {
  const context = relevantEntries.map(e =>
    `Q: ${e.question}\nA: ${e.answer}`
  ).join('\n\n')

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1000,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Draft a support response for this incoming question:

QUESTION:
${question}

RELEVANT KNOWLEDGE BASE CONTEXT:
${context}

Write the response directly. No subject line, no preamble. Just the response body.`
    }]
  })

  return (response.content[0] as { text: string }).text.trim()
}

export async function processTicket(question: string) {
  const [category, relevantEntries] = await Promise.all([
    classifyTicket(question),
    findRelevantEntries(question, 3)
  ])

  const draft = await draftResponse(question, relevantEntries)

  return {
    category,
    draft,
    relevantKbIds: relevantEntries.map(e => e.id)
  }
}
