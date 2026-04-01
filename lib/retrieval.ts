import Anthropic from '@anthropic-ai/sdk'
import { KNOWLEDGE_BASE, KBEntry } from './knowledge-base'
import { getLearnedEntries, LearnedEntry } from './learned'

const client = new Anthropic()

interface ScoredEntry {
  entry: KBEntry | LearnedEntry
  score: number
  reasoning: string
  isLearned: boolean
}

async function scoreEntry(
  question: string,
  entry: KBEntry | LearnedEntry,
  isLearned: boolean
): Promise<ScoredEntry> {
  const entryQuestion = entry.question
  const entryAnswer = isLearned
    ? (entry as LearnedEntry).approvedResponse
    : (entry as KBEntry).answer

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: `Score how relevant this knowledge base entry is to the incoming support question.

INCOMING QUESTION:
"${question}"

KB ENTRY:
Q: ${entryQuestion}
A: ${entryAnswer.slice(0, 200)}

Return a JSON object with exactly two fields:
- score: integer from 1 to 10 (10 = perfect match, 1 = completely unrelated)
- reasoning: one sentence explaining the score

Return only the JSON, nothing else. Example: {"score": 7, "reasoning": "Both questions are about login issues with school accounts."}`
    }]
  })

  const raw = (response.content[0] as { text: string }).text.trim()
  try {
    const parsed = JSON.parse(raw) as { score: number; reasoning: string }
    const boost = isLearned ? 1 : 0
    return {
      entry,
      score: Math.min(10, parsed.score + boost),
      reasoning: parsed.reasoning,
      isLearned
    }
  } catch {
    return { entry, score: 1, reasoning: 'Failed to parse score', isLearned }
  }
}

export async function semanticRetrieval(question: string, topK = 3): Promise<KBEntry[]> {
  const learnedEntries = getLearnedEntries()

  const kbItems: Array<{ entry: KBEntry | LearnedEntry; isLearned: boolean }> = [
    ...KNOWLEDGE_BASE.map(e => ({ entry: e as KBEntry | LearnedEntry, isLearned: false })),
    ...learnedEntries.map(e => ({ entry: e as KBEntry | LearnedEntry, isLearned: true }))
  ]

  const scored = await Promise.all(
    kbItems.map(({ entry, isLearned }) => scoreEntry(question, entry, isLearned))
  )

  scored.sort((a, b) => b.score - a.score)
  const top = scored.slice(0, topK)

  return top.map(({ entry, isLearned }) => {
    if (isLearned) {
      const learned = entry as LearnedEntry
      return {
        id: `learned_${learned.category}_${Date.now()}`,
        category: learned.category,
        tags: [],
        question: learned.question,
        answer: learned.approvedResponse
      } satisfies KBEntry
    }
    return entry as KBEntry
  })
}
