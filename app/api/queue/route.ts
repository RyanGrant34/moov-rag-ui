import { NextResponse } from 'next/server'
import { getQueue } from '@/lib/queue'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const queue = getQueue()
    return NextResponse.json(queue.reverse())
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('Failed to fetch queue', { error: message })
    return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 })
  }
}
