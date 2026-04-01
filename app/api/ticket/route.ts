import { NextRequest, NextResponse } from 'next/server'
import { processTicket } from '@/lib/rag'
import { addTicket } from '@/lib/queue'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { question?: string; district?: string }
    const { question, district } = body

    if (!question?.trim()) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 })
    }

    const { category, draft, relevantKbIds, confidence, autoApproved } =
      await processTicket(question, district)

    const ticket = addTicket({
      question,
      category,
      draft,
      relevantKbIds,
      confidence,
      autoApproved,
      district: district?.trim() || undefined
    })

    return NextResponse.json(ticket)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to process ticket' }, { status: 500 })
  }
}
