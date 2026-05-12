// Server-only PDF text extractor
// Wraps pdf-parse for Next.js App Router compatibility

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    // Dynamic require to avoid Edge runtime issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse')
    const result = await pdfParse(buffer) as { text: string }
    return result.text
  } catch {
    return ''
  }
}
