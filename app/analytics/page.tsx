import { getQueue, Ticket } from '@/lib/queue'
import { CATEGORIES } from '@/lib/knowledge-base'
import { getLearnedCount } from '@/lib/learned'
import Link from 'next/link'

interface CategoryStats {
  category: string
  label: string
  total: number
  pending: number
  approved: number
  autoApproved: number
  editRate: number
  avgConfidence: string
  lowConfidenceCount: number
}

function computeStats(tickets: Ticket[]): CategoryStats[] {
  const cats = Object.keys(CATEGORIES)
  return cats.map(cat => {
    const catTickets = tickets.filter(t => t.category === cat)
    const total = catTickets.length
    const pending = catTickets.filter(t => t.status === 'pending').length
    const approved = catTickets.filter(t => t.status === 'approved').length
    const autoApproved = catTickets.filter(t => t.autoApproved).length
    const approvedTickets = catTickets.filter(t => t.status === 'approved')
    const edited = approvedTickets.filter(t => t.wasEdited).length
    const editRate = approvedTickets.length > 0
      ? Math.round((edited / approvedTickets.length) * 100)
      : 0

    const highConf = catTickets.filter(t => t.confidence?.level === 'HIGH').length
    const medConf = catTickets.filter(t => t.confidence?.level === 'MEDIUM').length
    const lowConf = catTickets.filter(t => t.confidence?.level === 'LOW').length

    let avgConfidence = 'N/A'
    if (total > 0) {
      const score = (highConf * 3 + medConf * 2 + lowConf * 1) / total
      avgConfidence = score >= 2.5 ? 'HIGH' : score >= 1.5 ? 'MEDIUM' : 'LOW'
    }

    return {
      category: cat,
      label: CATEGORIES[cat] || cat,
      total,
      pending,
      approved,
      autoApproved,
      editRate,
      avgConfidence,
      lowConfidenceCount: lowConf
    }
  }).filter(s => s.total > 0)
}

function getTopCategories(stats: CategoryStats[]): CategoryStats[] {
  return [...stats].sort((a, b) => b.total - a.total).slice(0, 3)
}

function getKbGaps(stats: CategoryStats[]): CategoryStats[] {
  return [...stats]
    .filter(s => s.lowConfidenceCount > 0)
    .sort((a, b) => b.lowConfidenceCount - a.lowConfidenceCount)
    .slice(0, 5)
}

const CONF_COLORS: Record<string, string> = {
  HIGH: 'text-green-700 bg-green-50 border-green-200',
  MEDIUM: 'text-amber-700 bg-amber-50 border-amber-200',
  LOW: 'text-red-700 bg-red-50 border-red-200',
  'N/A': 'text-slate-500 bg-slate-50 border-slate-200'
}

export default function AnalyticsPage() {
  const tickets = getQueue()
  const learnedCount = getLearnedCount()
  const stats = computeStats(tickets)

  const totalTickets = tickets.length
  const totalPending = tickets.filter(t => t.status === 'pending').length
  const totalApproved = tickets.filter(t => t.status === 'approved').length
  const totalAutoApproved = tickets.filter(t => t.autoApproved).length

  const maxTotal = Math.max(...stats.map(s => s.total), 1)
  const topCategories = getTopCategories(stats)
  const kbGaps = getKbGaps(stats)

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center">
            <span className="text-white text-xs font-semibold">M</span>
          </div>
          <span className="font-semibold text-slate-900 text-sm">Support Portal</span>
          <span className="text-slate-300 text-sm">·</span>
          <span className="text-slate-500 text-sm">Analytics</span>
        </div>
        <Link
          href="/"
          className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          Back to Queue
        </Link>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Ticket volume, confidence, and KB coverage.</p>
          {learnedCount > 0 && (
            <p className="text-xs text-slate-400 mt-1">Learned from {learnedCount} approved response{learnedCount !== 1 ? 's' : ''}</p>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total tickets', value: totalTickets, color: 'text-slate-900' },
            { label: 'Pending review', value: totalPending, color: 'text-amber-700' },
            { label: 'Approved', value: totalApproved, color: 'text-green-700' },
            { label: 'Auto-approved', value: totalAutoApproved, color: 'text-green-600' }
          ].map(({ label, value, color }) => (
            <div key={label} className="border border-slate-200 rounded-xl p-4">
              <p className={`text-2xl font-semibold ${color}`}>{value}</p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Volume by Category</h2>
          <div className="space-y-3">
            {stats.length === 0 ? (
              <p className="text-sm text-slate-400">No tickets yet.</p>
            ) : (
              [...stats].sort((a, b) => b.total - a.total).map(s => (
                <div key={s.category} className="flex items-center gap-3">
                  <div className="w-32 shrink-0 text-xs text-slate-600 truncate">{s.label}</div>
                  <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                    <div
                      className="bg-green-500 h-full rounded-full"
                      style={{ width: `${Math.round((s.total / maxTotal) * 100)}%` }}
                    />
                  </div>
                  <div className="w-6 text-right text-xs text-slate-500 shrink-0">{s.total}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {stats.length > 0 && (
          <div className="border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Category Detail</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left text-slate-500 font-medium pb-2 pr-4">Category</th>
                    <th className="text-right text-slate-500 font-medium pb-2 px-3">Tickets</th>
                    <th className="text-right text-slate-500 font-medium pb-2 px-3">Approved</th>
                    <th className="text-right text-slate-500 font-medium pb-2 px-3">Auto</th>
                    <th className="text-right text-slate-500 font-medium pb-2 px-3">Edit rate</th>
                    <th className="text-right text-slate-500 font-medium pb-2 pl-3">Avg confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {[...stats].sort((a, b) => b.total - a.total).map(s => (
                    <tr key={s.category} className="border-b border-slate-50">
                      <td className="py-2 pr-4 text-slate-700">{s.label}</td>
                      <td className="py-2 px-3 text-right text-slate-600">{s.total}</td>
                      <td className="py-2 px-3 text-right text-slate-600">{s.approved}</td>
                      <td className="py-2 px-3 text-right text-slate-600">{s.autoApproved}</td>
                      <td className="py-2 px-3 text-right text-slate-600">{s.editRate}%</td>
                      <td className="py-2 pl-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full border text-xs ${CONF_COLORS[s.avgConfidence]}`}>
                          {s.avgConfidence}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {topCategories.length > 0 && (
          <div className="border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Top 3 Most Common</h2>
            <div className="flex gap-3 flex-wrap">
              {topCategories.map((s, i) => (
                <div key={s.category} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <span className="text-xs font-semibold text-slate-400">#{i + 1}</span>
                  <span className="text-xs text-slate-700">{s.label}</span>
                  <span className="text-xs text-slate-400">{s.total} tickets</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {kbGaps.length > 0 && (
          <div className="border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">KB Coverage Gaps</h2>
            <p className="text-xs text-slate-500 mb-4">Categories with the most LOW confidence tickets. Add KB entries here first.</p>
            <div className="space-y-2">
              {kbGaps.map(s => (
                <div key={s.category} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 text-xs">{s.label}</span>
                  <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                    {s.lowConfidenceCount} low confidence
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
