import type { TransactionCategory } from '@/types'

// ─── RÉGIMES LÉGAUX DE RÉSILIATION ──────────────────────────────────────────
// Serein "arme le client" : il détecte le régime applicable et fournit les
// références légales. Il n'agit jamais à la place du client (limite ORIAS).

export type LegalRegime =
  | 'hamon'            // Assurance > 1 an — L.113-15-2 code des assurances
  | 'chatel_assurance' // Assurance ≤ 1 an — L.113-15-1 code des assurances
  | 'telecom'          // Communications électroniques — L.224-39 code conso
  | 'energie'          // Électricité / gaz — L.224-15 code conso
  | 'chatel_conso'     // Tacite reconduction — L.215-1 code conso
  | 'droit_commun'     // Conditions contractuelles

export interface RegimeInput {
  category: TransactionCategory
  /** Date de souscription au format ISO (YYYY-MM-DD), si connue */
  subscribedAt?: string
  /** Le prestataire a-t-il envoyé l'avis d'échéance / de reconduction dans les délais ? */
  renewalNoticeReceived?: boolean
}

export interface RegimeResult {
  regime: LegalRegime
  /** Référence légale à citer dans la lettre */
  article: string
  /** Nom usuel du dispositif */
  label: string
  /** Ce que le régime permet, en langage simple */
  summary: string
  /** Le client peut-il résilier immédiatement (hors préavis) ? */
  cancellableNow: boolean
  /** Préavis maximal opposable, en jours (null = selon contrat) */
  maxNoticeDays: number | null
}

const MONTHS_FOR_HAMON = 12

function monthsSince(iso?: string): number | null {
  if (!iso) return null
  const start = new Date(iso).getTime()
  if (Number.isNaN(start)) return null
  return Math.floor((Date.now() - start) / (30.44 * 86_400_000))
}

export function detectLegalRegime(input: RegimeInput): RegimeResult {
  const { category, renewalNoticeReceived } = input
  const age = monthsSince(input.subscribedAt)

  if (category === 'telecom') {
    return {
      regime: 'telecom',
      article: 'article L.224-39 du Code de la consommation',
      label: 'Résiliation télécom (L.224-39)',
      summary:
        'Un contrat de communications électroniques se résilie à tout moment, avec un préavis maximal de 10 jours. '
        + 'En cas d\'engagement de 24 mois, au-delà du 12e mois les frais sont plafonnés au quart des sommes restant dues.',
      cancellableNow: true,
      maxNoticeDays: 10,
    }
  }

  if (category === 'utility') {
    return {
      regime: 'energie',
      article: 'article L.224-15 du Code de la consommation',
      label: 'Résiliation énergie (L.224-15)',
      summary:
        'Un contrat de fourniture d\'électricité ou de gaz naturel se résilie à tout moment, sans frais, '
        + 'avec prise d\'effet à la date souhaitée par le consommateur.',
      cancellableNow: true,
      maxNoticeDays: 0,
    }
  }

  if (category === 'insurance') {
    if (age !== null && age >= MONTHS_FOR_HAMON) {
      return {
        regime: 'hamon',
        article: 'article L.113-15-2 du Code des assurances (loi Hamon)',
        label: 'Loi Hamon (assurance > 1 an)',
        summary:
          'Après un an d\'engagement, un contrat d\'assurance auto, moto, habitation ou affinitaire se résilie '
          + 'à tout moment, sans frais ni pénalité. La résiliation prend effet un mois après réception de la demande.',
        cancellableNow: true,
        maxNoticeDays: 30,
      }
    }
    return {
      regime: 'chatel_assurance',
      article: 'article L.113-15-1 du Code des assurances (loi Chatel)',
      label: 'Loi Chatel (assurance ≤ 1 an)',
      summary:
        'Avant un an d\'engagement, la résiliation se fait à l\'échéance annuelle. Si l\'assureur n\'a pas envoyé '
        + 'l\'avis d\'échéance dans les délais (au plus tard 15 jours avant la date limite), le contrat est résiliable '
        + 'à tout moment à compter de la reconduction, sans pénalité.',
      cancellableNow: renewalNoticeReceived === false,
      maxNoticeDays: null,
    }
  }

  // Streaming, SaaS, presse, fitness… : contrats de services à tacite reconduction
  if (renewalNoticeReceived === false) {
    return {
      regime: 'chatel_conso',
      article: 'articles L.215-1 à L.215-3 du Code de la consommation (loi Chatel)',
      label: 'Loi Chatel (tacite reconduction)',
      summary:
        'Le professionnel doit rappeler par écrit la possibilité de ne pas reconduire le contrat, entre 3 mois et '
        + '1 mois avant la date limite. À défaut, le contrat reconduit est résiliable gratuitement, à tout moment.',
      cancellableNow: true,
      maxNoticeDays: 0,
    }
  }

  return {
    regime: 'droit_commun',
    article: 'articles L.215-1 à L.215-3 du Code de la consommation',
    label: 'Conditions contractuelles',
    summary:
      'La résiliation suit le préavis prévu au contrat. La demande écrite avec accusé de réception fait courir '
      + 'le délai et constitue une preuve opposable.',
    cancellableNow: false,
    maxNoticeDays: null,
  }
}
