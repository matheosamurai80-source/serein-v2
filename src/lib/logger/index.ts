type L = 'info'|'warn'|'error'|'debug'
function log(l: L, m: string, ctx?: Record<string,unknown>, err?: Error): void {
  if (process.env['NODE_ENV']==='development') console.log(`[${l.toUpperCase()}] ${m}`, ctx??'')
  else console.log(JSON.stringify({ level: l, message: m, timestamp: new Date().toISOString(), ctx, err: err?.message }))
}
export const logger = {
  info:  (m: string, c?: Record<string,unknown>) => log('info', m, c),
  warn:  (m: string, c?: Record<string,unknown>) => log('warn', m, c),
  error: (m: string, e?: Error, c?: Record<string,unknown>) => log('error', m, c, e),
  debug: (m: string, c?: Record<string,unknown>) => log('debug', m, c),
}
