/**
 * SEREIN — B1 : « Qu'est-ce que ça me coûte de partir ? »
 *
 * `detectLegalRegime` dit QUEL régime s'applique. Ce module dit ce que ça
 * COÛTE et QUAND la porte s'ouvre — en euros et en jours.
 *
 * Limite tenue : Serein informe et prépare. Il n'agit pas, ne démarche aucun
 * fournisseur, ne recommande personne. Aucune dépendance externe.
 *
 * Fonctions pures : aucune I/O, `today` toujours injecté.
 */

export type ServiceType =
  | 'insurance' | 'energy' | 'water' | 'telecom' | 'streaming'
  | 'gym' | 'loan' | 'rent' | 'tax' | 'other'

export interface ExitInput {
  service_type: ServiceType
  /** Mensualité en euros (null si inconnue) */
  amount: number | null
  frequency: 'monthly' | 'quarterly' | 'yearly' | 'weekly' | 'oneoff' | string
  /** Date d'échéance annuelle, ISO YYYY-MM-DD */
  anniversary_date?: string | null
  /** Préavis contractuel en jours */
  cancellation_notice_days?: number | null
  /** Durée d'engagement souscrite, en mois (12, 24…) */
  engagement_months?: number | null
  /** Début du contrat, ISO YYYY-MM-DD */
  subscribed_at?: string | null
  /** Contrat souscrit en ligne → résiliation en ligne obligatoire */
  souscrit_en_ligne?: boolean
  /** L'avis d'échéance a-t-il été reçu dans les délais ? */
  avis_echeance_recu?: boolean
}

export type ExitVerdict =
  /** Rien à payer, la porte est ouverte maintenant */
  | 'libre'
  /** Ouvert, mais un préavis court à respecter */
  | 'libre_avec_preavis'
  /** Il faut attendre une date */
  | 'attendre_fenetre'
  /** Partir maintenant coûte de l'argent */
  | 'penalite'
  /** Données insuffisantes pour trancher */
  | 'inconnu'

export interface ExitCost {
  verdict: ExitVerdict
  /** Une phrase, en français, sans jargon */
  resume: string
  /** Coût estimé en euros. null = inconnu, 0 = gratuit */
  montant_du: number | null
  /** Vrai si `montant_du` est une estimation et non un montant contractuel */
  estimation: boolean
  /** Préavis à respecter, en jours */
  preavis_jours: number | null
  /** Jours avant l'ouverture de la fenêtre (0 = ouverte, null = sans objet) */
  jours_avant_fenetre: number | null
  /** Le professionnel doit proposer un bouton « résilier » dans l'espace client */
  resiliation_en_ligne_obligatoire: boolean
  /** Référence à citer */
  article: string | null
  /** Ce que l'utilisateur peut faire, maintenant */
  action: string
  /** Ce qui manque pour être certain */
  inconnues: string[]
}

const JOUR = 86_400_000

function joursEntre(depuis: string, jusqua: string): number | null {
  const a = Date.parse(depuis)
  const b = Date.parse(jusqua)
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  return Math.round((b - a) / JOUR)
}

function moisDepuis(debut: string, today: string): number | null {
  const j = joursEntre(debut, today)
  return j === null ? null : Math.floor(j / 30.44)
}

/** Ramène toute fréquence à un montant mensuel, pour comparer ce qui est comparable. */
export function mensualise(amount: number | null, frequency: string): number | null {
  if (amount === null || !Number.isFinite(amount)) return null
  switch (frequency) {
    case 'monthly': return amount
    case 'quarterly': return amount / 3
    case 'yearly': return amount / 12
    case 'weekly': return (amount * 52) / 12
    default: return null
  }
}

/**
 * Prochaine échéance annuelle à partir de la date d'anniversaire.
 * Renvoie le nombre de jours qui nous en séparent (0 si c'est aujourd'hui).
 */
export function joursAvantEcheance(anniversaire: string, today: string): number | null {
  const anniv = new Date(anniversaire)
  const now = new Date(today)
  if (Number.isNaN(anniv.getTime()) || Number.isNaN(now.getTime())) return null
  const cible = new Date(Date.UTC(now.getUTCFullYear(), anniv.getUTCMonth(), anniv.getUTCDate()))
  if (cible.getTime() < now.getTime()) cible.setUTCFullYear(cible.getUTCFullYear() + 1)
  return Math.round((cible.getTime() - now.getTime()) / JOUR)
}

/** Contrats que la loi rend libres, sans engagement ni frais. */
const SANS_ENGAGEMENT: ServiceType[] = ['energy', 'water']

export function coutDeSortie(input: ExitInput, today: string): ExitCost {
  const inconnues: string[] = []
  const mensuel = mensualise(input.amount, input.frequency)
  if (mensuel === null) inconnues.push('Le montant de l\'échéance n\'est pas renseigné.')

  const enLigne = input.souscrit_en_ligne === true
  if (input.souscrit_en_ligne === undefined) {
    inconnues.push('Contrat souscrit en ligne ou en boutique ? Cela change vos droits de résiliation.')
  }

  // ── Énergie et eau : la loi tranche, il n'y a rien à payer ──
  if (SANS_ENGAGEMENT.includes(input.service_type)) {
    return {
      verdict: 'libre',
      resume: 'Rien à payer. Un contrat d\'énergie se résilie à tout moment, sans frais, à la date que vous choisissez.',
      montant_du: 0,
      estimation: false,
      preavis_jours: 0,
      jours_avant_fenetre: 0,
      resiliation_en_ligne_obligatoire: enLigne,
      article: 'article L.224-15 du Code de la consommation',
      action: 'Souscrivez ailleurs : le nouveau fournisseur résilie l\'ancien pour vous, sans coupure.',
      inconnues: [],
    }
  }

  // ── Télécom : L.224-39, préavis 10 jours, plafond Chatel après 12 mois ──
  if (input.service_type === 'telecom') {
    const engagement = input.engagement_months ?? 0
    const anciennete = input.subscribed_at ? moisDepuis(input.subscribed_at, today) : null

    if (!engagement) {
      return {
        verdict: 'libre_avec_preavis',
        resume: 'Sans engagement, la résiliation est gratuite. Comptez un préavis de 10 jours au maximum.',
        montant_du: 0,
        estimation: false,
        preavis_jours: 10,
        jours_avant_fenetre: 0,
        resiliation_en_ligne_obligatoire: enLigne,
        article: 'article L.224-39 du Code de la consommation',
        action: 'Demandez votre code RIO au 3179 pour garder votre numéro, puis souscrivez ailleurs.',
        inconnues: input.engagement_months === undefined
          ? ['Durée d\'engagement inconnue — vérifiez votre contrat.'] : [],
      }
    }

    if (anciennete === null) {
      return {
        verdict: 'inconnu',
        resume: `Engagement de ${engagement} mois. Sans la date de souscription, impossible de calculer ce que vous devez.`,
        montant_du: null, estimation: true, preavis_jours: 10, jours_avant_fenetre: null,
        resiliation_en_ligne_obligatoire: enLigne,
        article: 'article L.224-39 du Code de la consommation',
        action: 'Retrouvez la date de souscription sur votre première facture, puis relancez le calcul.',
        inconnues: [...inconnues, 'Date de souscription du contrat.'],
      }
    }

    const restant = Math.max(0, engagement - anciennete)
    if (restant === 0) {
      return {
        verdict: 'libre_avec_preavis',
        resume: 'Votre engagement est terminé : la résiliation est gratuite, avec 10 jours de préavis au maximum.',
        montant_du: 0, estimation: false, preavis_jours: 10, jours_avant_fenetre: 0,
        resiliation_en_ligne_obligatoire: enLigne,
        article: 'article L.224-39 du Code de la consommation',
        action: 'Demandez votre code RIO au 3179, puis souscrivez ailleurs.',
        inconnues,
      }
    }

    // Au-delà du 12e mois d'un engagement de 24, les frais sont plafonnés au
    // quart des sommes restant dues.
    const plafonne = engagement >= 24 && anciennete >= 12
    const du = mensuel === null ? null : (plafonne ? (mensuel * restant) / 4 : mensuel * restant)
    return {
      verdict: 'penalite',
      resume: plafonne
        ? `Il reste ${restant} mois. Au-delà du 12e mois, vous ne devez que le quart des sommes restantes.`
        : `Il reste ${restant} mois d'engagement, dus en totalité si vous partez maintenant.`,
      montant_du: du === null ? null : Math.round(du * 100) / 100,
      estimation: true,
      preavis_jours: 10,
      jours_avant_fenetre: Math.round(restant * 30.44),
      resiliation_en_ligne_obligatoire: enLigne,
      article: 'article L.224-39 du Code de la consommation',
      action: plafonne
        ? 'Comparez ce montant à ce que vous économiseriez ailleurs : le calcul est souvent favorable au départ.'
        : `Attendre le 12e mois divise la facture par quatre. Il vous reste ${Math.max(0, 12 - anciennete)} mois à patienter.`,
      inconnues,
    }
  }

  // ── Assurance : Hamon après 1 an, Chatel avant ──
  if (input.service_type === 'insurance') {
    const anciennete = input.subscribed_at ? moisDepuis(input.subscribed_at, today) : null

    if (anciennete !== null && anciennete >= 12) {
      return {
        verdict: 'libre_avec_preavis',
        resume: 'Après un an, la loi Hamon vous laisse partir à tout moment, sans frais ni pénalité.',
        montant_du: 0, estimation: false, preavis_jours: 30, jours_avant_fenetre: 0,
        resiliation_en_ligne_obligatoire: enLigne,
        article: 'article L.113-15-2 du Code des assurances (loi Hamon)',
        action: 'Le nouvel assureur se charge des démarches. La résiliation prend effet un mois après la demande.',
        inconnues,
      }
    }

    if (input.avis_echeance_recu === false) {
      return {
        verdict: 'libre',
        resume: 'Votre assureur ne vous a pas envoyé l\'avis d\'échéance à temps : vous pouvez résilier à tout moment, sans pénalité.',
        montant_du: 0, estimation: false, preavis_jours: 0, jours_avant_fenetre: 0,
        resiliation_en_ligne_obligatoire: enLigne,
        article: 'article L.113-15-1 du Code des assurances (loi Chatel)',
        action: 'Conservez une preuve de l\'absence d\'avis : c\'est ce qui fonde votre droit.',
        inconnues,
      }
    }

    if (input.anniversary_date) {
      const jours = joursAvantEcheance(input.anniversary_date, today)
      const preavis = input.cancellation_notice_days ?? 60
      const ouverture = jours === null ? null : Math.max(0, jours - preavis)
      const ouverte = ouverture === 0
      return {
        verdict: ouverte ? 'libre_avec_preavis' : 'attendre_fenetre',
        resume: ouverte
          ? `La fenêtre est ouverte : vous pouvez résilier pour l'échéance dans ${jours} jours.`
          : `La fenêtre de résiliation s'ouvre dans ${ouverture} jours (préavis de ${preavis} jours avant l'échéance).`,
        montant_du: 0, estimation: false,
        preavis_jours: preavis,
        jours_avant_fenetre: ouverture,
        resiliation_en_ligne_obligatoire: enLigne,
        article: 'article L.113-15-1 du Code des assurances (loi Chatel)',
        action: ouverte
          ? 'Envoyez votre demande maintenant : Serein prépare la lettre.'
          : 'Serein vous préviendra à l\'ouverture de la fenêtre. Rien à faire d\'ici là.',
        inconnues: input.cancellation_notice_days == null
          ? [...inconnues, 'Préavis exact inconnu — 60 jours retenus par prudence.'] : inconnues,
      }
    }

    return {
      verdict: 'inconnu',
      resume: 'Sans la date d\'échéance ni la date de souscription, impossible de dire quand la porte s\'ouvre.',
      montant_du: null, estimation: true, preavis_jours: null, jours_avant_fenetre: null,
      resiliation_en_ligne_obligatoire: enLigne,
      article: 'article L.113-15-1 du Code des assurances (loi Chatel)',
      action: 'Retrouvez la date d\'échéance sur votre avis de cotisation.',
      inconnues: [...inconnues, 'Date d\'échéance annuelle.', 'Date de souscription.'],
    }
  }

  // ── Streaming, salle de sport, presse, SaaS : tacite reconduction ──
  if (input.avis_echeance_recu === false) {
    return {
      verdict: 'libre',
      resume: 'Le professionnel ne vous a pas rappelé la reconduction dans les délais : le contrat est résiliable gratuitement, à tout moment.',
      montant_du: 0, estimation: false, preavis_jours: 0, jours_avant_fenetre: 0,
      resiliation_en_ligne_obligatoire: enLigne,
      article: 'articles L.215-1 à L.215-3 du Code de la consommation (loi Chatel)',
      action: 'Invoquez l\'absence de rappel dans votre demande. Serein prépare la lettre.',
      inconnues,
    }
  }

  const engagement = input.engagement_months ?? 0
  const anciennete = input.subscribed_at ? moisDepuis(input.subscribed_at, today) : null

  if (engagement > 0 && anciennete !== null && anciennete < engagement) {
    const restant = engagement - anciennete
    const du = mensuel === null ? null : mensuel * restant
    return {
      verdict: 'penalite',
      resume: `Il reste ${restant} mois d'engagement. Sans motif légitime, ils restent dus.`,
      montant_du: du === null ? null : Math.round(du * 100) / 100,
      estimation: true,
      preavis_jours: input.cancellation_notice_days ?? null,
      jours_avant_fenetre: Math.round(restant * 30.44),
      resiliation_en_ligne_obligatoire: enLigne,
      article: 'articles L.215-1 à L.215-3 du Code de la consommation',
      action: 'Un motif légitime (déménagement, perte d\'emploi, problème de santé) peut annuler ces frais : vérifiez vos conditions.',
      inconnues,
    }
  }

  if (engagement === 0 && input.engagement_months !== undefined) {
    return {
      verdict: 'libre',
      resume: enLigne
        ? 'Sans engagement, et souscrit en ligne : le bouton « résilier » doit exister dans votre espace client.'
        : 'Sans engagement : la résiliation est gratuite, selon le préavis prévu au contrat.',
      montant_du: 0, estimation: false,
      preavis_jours: input.cancellation_notice_days ?? 0,
      jours_avant_fenetre: 0,
      resiliation_en_ligne_obligatoire: enLigne,
      article: enLigne ? 'article L.215-1-1 du Code de la consommation' : null,
      action: enLigne
        ? 'Cherchez « Résilier mon contrat » dans votre espace client. Aucun appel ni courrier ne peut vous être imposé.'
        : 'Envoyez votre demande écrite. Serein prépare la lettre.',
      inconnues,
    }
  }

  return {
    verdict: 'inconnu',
    resume: 'Il manque des éléments pour chiffrer votre sortie.',
    montant_du: null, estimation: true,
    preavis_jours: input.cancellation_notice_days ?? null,
    jours_avant_fenetre: null,
    resiliation_en_ligne_obligatoire: enLigne,
    article: null,
    action: 'Complétez la durée d\'engagement et la date de souscription.',
    inconnues: [...inconnues, 'Durée d\'engagement.', 'Date de souscription.'],
  }
}
