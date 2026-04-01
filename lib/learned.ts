import fs from 'fs'
import path from 'path'

export interface LearnedEntry {
  question: string
  approvedResponse: string
  category: string
  timestamp: string
}

const LEARNED_FILE = path.join(process.cwd(), 'data', 'learned.json')

function ensureLearnedFile() {
  const dir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(LEARNED_FILE)) fs.writeFileSync(LEARNED_FILE, '[]')
}

export function getLearnedEntries(): LearnedEntry[] {
  try {
    ensureLearnedFile()
    const raw = fs.readFileSync(LEARNED_FILE, 'utf-8')
    return JSON.parse(raw) as LearnedEntry[]
  } catch {
    return []
  }
}

export function saveLearnedEntry(entry: Omit<LearnedEntry, 'timestamp'>) {
  ensureLearnedFile()
  const entries = getLearnedEntries()
  entries.push({ ...entry, timestamp: new Date().toISOString() })
  fs.writeFileSync(LEARNED_FILE, JSON.stringify(entries, null, 2))
}

export function getLearnedCount(): number {
  return getLearnedEntries().length
}
