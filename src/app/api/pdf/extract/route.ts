import { handle, ok, err } from '@/lib/api/response'
import { extractTextFromPdf } from '@/lib/pdf/extract'

// Secours de lecture PDF : quand pdf.js échoue côté navigateur (fréquent sur
// mobile), on lit le texte côté serveur avec pdf-parse. STATELESS : le fichier
// est lu en mémoire et n'est JAMAIS stocké. Le navigateur reste prioritaire
// (le fichier ne part au serveur que si la lecture locale échoue).

export const runtime = 'nodejs'
export const maxDuration = 30

const MAX_BYTES = 15 * 1024 * 1024

export async function POST(req: Request) {
  return handle(async () => {
    const buf = Buffer.from(await req.arrayBuffer())
    if (buf.length === 0) return err('VALIDATION_ERROR', 'Aucun fichier reçu.')
    if (buf.length > MAX_BYTES) return err('VALIDATION_ERROR', 'Fichier trop lourd (max 15 Mo).')
    const text = await extractTextFromPdf(buf)
    if (!text || text.trim().length < 20) {
      return err('STORAGE_ERROR', 'PDF illisible (document scanné ou protégé).')
    }
    return ok({ text })
  })
}
