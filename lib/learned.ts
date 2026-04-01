import fs from 'fs'
import path from 'path'
import { FileLock } from './file-lock'

export interface LearnedEntry {
  question: string
  approvedResponse: string
  category: string
  timestamp: string
}

const LEARNED_FILE = path.join(process.cwd(), 'data', 'learned.json')
const LOCK_KEY = 'learned.json'

function ensureLearnedFile() {
  const dir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(LEARNED_FILE)) fs.writeFileSync(LEARNED_FILE, '[]')
}

function readEntriesFromDisk(): LearnedEntry[] {
  try {
    ensureLearnedFile()
    const raw = fs.readFileSync(LEARNED_FILE, 'utf-8')
    return JSON.parse(raw) as LearnedEntry[]
  } catch {
    return []
  }
}

export function getLearnedEntries(): LearnedEntry[] {
  return readEntriesFromDisk()
}

export async function saveLearnedEntry(entry: Omit<LearnedEntry, 'timestamp'>): Promise<void> {
  return FileLock.withLock(LOCK_KEY, async () => {
    ensureLearnedFile()
    const entries = readEntriesFromDisk()

    // Deduplication: update existing entry if same question (case-insensitive trim)
    const normalizedIncoming = entry.question.trim().toLowerCase()
    const existingIdx = entries.findIndex(
      e => e.question.trim().toLowerCase() === normalizedIncoming
    )

    if (existingIdx !== -1) {
      entries[existingIdx] = {
        ...entries[existingIdx],
        approvedResponse: entry.approvedResponse,
        category: entry.category,
        timestamp: new Date().toISOString()
      }
    } else {
      entries.push({ ...entry, timestamp: new Date().toISOString() })
    }

    fs.writeFileSync(LEARNED_FILE, JSON.stringify(entries, null, 2))
  })
}

export function getLearnedCount(): number {
  return getLearnedEntries().length
}
