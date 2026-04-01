import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { updateTicket, getQueue } from '@/lib/queue'
import { saveLearnedEntry } from '@/lib/learned'
import { logger } from '@/lib/logger'

const ApproveSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  editedResponse: z.string().optional()
})

export async function POST(req: NextRequest) {
  let id: string
  let editedResponse: string | undefined
  try {
    const body = await req.json()
    const parsed = ApproveSchema.safeParse(body)
    if (!parsed.success) {
      const message = parsed.error.issues.map(e => e.message).join('; ')
      return NextResponse.json({ error: message }, { status: 400 })
    }
    id = parsed.data.id
    editedResponse = parsed.data.editedResponse
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  try {
    const queue = getQueue()
    const existing = queue.find(t => t.id === id)
    if (!existing) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    const finalResponse = editedResponse || existing.draft
    const wasEdited = editedResponse ? editedResponse.trim() !== existing.draft.trim() : false

    const ticket = await updateTicket(id, {
      status: 'approved',
      approvedResponse: finalResponse,
      wasEdited
    })

    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    await saveLearnedEntry({
      question: ticket.question,
      approvedResponse: finalResponse,
      category: ticket.category
    })

    return NextResponse.json(ticket)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('Failed to approve ticket', { id, error: message })
    return NextResponse.json({ error: 'Failed to approve ticket' }, { status: 500 })
  }
}
