import { scaledDimensions } from './logic'

// Photos de preuve (ticket / facture) stockées EN LOCAL, dans IndexedDB (plus
// large que localStorage, gère les blobs). Chaque photo est compressée avant
// stockage. Rien ne quitte l'appareil.

const DB_NAME = 'serein-equipment'
const STORE = 'photos'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE) }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Redimensionne + réencode en JPEG (~0,7) pour un poids raisonnable. */
async function compress(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const { width, height } = scaledDimensions(bmp.width, bmp.height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bmp, 0, 0, width, height)
  const blob: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.7))
  return blob ?? file
}

/** Enregistre (compressée) la photo de preuve d'un équipement. */
export async function savePhoto(id: string, file: File): Promise<void> {
  const blob = await compress(file)
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(blob, id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/** URL objet de la photo (à révoquer après usage), ou null si absente. */
export async function loadPhotoUrl(id: string): Promise<string | null> {
  const db = await openDb()
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(id)
    req.onsuccess = () => resolve(req.result as Blob | undefined)
    req.onerror = () => reject(req.error)
  })
  return blob ? URL.createObjectURL(blob) : null
}

export async function deletePhoto(id: string): Promise<void> {
  try {
    const db = await openDb()
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
  } catch { /* pas de photo / IndexedDB indispo : sans conséquence */ }
}
