import { linesFromTextItems, type TextItem } from '@/lib/analyse/logic'

// ─── EXTRACTION PDF 100 % NAVIGATEUR ────────────────────────────────────────
// 1) Extraction du texte natif (pdfjs, chargé dynamiquement).
// 2) Si le PDF est un SCAN (pas de texte réel — cas très fréquent pour les
//    relevés et contrats), secours par reconnaissance optique locale :
//    rendu de la page en image → prétraitement noir/blanc (module partagé
//    avec PanierMalin) → Tesseract (français). Le fichier ne quitte JAMAIS
//    l'appareil ; seul le module OCR est téléchargé au premier usage.

// Import à l'exécution (URL) : invisible pour le bundler, même source que
// les apps statiques → une seule implémentation du prétraitement.
const importRuntime = (u: string): Promise<Record<string, CallableFunction>> =>
  (new Function('u', 'return import(u)'))(u) as Promise<Record<string, CallableFunction>>

export type PhaseLecture = 'texte' | 'ocr'

async function ocrCanvas(canvas: HTMLCanvasElement): Promise<string> {
  // Point d'injection pour les tests (pas de CDN dans le bac à sable)
  const hook = (window as unknown as { __sereinOcr?: (c: HTMLCanvasElement) => Promise<string> }).__sereinOcr
  if (hook) return hook(canvas)
  const T = await importRuntime('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.esm.min.js')
  const worker = await (T.createWorker as (l: string) => Promise<{ recognize: (c: HTMLCanvasElement) => Promise<{ data: { text: string } }>; terminate: () => Promise<void> }>)('fra')
  try {
    const { data } = await worker.recognize(canvas)
    return data.text
  } finally {
    await worker.terminate()
  }
}

const MAX_PAGES_OCR = 3 // au-delà, trop long sur mobile — les 1res pages suffisent

export async function extractPdfText(
  file: File,
  onPhase?: (phase: PhaseLecture) => void
): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise

  onPhase?.('texte')
  const pages: string[] = []
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const content = await page.getTextContent()
    const items: TextItem[] = (content.items as { str?: string; transform?: number[] }[])
      .filter(i => typeof i.str === 'string' && Array.isArray(i.transform))
      .map(i => ({ str: i.str as string, x: i.transform![4], y: i.transform![5] }))
    pages.push(linesFromTextItems(items).join('\n'))
  }
  const texte = pages.join('\n')

  const pre = await importRuntime('/shared/pretraitement.mjs')
  if (!(pre.texteIllisible as (t: string) => boolean)(texte)) return texte

  // PDF scanné → OCR local page par page (prétraitement noir/blanc d'abord)
  onPhase?.('ocr')
  const morceaux: string[] = []
  for (let p = 1; p <= Math.min(doc.numPages, MAX_PAGES_OCR); p++) {
    const page = await doc.getPage(p)
    const viewport = page.getViewport({ scale: 2 })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) break
    await page.render({ canvasContext: ctx, viewport, canvas }).promise
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
    ;(pre.pretraiterRgba as (d: Uint8ClampedArray) => void)(img.data)
    ctx.putImageData(img, 0, 0)
    morceaux.push(await ocrCanvas(canvas))
  }
  return morceaux.join('\n')
}

/**
 * Lecture PDF ROBUSTE : d'abord dans le navigateur (le fichier ne quitte pas
 * l'appareil) ; si pdf.js échoue ou ne rend rien de lisible — cas fréquent sur
 * mobile — SECOURS serveur (pdf-parse, lecture en mémoire, aucun stockage).
 * C'est ce qui fait qu'un relevé « illisible » sur téléphone finit par se lire.
 */
export async function extractPdfTextResilient(
  file: File,
  onPhase?: (phase: PhaseLecture) => void
): Promise<string> {
  try {
    const t = await extractPdfText(file, onPhase)
    if (t && t.trim().length >= 40) return t
  } catch { /* pdf.js indisponible (mobile) → on tente le secours serveur */ }

  const res = await fetch('/api/pdf/extract', {
    method: 'POST',
    headers: { 'content-type': 'application/pdf' },
    body: await file.arrayBuffer(),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok || !body?.ok) {
    throw new Error(body?.error?.message ?? 'Lecture du PDF impossible.')
  }
  return body.data.text as string
}
