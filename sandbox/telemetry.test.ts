/**
 * SEREIN — sandbox du journal d'usage.
 * Ce qui est testé ici : le journal ne peut PAS servir à faire fuiter du contenu.
 */
import { preparerEvenement, estActionConnue, nettoyerMeta, ACTIONS } from '../src/lib/admin/telemetry'

let pass = 0, fail = 0
function check(label: string, ok: boolean) {
  if (ok) { pass++; console.log(`PASS  ${label}`) }
  else { fail++; console.log(`FAIL  ${label}`) }
}

console.log('=== A. LISTE BLANCHE FERMÉE ===')
check('Une action connue passe', estActionConnue('lettre_generee'))
check('Une action inventée est rejetée', !estActionConnue('truc_bidon'))
check('Aucun doublon dans la liste', new Set(ACTIONS).size === ACTIONS.length)
check('Une action inventée n\'écrit rien', preparerEvenement('exfiltration') === null)

console.log('\n=== B. LE JOURNAL NE PEUT PAS PORTER DE CONTENU ===')
const fuite = preparerEvenement('engagement_ajoute', {
  provider: 'AXA France',
  amount: 61.4,
  notes: 'Résilier avant le déménagement',
  service_type: 'assurance_auto',
})
check('L\'événement est bien créé', fuite !== null)
check('Le fournisseur est écarté', !('provider' in (fuite!.metadata ?? {})))
check('Le montant est écarté', !('amount' in (fuite!.metadata ?? {})))
check('Les notes sont écartées', !('notes' in (fuite!.metadata ?? {})))
check('La catégorie générique est conservée', fuite!.metadata?.service_type === 'assurance_auto')

const brut = JSON.stringify(fuite)
check('Aucune trace de « AXA »', !brut.includes('AXA'))
check('Aucune trace du montant', !brut.includes('61.4'))
check('Aucune trace des notes', !brut.includes('déménagement'))

console.log('\n=== C. DONNÉE DÉGUISÉE EN CHAMP AUTORISÉ ===')
const deguise = preparerEvenement('lettre_generee', {
  source: 'Mon numéro de contrat est AUTO-2025-4471 chez AXA, montant 61,40 €',
})
check('Une valeur trop longue est écartée', deguise?.metadata === null)

const limite = preparerEvenement('lettre_generee', { source: 'x'.repeat(33) })
check('33 caractères → écarté', limite?.metadata === null)
const ok32 = preparerEvenement('lettre_generee', { source: 'x'.repeat(32) })
check('32 caractères → conservé', ok32?.metadata?.source?.length === 32)

console.log('\n=== D. CAS LIMITES ===')
check('Sans métadonnées → null', preparerEvenement('coffre_cree')?.metadata === null)
check('Métadonnées vides → null', nettoyerMeta({}) === null)
check('Valeur vide écartée', nettoyerMeta({ source: '' }) === null)
check('Objet imbriqué écarté', nettoyerMeta({ source: { a: 1 } as unknown as string }) === null)
check('Nombre converti en texte', nettoyerMeta({ resultat: 200 })?.resultat === '200')
check('Undefined → null', nettoyerMeta(undefined) === null)

console.log(`\n=== RÉSULTAT : ${pass} PASS / ${fail} FAIL ===`)
if (fail > 0) process.exit(1)
