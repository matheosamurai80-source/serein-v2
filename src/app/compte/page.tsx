'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { FoyerTabs } from '@/components/ui/foyer-tabs'
import { useToast, Toast } from '@/components/ui/toast'
import { LegalFooter } from '@/components/legal'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { activeServiceKeys, deleteConfirmed, SERVICE_LABELS, type ServiceKey } from '@/lib/services/logic'
import { clearGuestData, hasGuestData } from '@/lib/data/local'

// Mon compte : où sont mes données, quels services sont actifs, et comment
// TOUT effacer (RGPD) — que l'on ait un compte ou non.

export default function ComptePage() {
  const toast = useToast()
  const [email, setEmail] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [services, setServices] = useState<ServiceKey[]>([])
  const [confirm, setConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [localData, setLocalData] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        setLocalData(hasGuestData(window.localStorage))
      } catch { /* stockage indisponible */ }
      try {
        const supabase = createSupabaseBrowserClient()
        const { data: { session } } = await supabase.auth.getSession()
        setEmail(session?.user?.email ?? null)
        if (session) {
          const { data } = await supabase.from('user_services').select('service_key, status')
          setServices(activeServiceKeys(data))
        }
      } catch { /* env Supabase absente : la page reste consultable */ }
      setLoaded(true)
    })()
  }, [])

  const clearDevice = () => {
    try {
      clearGuestData(window.localStorage)
      for (const k of ['serein.sender', 'serein-email']) window.localStorage.removeItem(k)
      setLocalData(false)
      toast.show('Données de cet appareil effacées ✓')
    } catch {
      toast.show('Effacement impossible sur ce navigateur.')
    }
  }

  const deleteAccount = async () => {
    if (!deleteConfirmed(confirm) || deleting) return
    setDeleting(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase.rpc('delete_my_account')
      if (error) throw new Error(error.message)
      try { clearGuestData(window.localStorage) } catch { /* déjà fait ou indisponible */ }
      await supabase.auth.signOut()
      toast.show('Compte et données supprimés définitivement.')
      setTimeout(() => { window.location.href = '/' }, 1200)
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Suppression impossible.')
      setDeleting(false)
    }
  }

  return (
    <>
      <FoyerTabs />
      <main className="min-h-screen max-w-[560px] mx-auto px-5 py-8 flex flex-col items-center animate-fade-up">
        <p className="font-mono text-[11px] tracking-[.17em] uppercase text-moss mb-5 flex items-center gap-2.5">
          <span className="w-6 h-px bg-moss" />Mon compte<span className="w-6 h-px bg-moss" />
        </p>
        <h1 className="font-serif text-[clamp(26px,5.5vw,40px)] tracking-[-0.025em] leading-[1.15] text-ink mb-3 text-center">
          Vos données, <em className="text-moss">votre décision.</em>
        </h1>

        {loaded && (
          <div className="w-full flex flex-col gap-4 mt-4">
            {/* Statut */}
            <div className="w-full bg-surface border border-ink/10 rounded-2xl p-5">
              <p className="font-mono text-[11px] tracking-[.13em] uppercase text-ink/50 mb-2">Statut</p>
              {email ? (
                <p className="text-sm text-ink/80 leading-[1.6]">
                  Connecté : <strong className="text-ink">{email}</strong>.<br />
                  Vos engagements, rappels et lettres sont stockés chez Supabase (UE) et
                  accessibles uniquement par votre compte.
                  {email === 'julienpeltier60@gmail.com' && (
                    <> <a href="/admin" className="text-moss underline" data-testid="lien-admin">Dashboard administrateur →</a></>
                  )}
                </p>
              ) : (
                <p className="text-sm text-ink/80 leading-[1.6]">
                  Mode sans compte : tout est enregistré <strong className="text-ink">sur cet appareil</strong>,
                  rien ne part sur un serveur.{' '}
                  <a href="/connexion" className="text-moss underline">Créer un compte</a> pour retrouver
                  vos données partout (transfert automatique).
                </p>
              )}
            </div>

            {/* Services */}
            <div className="w-full bg-surface border border-ink/10 rounded-2xl p-5" data-testid="services">
              <p className="font-mono text-[11px] tracking-[.13em] uppercase text-ink/50 mb-2">Mes services</p>
              {services.length > 0 ? (
                <ul className="flex flex-col gap-1.5 text-sm text-ink/80">
                  {services.map(k => <li key={k}>✅ {SERVICE_LABELS[k]}</li>)}
                </ul>
              ) : (
                <p className="text-sm text-ink/80 leading-[1.6]">
                  Serein et PanierMalin sont actuellement <strong className="text-ink">inclus gratuitement</strong>.
                  À terme, un abonnement unique couvrira plusieurs services activables à la demande.
                </p>
              )}
            </div>

            {/* Export RGPD (portabilité) — compte connecté uniquement */}
            {email && (
              <div className="w-full bg-surface border border-ink/10 rounded-2xl p-5">
                <p className="font-mono text-[11px] tracking-[.13em] uppercase text-ink/50 mb-2">Portabilité (RGPD)</p>
                <p className="text-sm text-ink/80 leading-[1.6] mb-3">
                  Téléchargez vos engagements et vos services dans un fichier CSV lisible
                  (Excel, LibreOffice…). Vos données vous appartiennent.
                </p>
                <a
                  href="/api/export-csv"
                  data-testid="export-csv"
                  className="inline-block text-[13px] font-semibold bg-sage text-cream rounded-full px-5 py-2.5 hover:bg-sage-light transition-colors"
                >
                  📥 Exporter mes données (CSV)
                </a>
              </div>
            )}

            {/* Effacement local */}
            {localData && (
              <div className="w-full bg-surface border border-ink/10 rounded-2xl p-5">
                <p className="font-mono text-[11px] tracking-[.13em] uppercase text-ink/50 mb-2">Cet appareil</p>
                <p className="text-sm text-ink/80 leading-[1.6] mb-3">
                  Des données Serein (mode sans compte) existent sur cet appareil.
                </p>
                <Button variant="secondary" size="md" onClick={clearDevice} data-testid="clear-device">
                  Effacer les données de cet appareil
                </Button>
              </div>
            )}

            {/* Suppression définitive */}
            {email && (
              <div className="w-full bg-crimson/5 border border-crimson/25 rounded-2xl p-5" data-testid="danger">
                <p className="font-mono text-[11px] tracking-[.13em] uppercase text-crimson mb-2">Zone irréversible</p>
                <p className="text-sm text-ink/80 leading-[1.6] mb-3">
                  Supprimer mon compte et <strong className="text-ink">toutes</strong> mes données
                  (engagements, rappels, lettres, services). Immédiat et définitif.
                  Tapez <strong className="text-crimson">SUPPRIMER</strong> pour confirmer :
                </p>
                <input
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="SUPPRIMER"
                  data-testid="confirm-input"
                  className="w-full bg-surface border border-ink/12 rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink/35 focus:outline-none focus:border-crimson/60 transition-colors mb-3"
                />
                <Button
                  onClick={deleteAccount}
                  loading={deleting}
                  disabled={!deleteConfirmed(confirm)}
                  data-testid="delete-account"
                  className={`!bg-crimson hover:!bg-crimson/85 ${!deleteConfirmed(confirm) ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  Supprimer mon compte et mes données
                </Button>
              </div>
            )}
          </div>
        )}

        <LegalFooter />
        <Toast message={toast.message} visible={toast.visible} onHide={toast.hide} />
      </main>
    </>
  )
}
