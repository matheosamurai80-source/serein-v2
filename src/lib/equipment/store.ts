import type { EquipmentItem } from './logic'

// Stockage local des garanties (sur l'appareil). La synchro cloud viendra plus
// tard ; pour l'instant, comme PanierMalin, tout reste en localStorage — zéro
// dépendance réseau, la vie privée par défaut.

const KEY = 'serein.equipment'

function read(): EquipmentItem[] {
  if (typeof window === 'undefined') return []
  try {
    const rows = JSON.parse(window.localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(rows) ? (rows as EquipmentItem[]) : []
  } catch { return [] }
}

function write(items: EquipmentItem[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(KEY, JSON.stringify(items))
}

export function listEquipment(): EquipmentItem[] {
  return read()
}

export function addEquipment(draft: Omit<EquipmentItem, 'id'>): EquipmentItem {
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `eq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const item: EquipmentItem = { ...draft, id }
  write([item, ...read()])
  return item
}

export function setEquipmentPhoto(id: string, hasPhoto: boolean): void {
  write(read().map(i => (i.id === id ? { ...i, has_photo: hasPhoto } : i)))
}

export function removeEquipment(id: string): void {
  write(read().filter(i => i.id !== id))
}
