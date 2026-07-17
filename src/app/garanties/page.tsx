'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { FoyerTabs } from '@/components/ui/foyer-tabs'
import { useToast, Toast } from '@/components/ui/toast'
import { listEquipment, addEquipment, removeEquipment, setEquipmentPhoto } from '@/lib/equipment/store'
import { savePhoto, loadPhotoUrl, deletePhoto } from '@/lib/equipment/photos'
import { warrantyStatus, extractPurchaseInfo, type EquipmentItem, type WarrantyUrgency } from '@/lib/equipment/logic'

// Pavé Équipement & Garanties : tu achètes un appareil, Serein te prévient AVANT
// la fin de garantie. Ajout manuel ou en collant le ticket (l'enseigne, la date
// et le prix se remplissent tout seuls). Aucune donnée ne quitte l'appareil.

const today = () => new Date().toISOString().slice(0, 10)
const frDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

const URGENCY_UI: Record<WarrantyUrgency, { badge: string; label: (d: number) => string }> = {
  expiree: { badge: 'bg-ink/8 text-ink/50 border-ink/12', label: () => 'Garantie terminée' },
  bientot: { badge: 'bg-amber/15 text-amber border-amber/30', label: d => `Bientôt finie · ${d} j` },
  ok:      { badge: 'bg-sage/12 text-moss border-sage/25', label: d => `Sous garantie · ${d} j` },
}

const inputCls = 'w-full bg-surface border border-ink/12 rounded-xl px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/35 focus:outline-none focus:border-sage/60 transition-colors'
const labelCls = 'font-mono text-[10.5px] tracking-[.12em] uppercase text-ink/50 mb-1 block'

export default function GarantiesPage() {
  const toast = useToast()
  const [items, setItems] = useState<EquipmentItem[]>([])
  const [name, setName] = useState('')
  const [date, setDate] = useState(today())
  const [retailer, setRetailer] = useState('')
  const [price, setPrice] = useState('')
  const [months, setMonths] = useState(24)
  const [paste, setPaste] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [viewId, setViewId] = useState<string | null>(null)
  const [viewUrl, setViewUrl] = useState<string | null>(null)

  const refresh = () => setItems(listEquipment())
  useEffect(() => { setItems(listEquipment()) }, [])

  const fillFromTicket = () => {
    const info = extractPurchaseInfo(paste)
    if (!info.date && !info.retailer && !info.price) { toast.show('Rien reconnu dans ce texte.'); return }
    if (info.date) setDate(info.date)
    if (info.retailer) setRetailer(info.retailer)
    if (info.price != null) setPrice(String(info.price))
    toast.show('Ticket lu — vérifie et donne un nom à l’appareil.')
  }

  const add = async () => {
    if (!name.trim()) { toast.show('Donne un nom à l’appareil (ex. Lave-linge Bosch).'); return }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { toast.show('Indique la date d’achat.'); return }
    const item = addEquipment({
      name: name.trim(),
      purchase_date: date,
      retailer: retailer.trim() || null,
      price: price ? parseFloat(price.replace(',', '.')) || null : null,
      warranty_months: months,
    })
    if (photo) {
      try { await savePhoto(item.id, photo); setEquipmentPhoto(item.id, true) }
      catch { toast.show('Garantie enregistrée, mais la photo n’a pas pu être gardée.') }
    }
    setName(''); setRetailer(''); setPrice(''); setPaste(''); setDate(today()); setMonths(24); setPhoto(null)
    refresh()
    toast.show('✓ Garantie enregistrée')
  }

  const del = (id: string) => {
    removeEquipment(id)
    void deletePhoto(id)
    if (viewId === id) { setViewId(null); if (viewUrl) URL.revokeObjectURL(viewUrl); setViewUrl(null) }
    refresh()
  }

  const togglePhoto = async (id: string) => {
    if (viewId === id) { // fermer
      setViewId(null); if (viewUrl) URL.revokeObjectURL(viewUrl); setViewUrl(null); return
    }
    if (viewUrl) URL.revokeObjectURL(viewUrl)
    const url = await loadPhotoUrl(id)
    if (!url) { toast.show('Photo introuvable.'); return }
    setViewUrl(url); setViewId(id)
  }

  // Tri : le plus urgent d'abord (fin la plus proche), les terminées en dernier.
  const withStatus = items
    .map(it => ({ it, st: warrantyStatus(it, today()) }))
    .sort((a, b) => (a.st.daysLeft ?? 1e9) - (b.st.daysLeft ?? 1e9))

  return (
    <>
      <FoyerTabs />
      <main className="min-h-screen max-w-[640px] mx-auto px-5 py-8 animate-fade-up">
        <p className="font-mono text-[11px] tracking-[.17em] uppercase text-moss mb-5 flex items-center gap-2.5 justify-center">
          <span className="w-6 h-px bg-moss" />Équipement &amp; garanties<span className="w-6 h-px bg-moss" />
        </p>
        <h1 className="font-serif text-[clamp(24px,5vw,38px)] tracking-[-0.025em] leading-[1.15] text-ink mb-3 text-center">
          Ne perds plus jamais <em className="text-moss">une garantie.</em>
        </h1>
        <p className="text-sm text-ink/70 leading-[1.6] mb-8 text-center max-w-[460px] mx-auto">
          Enregistre tes achats (avec le ticket) : Serein calcule la fin de garantie
          — 2 ans par défaut — et te prévient avant qu’elle expire. Tout reste sur ton appareil.
        </p>

        {/* Ajout */}
        <div className="w-full bg-surface border border-ink/10 rounded-2xl p-4 mb-6 flex flex-col gap-3">
          <div>
            <label className={labelCls}>Coller le ticket (optionnel : remplit date, enseigne, prix)</label>
            <div className="flex gap-2">
              <input value={paste} onChange={e => setPaste(e.target.value)} placeholder="colle le texte du ticket…" className={inputCls} />
              <Button size="sm" variant="secondary" onClick={fillFromTicket} disabled={paste.trim().length < 6}>Lire</Button>
            </div>
          </div>
          <div>
            <label className={labelCls}>Appareil</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="ex. Lave-linge Bosch WAN28" className={inputCls} data-testid="eq-name" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelCls}>Date d’achat</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} data-testid="eq-date" />
            </div>
            <div className="w-[130px]">
              <label className={labelCls}>Garantie</label>
              <select value={months} onChange={e => setMonths(Number(e.target.value))} className={inputCls}>
                <option value={12}>1 an</option>
                <option value={24}>2 ans (légale)</option>
                <option value={36}>3 ans</option>
                <option value={60}>5 ans</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelCls}>Enseigne (optionnel)</label>
              <input value={retailer} onChange={e => setRetailer(e.target.value)} placeholder="ex. Boulanger" className={inputCls} />
            </div>
            <div className="w-[130px]">
              <label className={labelCls}>Prix (optionnel)</label>
              <input inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} placeholder="€" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Photo du ticket / de la facture (la preuve pour la garantie)</label>
            <label htmlFor="eq-photo" className="flex items-center justify-center gap-2 border-[1.5px] border-dashed border-sage/50 rounded-xl py-2.5 text-[13px] text-green-dark cursor-pointer text-moss">
              {photo ? `📷 ${photo.name.slice(0, 28)}` : '📷 Prendre une photo / importer'}
            </label>
            <input id="eq-photo" type="file" accept="image/*" capture="environment" className="hidden"
              onChange={e => setPhoto(e.target.files?.[0] ?? null)} />
          </div>
          <Button onClick={() => void add()} data-testid="eq-add">➕ Enregistrer la garantie</Button>
        </div>

        {/* Liste */}
        {withStatus.length === 0 ? (
          <p className="text-sm text-ink/50 text-center">Aucun équipement suivi pour l’instant.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {withStatus.map(({ it, st }) => {
              const ui = URGENCY_UI[st.urgency]
              return (
                <div key={it.id} data-testid="eq-item" className="bg-surface border border-ink/10 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-ink text-sm">{it.name}</span>
                        <span className={`text-[10.5px] font-semibold border rounded-full px-2.5 py-0.5 ${ui.badge}`}>
                          {st.daysLeft != null ? ui.label(st.daysLeft) : '—'}
                        </span>
                      </span>
                      <span className="block text-xs text-ink/50 mt-0.5">
                        {[it.retailer, it.price != null ? `${it.price.toLocaleString('fr-FR')} €` : null,
                          st.end ? `garantie jusqu’au ${frDate(st.end)}` : null].filter(Boolean).join(' · ')}
                      </span>
                      {it.has_photo && (
                        <button onClick={() => void togglePhoto(it.id)} data-testid="eq-photo-view"
                          className="mt-1.5 font-mono text-[11px] tracking-[.1em] uppercase text-moss underline">
                          📷 {viewId === it.id ? 'masquer le ticket' : 'voir le ticket'}
                        </button>
                      )}
                    </span>
                    <button onClick={() => del(it.id)} aria-label="retirer" className="text-ink/30 hover:text-crimson text-sm mt-0.5">✕</button>
                  </div>
                  {it.has_photo && viewId === it.id && viewUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={viewUrl} alt={`Ticket ${it.name}`} className="mt-3 w-full rounded-xl border border-ink/10" />
                  )}
                </div>
              )
            })}
          </div>
        )}

        <p className="font-mono text-[11px] text-ink/45 tracking-wider text-center mt-6">
          Garantie légale de conformité : 2 ans sur un bien neuf (Code de la consommation).
          Serein t’informe — c’est toi qui fais valoir la garantie.
        </p>

        <Toast message={toast.message} visible={toast.visible} onHide={toast.hide} />
      </main>
    </>
  )
}
