/**
 * SEREIN — Classification des données par niveau d'exposition.
 *
 * C'est ce module qui alimente l'écran « Voir ce que le serveur voit ».
 * Chaque champ déclare où il vit. Aucun champ n'échappe au classement :
 * un champ non déclaré est traité comme COFFRE par défaut (fail-safe).
 */

export type Tier =
  /** Chiffré sur l'appareil. Le serveur ne voit que du bruit. */
  | 'coffre'
  /** En clair côté serveur — nécessaire au fonctionnement. */
  | 'serveur'
  /** Transite en clair, analysé, puis détruit. Jamais conservé. */
  | 'transitoire'

export interface FieldSpec {
  tier: Tier
  /** Justification affichée à l'utilisateur, en français, sans jargon. */
  why: string
}

export const FIELD_TIERS: Record<string, FieldSpec> = {
  // ── Coffre : tout ce qui vous identifie ou vous décrit ──
  'commitment.provider':      { tier: 'coffre', why: 'Le nom de votre fournisseur ne regarde que vous.' },
  'commitment.amount':        { tier: 'coffre', why: 'Vos montants ne quittent jamais votre appareil en clair.' },
  'commitment.contract_ref':  { tier: 'coffre', why: 'Votre numéro de contrat est une donnée identifiante.' },
  'commitment.notes':         { tier: 'coffre', why: 'Vos notes personnelles.' },
  'contact.name':             { tier: 'coffre', why: 'Votre carnet d\'adresses vous appartient.' },
  'contact.phone':            { tier: 'coffre', why: 'Numéro personnel.' },
  'contact.address':          { tier: 'coffre', why: 'Adresse personnelle.' },
  'invoice.content':          { tier: 'coffre', why: 'Le contenu extrait de vos factures.' },
  'letter.content':           { tier: 'coffre', why: 'Vos courriers contiennent votre nom et votre adresse.' },

  // ── Serveur : le strict minimum pour que le service fonctionne ──
  'commitment.id':            { tier: 'serveur', why: 'Identifiant technique, aucun sens hors de votre compte.' },
  'commitment.due_date':      { tier: 'serveur', why: 'Nécessaire pour vous alerter avant l\'échéance, même appareil éteint.' },
  'commitment.service_type':  { tier: 'serveur', why: 'Catégorie générique — permet d\'appliquer le bon régime juridique.' },
  'account.email':            { tier: 'serveur', why: 'Nécessaire pour vous envoyer vos alertes.' },

  // ── Transitoire : présent quelques secondes, puis détruit ──
  'upload.pdf':               { tier: 'transitoire', why: 'Analysé puis supprimé du serveur. Reçu de suppression consultable.' },
}

export function tierOf(field: string): FieldSpec {
  return FIELD_TIERS[field] ?? { tier: 'coffre', why: 'Champ non classé — chiffré par précaution.' }
}

/**
 * Projection serveur : ce qui est RÉELLEMENT stocké en base.
 * L'écran de transparence affiche le retour de cette fonction, tel quel.
 */
export function serverProjection(
  entity: string,
  record: Record<string, unknown>,
  sealed: { iv: string; ciphertext: string },
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(record)) {
    if (tierOf(`${entity}.${key}`).tier === 'serveur') out[key] = value
  }
  out['_chiffre'] = `${sealed.ciphertext.slice(0, 48)}…`
  return out
}

/** Compte des champs par niveau — alimente le badge de confidentialité. */
export function tierSummary(entity: string, fields: string[]) {
  const counts = { coffre: 0, serveur: 0, transitoire: 0 }
  for (const f of fields) counts[tierOf(`${entity}.${f}`).tier]++
  return counts
}
