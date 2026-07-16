/**
 * Test sandbox — parseur de ticket sur un VRAI ticket (appli E.Leclerc, 23/06/2026).
 * Cas terrain fourni par Juju : code TVA en fin de ligne, rayons « >> », promos
 * sur deux lignes (« 2 X 1.89€ » puis total). Avant : 0 détecté. Objectif : tout.
 * Lancer : npm run test:sandbox
 */
// @ts-expect-error module ESM sans types (app statique)
import { parseTicketText } from '../public/paniermalin/logic.mjs'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}
type L = { label: string; price: number }

// Transcription fidèle du ticket (format appli Leclerc)
const ticket = `Ticket du 23/06/2026
                              TTC   TVA
>> EPICERIE
RECEPTION 380G                3.57   1
PZ TOMATES CUISINEES 650G F12  2.48   1
PREPARATION RISOTTO CHAMPIGNONS  0.87   1
MAIS TENDRE.3X140G            1.85   1
PAINS AU CHOCOLAT.360G
        2 X 1.89€             3.78   1
LEVURE CHIMIQUE 6X11G         0.26   1
THON ENTIER AU NATUREL.2X140G  3.75   1
BRIOCHE TRANCHEE NAT EPI 700G  2.29   1
ASPERGES BLANCHES MOYENNES 205G  2.10   1
SPE GRD POMME SSA 12X90G      2.82   1
PATE A TARTINER 600G          2.75   1
ABRICOTS 1/2-FRUITS SIROP     1.48   1
PECHES AU SIROP BTE 4/4 465G   1.67   1
LOT GOUT FOUR ROND TT CH.4X300G  4.60   1
KRISPROLLS COMPLETS 425G      3.07   1
>> LIQUIDE
IGP ILE BEAUTE LES ROZALLEES RS  3.95   5
VIN UE BLANC MR 75CL          1.85   5
>> DPH
SH.NATURE MOI NOURRISS.250ML   2.29   5
MASQ COCO THE VER,LOVEA,390ML   5.91   5
CLAIR CHIFFONS DEPOUSS.*20    1.29   5
LINGETTES ANTIBACTERIENNE X40  0.88   5
LIQ VAISSE ANTI ODEUR BIC.500ML  0.64   5
PH SUPERSOFT BLANC 2P FOXY 12RL  3.62   5
DEMAQ 0% SENSITIV,NIVEA,400ML   3.49   5
>> CREMERIE
CAMEMBERT PRESIDENT 21%MG
        2 X 1.84€             3.68   1
ROUCOULONS MILLERET.220G      2.70   1
ST MORET LIGNE ET PLAISIR 300G  3.99   1
PF LOIK AFH 9X16.67G          1.89   1
EMMENTAL RAPE 29%MG 3X70G     1.89   1
SUISSE NATURE DELISS.20%MG X12  1.73   1
FROM A TARTINER NATURE 150GR LC  1.23   1
MIMOLETTE 24%MG PORTION       2.91   1
SKYR NATURE 850G MR           2.69   1
ROCAMADOUR AOP 22%MG 3X35G    2.73   1
MOZZARELLA CASA AZZURA.3X125G   3.07   1
FERRARI PARMIGIANO REGGIANO AOP  1.83   1
>> POISSONNERIE
BATONNETS SAVOUREUX BOITE.500G   2.71   1`

const r: L[] = parseTicketText(ticket)
const find = (frag: string) => r.find(l => l.label.toUpperCase().includes(frag))

check('37 produits détectés (avant : 0)', r.length === 37, `${r.length} détecté(s)`)
check('code TVA en fin de ligne ignoré → prix = 3,57 (pas 1)', find('RECEPTION')?.price === 3.57)
check('promo 2 lignes : PAINS AU CHOCOLAT = 3,78 (total)', find('PAINS AU CHOCOLAT')?.price === 3.78)
check('promo 2 lignes : CAMEMBERT = 3,68 (total)', find('CAMEMBERT')?.price === 3.68)
check('décimale dans le nom (9X16.67G) sans fausser le prix → 1,89', find('PF LOIK')?.price === 1.89)
check('rayons « >> » exclus (aucun label EPICERIE/LIQUIDE/DPH/CREMERIE)',
  !r.some(l => /^(EPICERIE|LIQUIDE|DPH|CREMERIE|POISSONNERIE)$/i.test(l.label)))
check('en-tête TTC/TVA et « Ticket du … » exclus',
  !r.some(l => /ttc|ticket du/i.test(l.label)))
check('dernier rayon lu : BATONNETS = 2,71', find('BATONNETS')?.price === 2.71)
check('MASQ COCO (virgules dans le nom) = 5,91', find('MASQ COCO')?.price === 5.91)
check('tous les prix dans une fourchette plausible', r.every(l => l.price >= 0.05 && l.price <= 500))

// ─── CAS RÉEL n°2 : COPIER-COLLER « APLATI » (tout sur une ligne) ────────────
// Quand Juju copie le ticket depuis l'appli, les retours à la ligne sautent :
// tout arrive sur UNE ligne séparée par des espaces. Avant : 1 seul produit.
const aplati = `PTION 380G                      3.57   1            PZ TOMATES CUISINEES 650G F12       2.48   1            PREPARATION RISOTTO CHAMPIGNONS     0.87   1            MAIS TENDRE.3X140G                  1.85   1            PAINS AU CHOCOLAT.360G                         2 X 1.89€                  3.78   1            LEVURE CHIMIQUE 6X11G               0.26   1            THON ENTIER AU NATUREL.2X140G       3.75   1            BRIOCHE TRANCHEE NAT EPI 700G       2.29   1            ASPERGES BLANCHES MOYENNES 205G     2.10   1            SPE GRD POMME SSA 12X90G            2.82   1            PATE A TARTINER 600G                2.75   1            ABRICOTS 1/2-FRUITS SIROP           1.48   1            PECHES AU SIROP BTE 4/4 465G        1.67   1            LOT GOUT FOUR ROND TT CH.4X300G     4.60   1            KRISPROLLS COMPLETS 425G            3.07   1            >> LIQUIDE                IGP ILE BEAUTE LES ROZALLEES RS     3.95   5            VIN UE BLANC MR 75CL                1.85   5            >> DPH                SH.NATURE MOI NOURRISS.250ML        2.29   5            MASQ COCO THE VER,LOVEA,390ML       5.91   5            CLAIR CHIFFONS DEPOUSS.*20          1.29   5            LINGETTES ANTIBACTERIENNE X40       0.88   5            LIQ VAISSE ANTI ODEUR BIC.500ML     0.64   5            PH SUPERSOFT BLANC 2P FOXY 12RL     3.62   5            DEMAQ 0% SENSITIV,NIVEA,400ML       3.49   5            >> CREMERIE                CAMEMBERT PRESIDENT 21%MG                         2 X 1.84€                  3.68   1            ROUCOULONS MILLERET.220G            2.70   1            ST MORET LIGNE ET PLAISIR 300G      3.99   1            PF LOIK AFH 9X16.67G                1.89   1            EMMENTAL RAPE 29%MG 3X70G           1.89   1            SUISSE NATURE DELISS.20%MG X12      1.73   1            FROM A TARTINER NATURE 150GR LC     1.23   1            MIMOLETTE 24%MG PORTION             2.91   1            SKYR NATURE 850G MR                 2.69   1            ROCAMADOUR AOP 22%MG 3X35G          2.73   1            MOZZARELLA CASA AZZURA.3X125G       3.07   1            FERRARI PARMIGIANO REGGIANO AOP     1.83   1            >> POISSONNERIE                BATONNETS SAVOUREUX BOITE.500G      2.71   1            >> FRUIT ET LEGUMES                CHAMPIGNON DE PARIS ECO+ 200G       0.95   1            MACHE 200GR NOTRE JARDIN            1.50   1            BETTERAVES ENTIERES.BIO VILLAGE     1.09   1            OIGNON JAUNE CQLP FILET 1KG         2.47   1            >> SURGELES                BAC LA LAITIERE FRAISE              3.29   1            >> CHARCUTERIE                PIZ DOLCE 400G BIANCA X4            4.83   1            JAMBON CRU FUME FORET NOIRE IGP     2.95   1            TABOULE POULET 1KG MENU FRAICH      4.15   1            4GALETTES SARRASIN DE BRETAGNE      1.79   1            JAMBON DE PARIS SUP DD 10T 400G     3.77   1`
const ra: L[] = parseTicketText(aplati)
const findA = (frag: string) => ra.find(l => l.label.toUpperCase().includes(frag))
check('aplati : 47 produits (avant : 1 seul !)', ra.length === 47, `${ra.length} détecté(s)`)
check('aplati : promo PAINS AU CHOCOLAT = 3,78', findA('PAINS AU CHOCOLAT')?.price === 3.78)
check('aplati : promo CAMEMBERT = 3,68', findA('CAMEMBERT')?.price === 3.68)
check('aplati : rayon FRUIT/LEGUMES lu (OIGNON = 2,47)', findA('OIGNON')?.price === 2.47)
check('aplati : dernier produit (JAMBON DE PARIS = 3,77)', findA('JAMBON DE PARIS')?.price === 3.77)
check('aplati : aucun rayon « >> » pris pour un produit', !ra.some(l => /liquide|cremerie|surgeles|charcuterie|poissonnerie|epicerie/i.test(l.label)))
check('aplati : label PAINS nettoyé (sans « 2 X 1.89€ »)', findA('PAINS AU CHOCOLAT')?.label.includes('X 1.89') === false)

console.log(failures === 0 ? '\n✅ TICKET RÉEL LECLERC : TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
