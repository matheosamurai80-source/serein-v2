// ─── HUB D'ACCUEIL ──────────────────────────────────────────────────────────
// Une seule adresse pour tout : Serein (finances récurrentes) et PanierMalin
// (courses). Les nouveaux venus passent par l'onboarding, les autres entrent
// directement là où ils travaillent.

const SEREIN_LINKS = [
  { href: '/dashboard',   emoji: '🏠', title: 'Tableau de bord', desc: 'Vue d’ensemble et score de vigilance' },
  { href: '/analyse',     emoji: '📄', title: 'Analyse de relevé', desc: 'Détection 100 % dans votre navigateur' },
  { href: '/engagements', emoji: '📋', title: 'Engagements', desc: 'Suivre abonnements et contrats' },
  { href: '/rappels',     emoji: '🔔', title: 'Rappels', desc: 'Prévenu avant chaque fenêtre' },
  { href: '/resiliation', emoji: '✉️', title: 'Lettre de résiliation', desc: 'La loi de votre côté, prête à envoyer' },
  { href: '/connexion',   emoji: '🔑', title: 'Mon compte', desc: 'Retrouver ses données partout' },
]

export default function RootPage() {
  return (
    <main className="min-h-screen max-w-[720px] mx-auto px-5 py-10 flex flex-col items-center animate-fade-up">
      <p className="font-mono text-[11px] tracking-[.17em] uppercase text-moss mb-5 flex items-center gap-2.5">
        <span className="w-6 h-px bg-moss" />Vos applications<span className="w-6 h-px bg-moss" />
      </p>
      <h1 className="font-serif text-[clamp(28px,6vw,48px)] tracking-[-0.025em] leading-[1.12] text-ink mb-3 text-center">
        Tout est là. <em className="text-moss">Vous gardez la main.</em>
      </h1>
      <p className="text-sm text-ink/70 leading-[1.6] mb-8 text-center max-w-[460px]">
        Serein veille sur vos abonnements et contrats. PanierMalin optimise vos courses.
        Deux outils, une seule adresse.
      </p>

      {/* Serein */}
      <div className="w-full mb-8">
        <div className="flex items-baseline justify-between mb-3">
          <p className="font-mono text-[11px] tracking-[.13em] uppercase text-ink/50">🛡️ Serein — finances récurrentes</p>
          <a href="/onboarding" className="font-mono text-[11px] tracking-wider text-moss underline">Découvrir →</a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SEREIN_LINKS.map(x => (
            <a key={x.href} href={x.href} data-testid="hub-link"
              className="bg-surface border border-ink/10 rounded-2xl p-5 flex items-start gap-3.5 hover:border-sage/40 transition-colors">
              <span className="text-2xl flex-shrink-0">{x.emoji}</span>
              <span>
                <span className="block font-semibold text-ink text-sm">{x.title}</span>
                <span className="block text-xs text-ink/50 mt-0.5 leading-[1.5]">{x.desc}</span>
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* PanierMalin */}
      <div className="w-full">
        <p className="font-mono text-[11px] tracking-[.13em] uppercase text-ink/50 mb-3">🛒 PanierMalin — courses malines</p>
        <a href="/paniermalin" data-testid="hub-paniermalin"
          className="w-full bg-sage/8 border border-sage/20 rounded-2xl p-6 flex items-center gap-4 hover:border-sage/45 transition-colors">
          <span className="text-3xl flex-shrink-0">🛒</span>
          <span className="flex-1">
            <span className="block font-serif text-lg text-ink">Ouvrir PanierMalin</span>
            <span className="block text-[13px] text-ink/60 mt-0.5 leading-[1.55]">
              Scan de produits, prix au kilo, Nutri-Score et meilleure alternative — dans le même navigateur.
            </span>
          </span>
          <span className="text-lg text-moss flex-shrink-0">→</span>
        </a>
      </div>

      <p className="font-mono text-[11px] text-ink/45 tracking-wider text-center mt-9 leading-[1.7]">
        Serein arme, alerte et prépare — c&apos;est toujours vous qui décidez.
      </p>
    </main>
  )
}
