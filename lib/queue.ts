import fs from 'fs'
import path from 'path'

export type TicketStatus = 'pending' | 'approved' | 'rejected'

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
}

const QUEUE_FILE = path.join(process.cwd(), 'data', 'queue.json')

function ensureDataDir() {
  const dir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(QUEUE_FILE)) fs.writeFileSync(QUEUE_FILE, '[]')
}

export function getQueue(): Ticket[] {
  ensureDataDir()
  const raw = fs.readFileSync(QUEUE_FILE, 'utf-8')
  return JSON.parse(raw)
}

export function saveQueue(queue: Ticket[]) {
  ensureDataDir()
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2))
}

export function addTicket(ticket: Omit<Ticket, 'id' | 'timestamp' | 'status' | 'approvedResponse'>): Ticket {
  const queue = getQueue()
  const newTicket: Ticket = {
    ...ticket,
    id: `ticket_${String(queue.length + 1).padStart(4, '0')}`,
    timestamp: new Date().toISOString(),
    status: 'pending',
    approvedResponse: null
  }
  queue.push(newTicket)
  saveQueue(queue)
  return newTicket
}

export function updateTicket(id: string, updates: Partial<Ticket>): Ticket | null {
  const queue = getQueue()
  const idx = queue.findIndex(t => t.id === id)
  if (idx === -1) return null
  queue[idx] = { ...queue[idx], ...updates }
  saveQueue(queue)
  return queue[idx]
}
