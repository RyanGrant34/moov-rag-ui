/**
 * Structured JSON logger. Outputs to stdout/stderr with timestamp, level,
 * message, and optional context. Keeps internal details server-side only.
 */

type LogLevel = 'info' | 'warn' | 'error'

interface LogPayload {
  timestamp: string
  level: LogLevel
  message: string
  context?: Record<string, unknown>
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const payload: LogPayload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context !== undefined ? { context } : {})
  }
  const line = JSON.stringify(payload)
  if (level === 'error') {
    console.error(line)
  } else {
    console.log(line)
  }
}

export const logger = {
  info(message: string, context?: Record<string, unknown>) {
    log('info', message, context)
  },
  warn(message: string, context?: Record<string, unknown>) {
    log('warn', message, context)
  },
  error(message: string, context?: Record<string, unknown>) {
    log('error', message, context)
  }
}
