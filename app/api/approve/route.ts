import { NextRequest, NextResponse } from 'next/server'
import { updateTicket } from '@/lib/queue'

export async function POST(req: NextRequest) {
  const { id, editedResponse } = await req.json()
  const ticket = updateTicket(id, {
    status: 'approved',
    approvedResponse: editedResponse || null
  })
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  return NextResponse.json(ticket)
}
