import { NextResponse } from 'next/server'
import { getQueue } from '@/lib/queue'

export async function GET() {
  const queue = getQueue()
  return NextResponse.json(queue.reverse())
}
