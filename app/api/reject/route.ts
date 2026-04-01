import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { updateTicket } from '@/lib/queue'
import { logger } from '@/lib/logger'

const RejectSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  reason: z.string().optional()
})

export async function POST(req: NextRequest) {
  let id: string
  let reason: string | undefined
  try {
    const body = await req.json()
    const parsed = RejectSchema.safeParse(body)
    if (!parsed.success) {
      const message = parsed.error.issues.map(e => e.message).join('; ')
      return NextResponse.json({ error: message }, { status: 400 })
    }
    id = parsed.data.id
    reason = parsed.data.reason
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  try {
    const ticket = await updateTicket(id, {
      status: 'rejected',
      rejectionReason: reason ?? ''
    })
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    return NextResponse.json(ticket)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('Failed to reject ticket', { id, error: message })
    return NextResponse.json({ error: 'Failed to reject ticket' }, { status: 500 })
  }
}
