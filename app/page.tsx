'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'

type TicketStatus = 'pending' | 'approved' | 'rejected'
type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW'
type Tab = 'queue' | 'submit' | 'kb'

interface TicketConfidence {
  level: ConfidenceLevel
  reasoning: string
}

interface Ticket {
  id: string
  timestamp: string
  category: string
  question: string
  draft: string
  relevantKbIds: string[]
  status: TicketStatus
  approvedResponse: string | null
  rejectionReason?: string
  confidence?: TicketConfidence
  autoApproved?: boolean
  district?: string
  wasEdited?: boolean
}

const CATEGORY_LABELS: Record<string, string> = {
  login: 'Login & Access',
  hardware: 'Hardware',
  attendance: 'Attendance',
  hall_passes: 'Hall Passes',
  rooms: 'Rooms & Readers',
  printer: 'Printer & IDs',
  training: 'Training & PD'
}

const CATEGORY_COLORS: Record<string, { dot: string; bg: string; text: string }> = {
  login:      { dot: 'bg-blue-500',    bg: 'bg-blue-50',    text: 'text-blue-700'    },
  hardware:   { dot: 'bg-orange-500',  bg: 'bg-orange-50',  text: 'text-orange-700'  },
  attendance: { dot: 'bg-violet-500',  bg: 'bg-violet-50',  text: 'text-violet-700'  },
  hall_passes:{ dot: 'bg-cyan-500',    bg: 'bg-cyan-50',    text: 'text-cyan-700'    },
  rooms:      { dot: 'bg-indigo-500',  bg: 'bg-indigo-50',  text: 'text-indigo-700'  },
  printer:    { dot: 'bg-rose-500',    bg: 'bg-rose-50',    text: 'text-rose-700'    },
  training:   { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' }
}

const STATUS_LEFT: Record<TicketStatus, string> = {
  pending:  'border-l-amber-400',
  approved: 'border-l-green-500',
  rejected: 'border-l-red-400'
}

const STATUS_BADGE: Record<TicketStatus, string> = {
  pending:  'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  approved: 'bg-green-50 text-green-700 ring-1 ring-green-200',
  rejected: 'bg-red-50 text-red-700 ring-1 ring-red-200'
}

const CONFIDENCE_BADGE: Record<ConfidenceLevel, string> = {
  HIGH:   'bg-green-50 text-green-700 ring-1 ring-green-200',
  MEDIUM: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  LOW:    'bg-red-50 text-red-700 ring-1 ring-red-200'
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function Spinner({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
  return (
    <svg className={`animate-spin ${cls}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function CategoryPill({ category }: { category: string }) {
  const c = CATEGORY_COLORS[category] ?? { dot: 'bg-slate-400', bg: 'bg-slate-50', text: 'text-slate-600' }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {CATEGORY_LABELS[category] || category}
    </span>
  )
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }: { label: string; value: number | string; sub?: string; accent?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex flex-col gap-1 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`text-2xl font-bold tracking-tight ${accent ?? 'text-slate-900'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

// ─── Queue Tab ───────────────────────────────────────────────────────────────
function QueueTab({
  queue, queueLoading, fetchQueue, fetchLearnedCount, learnedCount
}: {
  queue: Ticket[]
  queueLoading: boolean
  fetchQueue: () => void
  fetchLearnedCount: () => void
  learnedCount: number
}) {
  const [filter, setFilter] = useState<'all' | TicketStatus>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const pendingCount  = queue.filter(t => t.status === 'pending').length
  const approvedCount = queue.filter(t => t.status === 'approved').length
  const rejectedCount = queue.filter(t => t.status === 'rejected').length
  const autoCount     = queue.filter(t => t.autoApproved).length

  const filtered = queue.filter(t => filter === 'all' || t.status === filter)

  async function approveTicket(id: string, draft: string) {
    await fetch('/api/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, editedResponse: draft })
    })
    setExpandedId(null)
    fetchQueue()
    fetchLearnedCount()
  }

  async function rejectTicket(id: string) {
    await fetch('/api/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    setExpandedId(null)
    fetchQueue()
  }

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Tickets"   value={queue.length}   sub="all time" />
        <StatCard label="Pending Review"  value={pendingCount}   sub="needs action" accent={pendingCount > 0 ? 'text-amber-600' : undefined} />
        <StatCard label="Auto-approved"   value={autoCount}      sub="no review needed" accent="text-green-600" />
        <StatCard label="Learned"         value={learnedCount}   sub="in memory" accent="text-indigo-600" />
      </div>

      {/* Filter tabs + refresh */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => {
            const count = f === 'all' ? queue.length : f === 'pending' ? pendingCount : f === 'approved' ? approvedCount : rejectedCount
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs font-medium px-3.5 py-1.5 rounded-lg transition-all capitalize ${
                  filter === f
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}{' '}
                <span className={`${filter === f ? 'text-slate-400' : 'text-slate-400'}`}>{count}</span>
              </button>
            )
          })}
        </div>
        <button
          onClick={fetchQueue}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Card list */}
      <div className="space-y-2">
        {queueLoading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
            <Spinner />
            <span className="text-sm">Loading queue...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-600">No tickets yet</p>
              <p className="text-xs text-slate-400 mt-1">Go to Submit to generate your first draft.</p>
            </div>
          </div>
        ) : filtered.map(ticket => {
          const isExpanded = expandedId === ticket.id
          return (
            <div
              key={ticket.id}
              className={`bg-white rounded-xl border border-slate-200 border-l-[3px] ${STATUS_LEFT[ticket.status]} transition-all hover:shadow-sm ${isExpanded ? 'shadow-sm' : ''}`}
            >
              {/* Card header — always visible */}
              <div
                className="px-5 py-4 cursor-pointer flex items-center gap-4"
                onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 leading-snug line-clamp-1">{ticket.question}</p>
                  <div className="flex items-center flex-wrap gap-2 mt-1.5">
                    <CategoryPill category={ticket.category} />
                    {ticket.district && (
                      <span className="text-xs text-slate-400">{ticket.district}</span>
                    )}
                    <span className="text-xs text-slate-300">·</span>
                    <span className="text-xs text-slate-400">{formatTime(ticket.timestamp)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {ticket.confidence && (
                    <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${CONFIDENCE_BADGE[ticket.confidence.level]}`}
                      title={ticket.confidence.reasoning}>
                      {ticket.confidence.level}
                    </span>
                  )}
                  {ticket.autoApproved && (
                    <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-slate-100 text-slate-500">Auto</span>
                  )}
                  <span className={`text-xs px-2.5 py-0.5 rounded-md font-medium capitalize ${STATUS_BADGE[ticket.status]}`}>
                    {ticket.status}
                  </span>
                  <svg
                    className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Expanded body */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-4" onClick={e => e.stopPropagation()}>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Draft Response</p>
                    <div className="bg-slate-50 rounded-xl px-4 py-3.5 border border-slate-100">
                      <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                        {ticket.approvedResponse || ticket.draft}
                      </p>
                    </div>
                  </div>

                  {ticket.confidence && (
                    <p className="text-xs text-slate-400">
                      Confidence{' '}
                      <span className={`font-semibold ${
                        ticket.confidence.level === 'HIGH' ? 'text-green-600'
                        : ticket.confidence.level === 'LOW' ? 'text-red-500'
                        : 'text-amber-600'
                      }`}>{ticket.confidence.level}</span>
                      {' '}— {ticket.confidence.reasoning}
                    </p>
                  )}

                  {ticket.relevantKbIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {ticket.relevantKbIds.map(id => (
                        <span key={id} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono">{id}</span>
                      ))}
                    </div>
                  )}

                  {ticket.status === 'pending' && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => approveTicket(ticket.id, ticket.draft)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors shadow-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => rejectTicket(ticket.id)}
                        className="px-5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium py-2.5 rounded-lg transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {ticket.status === 'approved' && (
                    <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {ticket.autoApproved ? 'Auto-approved' : 'Approved and sent'}
                    </div>
                  )}

                  {ticket.status === 'rejected' && (
                    <div className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      Rejected
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Submit Tab ───────────────────────────────────────────────────────────────
function SubmitTab({ onSubmitSuccess }: { onSubmitSuccess: () => void }) {
  const [question, setQuestion] = useState('')
  const [district, setDistrict] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null)
  const [editedDraft, setEditedDraft] = useState('')
  const [done, setDone] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  async function submitTicket() {
    if (!question.trim()) return
    setLoading(true)
    setActiveTicket(null)
    setDone(false)
    try {
      const res = await fetch('/api/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, district: district.trim() || undefined })
      })
      const ticket = await res.json() as Ticket
      setActiveTicket(ticket)
      setEditedDraft(ticket.draft)
      setQuestion('')
      onSubmitSuccess()
    } finally {
      setLoading(false)
    }
  }

  async function approveTicket() {
    if (!activeTicket) return
    await fetch('/api/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: activeTicket.id, editedResponse: editedDraft })
    })
    setDone(true)
    setActiveTicket(null)
    onSubmitSuccess()
  }

  async function rejectTicket() {
    if (!activeTicket) return
    await fetch('/api/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: activeTicket.id })
    })
    setDone(true)
    setActiveTicket(null)
    onSubmitSuccess()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Command-palette card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-xl bg-green-600 flex items-center justify-center shadow-sm shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Submit a Support Ticket</p>
              <p className="text-xs text-slate-400">Paste any question. Multi-question emails are handled automatically.</p>
            </div>
          </div>

          <input
            type="text"
            value={district}
            onChange={e => setDistrict(e.target.value)}
            placeholder="District / School (optional)"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-colors mb-3"
          />

          <textarea
            ref={textareaRef}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Paste the support question here..."
            rows={8}
            className="w-full bg-transparent border-0 text-sm text-slate-800 placeholder-slate-400 focus:outline-none resize-none leading-relaxed"
            onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) submitTicket() }}
          />
        </div>

        <div className="px-6 pb-5 pt-3 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400">⌘ + Enter to submit</p>
          <button
            onClick={submitTicket}
            disabled={loading || !question.trim()}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
          >
            {loading ? <><Spinner /> Generating...</> : 'Generate Draft'}
          </button>
        </div>
      </div>

      {/* Done state */}
      {done && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-green-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-green-700 font-medium">Done. Ticket processed and saved to queue.</p>
        </div>
      )}

      {/* Active draft */}
      {activeTicket && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5 flex-wrap">
              <CategoryPill category={activeTicket.category} />
              {activeTicket.district && <span className="text-xs text-slate-400">{activeTicket.district}</span>}
              <span className="text-xs text-slate-300">·</span>
              <span className="text-xs font-mono text-slate-400">{activeTicket.id}</span>
            </div>
            <div className="flex items-center gap-2">
              {activeTicket.confidence && (
                <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${CONFIDENCE_BADGE[activeTicket.confidence.level]}`}
                  title={activeTicket.confidence.reasoning}>
                  {activeTicket.confidence.level}
                </span>
              )}
              {activeTicket.autoApproved
                ? <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-green-50 text-green-700 ring-1 ring-green-200">Auto-approved</span>
                : <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200">Needs review</span>
              }
            </div>
          </div>

          <div className="px-5 py-5 space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Draft Response</p>
            <textarea
              value={editedDraft}
              onChange={e => setEditedDraft(e.target.value)}
              rows={10}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white resize-none transition-colors leading-relaxed"
            />
            {!activeTicket.autoApproved && (
              <div className="flex gap-2">
                <button
                  onClick={approveTicket}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-3 rounded-xl transition-colors shadow-sm"
                >
                  Approve &amp; Send
                </button>
                <button
                  onClick={rejectTicket}
                  className="px-5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium py-3 rounded-xl transition-colors"
                >
                  Reject
                </button>
              </div>
            )}
            {activeTicket.relevantKbIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {activeTicket.relevantKbIds.map(id => (
                  <span key={id} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono">{id}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── KB Tab ───────────────────────────────────────────────────────────────────
const KB_CATEGORIES = ['login', 'hardware', 'attendance', 'hall_passes', 'rooms', 'printer', 'training']

function KBTab() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [entries, setEntries] = useState<Array<{ id: string; category: string; question: string; answer: string }>>([])

  useEffect(() => {
    fetch('/api/kb')
      .then(r => r.json())
      .then(data => setEntries(data))
      .catch(() => {})
  }, [])

  const byCategory: Record<string, typeof entries> = {}
  for (const cat of KB_CATEGORIES) byCategory[cat] = []
  for (const e of entries) {
    if (!byCategory[e.category]) byCategory[e.category] = []
    byCategory[e.category].push(e)
  }

  if (entries.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-center py-20 text-slate-400 gap-3">
          <Spinner />
          <span className="text-sm">Loading knowledge base...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Knowledge Base</h2>
        <p className="text-xs text-slate-400 mt-1">{entries.length} entries · used for semantic retrieval on every ticket</p>
      </div>
      {KB_CATEGORIES.filter(cat => byCategory[cat]?.length > 0).map(cat => {
        const c = CATEGORY_COLORS[cat] ?? { dot: 'bg-slate-400', bg: 'bg-slate-50', text: 'text-slate-600' }
        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${c.dot}`} />
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {CATEGORY_LABELS[cat] || cat}
              </p>
              <span className="text-xs text-slate-400">({byCategory[cat].length})</span>
            </div>
            <div className="space-y-1.5">
              {byCategory[cat].map(entry => (
                <div
                  key={entry.id}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                    className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono text-slate-400 shrink-0">{entry.id}</span>
                      <p className="text-sm text-slate-700 font-medium truncate">{entry.question}</p>
                    </div>
                    <svg
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ml-3 ${expandedId === entry.id ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedId === entry.id && (
                    <div className="px-4 pb-4 border-t border-slate-100 pt-3">
                      <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">{entry.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const [tab, setTab] = useState<Tab>('queue')
  const [queue, setQueue] = useState<Ticket[]>([])
  const [queueLoading, setQueueLoading] = useState(true)
  const [learnedCount, setLearnedCount] = useState(0)

  const fetchQueue = useCallback(async () => {
    const res = await fetch('/api/queue')
    const data = await res.json() as Ticket[]
    setQueue(data)
    setQueueLoading(false)
  }, [])

  const fetchLearnedCount = useCallback(async () => {
    const res = await fetch('/api/learned-count')
    if (res.ok) {
      const data = await res.json() as { count: number }
      setLearnedCount(data.count)
    }
  }, [])

  useEffect(() => {
    fetchQueue()
    fetchLearnedCount()
  }, [fetchQueue, fetchLearnedCount])

  const pendingCount = queue.filter(t => t.status === 'pending').length

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'queue',
      label: 'Queue',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      )
    },
    {
      id: 'submit',
      label: 'Submit',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      id: 'kb',
      label: 'Knowledge Base',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    }
  ]

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">

      {/* Top nav */}
      <header className="bg-white border-b border-slate-200 px-6 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center gap-6 h-14">

          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center shadow-sm">
              <span className="text-white text-xs font-bold">M</span>
            </div>
            <span className="text-sm font-semibold text-slate-900">MOOV Support</span>
          </div>

          <div className="w-px h-5 bg-slate-200" />

          {/* Tabs */}
          <nav className="flex items-center gap-0.5 flex-1">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.id
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {t.icon}
                {t.label}
                {t.id === 'queue' && pendingCount > 0 && (
                  <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md leading-none">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Right actions */}
          <Link
            href="/analytics"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg hover:border-slate-300 transition-colors shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Analytics
          </Link>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        {tab === 'queue' && (
          <QueueTab
            queue={queue}
            queueLoading={queueLoading}
            fetchQueue={fetchQueue}
            fetchLearnedCount={fetchLearnedCount}
            learnedCount={learnedCount}
          />
        )}
        {tab === 'submit' && (
          <SubmitTab
            onSubmitSuccess={() => {
              fetchQueue()
              fetchLearnedCount()
            }}
          />
        )}
        {tab === 'kb' && <KBTab />}
      </main>
    </div>
  )
}
