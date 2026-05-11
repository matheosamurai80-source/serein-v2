// ─── LOGGER ────────────────────────────────────────────────────────────────
// Production: structured JSON logs
// Development: pretty print
type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, unknown>
  error?: { message: string; stack?: string }
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context && { context }),
    ...(error && { error: { message: error.message, stack: error.stack } }),
  }

  if (process.env['NODE_ENV'] === 'development') {
    const colors = { info: '\x1b[36m', warn: '\x1b[33m', error: '\x1b[31m', debug: '\x1b[90m' }
    console.log(`${colors[level]}[${level.toUpperCase()}]\x1b[0m ${message}`, context ?? '')
  } else {
    console.log(JSON.stringify(entry))
  }
}

export const logger = {
  info:  (msg: string, ctx?: Record<string, unknown>) => log('info', msg, ctx),
  warn:  (msg: string, ctx?: Record<string, unknown>) => log('warn', msg, ctx),
  error: (msg: string, err?: Error, ctx?: Record<string, unknown>) => log('error', msg, ctx, err),
  debug: (msg: string, ctx?: Record<string, unknown>) => log('debug', msg, ctx),
}
