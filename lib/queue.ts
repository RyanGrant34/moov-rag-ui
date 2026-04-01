import fs from 'fs'
import path from 'path'
import type { ConfidenceLevel } from './rag'
import { FileLock } from './file-lock'

export type TicketStatus = 'pending' | 'approved' | 'rejected'

export interface TicketConfidence {
  level: ConfidenceLevel
  reasoning: string
}

export interface Ticket {
  id: string
  timestamp: string
  category: string
  question: string
  draft: string
  relevantKbIds: string[]
  status: TicketStatus
  approvedResponse: string | null
  rejectionReason?: string
  confidence?: TicketConfidence
  autoApproved?: boolean
  district?: string
  wasEdited?: boolean
}

const QUEUE_FILE = path.join(process.cwd(), 'data', 'queue.json')
const LOCK_KEY = 'queue.json'

// In-memory read cache with 5-second TTL
let cache: { data: Ticket[]; expiresAt: number } | null = null
const CACHE_TTL_MS = 5000

function invalidateCache() {
  cache = null
}

function ensureDataDir() {
  const dir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(QUEUE_FILE)) fs.writeFileSync(QUEUE_FILE, '[]')
}

function readQueueFromDisk(): Ticket[] {
  ensureDataDir()
  const raw = fs.readFileSync(QUEUE_FILE, 'utf-8')
  return JSON.parse(raw) as Ticket[]
}

export function getQueue(): Ticket[] {
  const now = Date.now()
  if (cache && now < cache.expiresAt) {
    return cache.data
  }
  const data = readQueueFromDisk()
  cache = { data, expiresAt: now + CACHE_TTL_MS }
  return data
}

async function saveQueueLocked(queue: Ticket[]): Promise<void> {
  return FileLock.withLock(LOCK_KEY, async () => {
    ensureDataDir()
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2))
    invalidateCache()
  })
}

export async function addTicket(
  ticket: Omit<Ticket, 'id' | 'timestamp' | 'status' | 'approvedResponse'>
): Promise<Ticket> {
  return FileLock.withLock(LOCK_KEY, async () => {
    const queue = readQueueFromDisk()
    const newTicket: Ticket = {
      ...ticket,
      id: `ticket_${String(queue.length + 1).padStart(4, '0')}`,
      timestamp: new Date().toISOString(),
      status: ticket.autoApproved ? 'approved' : 'pending',
      approvedResponse: ticket.autoApproved ? ticket.draft : null
    }
    queue.push(newTicket)
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2))
    invalidateCache()
    return newTicket
  })
}

export async function updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket | null> {
  return FileLock.withLock(LOCK_KEY, async () => {
    const queue = readQueueFromDisk()
    const idx = queue.findIndex(t => t.id === id)
    if (idx === -1) return null
    queue[idx] = { ...queue[idx], ...updates }
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2))
    invalidateCache()
    return queue[idx]
  })
}

// Kept for internal use only (buildDistrictContext in rag.ts reads synchronously)
export { saveQueueLocked as saveQueue }
