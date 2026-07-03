import { detectLegalRegime, type RegimeInput, type RegimeResult } from './legal'

// ─── GÉNÉRATEUR DE LETTRES DE RÉSILIATION ───────────────────────────────────
// Produit une lettre prête à envoyer en recommandé avec accusé de réception.
// C'est le client qui envoie : Serein ne fait que générer le document.

export interface LetterInput extends RegimeInput {
  /** Nom du service à résilier (ex. « Netflix », « Orange Livebox ») */
  serviceName: string
  /** Nom et prénom du client */
  senderName: string
  /** Adresse postale du client */
  senderAddress: string
  /** Nom du prestataire (service résiliation) */
  providerName: string
  /** Adresse du service résiliation du prestataire */
  providerAddress: string
  /** Numéro de client / de contrat, si connu */
  contractRef?: string
  /** Date d'envoi (ISO) — par défaut : aujourd'hui */
  sentAt?: string
}

export interface GeneratedLetter {
  regime: RegimeResult
  subject: string
  body: string
}

function frDate(iso?: string): string {
  const d = iso ? new Date(iso) : new Date()
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function effectivenessSentence(r: RegimeResult): string {
  switch (r.regime) {
    case 'telecom':
      return 'Conformément à ce texte, la résiliation prendra effet au plus tard dix (10) jours après réception du présent courrier.'
    case 'energie':
      return 'Conformément à ce texte, je vous demande de faire prendre effet à cette résiliation dès réception du présent courrier, sans frais.'
    case 'hamon':
      return 'Conformément à ce texte, la résiliation prendra effet un (1) mois après réception du présent courrier, sans frais ni pénalité.'
    case 'chatel_assurance':
      return 'L\'avis d\'échéance ne m\'étant pas parvenu dans les délais légaux, je suis en droit de mettre un terme à ce contrat à tout moment, sans pénalité, à compter de la date de reconduction.'
    case 'chatel_conso':
      return 'L\'information de reconduction prévue par ces textes ne m\'ayant pas été adressée dans les délais, je suis en droit de mettre un terme au contrat reconduit tacitement, gratuitement et à tout moment.'
    case 'droit_commun':
      return 'Je vous demande de faire prendre effet à cette résiliation à l\'issue du préavis prévu au contrat, dont le présent courrier constitue le point de départ.'
  }
}

export function generateCancellationLetter(input: LetterInput): GeneratedLetter {
  const regime = detectLegalRegime(input)
  const ref = input.contractRef ? `\nRéférence client / contrat : ${input.contractRef}` : ''
  const subject = `Résiliation de mon abonnement ${input.serviceName}`

  const body = `${input.senderName}
${input.senderAddress}

${input.providerName}
${input.providerAddress}

Le ${frDate(input.sentAt)}

Objet : ${subject}${ref}
Lettre recommandée avec accusé de réception

Madame, Monsieur,

Par la présente, je vous notifie ma décision de résilier mon abonnement « ${input.serviceName} » souscrit auprès de vos services${input.subscribedAt ? ` le ${frDate(input.subscribedAt)}` : ''}.

Cette résiliation s'appuie sur l'${regime.article}. ${effectivenessSentence(regime)}

Je vous remercie de bien vouloir me confirmer par écrit la prise en compte de cette résiliation, sa date d'effet, ainsi que l'arrêt de tout prélèvement à compter de cette date. Tout prélèvement postérieur ferait l'objet d'une demande de remboursement.

Dans l'attente de votre confirmation, je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

${input.senderName}`

  return { regime, subject, body }
}
