import { linesFromTextItems, type TextItem } from '@/lib/analyse/logic'

// ─── EXTRACTION PDF 100 % NAVIGATEUR ────────────────────────────────────────
// pdfjs chargé dynamiquement (gros module) ; le fichier ne quitte jamais
// l'appareil. Utilisé par /analyse (relevés) et /resiliation (contrats).

export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  const pages: string[] = []
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const content = await page.getTextContent()
    const items: TextItem[] = (content.items as { str?: string; transform?: number[] }[])
      .filter(i => typeof i.str === 'string' && Array.isArray(i.transform))
      .map(i => ({ str: i.str as string, x: i.transform![4], y: i.transform![5] }))
    pages.push(linesFromTextItems(items).join('\n'))
  }
  return pages.join('\n')
}
