'use client'
import { useOnboardingStore } from '@/stores/onboarding'
import { useToast, Toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

// Écran final de l'onboarding.
// Fonctionnel : envoie vers la partie qui marche (engagements + lettres).
// Propre : aucun appel réseau qui échoue.
// Légal : Serein arme le client (lettres prêtes), il n'agit jamais à sa place.
// La connexion bancaire et l'import PDF automatique sont annoncés « Bientôt ».

export function ScreenConversion() {
  const { simulation, email, setEmail } = useOnboardingStore()
  const toast = useToast()

  const comingSoon = (label: string) =>
    toast.show(`${label} — bientôt disponible. En attendant, ajoutez vos abonnements à la main, c'est déjà prêt.`)

  const rememberEmail = () => {
    if (email) {
      try { localStorage.setItem('serein-email', email) } catch { /* stockage indispo */ }
    }
  }

  return (
    <div className="flex flex-col items-center w-full animate-fade-up">
      <div className="w-[72px] h-[72px] rounded-[22px] bg-sage/12 border border-sage/20 flex items-center justify-center text-[30px] mb-6 animate-float">
        🛡️
      </div>

      <p className="font-mono text-[11px] tracking-[.17em] uppercase text-moss mb-4 flex items-center gap-2.5">
        <span className="w-6 h-px bg-moss" />Prêt à commencer<span className="w-6 h-px bg-moss" />
      </p>

      <h2 className="font-serif text-[clamp(24px,5.5vw,44px)] tracking-[-0.025em] leading-[1.15] text-ink mb-2 text-center">
        Serein veille.<br /><em className="text-moss">Vous décidez.</em>
      </h2>
      <p className="text-[clamp(15px,3.5vw,17px)] text-ink/70 font-light mb-6">
        On détecte et on prépare vos lettres. C&apos;est toujours vous qui envoyez.
      </p>

      {simulation && (
        <div className="w-full bg-sage/8 border border-sage/18 rounded-[18px] p-5 mb-5 text-left">
          <p className="text-sm text-ink/70 mb-0.5">Votre potentiel d&apos;économie</p>
          <p className="font-serif text-[30px] tracking-[-0.02em] text-moss">{simulation.annualLoss} €</p>
          <p className="font-mono text-[11px] text-ink/50">par an · estimation personnalisée</p>
        </div>
      )}

      {/* Action qui marche : entrer dans l'app */}
      <a
        href="/engagements"
        onClick={rememberEmail}
        data-testid="cta-start"
        className="w-full bg-sage text-cream rounded-[18px] p-5 flex items-center gap-4 text-left hover:bg-sage-light transition-all mb-3"
      >
        <div className="w-11 h-11 rounded-xl bg-ink/8 flex items-center justify-center text-xl flex-shrink-0">📋</div>
        <div className="flex-1">
          <p className="text-sm font-bold mb-0.5">Suivre mes abonnements &amp; créer mes lettres</p>
          <p className="text-xs opacity-70 leading-[1.5]">Disponible maintenant · sans connexion bancaire</p>
        </div>
        <span className="text-lg flex-shrink-0">→</span>
      </a>

      {/* Bientôt disponible */}
      <div className="flex flex-col gap-3 w-full mb-4">
        <button
          onClick={() => comingSoon('🏦 Connexion bancaire')}
          data-testid="soon-bank"
          className="w-full bg-surface border-2 border-ink/10 rounded-[18px] p-5 flex items-center gap-4 text-left opacity-70 hover:opacity-100 transition-all"
        >
          <div className="w-11 h-11 rounded-xl bg-sage/12 flex items-center justify-center text-xl flex-shrink-0">🏦</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink mb-0.5">Connexion bancaire</p>
            <p className="text-xs text-ink/50 leading-[1.5]">Détection automatique de vos abonnements</p>
          </div>
          <span className="font-mono text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-full bg-amber/15 text-amber flex-shrink-0">
            Bientôt
          </span>
        </button>

        <button
          onClick={() => comingSoon('📄 Import de relevé PDF')}
          data-testid="soon-pdf"
          className="w-full bg-surface border-2 border-ink/10 rounded-[18px] p-5 flex items-center gap-4 text-left opacity-70 hover:opacity-100 transition-all"
        >
          <div className="w-11 h-11 rounded-xl bg-amber/12 flex items-center justify-center text-xl flex-shrink-0">📄</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink mb-0.5">Import de relevé PDF</p>
            <p className="text-xs text-ink/50 leading-[1.5]">Analyse automatique de vos prélèvements</p>
          </div>
          <span className="font-mono text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-full bg-amber/15 text-amber flex-shrink-0">
            Bientôt
          </span>
        </button>
      </div>

      {/* E-mail optionnel */}
      <div className="w-full mb-5">
        <label className="block font-mono text-[12px] tracking-[.08em] uppercase text-ink/50 mb-2.5">
          Votre e-mail (optionnel) — pour être prévenu des nouveautés
        </label>
        <input
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="vous@exemple.fr"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onBlur={rememberEmail}
          className={cn(
            'w-full px-[18px] py-4 bg-surface border rounded-2xl',
            'text-base font-sans text-[#F8F7F3] outline-none',
            'transition-all duration-200 placeholder:text-ink/35',
            'border-ink/12 focus:border-sage focus:shadow-[0_0_0_3px_rgba(130,168,132,.14)]'
          )}
        />
      </div>

      <p className="font-mono text-[11.5px] text-ink/50 text-center tracking-wider leading-[1.7]">
        Vos lettres prêtes à envoyer · Vous gardez la main · Sans engagement
      </p>

      <Toast message={toast.message} visible={toast.visible} onHide={toast.hide} />
    </div>
  )
}
