// ─── MON FOYER — la bibliothèque (3e onglet) ────────────────────────────────
// Les services ne créent jamais d'onglet : ils vivent comme des cartes ici,
// groupées par famille. Ajouter un service = une entrée de plus, pas un onglet.
// (cf. SEREIN-PLAN-FUSION.md : Accueil · + · Mon foyer, verrouillés à vie.)

export interface FoyerLink {
  href: string
  label: string
  icon: string
  desc: string
}
export interface FoyerSection {
  title: string
  links: FoyerLink[]
}

/** Modèle pur du hub « Mon foyer » (rendu par la page, testable en sandbox). */
export function foyerSections(): FoyerSection[] {
  return [
    {
      title: 'Contrats & abonnements',
      links: [
        { href: '/engagements', label: 'Mes engagements', icon: '📋', desc: 'Ce que tu paies chaque mois, et les fenêtres de résiliation.' },
        { href: '/abonnements', label: 'Abonnements détectés', icon: '🔍', desc: 'Repérés dans tes relevés — à suivre ou ignorer.' },
        { href: '/rappels', label: 'Mes rappels', icon: '⏰', desc: 'Alertes avant chaque échéance importante.' },
      ],
    },
    {
      title: 'Démarches',
      links: [
        { href: '/resiliation', label: 'Lettre de résiliation', icon: '✉️', desc: 'Génère la lettre prête à envoyer — tu gardes la main.' },
      ],
    },
    {
      title: 'Documents',
      links: [
        { href: '/analyse', label: 'Analyser un relevé', icon: '📄', desc: 'Détecte tes abonnements à partir d’un relevé bancaire.' },
        { href: '/ajouter', label: 'Ajouter un document', icon: '➕', desc: 'Ticket, facture, courrier — l’app l’envoie au bon endroit.' },
      ],
    },
    {
      title: 'Équipement',
      links: [
        { href: '/garanties', label: 'Mes garanties', icon: '📦', desc: 'Tes appareils : Serein te prévient avant la fin de garantie.' },
      ],
    },
    {
      title: 'Courses',
      links: [
        { href: '/paniermalin', label: 'PanierMalin', icon: '🧺', desc: 'Tes courses, tes prix, ton placard.' },
      ],
    },
    {
      title: 'Mon compte',
      links: [
        { href: '/compte', label: 'Compte & confidentialité', icon: '👤', desc: 'Connexion, tes données, déconnexion.' },
      ],
    },
  ]
}

/** Toutes les routes « sous » Mon foyer (pour l'état actif de l'onglet). */
export function foyerRoutes(): string[] {
  return ['/foyer', ...foyerSections().flatMap(s => s.links.map(l => l.href))]
}
