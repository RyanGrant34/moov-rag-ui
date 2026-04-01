'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type TicketStatus = 'pending' | 'approved' | 'rejected'
type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW'

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

const CATEGORY_COLORS: Record<string, string> = {
  login: 'bg-blue-500',
  hardware: 'bg-orange-500',
  attendance: 'bg-purple-500',
  hall_passes: 'bg-cyan-500',
  rooms: 'bg-indigo-500',
  printer: 'bg-rose-500',
  training: 'bg-emerald-500'
}

const STATUS_BORDER: Record<TicketStatus, string> = {
  pending: 'border-l-amber-400',
  approved: 'border-l-green-500',
  rejected: 'border-l-red-400'
}

const STATUS_BADGE: Record<TicketStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  approved: 'bg-green-50 text-green-700 ring-1 ring-green-200',
  rejected: 'bg-red-50 text-red-700 ring-1 ring-red-200'
}

const CONFIDENCE_BADGE: Record<ConfidenceLevel, string> = {
  HIGH: 'bg-green-50 text-green-700 ring-1 ring-green-200',
  MEDIUM: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  LOW: 'bg-red-50 text-red-700 ring-1 ring-red-200'
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function CategoryDot({ category }: { category: string }) {
  const color = CATEGORY_COLORS[category] ?? 'bg-slate-400'
  return <span className={`inline-block w-2 h-2 rounded-full ${color} shrink-0`} />
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export default function Home() {
  const [question, setQuestion] = useState('')
  const [district, setDistrict] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null)
  const [editedDraft, setEditedDraft] = useState('')
  const [queue, setQueue] = useState<Ticket[]>([])
  const [queueLoading, setQueueLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [filter, setFilter] = useState<'all' | TicketStatus>('all')
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

  async function submitTicket() {
    if (!question.trim()) return
    setLoading(true)
    setActiveTicket(null)
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
      fetchQueue()
      fetchLearnedCount()
    } finally {
      setLoading(false)
    }
  }

  async function approveTicket(id: string, draft: string) {
    await fetch('/api/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, editedResponse: draft })
    })
    setActiveTicket(null)
    setSelectedTicket(null)
    fetchQueue()
    fetchLearnedCount()
  }

  async function rejectTicket(id: string) {
    await fetch('/api/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    setActiveTicket(null)
    setSelectedTicket(null)
    fetchQueue()
  }

  const filtered = queue.filter(t => filter === 'all' || t.status === filter)
  const pendingCount = queue.filter(t => t.status === 'pending').length
  const approvedCount = queue.filter(t => t.status === 'approved').length
  const rejectedCount = queue.filter(t => t.status === 'rejected').length

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">

      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center shadow-sm">
              <span className="text-white text-xs font-bold tracking-tight">M</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 leading-none">MOOV</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Support AI</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-green-50 text-green-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-sm font-medium">Queue</span>
            {pendingCount > 0 && (
              <span className="ml-auto text-xs font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md">
                {pendingCount}
              </span>
            )}
          </div>

          <Link
            href="/analytics"
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-sm font-medium">Analytics</span>
          </Link>
        </nav>

        {/* Bottom stats */}
        <div className="px-4 py-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Total tickets</span>
            <span className="text-xs font-semibold text-slate-700">{queue.length}</span>
          </div>
          {learnedCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              <span className="text-xs text-slate-500">
                {learnedCount} learned response{learnedCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">

        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-base font-semibold text-slate-900">Draft Queue</h1>
            <p className="text-xs text-slate-400 mt-0.5">Submit a support ticket. AI drafts the response. You approve or reject.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {pendingCount} pending
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                {approvedCount} approved
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                {rejectedCount} rejected
              </span>
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-0 overflow-hidden">

          {/* Left: Submit form */}
          <div className="border-r border-slate-200 bg-white flex flex-col overflow-y-auto">
            <div className="px-6 py-6 space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">New Ticket</h2>
                <p className="text-xs text-slate-400 mt-1">Paste an incoming support email. Multi-question emails are parsed automatically.</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1.5 block">District / School</label>
                  <input
                    type="text"
                    value={district}
                    onChange={e => setDistrict(e.target.value)}
                    placeholder="Optional — adds context to the draft"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1.5 block">Support Question</label>
                  <textarea
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    placeholder="Paste the support question here..."
                    rows={7}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent focus:bg-white resize-none transition-colors"
                    onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) submitTicket() }}
                  />
                </div>
                <button
                  onClick={submitTicket}
                  disabled={loading || !question.trim()}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  {loading ? (
                    <>
                      <Spinner />
                      Generating draft...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Generate Draft
                    </>
                  )}
                </button>
                <p className="text-xs text-slate-400 text-center">⌘ + Enter to submit</p>
              </div>

              {/* Active ticket draft */}
              {activeTicket && (
                <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <CategoryDot category={activeTicket.category} />
                        <span className="text-xs font-medium text-slate-700 truncate">
                          {CATEGORY_LABELS[activeTicket.category] || activeTicket.category}
                        </span>
                        {activeTicket.district && (
                          <span className="text-xs text-slate-400 truncate">· {activeTicket.district}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {activeTicket.confidence && (
                          <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${CONFIDENCE_BADGE[activeTicket.confidence.level]}`}
                            title={activeTicket.confidence.reasoning}>
                            {activeTicket.confidence.level}
                          </span>
                        )}
                        {activeTicket.autoApproved ? (
                          <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-green-50 text-green-700 ring-1 ring-green-200">Auto</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200">Review</span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 font-mono">{activeTicket.id}</p>
                  </div>

                  <div className="p-4 space-y-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Draft Response</p>
                    <textarea
                      value={editedDraft}
                      onChange={e => setEditedDraft(e.target.value)}
                      rows={10}
                      className="w-full text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white resize-none transition-colors leading-relaxed"
                    />
                    {!activeTicket.autoApproved && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => approveTicket(activeTicket.id, editedDraft)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors shadow-sm"
                        >
                          Approve &amp; Send
                        </button>
                        <button
                          onClick={() => rejectTicket(activeTicket.id)}
                          className="px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium py-2.5 rounded-lg transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {activeTicket.relevantKbIds.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {activeTicket.relevantKbIds.map(id => (
                          <span key={id} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-mono">{id}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Queue */}
          <div className="flex flex-col overflow-hidden bg-[#f8fafc]">
            <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                {(['all', 'pending', 'approved', 'rejected'] as const).map(f => {
                  const count = f === 'all' ? queue.length
                    : f === 'pending' ? pendingCount
                    : f === 'approved' ? approvedCount
                    : rejectedCount
                  return (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all capitalize ${
                        filter === f
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                      <span className={`ml-1.5 ${filter === f ? 'text-slate-500' : 'text-slate-400'}`}>
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
              <button
                onClick={fetchQueue}
                className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1.5 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {queueLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                  <Spinner />
                  <span className="text-sm">Loading queue...</span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-600">No tickets yet</p>
                    <p className="text-xs text-slate-400 mt-1">Submit a question on the left to generate your first draft.</p>
                  </div>
                </div>
              ) : filtered.map(ticket => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(selectedTicket?.id === ticket.id ? null : ticket)}
                  className={`bg-white rounded-xl border-l-[3px] border border-slate-200 ${STATUS_BORDER[ticket.status]} p-4 cursor-pointer hover:shadow-sm hover:border-slate-300 transition-all`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-sm text-slate-800 font-medium line-clamp-2 flex-1 leading-snug">
                      {ticket.question}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      {ticket.confidence && (
                        <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${CONFIDENCE_BADGE[ticket.confidence.level]}`}>
                          {ticket.confidence.level}
                        </span>
                      )}
                      {ticket.autoApproved && (
                        <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-slate-100 text-slate-600">
                          Auto
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-md font-medium capitalize ${STATUS_BADGE[ticket.status]}`}>
                        {ticket.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                    <CategoryDot category={ticket.category} />
                    <span>{CATEGORY_LABELS[ticket.category] || ticket.category}</span>
                    {ticket.district && (
                      <>
                        <span>·</span>
                        <span>{ticket.district}</span>
                      </>
                    )}
                    <span>·</span>
                    <span>{formatTime(ticket.timestamp)}</span>
                    <span>·</span>
                    <span className="font-mono">{ticket.id}</span>
                  </div>

                  {selectedTicket?.id === ticket.id && (
                    <div
                      className="mt-4 pt-4 border-t border-slate-100 space-y-3"
                      onClick={e => e.stopPropagation()}
                    >
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Draft Response</p>
                      <div className="bg-slate-50 rounded-lg px-4 py-3 border border-slate-100">
                        <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                          {ticket.approvedResponse || ticket.draft}
                        </p>
                      </div>

                      {ticket.confidence && (
                        <p className="text-xs text-slate-400">
                          Confidence:{' '}
                          <span className={`font-medium ${
                            ticket.confidence.level === 'HIGH' ? 'text-green-600'
                            : ticket.confidence.level === 'LOW' ? 'text-red-500'
                            : 'text-amber-600'
                          }`}>
                            {ticket.confidence.level}
                          </span>
                          {' '}— {ticket.confidence.reasoning}
                        </p>
                      )}

                      {ticket.relevantKbIds.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {ticket.relevantKbIds.map(id => (
                            <span key={id} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-mono">{id}</span>
                          ))}
                        </div>
                      )}

                      {ticket.status === 'pending' && (
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => approveTicket(ticket.id, ticket.draft)}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-2.5 rounded-lg transition-colors shadow-sm"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => rejectTicket(ticket.id)}
                            className="px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium py-2.5 rounded-lg transition-colors"
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
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
