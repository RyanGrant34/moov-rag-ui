'use client'

import { useState, useEffect, useCallback } from 'react'

type TicketStatus = 'pending' | 'approved' | 'rejected'

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

const STATUS_STYLES: Record<TicketStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  approved: 'bg-green-50 text-green-700 border border-green-200',
  rejected: 'bg-red-50 text-red-700 border border-red-200'
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function Home() {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null)
  const [editedDraft, setEditedDraft] = useState('')
  const [queue, setQueue] = useState<Ticket[]>([])
  const [queueLoading, setQueueLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [filter, setFilter] = useState<'all' | TicketStatus>('all')

  const fetchQueue = useCallback(async () => {
    const res = await fetch('/api/queue')
    const data = await res.json()
    setQueue(data)
    setQueueLoading(false)
  }, [])

  useEffect(() => { fetchQueue() }, [fetchQueue])

  async function submitTicket() {
    if (!question.trim()) return
    setLoading(true)
    setActiveTicket(null)
    try {
      const res = await fetch('/api/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      })
      const ticket = await res.json()
      setActiveTicket(ticket)
      setEditedDraft(ticket.draft)
      setQuestion('')
      fetchQueue()
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

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center">
            <span className="text-white text-xs font-semibold">M</span>
          </div>
          <span className="font-semibold text-slate-900 text-sm">MOOV Support</span>
          <span className="text-slate-300 text-sm">·</span>
          <span className="text-slate-500 text-sm">AI Draft Queue</span>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
            {pendingCount} pending review
          </div>
        )}
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">New Ticket</h1>
            <p className="text-sm text-slate-500 mt-1">Paste an incoming support question. The RAG drafts a response in seconds.</p>
          </div>

          <div className="space-y-3">
            <textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Paste the support question here..."
              rows={6}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) submitTicket() }}
            />
            <button
              onClick={submitTicket}
              disabled={loading || !question.trim()}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Generating draft...
                </>
              ) : 'Generate Draft'}
            </button>
            <p className="text-xs text-slate-400 text-center">Cmd + Enter to submit</p>
          </div>

          {activeTicket && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">{activeTicket.id}</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-slate-500">{CATEGORY_LABELS[activeTicket.category] || activeTicket.category}</span>
                </div>
                <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Pending review</span>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Draft Response</p>
                <textarea
                  value={editedDraft}
                  onChange={e => setEditedDraft(e.target.value)}
                  rows={10}
                  className="w-full text-sm text-slate-800 border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => approveTicket(activeTicket.id, editedDraft)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                  >
                    Approve & Send
                  </button>
                  <button
                    onClick={() => rejectTicket(activeTicket.id)}
                    className="px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium py-2 rounded-lg transition-colors"
                  >
                    Reject
                  </button>
                </div>
                {activeTicket.relevantKbIds.length > 0 && (
                  <p className="text-xs text-slate-400">KB references: {activeTicket.relevantKbIds.join(', ')}</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Review Queue</h2>
            <button onClick={fetchQueue} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Refresh</button>
          </div>

          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors capitalize ${
                  filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {f === 'all' ? `All (${queue.length})` :
                 f === 'pending' ? `Pending (${queue.filter(t => t.status === 'pending').length})` :
                 f === 'approved' ? `Approved (${queue.filter(t => t.status === 'approved').length})` :
                 `Rejected (${queue.filter(t => t.status === 'rejected').length})`}
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {queueLoading ? (
              <div className="text-center py-12 text-sm text-slate-400">Loading queue...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-400">No tickets here yet.</div>
            ) : filtered.map(ticket => (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(selectedTicket?.id === ticket.id ? null : ticket)}
                className="border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-slate-300 transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="text-sm text-slate-800 font-medium line-clamp-2 flex-1">{ticket.question}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 capitalize ${STATUS_STYLES[ticket.status]}`}>
                    {ticket.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{ticket.id}</span>
                  <span>·</span>
                  <span>{CATEGORY_LABELS[ticket.category] || ticket.category}</span>
                  <span>·</span>
                  <span>{formatTime(ticket.timestamp)}</span>
                </div>

                {selectedTicket?.id === ticket.id && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-3" onClick={e => e.stopPropagation()}>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Draft</p>
                    <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{ticket.approvedResponse || ticket.draft}</p>
                    {ticket.status === 'pending' && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => approveTicket(ticket.id, ticket.draft)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-2 rounded-lg transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => rejectTicket(ticket.id)}
                          className="px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium py-2 rounded-lg transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {ticket.status === 'approved' && (
                      <div className="flex items-center gap-1.5 text-xs text-green-600">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                        Approved and sent
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
