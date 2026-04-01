import { NextRequest, NextResponse } from 'next/server'
import { updateTicket, getQueue } from '@/lib/queue'
import { saveLearnedEntry } from '@/lib/learned'

export async function POST(req: NextRequest) {
  const body = await req.json() as { id?: string; editedResponse?: string }
  const { id, editedResponse } = body

  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

  const queue = getQueue()
  const existing = queue.find(t => t.id === id)
  if (!existing) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

  const finalResponse = editedResponse || existing.draft
  const wasEdited = editedResponse ? editedResponse.trim() !== existing.draft.trim() : false

  const ticket = updateTicket(id, {
    status: 'approved',
    approvedResponse: finalResponse,
    wasEdited
  })

  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

  saveLearnedEntry({
    question: ticket.question,
    approvedResponse: finalResponse,
    category: ticket.category
  })

  return NextResponse.json(ticket)
}
