export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const p = require('pdf-parse')
    const r = await p(buffer) as { text: string }
    return r.text
  } catch { return '' }
}
