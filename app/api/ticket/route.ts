import { NextRequest, NextResponse } from 'next/server'
import { processTicket } from '@/lib/rag'
import { addTicket } from '@/lib/queue'

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json()
    if (!question?.trim()) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 })
    }

    const { category, draft, relevantKbIds } = await processTicket(question)
    const ticket = addTicket({ question, category, draft, relevantKbIds })

    return NextResponse.json(ticket)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to process ticket' }, { status: 500 })
  }
}
