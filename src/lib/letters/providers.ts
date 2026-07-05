import type { TransactionCategory } from '@/types'

// ─── ANNUAIRE DES SERVICES RÉSILIATION ──────────────────────────────────────
// Adresses INDICATIVES des services résiliation des prestataires français les
// plus courants — pour pré-remplir la lettre au lieu de tout saisir à la main.
// L'interface rappelle toujours de vérifier l'adresse sur la dernière facture.

export interface ProviderInfo {
  /** Identifiant stable (pour le <select>) */
  id: string
  /** Nom affiché dans la liste */
  name: string
  category: TransactionCategory
  /** Destinataire tel qu'il apparaît sur la lettre */
  service: string
  /** Adresse postale du service résiliation (indicative) */
  address: string
  /** Variantes de nom pour la détection (libellés bancaires, contrats…) */
  aliases: string[]
}

export const PROVIDERS: ProviderInfo[] = [
  // Télécom
  { id: 'orange', name: 'Orange', category: 'telecom',
    service: 'Orange — Service Résiliation', address: 'TSA 10018, 59878 Lille Cedex 9',
    aliases: ['orange', 'sosh', 'livebox'] },
  { id: 'sfr', name: 'SFR / RED', category: 'telecom',
    service: 'SFR — Service Résiliation', address: 'TSA 30103, 69947 Lyon Cedex 20',
    aliases: ['sfr', 'red by sfr', 'red-by-sfr'] },
  { id: 'free', name: 'Free', category: 'telecom',
    service: 'Free — Service Résiliation', address: '75371 Paris Cedex 08',
    aliases: ['free', 'freebox', 'free mobile'] },
  { id: 'bouygues', name: 'Bouygues Telecom / B&You', category: 'telecom',
    service: 'Bouygues Telecom — Service Clients', address: 'TSA 59013, 60643 Chantilly Cedex',
    aliases: ['bouygues', 'bouygtel', 'b&you', 'bbox'] },
  // Assurance
  { id: 'axa', name: 'AXA', category: 'insurance',
    service: 'AXA France — Service Relation Clients', address: 'TSA 46307, 95901 Cergy-Pontoise Cedex 9',
    aliases: ['axa'] },
  { id: 'maif', name: 'MAIF', category: 'insurance',
    service: 'MAIF', address: 'CS 90000, 79038 Niort Cedex 9',
    aliases: ['maif'] },
  { id: 'macif', name: 'MACIF', category: 'insurance',
    service: 'MACIF', address: '1 rue Jacques Vandier, 79000 Niort',
    aliases: ['macif'] },
  { id: 'matmut', name: 'Matmut', category: 'insurance',
    service: 'Matmut', address: '66 rue de Sotteville, 76100 Rouen',
    aliases: ['matmut'] },
  { id: 'gmf', name: 'GMF', category: 'insurance',
    service: 'GMF Assurances', address: '45930 Orléans Cedex 9',
    aliases: ['gmf'] },
  { id: 'allianz', name: 'Allianz', category: 'insurance',
    service: 'Allianz France — Relations Clients', address: 'Case courrier S1803, 1 cours Michelet, CS 30051, 92076 Paris La Défense Cedex',
    aliases: ['allianz'] },
  // Énergie
  { id: 'edf', name: 'EDF', category: 'utility',
    service: 'EDF — Service Clients', address: 'TSA 21941, 62978 Arras Cedex 9',
    aliases: ['edf'] },
  { id: 'engie', name: 'Engie', category: 'utility',
    service: 'ENGIE — Service Clients', address: 'TSA 87494, 76934 Rouen Cedex 09',
    aliases: ['engie', 'gdf'] },
  { id: 'totalenergies', name: 'TotalEnergies', category: 'utility',
    service: 'TotalEnergies — Service Clients', address: 'TSA 21519, 75901 Paris Cedex 15',
    aliases: ['totalenergies', 'total direct energie', 'direct energie'] },
  // Streaming / divertissement
  { id: 'canal', name: 'Canal+', category: 'streaming',
    service: 'CANAL+ — Service Résiliation', address: 'TSA 86712, 95905 Cergy-Pontoise Cedex 9',
    aliases: ['canal+', 'canal plus', 'canalplus', 'canal'] },
  { id: 'netflix', name: 'Netflix', category: 'streaming',
    service: 'Netflix International B.V.', address: 'Karperstraat 8-10, 1075 KZ Amsterdam, Pays-Bas',
    aliases: ['netflix'] },
  { id: 'spotify', name: 'Spotify', category: 'streaming',
    service: 'Spotify AB', address: 'Regeringsgatan 19, 111 53 Stockholm, Suède',
    aliases: ['spotify'] },
  // Salle de sport
  { id: 'basicfit', name: 'Basic-Fit', category: 'fitness',
    service: 'Basic-Fit France — Service Clients', address: 'Tour W, 102 Terrasse Boieldieu, 92800 Puteaux',
    aliases: ['basic-fit', 'basic fit', 'basicfit'] },
]

function normalize(s: string): string {
  return s.normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '').toLowerCase().trim()
}


export function providerById(id: string): ProviderInfo | null {
  return PROVIDERS.find(p => p.id === id) ?? null
}

/** Retrouve un prestataire à partir d'un nom libre (« freebox », « Axa auto »…). */
export function findProvider(query: string): ProviderInfo | null {
  const q = normalize(query)
  if (q.length < 3) return null
  for (const p of PROVIDERS) {
    for (const alias of p.aliases) {
      const a = normalize(alias)
      if (q === a || q.includes(a) || (a.length >= 4 && a.includes(q))) return p
    }
  }
  return null
}

export function providersForCategory(category: TransactionCategory): ProviderInfo[] {
  return PROVIDERS.filter(p => p.category === category)
}

// ─── PRÉ-REMPLISSAGE DEPUIS UN CONTRAT (PDF lu localement) ─────────────────

export interface ContractPrefill {
  provider: ProviderInfo | null
  contractRef: string | null
}

const REF_PATTERN = new RegExp(
  String.raw`(?:n[°ºo]?\s*(?:de\s*)?(?:client|contrat|adh[ée]rent|abonn[ée]|police|dossier)|r[ée]f(?:[ée]rence)?\.?\s*(?:client|contrat|dossier)?)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-\/]{3,24})`,
  'i'
)

/**
 * Extrait du texte d'un contrat le prestataire (via l'annuaire) et le numéro
 * de client/contrat. Tout se passe dans le navigateur — le document ne quitte
 * jamais l'appareil.
 */
export function extractContractInfo(text: string): ContractPrefill {
  const norm = normalize(text)
  let provider: ProviderInfo | null = null
  outer: for (const p of PROVIDERS) {
    for (const alias of p.aliases) {
      if (norm.includes(normalize(alias))) { provider = p; break outer }
    }
  }
  const m = REF_PATTERN.exec(text)
  return { provider, contractRef: m ? m[1] : null }
}
