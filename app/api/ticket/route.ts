import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { processTicket } from '@/lib/rag'
import { addTicket } from '@/lib/queue'
import { checkRateLimit } from '@/lib/rate-limiter'
import { logger } from '@/lib/logger'

const TicketSchema = z.object({
  question: z.string().min(1, 'Question is required').max(5000, 'Question must be 5000 characters or fewer'),
  district: z.string().max(100, 'District must be 100 characters or fewer').optional()
})

const TIMEOUT_MS = 30_000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Request timed out')), ms)
  )
  return Promise.race([promise, timeout])
}

export async function POST(req: NextRequest) {
  // Rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown'

  const { allowed, retryAfter } = checkRateLimit(ip)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) }
      }
    )
  }

  // Input validation
  let question: string
  let district: string | undefined
  try {
    const body = await req.json()
    const parsed = TicketSchema.safeParse(body)
    if (!parsed.success) {
      const message = parsed.error.issues.map(e => e.message).join('; ')
      return NextResponse.json({ error: message }, { status: 400 })
    }
    question = parsed.data.question
    district = parsed.data.district
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  try {
    const { category, draft, relevantKbIds, confidence, autoApproved } =
      await withTimeout(processTicket(question, district), TIMEOUT_MS)

    const ticket = await addTicket({
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
    const message = err instanceof Error ? err.message : String(err)
    logger.error('Failed to process ticket', { ip, error: message })
    return NextResponse.json({ error: 'Failed to process ticket' }, { status: 500 })
  }
}
