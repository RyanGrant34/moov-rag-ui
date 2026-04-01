import { NextResponse } from 'next/server'
import { getLearnedCount } from '@/lib/learned'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const count = getLearnedCount()
    return NextResponse.json({ count })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('Failed to fetch learned count', { error: message })
    return NextResponse.json({ error: 'Failed to fetch learned count' }, { status: 500 })
  }
}
