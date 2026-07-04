import type { ServiceType, CommitmentLike } from '@/lib/commitments/logic'
import { effectiveDeadline } from '@/lib/commitments/logic'

// ─── UNIK — conseil personnalisé par engagement ─────────────────────────────
// Un conseil court, juste et actionnable par type de service, appuyé sur les
// textes déjà codés dans le générateur de lettres. Serein informe ; le
// client agit (limite ORIAS).

export interface UnikAdvice {
  text: string
  /** l'engagement est résiliable à tout moment (régime légal favorable) */
  cancellableAnytime: boolean
}

export function unikAdviceFor(c: CommitmentLike & { service_type: ServiceType }): UnikAdvice | null {
  const deadline = effectiveDeadline(c)
  switch (c.service_type) {
    case 'telecom':
      return {
        text: 'Résiliable à tout moment, préavis 10 jours maximum (L.224-39). Après 12 mois d\'un engagement 24 mois, les frais sont plafonnés.',
        cancellableAnytime: true,
      }
    case 'energy':
    case 'water':
      return {
        text: 'Résiliable à tout moment et sans frais (L.224-15) — inutile d\'attendre une échéance.',
        cancellableAnytime: true,
      }
    case 'insurance':
      return {
        text: 'Souscrite il y a plus d\'un an ? Loi Hamon : résiliable à tout moment, effet sous 1 mois. Sinon, visez l\'échéance annuelle (loi Chatel).',
        cancellableAnytime: false,
      }
    case 'streaming':
    case 'gym':
      return {
        text: deadline
          ? 'Contrat à reconduction : agissez avant la date limite — la lettre est prête.'
          : 'Pas informé de la reconduction dans les délais ? Loi Chatel : résiliation gratuite à tout moment (L.215-1).',
        cancellableAnytime: !deadline,
      }
    default:
      return null // loyer, crédit, impôts, divers : pas de conseil générique fiable
  }
}
