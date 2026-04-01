import { NextResponse } from 'next/server'
import { KNOWLEDGE_BASE } from '@/lib/knowledge-base'

export async function GET() {
  const entries = KNOWLEDGE_BASE.map(({ id, category, question, answer }) => ({
    id,
    category,
    question,
    answer
  }))
  return NextResponse.json(entries)
}
