/**
 * In-memory rate limiter: max N requests per IP per window.
 * Uses a sliding window approximation via bucketed timestamps.
 */

interface RateLimitEntry {
  timestamps: number[]
}

const store = new Map<string, RateLimitEntry>()

const MAX_REQUESTS = 20
const WINDOW_MS = 60 * 1000 // 1 minute

export interface RateLimitResult {
  allowed: boolean
  /** Seconds until the oldest request falls outside the window */
  retryAfter: number
}

export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now()
  const entry = store.get(ip) ?? { timestamps: [] }

  // Drop timestamps outside the current window
  const windowStart = now - WINDOW_MS
  const recent = entry.timestamps.filter(t => t > windowStart)

  if (recent.length >= MAX_REQUESTS) {
    const oldest = recent[0]
    const retryAfter = Math.ceil((oldest + WINDOW_MS - now) / 1000)
    store.set(ip, { timestamps: recent })
    return { allowed: false, retryAfter }
  }

  recent.push(now)
  store.set(ip, { timestamps: recent })
  return { allowed: true, retryAfter: 0 }
}
