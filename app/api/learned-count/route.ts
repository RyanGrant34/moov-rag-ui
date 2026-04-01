import { NextResponse } from 'next/server'
import { getLearnedCount } from '@/lib/learned'

export async function GET() {
  const count = getLearnedCount()
  return NextResponse.json({ count })
}
