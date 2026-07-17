# SEREIN — Dossier de référence

> Document à consulter en premier avant toute intervention sur ce dépôt.
> Dernière mise à jour : 2026-07-14 (Fusion — les 3 onglets verrouillés : Accueil · ＋ · Mon foyer)
>
> **Architecture de la fusion gravée dans `SEREIN-PLAN-FUSION.md`** (un geste,
> trois onglets, des cartes ; le « + » route via `routerDocument`).

## 1. Le produit

### Positionnement (récap Abonopack × Serein, intégré le 2026-07-04)
- **Serein est un gardien silencieux** : assistant français de vigilance
  financière qui détecte, analyse et réduit les dépenses invisibles
  (abonnements, services récurrents, contrats du quotidien). Ni app
  bancaire, ni comparateur, ni agrégateur.
- **Promesse : « Vous ne payez plus pour ce que vous ne voyez plus. »**
- Ton : calme, premium, rassurant — esthétique Apple/Notion, minimaliste
  « French touch », zéro élément cyber/néon. ✅ La charte claire
  crème/vert forêt actuelle respecte cette direction.
- Éthique : zéro commission fournisseur, zéro vente de données, zéro
  comparateur sponsorisé, transparence radicale, 100 % France.
- ⚠️ Reformulation légale obligatoire du récap : Serein ne « résilie pas
  automatiquement » et ne fait pas de « renégociation automatisée » —
  il PRÉPARE (lettres, alertes, recommandations) et le client agit
  (limite ORIAS). Toute copie doit suivre cette formulation.
- **Abonopack** (concept à venir, sur le socle actuel) : synthèse claire
  des abonnements — prix, fréquence, dates clés, risques — avec **score
  de vigilance**, recommandations et estimation d'économies. Le dashboard
  et la table commitments actuels en sont la fondation directe.
- **Unik** : dimension sur-mesure (recommandations personnalisées par
  profil) — après Abonopack.
- NB : l'ancienne itération décrite dans le récap (HTML/CSS/JS, projet
  Supabase `oujdbevbgqntkousvsms`, tables leads/pdf_scans, fond navy) est
  **obsolète** — le présent dépôt (Next.js + `xfcrryjhxqjdkzsymlro`) est
  la seule base de travail.


App française de gestion financière personnelle, spécialisée dans la
**détection et l'annulation d'abonnements**.

- Positionnement : Serein **arme le client** (détecte, alerte, génère des
  lettres) — il n'agit jamais à sa place. Limite légale à ne jamais franchir
  (évite la licence ORIAS).
- La détection est commoditisée (Bankin', Linxo, banques). La valeur
  défendable = **l'action** (résiliation assistée).
- Moat confirmé : le générateur de lettres de résiliation avec détection du
  régime légal (Loi Hamon, Loi Chatel, L.224-39 télécom, L.224-15 énergie).
  → **livré le 2026-07-01** : page `/resiliation` (voir ci-dessous).
- Piste de validation la plus prometteuse : licence B2B2C en marque blanche
  auprès de banques/assurances.
- Statut légal : incorporation en micro-entreprise requise avant d'ouvrir à
  des tiers ou d'encaisser. 4 documents légaux déjà produits (hors dépôt).

## 2. Ce que contient ce dépôt (serein-v2)

Tunnel d'acquisition + analyse de relevés PDF. Vérifié fonctionnel le
2026-07-01 : build vert, lint vert, 15/15 tests sandbox PASS, rendu prod OK.

### Parcours onboarding (`/onboarding`, 5 écrans)
`src/components/onboarding/` — piloté par le store Zustand `src/stores/onboarding.ts` :
1. **ScreenLanding** — accroche « Vos pertes invisibles, révélées. »
2. **ScreenQuestion** — « Combien d'abonnements pensez-vous avoir ? » (0–3 / 4–6 / 7+)
3. **ScreenSimulation** — estimation des pertes (table `SIM_TABLE` dans `src/config`)
4. **ScreenReassurance** — confiance DSP2 (lecture seule, Powens/ACPR, données en France)
5. **ScreenConversion** (nettoyé 2026-07-03) — e-mail optionnel, CTA
   « Suivre mes abonnements & créer mes lettres → » vers `/engagements`
   (la partie qui marche), connexion bancaire + import PDF affichés
   « Bientôt disponible » (aucun appel réseau), formulations légales
   (Serein arme, n'agit pas). URL en ligne : https://serein-v2.vercel.app

### Pipeline d'analyse
- `POST /api/leads` — crée un lead (validation Zod, rate-limit).
- **Analyse du relevé : côté navigateur** (`/analyse`, OCR local pdf.js +
  Tesseract, PR #25) — le parseur (`src/lib/pdf/parser.ts`, formats bancaires
  français) et le scoring (`src/lib/scoring/engine.ts`) tournent dans la page.
- ⚠️ Les anciennes routes `POST /api/upload` et `POST /api/analyze` ont été
  **supprimées à la Brique 2** : elles visaient un bucket fantôme `pdfs`, un
  schéma mort (`file_path`, `lead_id`…) et tournaient en **service-role
  (contournait la RLS)**. Remplacées par le socle Storage `/api/uploads` (voir
  plus bas).

### Moteur de scoring (logique métier centrale)
- Récurrence : ≥ 2 occurrences, montants similaires (tolérance 15 %),
  fréquence hebdo/mensuelle/annuelle détectée par intervalle moyen.
- Score d'inutilité 0–100 : ancienneté > 6 mois (+30), doublon de catégorie
  (+25), coût > 15 €/mois (+20), base usage faible (+12,5). Seuil « inutile » : 60.
- Insight : pertes mensuelles/annuelles + indice Serein (0–100).
- Testé par `npm run test:sandbox` (`sandbox/business-logic.test.ts`).

### Générateur de lettres de résiliation (le moat) — `/resiliation`
- `src/lib/letters/legal.ts` — détection du régime légal applicable :
  télécom → L.224-39 conso (préavis ≤ 10 j) · énergie → L.224-15 conso
  (à tout moment, sans frais) · assurance > 1 an → loi Hamon L.113-15-2
  (à tout moment, effet 1 mois) · assurance ≤ 1 an → loi Chatel L.113-15-1 ·
  tacite reconduction sans information → loi Chatel L.215-1 (gratuit, à tout
  moment) · sinon droit commun (préavis contractuel).
- `src/lib/letters/generator.ts` — lettre formelle complète (LRAR, article
  cité, date d'effet selon le régime, demande d'arrêt des prélèvements).
- **Le bon mot pour le bon contrat** (retour utilisateur 2026-07-05) :
  `contractNoun(category)` — assurance → « contrat d'assurance », énergie →
  « contrat de fourniture d'énergie », télécom → « contrat », reste →
  « abonnement ». Fini la lettre d'assurance qui parlait d'« abonnement ».
- **Annuaire des services résiliation** (`src/lib/letters/providers.ts`) :
  17 prestataires FR (Orange, SFR, Free, Bouygues, AXA, MAIF, MACIF, Matmut,
  GMF, Allianz, EDF, Engie, TotalEnergies, Canal+, Netflix, Spotify,
  Basic-Fit) avec adresse du service résiliation (indicative — l'UI rappelle
  de vérifier sur la facture). `findProvider()` retrouve depuis un nom libre
  (« Freebox » → Free). Un `<select>` remplit prestataire + adresse +
  catégorie d'un coup.
- **Charger son contrat (PDF)** : lu 100 % dans le navigateur (pdfjs mutualisé
  dans `src/lib/pdf/browser.ts`), `extractContractInfo()` reconnaît le
  prestataire et le n° de client/contrat → champs pré-remplis.
- **Nom + adresse mémorisés** sur l'appareil (localStorage `serein.sender`) :
  plus besoin de les retaper à chaque lettre.
- Page `/resiliation` : formulaire → régime détecté + lettre → copier /
  télécharger .txt / sauvegarder (espace connecté, ou sur l'appareil en mode
  invité). C'est toujours le client qui envoie (limite ORIAS respectée).
- `src/lib/letters/db.ts` : correspondance régimes → `letter_type` v5
  (hamon→hamon, chatel_*→chatel, reste→standard) + validation avant insert.
- Testé : `sandbox/letters.test.ts` (25 cas) + `sandbox/providers.test.ts`
  (15 cas) + parcours navigateur réel sans Supabase (18 cas).

### Page Engagements — `/engagements` (le cœur du schéma v5)
- `src/lib/commitments/logic.ts` — logique testée : coût mensualisé (hebdo/
  mensuel/trimestriel/annuel/ponctuel), échéance effective (date explicite ou
  anniversaire − préavis), urgence (critique ≤ 7 j / bientôt ≤ 30 j / ok /
  dépassée), tri urgence puis coût, total mensuel des actifs, correspondance
  type de service → catégorie légale.
- Page : total récurrent /mois, formulaire d'ajout, liste triée par urgence
  avec badges, **« Générer la lettre → »** pré-remplit `/resiliation`
  (service + catégorie), « Résilié ✓ » (status cancelled), suppression.
  Fonctionne connecté (Supabase) comme sans compte (stockage local).
- **« Générer la lettre → » transmet `commitment_id`** ; une fois la lettre
  sauvegardée, l'engagement affiche « Revoir la lettre » (boucle fermée).
- Testé : 18 cas sandbox PASS + 14 cas navigateur PASS (dont le lien lettre).

### Onglet Rappels — `/rappels` (prévenir avant la fenêtre)
- `src/lib/reminders/logic.ts` — logique testée : construction d'un rappel
  depuis l'échéance d'un engagement (14 j avant par défaut, jamais planifié
  dans le passé), timing (passé / aujourd'hui / à venir), « dû » (en attente
  et échu), tri (dûs d'abord, traités en dernier).
- Page : suggestions automatiques (engagements actifs avec échéance sans
  rappel), création en un clic (insert `reminders`, kind `cancellation_window`,
  canal `in_app`), liste triée avec badges de timing, « Marquer comme lu »
  (status read), « Générer la lettre → », suppression.
- Barre de navigation Engagements / Rappels / Lettre (`src/components/ui/nav.tsx`).
- Testé : 16 cas sandbox PASS + 13 cas navigateur PASS (API Supabase simulée).

### Connexion — `/connexion` (vrais comptes)
- `src/lib/auth/logic.ts` — validation e-mail + mot de passe (≥ 8) et
  traduction des erreurs Supabase Auth en français (testé, 11 cas).
- Page : bascule Se connecter / Créer un compte (e-mail + mot de passe),
  `signInWithPassword` / `signUp`, message « vérifiez votre boîte mail » si
  confirmation requise, lien « continuer sans connexion ».
- **À la connexion, `migrateGuestData()` transfère les données saisies sans
  compte** (engagements dédoublonnés par nom + lettres) vers l'espace
  Supabase, puis vide le stockage local.
- `src/components/ui/nav.tsx` : affiche l'e-mail connecté + « Déconnexion »,
  sinon un lien « Connexion » (via `onAuthStateChange`).
- Testé : 11 cas sandbox + 7 cas navigateur (validation, refus, connexion,
  inscription avec confirmation).

### Tableau de bord — `/dashboard` (accueil connecté)
- `src/lib/dashboard/logic.ts` — `buildDashboardSummary(commitments, reminders)` :
  total mensuel/annuel, nb d'engagements actifs/résiliés, rappels dûs,
  3 prochains rappels, prochaine fenêtre de résiliation (la plus proche + urgence).
- Page : 4 chiffres clés, carte « prochaine fenêtre de résiliation » (→ lettre
  pré-remplie), « prochains rappels », accès rapides. Point d'atterrissage
  après connexion. État vide géré (invite à ajouter un engagement).
- Testé : 9 cas sandbox + 9 cas navigateur.

### Abonopack v1 — score de vigilance (livré 2026-07-04, sur le dashboard)
- `src/lib/abonopack/logic.ts` — score 0-100 **explicable** par engagement :
  fenêtre ≤ 7 j (+35) / ≤ 30 j (+25) / dépassée (+15) / inconnue (+20,
  « angle mort ») · coût > 30 €/mois (+25) ou > 15 (+15) · doublon de
  catégorie (+25) · renouvellement annuel (+10). Niveaux : ≥ 60 élevée,
  ≥ 35 modérée, sinon faible. Score global pondéré par le coût.
- Synthèse d'économies **honnête** : seuls les doublons sont chiffrés
  (tout sauf le moins cher de chaque catégorie) — mention « c'est vous
  qui décidez » (ORIAS).
- Section sur `/dashboard` : score global + badge, encart économies,
  top 4 avec raisons, lien « passer en revue ».
- Testé : 12 cas sandbox PASS + 7 cas navigateur PASS.

### Analyse de relevé dans le navigateur — `/analyse` (livré 2026-07-04)
- **Le relevé ne quitte jamais l'appareil** : extraction PDF (pdfjs-dist,
  chargé dynamiquement), reconstruction des lignes (`linesFromTextItems`,
  regroupement par ordonnée), puis le parseur bancaire et le moteur de
  scoring existants tournent côté navigateur. Aucune clé serveur requise.
- Deux entrées : dépôt de PDF (avec message clair si scan sans texte) ou
  **collage du texte du relevé** (fallback universel, testable).
- Résultats : stats (transactions lues, abonnements détectés, ≈ €/mois et
  €/an), liste cochable avec risque + « pourquoi », dédoublonnage contre
  les engagements déjà suivis (« Déjà suivi »), puis insertion
  `commitments` (`detected_automatically: true`) → redirection Engagements.
- Détection indicative, l'utilisateur choisit (ORIAS). Le bouton PDF de
  l'onboarding pointe désormais sur `/analyse` (« Nouveau ») ; l'onglet
  Analyse est dans la nav et le dashboard.
- `src/lib/analyse/logic.ts` testé en sandbox (lignes PDF, suggestions,
  dédoublonnage, stats).

### Détection sur relevé d'UN mois (corrigé 2026-07-05)
- Retour utilisateur : « la lecture du relevé ne détecte pas les abonnements ».
  Cause : le moteur exigeait ≥ 2 occurrences espacées d'un mois — or un relevé
  couvre un seul mois, chaque abonnement n'y figure qu'une fois → zéro détection.
- Parseur réécrit (`src/lib/pdf/parser.ts`) : dates sans année (« 05.01 »),
  décimales point ou virgule, séparateurs de milliers, colonne solde en fin de
  ligne (le débit est retenu, pas le solde), lignes Solde/Total ignorées,
  ~65 marchands FR reconnus (streaming, télécom, assurance, énergie, sport).
- Moteur (`scoring/engine.ts`) : repli 1 occurrence — marchand d'abonnement
  connu OU libellé récurrent (PRLV, échéance, cotisation, loyer) → suggéré
  avec confiance réduite ; la boulangerie en CB reste exclue.
- **v2 (même jour)** : opérations coupées sur 2 lignes recollées (PDF Crédit
  Agricole & co) + `parseStatement` remonte les « lignes non comprises »,
  affichées sur /analyse avec bouton copier → l'utilisateur peut les envoyer
  pour améliorer la détection.

### Offres de référence — « vous payez X, ça existe à Y » (livré 2026-07-05)
- `src/lib/offres/logic.ts` : forfaits mobiles et box fibre d'entrée de gamme
  (tarifs INDICATIFS 2026 : Free 2 €, RED/B&You 7,99 €, box ~20 €) ;
  `compareToMarket` chiffre l'économie €/mois et €/an, détecte « probablement
  plus engagé » (échéance passée ou inconnue) vs « vérifiez votre engagement ».
- Énergie : pas de fausse promesse (le montant dépend de la consommation) →
  repère ~0,20 €/kWh + renvoi vers comparateur.energie-info.fr (public,
  neutre) + rappel L.224-15.
- Limite ORIAS : information uniquement, zéro commission, « c'est vous qui
  décidez » dans chaque message. Affiché sur les cartes /engagements
  (ligne « 💡 Offre »).
- **v2 (même jour)** : streaming (formule avec pub ~5,99 € si l'abonnement
  coûte plus), salle de sport (Basic-Fit ~25 €), assurance (loi Hamon +
  « 2-3 devis à garanties égales », jamais de chiffre promis). Loyer,
  crédit, impôts : jamais de leçon.

### Unik v1 — conseil légal par engagement (livré 2026-07-04)
- `src/lib/unik/logic.ts` : conseil court et juste par type de service
  (télécom → L.224-39 · énergie/eau → L.224-15 · assurance → Hamon/Chatel ·
  streaming/sport → Chatel reconduction, adapté selon qu'une échéance est
  connue) ; pas de conseil générique pour loyer/crédit/impôts.
- Affiché sur chaque carte d'engagement (« Unik · … »).

### Mode invité — façade de données unique (livré 2026-07-05)
- **Pourquoi** : « les ajouts d'abonnement ne fonctionnent pas » — cause
  vérifiée en base : 0 utilisateur anonyme jamais créé, la connexion anonyme
  Supabase n'a jamais été activée. Plutôt que de dépendre d'un réglage
  serveur, le mode sans compte est passé en **stockage local** : ça marche
  pour tout le monde, tout de suite, et rien ne quitte l'appareil.
- `src/lib/data/local.ts` — CRUD localStorage pur et testable (stockage
  injecté), clés `serein.local.*`, JSON corrompu toléré, dédoublonnage de
  migration par nom.
- `src/lib/data/store.ts` — façade unique : compte connecté → Supabase,
  sinon → localStorage. Les 5 pages (engagements, rappels, analyse,
  dashboard, résiliation) ne parlent plus qu'à cette façade.
- Bandeau discret « Mode sans compte : tout est enregistré sur cet appareil »
  avec lien vers `/connexion` ; à la connexion, migration automatique.
- `src/lib/supabase/session.ts` (connexion anonyme) supprimé.
- Testé : `sandbox/localstore.test.ts` 11 cas + 18 cas navigateur réels
  (Supabase volontairement bloqué pendant le test pour prouver l'autonomie).

### Hub d'accueil — `/` (livré 2026-07-05)
- La racine n'est plus une redirection vers l'onboarding : c'est le point
  d'accès à tout — 6 entrées Serein (dashboard, analyse, engagements,
  rappels, lettre, compte), lien « Découvrir » vers l'onboarding, et carte
  PanierMalin (https://serein-v2.vercel.app/paniermalin/).
- PanierMalin aussi en accès rapide sur le dashboard.

### Brique 0 — Fondation légale + multiservice (livrée 2026-07-05)
- **Pages légales** `/confidentialite`, `/cgu`, `/mentions-legales` : rédigées
  d'après le comportement RÉEL du code (analyse 100 % locale, mode invité
  localStorage, compte Supabase UE base légale contrat, synchro famille par
  code aléatoire sans identité, Open Food Facts = code-barres seul,
  sous-traitants Supabase/Vercel, droits RGPD + CNIL). Gabarit commun
  `src/components/legal.tsx` + `LegalFooter` sur le hub, /connexion, /compte.
  ⚠️ À COMPLÉTER par Juju : SIREN/SIRET + adresse pro dans mentions légales.
- **`/compte`** : statut (compte ou appareil), services actifs, « Effacer les
  données de cet appareil » (invité), « Supprimer mon compte et mes données »
  (garde-fou : taper SUPPRIMER) → RPC `delete_my_account()`.
- **Constat en base** : `profiles` n'a PAS de FK vers `auth.users` → la
  fonction supprime explicitement le profil (cascade : engagements, rappels,
  lettres, uploads…) PUIS le compte auth. Cascade vérifiée avec un
  utilisateur synthétique (0 ligne restante).
- **Table `user_services`** (user_id, service_key ∈ serein/paniermalin/apres/
  jarvis, status, activated_at, deactivated_at), RLS propriétaire, PK
  (user_id, service_key). Pas de facturation dans cette brique.
  Logique `activeServiceKeys(rows)` pure (`src/lib/services/logic.ts`).
- PanierMalin : texte « vos données restent sur ce téléphone » nuancé
  (exception synchro famille) + liens légaux + lien retour 🛡️ Serein.
- Testé : `sandbox/fondation.test.ts` 13 cas + 15 cas navigateur (dont
  session simulée cookie @supabase/ssr + mocks GoTrue).

### Brique 1 — Factures ponctuelles (livrée 2026-07-06)
- **Choix de schéma (justifié)** : table dédiée `factures_ponctuelles`
  (les fréquences irrégulières violeraient la contrainte `frequency` v5) ;
  rappels SANS duplication via colonne `facture_id` facultative sur
  `reminders` (FK cascade) — même page, même tri, mêmes statuts.
- **Deux modes par facture** (`src/lib/factures/logic.ts`) :
  - A « interval » : départ + intervalle en mois → échéance calculée,
    ancrée sur l'échéance stockée (« Payée ✓ » avance d'un intervalle,
    jamais ramenée en arrière), auto-relance après passage, bornage fin de
    mois (31/01 + 1 mois = 28-29/02).
  - B « manual » : date saisie, FIGÉE tant que l'utilisateur ne la change
    pas (champ « Nouvelle date » sur la carte).
- Rappels : `factureReminderDraft` RÉUTILISE `buildReminderForCommitment`
  (préavis choisi par facture, jamais dans le passé, 9 h) ; suggestions
  « Factures à programmer » sur /rappels ; pas de bouton lettre sur un
  rappel de facture. Urgence sur la même échelle que les abonnements.
- UI : section « Factures ponctuelles » clairement séparée sur /engagements
  (formulaire A/B, liste avec badge, Payée ✓ / nouvelle date / suppression).
  Mode invité localStorage (`serein.local.factures`) + migration au compte.
- Testé : `sandbox/factures.test.ts` 24 cas (dont l'exemple du cahier des
  charges 1er janv/6 mois → 1er juil → 1er janv, et le bug d'ancre trouvé
  par le test navigateur) + 10 cas navigateur.

### Brique 2 — Liens utiles partagés (livrée 2026-07-06)
- Table `liens_utiles` (service_key, categorie, nom, url, description,
  ordre_affichage ; unique service+categorie+nom) — lecture publique (RLS
  select `true`), AUCUN droit d'écriture client (gestion manuelle SQL).
- Logique partagée `src/lib/liens/logic.ts` : filtre service+catégories,
  tri ordre puis nom, **https obligatoire** (javascript:/http: exclus).
- **Choix documenté** : PanierMalin étant une app statique vanilla, un
  composant React unique est matériellement impossible — le partage se fait
  au niveau donnée + règles : composant React `<LiensUtiles/>` côté Serein
  (monté sur /engagements : eau + énergie, note « l'eau est gérée par
  commune »), rendu vanilla côté PanierMalin (« 🏷️ Bons plans & cartes de
  fidélité ») consommant la même table avec les mêmes filtres REST.
- Peuplé : Serein → Veolia, Suez, Saur, EDF, Engie, TotalEnergies ;
  PanierMalin → E.Leclerc, Intermarché, Carrefour, Auchan, Super U, Lidl.
- Cas vide géré des deux côtés : « Aucun lien disponible pour l'instant. »
- Testé : `sandbox/liens.test.ts` 10 cas + 8 cas navigateur (table simulée
  pleine et vide).

### Navigation croisée + sélecteur « Ma banque » (livré 2026-07-06)
- **Nav Serein** (toutes pages) : bouton « 🧺 PanierMalin » ; **PanierMalin** :
  bouton « 🛡️ Retour Serein » en tête de page (+ lien pied de page).
- **Menu déroulant « 🏦 Ma banque… »** dans les DEUX applis : 14 banques FR
  (Crédit Agricole, BNP, SG, Banque Postale, Caisse d'Épargne, Crédit
  Mutuel, LCL, Banque Populaire, CIC, BoursoBank, Fortuneo, Hello bank!,
  N26, Revolut) → lien direct vers l'espace particuliers en nouvel onglet
  (pratique pour télécharger le relevé à analyser). Données dans la table
  partagée `liens_utiles` (catégorie `banque`, semée pour les 2 services) ;
  hors ligne, le sélecteur se masque proprement.
- Composant `src/components/banque-select.tsx` (Serein) + rendu vanilla
  PanierMalin (mêmes données, même filtre https).
- Testé : +3 cas sandbox (liens.test.ts) + 9 cas navigateur (popup vérifiée,
  hors-ligne). Service worker v8.

### Dashboard administrateur — `/admin` (livré 2026-07-06)
- **Sécurité côté serveur** : RPC `admin_stats()` (security definer) vérifie
  que le compte connecté est julienpeltier60@gmail.com ; sinon « accès
  refusé » (vérifié en base : appel sans auth → rejeté). La page ne
  contient aucun secret.
- **Chiffres agrégés uniquement, aucune donnée individuelle** : comptes
  (total + 7 derniers jours), engagements (total/actifs/détectés auto +
  répartition par type), lettres (total + par régime), rappels (total/en
  attente), factures ponctuelles, listes famille PanierMalin.
- Rappel honnête affiché : les utilisateurs en mode sans compte (local)
  sont invisibles par conception.
- Accès : URL /admin + lien discret sur /compte (visible pour l'admin
  seulement — cosmétique, la barrière réelle est la fonction SQL).
- 3 états gérés : admin (stats), compte non autorisé (🔒), non connecté
  (invitation). Logique de mise en forme pure `src/lib/admin/logic.ts`.
- Testé : `sandbox/admin.test.ts` 13 cas + 10 cas navigateur (3 profils).

### Export CSV — portabilité RGPD (livré 2026-07-06)
- Bouton « 📥 Exporter mes données (CSV) » sur /compte (connecté uniquement)
  → GET `/api/export-csv` : client Supabase anon + cookies de session, donc
  **RLS appliqué** (SELECT sous l'identité de l'utilisateur) + refiltre
  `onlyMine` en ceinture. Lecture seule, aucune écriture, aucune table.
- Un fichier, deux sections titrées : engagements (16 colonnes, schéma réel
  lu en base) et services (4 colonnes). En-têtes ET valeurs en français
  (types, fréquences, statuts traduits ; montants à virgule ; dates FR).
- Format Excel FR : **UTF-8 + BOM**, séparateur `;`, CRLF, échappement
  RFC 4180, injection de formule neutralisée (= + - @ → apostrophe).
- Sans session → 401 message FR ; invité local → pas de bouton (ses données
  sont déjà sur son appareil).
- Testé : `sandbox/export-csv.test.ts` 20 cas (comptage, octets BOM/UTF-8,
  étanchéité entre utilisateurs, échappements) + 4 cas navigateur.
- Extension notée, NON implémentée : export JSON complet (lettres, rappels,
  factures) pour une portabilité totale — à décider comme brique future.

### Lecture de documents robuste — OCR + prétraitement (livré 2026-07-07)
- Retour : « les importations doc ou photo ne se lisent pas ou mal, Serein
  comme PanierMalin ». Deux causes réelles traitées :
- **Serein** : beaucoup de relevés/contrats PDF sont des SCANS (images) →
  l'extraction de texte native ne trouve rien. `extractPdfText` détecte ce
  cas (`texteIllisible` : < 40 car. ou aucun chiffre) et bascule sur un
  **secours OCR local** (rendu page → prétraitement N/B → Tesseract fra,
  3 premières pages max). Callback `onPhase('ocr')` → toast « PDF scanné
  détecté, lecture optique… ». Le fichier ne quitte jamais l'appareil.
- **PanierMalin** : les photos partaient brutes dans l'OCR. Ajout d'un
  **prétraitement** avant reconnaissance (redimensionnement ~1400-2000 px +
  niveaux de gris + binarisation Otsu) — le levier n°1 de qualité OCR.
- **Module partagé** `public/shared/pretraitement.mjs` (Otsu, binarisation,
  décision OCR) : logique pure, UNE implémentation pour les deux apps.
  Testé `sandbox/pretraitement.test.ts` 10 cas + 7 cas navigateur (module
  servi et correct côté Serein ET PanierMalin, décision, non-régression
  collage). Note : le rendu PDF→canvas→worker Tesseract ne s'exerce que sur
  un vrai appareil (worker pdf.js/canvas non fiables en headless). SW v10.

### Pages légales + repositionnement landing (livré 2026-07-07)
- **`/positionnement`** (nouveau) : la différence de fond « j'arme le client,
  je n'agis pas à sa place » face aux services de résiliation par mandat
  (Papernest, Ideel cités factuellement). Ce que Serein fait / ne fait pas.
- **`/confidentialite`** (réécrit) : ⚠️ **le traitement des documents
  (relevés, contrats) est décrit comme transmis à Mistral (OCR/analyse, UE)**,
  par instruction produit. Interdit « 100 % local / ne quitte jamais ».
  TODO `[À COMPLÉTER]` visibles : localisation/DPA Mistral, responsable de
  traitement, DPO.
- **`/mentions-legales`** : Mistral ajouté aux hébergeurs ; `[À COMPLÉTER]`
  SIREN/SIRET + adresse conservés.
- **Landing (`/`)** : hero « Serein veille. Vous décidez. Vous envoyez. » +
  différenciation « à votre place » vs « vous arme », aucun mandat, zéro
  commission ; lien vers /positionnement. Positionnement ajouté au footer
  légal et à la navigation inter-documents.
- **⚠️ INCOHÉRENCE CODE À RÉSOUDRE (hors ce ticket, = logique métier)** :
  le code d'analyse actuellement déployé fait de l'OCR LOCAL (pdf.js +
  Tesseract, PR #25), pas Mistral. Les affirmations « 100 % local / ne
  quitte jamais l'appareil » ont été retirées de /analyse, onboarding,
  /resiliation et de la landing pour éviter la contradiction, mais **la
  page confidentialité décrit une architecture Mistral pas encore
  branchée**. Prochaine brique à cadrer : migrer l'analyse documentaire
  Serein vers l'API Mistral OCR (serveur/UE) pour aligner le code sur le
  texte. (PanierMalin : l'OCR ticket reste local — distinct, décrit tel quel.)
- Aucune logique métier modifiée : 319/319 sandbox intacts, 24 cas navigateur.

### Brique 1 — Socle API (livré 2026-07-09, plan de fusion « New project »)
Première brique du plan de fusion : serein-v2 est LE projet définitif. Objectif
= un contrat d'API unique et durci pour les modules `subscriptions` et
`reminders`, sans changer aucun comportement visible.
- **`src/lib/api/response.ts`** : enveloppe standard. Succès `{ ok:true, data }`,
  erreur `{ ok:false, error:{ code, message, details? } }`. 10 codes normalisés
  (UNAUTHORIZED 401, EMAIL_NOT_VERIFIED 403, FORBIDDEN 403, VALIDATION_ERROR 422,
  NOT_FOUND 404, RATE_LIMITED 429, PREMIUM_REQUIRED 402, AI_PROVIDER_ERROR 502,
  STORAGE_ERROR 502, INTERNAL_ERROR 500). `handle()` mappe les `ApiError` et
  masque toute exception inconnue en INTERNAL_ERROR (zéro fuite de détail).
- **`src/lib/validation/`** (l'ancien `validation.ts` devient un dossier, import
  `@/lib/validation` inchangé) : schémas Zod alignés sur les **colonnes réelles
  des tables live** (lues en base le 2026-07-09, pas sur les docs de l'ancien
  projet). subscriptions, reminders, uploads, cancellation_letters + leads
  hérité. `user_id` n'est JAMAIS accepté du payload → il vient de la session.
- **`src/lib/services/{subscriptions,reminders}.ts`** + `session.ts` :
  create/list/update/delete. `requireUser()` vérifie la session (401 sinon) ;
  la RLS + `.eq('id')` bornent à l'utilisateur (introuvable → NOT_FOUND). Toute
  la logique d'accès vit là, **aucune logique dans les routes**.
- **Routes canoniques** `/api/subscriptions(/[id])` et `/api/reminders(/[id])`
  (GET/POST/PATCH/DELETE) : route → Zod → auth → service → réponse standard.
- ⚠️ **Pas de « migration » à faire** : contrairement à ce que supposait le
  prompt, il n'existait aucune route subscriptions/reminders à migrer. L'app est
  client-side Supabase (`src/lib/data/store.ts`, RLS). Le socle est donc une
  couche serveur **additive et non-branchée** ; aucune page ne la consomme
  encore → comportement visible strictement inchangé.
- ⚠️ **Tension DB notée (hors scope)** : `reminders.commitment_id` est NOT NULL
  en base, or `store.ts` insère `null` pour les rappels de factures. Le schéma
  Zod reflète la base (commitment_id requis). Bug du store à traiter à part.
- Vérifs : sandbox **30/30 PASS** (`sandbox/validation.test.ts`), suite complète
  verte, lint 0 erreur, `tsc` src propre, `npm run build` vert (les 8 routes
  API listées, dont les 4 nouvelles). Aucun secret `NEXT_PUBLIC_`.

### Brique 2 — Socle Storage / uploads durci (livré 2026-07-09)
Deuxième brique du plan de fusion. Objectif : un accès aux documents (relevés)
correct et durci, sur le socle Brique 1. **Aucun changement DB** — le bucket
privé et les policies existaient déjà en base (vérifié le 2026-07-09).
- **`src/lib/storage/documents.ts`** (logique pure, testée) : bucket privé
  unique `bank-statements`, MIME = PDF seul, taille ≤ 10 Mo, TTL des URL signées
  court (60 s). `validateDocumentFile()`, `objectPathFor(userId, id)` (un
  document vit toujours sous `${userId}/…`), `isOwnedPath()` (garde anti-fuite,
  bloque la traversée `../autre-user`).
- **`src/lib/services/uploads.ts`** (session + RLS) : `createUpload` (valide →
  ligne `uploads` → objet Storage, **rollback de la ligne si l'upload échoue**),
  `listUploads`, `createDownloadUrl` (URL signée courte), `deleteUpload`
  (**suppression coordonnée objet Storage + ligne base**). NOT_FOUND si le
  document n'est pas celui de l'utilisateur.
- **Routes** `/api/uploads` (GET/POST multipart), `/api/uploads/[id]` (DELETE),
  `/api/uploads/[id]/download` (GET → URL signée). Route → validation → auth →
  service → réponse standard.
- **Sécurité en base (déjà présente, vérifiée)** : bucket `bank-statements`
  privé (10 Mo, PDF) ; policies Storage per-utilisateur
  (`foldername[1] = auth.uid()`) INSERT/SELECT/DELETE ; table `uploads` en RLS
  `owner_all`. Le code s'appuie dessus + double la garde côté serveur.
- **Nettoyage** : suppression des routes mortes `/api/upload` et `/api/analyze`
  (bucket fantôme + service-role + schéma mort) et de la config morte
  (`UPLOAD_CONFIG`, `RATE_LIMIT.upload/analyze`). Surface d'attaque réduite.
- ⚠️ Comme la Brique 1, ce socle est **prêt mais non branché** dans l'UI :
  l'analyse Serein reste client-side (OCR local). Ces routes sont la porte
  serveur durcie pour quand un flux d'upload sera branché (ou pour la refonte
  de l'analyse). Comportement visible inchangé.
- Vérifs : sandbox **17/17 PASS** (`sandbox/storage.test.ts`), suite complète
  verte, lint 0 erreur, `tsc` src propre, build vert (3 routes `/api/uploads*`).

### Brique 3 — Socle API pour `commitments`, le vrai cœur (livré 2026-07-09)
Troisième brique. Constat qui l'a motivée : la Brique 1 avait bâti le socle sur
`subscriptions`, mais **toute l'app tourne sur `commitments`** (dashboard,
rappels, engagements, analyse, export) — `subscriptions` est **orpheline**
(elle n'était remplie que par l'ancienne `/api/analyze`, supprimée en Brique 2).
On donne donc un socle durci à la vraie table, préalable pour brancher plus tard
la page Engagements dessus.
- **`src/lib/validation/commitments.ts`** : schéma Zod aligné sur les colonnes et
  CHECK réels (vérifiés le 2026-07-09). service_type (10 valeurs), frequency
  (dont `one_time`), status (dont `expired`), importance (low→critical) ;
  `amount` nullable ; dates au format AAAA-MM-JJ ; `user_id` jamais du payload.
- **`src/lib/services/commitments.ts`** : list/create/update/delete, session +
  RLS + `.eq` → NOT_FOUND. Colonnes = celles de `store.ts` + `importance`/`notes`.
- **Routes** `/api/commitments` (GET/POST) et `/api/commitments/[id]`
  (PATCH/DELETE). Route → Zod → auth → service → réponse standard.
- Vérifs : sandbox **19/19 PASS** (`sandbox/commitments-validation.test.ts`),
  suite complète verte, lint 0 erreur, `tsc` src propre, build vert.
- ⚠️ Comme Brique 1/2 : socle **additif, pas encore branché** dans l'UI (les
  pages passent encore par `store.ts` en direct, mode invité compris).
  Comportement visible inchangé.

**⚠️ Deux dettes honnêtes mises au jour (à traiter dans une brique dédiée, PAS
ici) :**
1. ~~**Doublon de modèle** : `subscriptions` (orpheline) vs `commitments`.~~
   ✅ **Résolu en Brique 7** : ce n'était pas un doublon mais la table de
   **détection** (abonnements repérés dans les relevés). Elle est maintenant
   branchée et utilisée (page `/abonnements`).
2. ~~**`reminders.commitment_id` NOT NULL** en base alors que `store.ts` insère
   `null` pour les rappels de factures ponctuelles.~~ ✅ **Corrigé en Brique 5**
   (colonne rendue nullable + CHECK « au moins une cible : engagement OU
   facture »).

### Brique 4 — Engagements branchés sur le socle (livré 2026-07-09)
Première **mise en service** du socle : pour les comptes connectés, la façade de
données `store.ts` parle désormais à `/api/commitments` (validation Zod + auth +
RLS côté serveur) au lieu d'attaquer Supabase en direct. Le **mode invité reste
100 % local** (aucun changement). Branchement fait au bon endroit — la façade —
donc **aucune page réécrite**.
- **`src/lib/data/api.ts`** : client typé du socle. `unwrap()` déballe
  l'enveloppe standard (pur, testé), `apiGet/Post/Patch/Delete` en
  `credentials: same-origin` — la session voyage par cookie (@supabase/ssr),
  donc l'appel serveur est authentifié sans réglage.
- **`src/lib/data/store.ts`** : branche cloud de `listCommitments`,
  `addCommitments` (un POST par engagement), `updateCommitment`,
  `deleteCommitment` → socle API. Branche invité inchangée. `COMMITMENT_COLS`
  retiré (les colonnes sont gérées côté serveur).
- **Vérifs faites ici** : sandbox client `data-api.test.ts` (pur) + suite
  complète **394 PASS** ; lint 0, `tsc` src propre, build vert ; E2E Playwright
  Engagements **mode invité 6/6** (ajout / total / persistance / résilié /
  suppression — la branche locale n'a pas régressé) ; smoke serveur non
  authentifié → `/api/commitments` répond **401 UNAUTHORIZED** et un id invalide
  **422 VALIDATION_ERROR** (enveloppe standard).
- ⚠️ **Limite de vérification (environnement)** : ce bac à sable **ne peut pas
  atteindre Supabase** (egress bloqué — les tests navigateur historiques
  coupent `supabase.co`). Le chemin **connecté** (add/modif/suppression en étant
  loggué) n'est donc pas exécutable ici. Il est sûr par construction (mêmes
  insert/RLS qu'avant, derrière un client typé + pont cookie confirmé) et part
  sur la **preview Vercel** de la branche — à valider là avant merge en prod.
  Checklist preview : se connecter → /engagements → ajouter, marquer résilié,
  supprimer un engagement ; vérifier qu'il réapparaît après rechargement.

### Brique 5 — Dette rappels corrigée + Rappels branchés sur le socle (livré 2026-07-09)
Correction de la dette n°2 de la Brique 3, puis mise en service des Rappels.
- **Migration DB `reminders_allow_facture_target`** (table vide, 0 ligne → sans
  risque) : `commitment_id` passe **nullable** + nouveau CHECK
  `reminders_target_present_check` = `commitment_id IS NOT NULL OR facture_id IS
  NOT NULL`. Un rappel peut donc cibler un engagement **ou** une facture
  ponctuelle — ce que le code faisait déjà mais que la base refusait côté cloud.
- **`src/lib/validation/reminders.ts`** : schéma revu — `commitment_id` et
  `facture_id` optionnels, `.refine` « au moins une cible ». Base réutilisable
  pour la mise à jour partielle (`ReminderShape.partial()`).
- **`src/lib/data/store.ts`** : branche cloud de `listReminders` / `addReminder`
  (factures incluses) / `updateReminder` / `deleteReminder` → `/api/reminders`.
  Branche invité inchangée. `REMINDER_COLS` retiré.
- **Vérifs faites ici** : suite sandbox **395 PASS** (dont schéma rappels revu :
  facture seule acceptée, sans cible rejetée) ; lint 0, `tsc` src propre, build
  vert ; **E2E Playwright Rappels mode invité 6/6** (engagement→suggestion→
  programmer→lu→persistance→suppression) ; smoke `/api/reminders` non
  authentifié → **401** standard.
- ⚠️ Même limite qu'en Brique 4 : le chemin **connecté** n'est pas exécutable
  ici (pas d'accès Supabase). Sûr par construction ; à valider sur la preview.
  Checklist : connecté → /rappels → programmer un rappel (engagement ET
  facture), marquer lu, supprimer.

### Brique 6 — Factures ponctuelles branchées sur le socle (livré 2026-07-09)
Dernier module « métier » encore en accès direct : les factures ponctuelles
(eau, taxe, assurance annuelle…) passent maintenant par `/api/factures` pour les
comptes connectés. Mode invité inchangé.
- **`src/lib/validation/factures.ts`** : schéma aligné sur les CHECK réels —
  mode ∈ interval|manual, status ∈ active|archived, interval_months 1..60,
  notice_days 0..365, **et les règles conditionnelles** : interval →
  start_date + interval_months requis ; manual → next_due_date requis
  (miroir de `mode_interval_complet` / `mode_manual_complet`).
- **`src/lib/services/factures.ts`** : list/create/update/delete, session +
  RLS + `.eq` → NOT_FOUND.
- **Routes** `/api/factures` (GET/POST) et `/api/factures/[id]` (PATCH/DELETE).
- **`src/lib/data/store.ts`** : branche cloud des 4 fonctions factures → socle.
  `FACTURE_COLS` retiré (dernière sélection directe supprimée du façade cloud).
- **Vérifs faites ici** : sandbox **412 PASS** (dont cohérence de mode) ; lint 0,
  `tsc` src propre, build vert ; **E2E Playwright Factures mode invité 6/6**
  (interval + manual, persistance, « payée », suppression) ; smoke
  `/api/factures` non authentifié → **401** standard.
- ⚠️ Même limite : chemin **connecté** non exécutable ici → à valider sur la
  preview (ajouter une facture « fréquence » et une « dates fixes »).

**Socle terminé pour les 3 modules métier** : engagements, rappels et factures
passent tous par l'API durcie (connectés) ; seul le mode invité reste 100 %
local. Reste la dette n°1 : la table orpheline `subscriptions`.

### Brique 7 — Détection d'abonnements branchée sur `subscriptions` (livré 2026-07-09)
Le cœur de Serein enfin persisté : les abonnements repérés dans un relevé sont
**mémorisés** (table `subscriptions`, pas jetés), avec les « dormants », et une
page pour les suivre ou les ignorer. Réponse à « la garder ET la construire ».
- **`src/lib/subscriptions/detect.ts`** (logique pure, testée) : conversion
  détection → ligne `subscriptions`. `annual → yearly`, montant réel reconstruit
  (l'annuel ×12), `isDormant` (plus vu depuis > 60 j), dédoublonnage par nom
  (interne + contre l'existant). Dates mal formées → `last_seen` null (robuste).
- **`src/lib/data/store.ts`** : façade `subscriptions` — `listSubscriptions`,
  `saveDetectedSubscriptions` (cloud → `/api/subscriptions` de la Brique 1 ;
  invité → local), `deleteSubscription`.
- **`/analyse`** : après le scoring, la détection est **enregistrée**
  (best-effort, non bloquant) — sans casser le flux « suivre dans mes
  engagements » existant. Un lien renvoie vers les détectés.
- **`/abonnements`** (nouvelle page + entrée de nav « Détectés ») : liste les
  abonnements détectés (montant, fréquence, fiabilité %, badge **Dormant**),
  bandeau « N dormants », actions **Résilier — générer la lettre →** (lien vers
  `/resiliation?service=…`, pré-remplit le formulaire = le moat détection→
  annulation), **Suivre** (→ engagement) et **Ignorer**. (Lien résiliation
  ajouté le 2026-07-09 suite au retour de Juju : « pas de lien résiliation pour
  les souscriptions en ligne ».)
- **Vérifs faites ici** : sandbox **433 PASS** (dont 22 sur la conversion) ;
  lint 0, `tsc` src propre, build vert ; **E2E Playwright invité 6/6** (analyse
  d'un relevé collé → persistance → page détectés → Suivre → présent dans
  Engagements → Ignorer) ; smoke `/api/subscriptions` non authentifié → **401**.
- ⚠️ Même limite : chemin **connecté** non exécutable ici → à valider sur preview
  (analyser un relevé en étant connecté, puis /abonnements).
- Slice suivante possible : marquer « suivi » plutôt que supprimer, filtrer les
  dormants, badge de compteur dans la nav.

**🎉 Plan de fusion « New project → serein-v2 » : TERMINÉ (7 briques).** Le socle
durci (réponse standard, validation, services, Storage) couvre les 4 modules
métier — engagements, rappels, factures, abonnements détectés — pour les comptes
connectés, mode invité préservé.

### Serein — résiliation : liens d'envoi et de résiliation en ligne (2026-07-09)
Retour de Juju : « pas de lien pour envoyer la lettre ni de lien de résiliation
pour les services en ligne ». Deux ajouts sur `/resiliation`, dans la limite
ORIAS (Serein arme, n'envoie jamais à la place du client) :
- **Lien d'envoi** : « 📮 L'envoyer en recommandé en ligne (La Poste) » —
  service officiel, c'est le client qui envoie. En plus de Copier/Télécharger.
- **Lien de résiliation en ligne** : nouveau champ `cancelUrl` sur l'annuaire
  `providers.ts` pour les services web (Netflix, Spotify, Canal+, Basic-Fit,
  Orange, SFR, Free, Bouygues). Bandeau « 💻 [service] se résilie en ligne → »
  quand le prestataire détecté en a un. Assurance/énergie : pas de lien (par
  lettre). Vérif : sandbox `resiliation-links.test.ts` (services web = lien
  https ; assurance/énergie = lettre) + E2E Playwright 5/5, suite 506 PASS.

### Base de données
`supabase/schema.sql` — 5 tables historiques du tunnel : leads, uploads,
transactions, subscriptions, insights (service_role uniquement).
**Vérifié en base le 2026-07-02 : le schéma v5 à 12 tables est déjà déployé
dans le projet Supabase** (profiles, categories, uploads, transactions,
subscriptions, budgets, savings_goals, insights, activity_logs, commitments,
reminders, cancellation_letters — RLS partout, trigger `on_auth_user_created`
qui crée le profil à l'inscription, y compris anonyme). Le module Lettre
écrit désormais dans `cancellation_letters`.

### Design system (thème clair — bascule 2026-07-03)
- **Fond crème `#FCFAF5`**, surfaces blanches `#FFFFFF`, encre `#26302A`
  (texte), vert forêt `moss #375538` / `sage #557A59`, ambre `#B5713A`,
  crimson `#B84B38`. Tokens `cream` / `surface` / `ink` dans `tailwind.config.ts`.
- Conversion faite par remap systématique des classes sombres → claires
  (bg-night→bg-cream/surface, text-white/*→text-ink/*, sage-light→moss…).
- Polices : Instrument Serif (display), Geist (texte), Geist Mono.
- Aligne l'app sur la charte claire du dossier de référence global.

## 3. Déploiement (Vercel)

- **Cause racine des échecs Vercel (corrigée le 2026-07-03) :** `vercel.json`
  contenait `"public": true`, propriété rejetée par le schéma Vercel → **tous**
  les déploiements échouaient avant même la compilation (aucun log). `vercel.json`
  réduit à `{ "framework": "nextjs" }`.
- **Config navigateur :** `.env.production` commité avec les 2 variables
  **publiques** `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  (la clé anon est publique par conception, protégée par RLS). La clé secrète
  `service_role` n'est jamais commitée (à mettre dans Vercel → Env Variables
  si on veut le pipeline PDF `/api/*`).
- Le déploiement de `main` se fait via l'intégration GitHub de Vercel.
- **Deuxième cause racine (corrigée le 2026-07-05) :** les variables
  d'environnement du tableau de bord Vercel pointaient encore vers l'ANCIEN
  projet Supabase (`oujdbevbgqntkousvsms`) et écrasaient `.env.production`
  au build → sessions fantômes des anciens visiteurs + ajouts en échec.
  Correctif : `src/lib/supabase/config.ts` inscrit l'URL et la clé anon
  (publiques par conception) du projet officiel dans le code — plus aucun
  réglage d'hébergeur ne peut les écraser. Ménage recommandé un jour :
  supprimer les variables `NEXT_PUBLIC_SUPABASE_*` obsolètes dans
  Vercel → Settings → Environment Variables (sans urgence, sans effet).

## 3bis. État des lieux — 2026-07-01

**Brique livrée : remise en état complète du dépôt.**
Le dépôt avait été peuplé par des dépôts de fichiers un par un : les versions
complètes des fichiers étaient à la racine sous des noms mutilés par le
navigateur (`page (4).tsx`, `download`, un favicon nommé `validation.ts`…),
tandis que `src/` contenait des versions tronquées, parfois cassées.
Chaque fichier a été identifié par son contenu et remis à sa place ; les
fichiers cassés (postcss, rate-limit, moteur de scoring) ont été réparés.

Vérifications : `npm run test:sandbox` 15/15 PASS · `npm run build` vert ·
`npm run lint` 0 erreur · serveur de prod rendu et CSS vérifiés.

Il manque encore : les vraies clés dans `.env.local` (copier `env.example`),
et l'application de `supabase/schema.sql` sur le projet Supabase si ce n'est
pas déjà fait.

## 4. Prochaines briques (dans l'ordre)

Plan de briques validé par Juju le 2026-07-05 (« prompt ultime ») :
1. ~~Brique 0 — légal + fondation multiservice~~ ✅ livrée
2. ~~Brique 2 — Liens utiles partagés~~ ✅ livrée
3. ~~Brique 1 — Factures ponctuelles~~ ✅ livrée
4. ~~Brique 4 — Détail Nutri-Score enrichi~~ ✅ livrée
5. ~~Brique 3 — OCR ticket de caisse~~ ✅ livrée (l'association automatique
   ticket→fiche Open Food Facts reste hors scope, à réévaluer si besoin).

**Plan « prompt ultime » terminé (5/5).**

**Plan de fusion « New project → serein-v2 » (validé Juju le 2026-07-09)** —
serein-v2 est LE projet définitif, l'ancien « New project » est abandonné
(seule sa doc est récupérée). Briques dans l'ordre :
1. ~~Brique 1 — Socle API (réponse standard, Zod, services)~~ ✅ livrée 2026-07-09
2. ~~Brique 2 — durcissement uploads / Storage (bucket privé, URL signées
   courtes, suppression Storage + base, limites taille/MIME)~~ ✅ livrée 2026-07-09
3. ~~Brique 3 — socle API pour `commitments` (le vrai cœur)~~ ✅ livrée 2026-07-09
4. ~~Brique 4 — Engagements branchés sur `/api/commitments` (connectés), mode
   invité gardé en local~~ ✅ livrée 2026-07-09 (1ʳᵉ mise en service du socle)
5. ~~Brique 5 — dette `reminders.commitment_id` corrigée + Rappels branchés sur
   `/api/reminders`~~ ✅ livrée 2026-07-09
6. ~~Brique 6 — Factures ponctuelles branchées sur `/api/factures`~~ ✅ livrée
   2026-07-09 (socle terminé pour les 3 modules métier)
7. ~~Brique 7 — détection d'abonnements branchée sur `subscriptions`
   (page `/abonnements`, dormants, suivre/ignorer)~~ ✅ livrée 2026-07-09

**Plan de fusion terminé (7/7).** Pistes ensuite (à cadrer) : slice 2 de la
détection (statut « suivi », filtres, compteur nav) ; refonte de l'analyse vers
Mistral OCR (aligne le code sur la page Confidentialité — nécessite une clé API
payante + accord d'envoi à un tiers).
4. Brique 4 — (à préciser depuis le plan de fusion)
5. Brique 5 — (à préciser depuis le plan de fusion)

Garées (hors briques, à re-prioriser ensuite) : chatbot assistant (guidé
gratuit ou IA générative = clé API payante à décider), rappels e-mail,
extension annuaire résiliation.

## 5. Historique des briques

| Date | Brique | Vérification |
|------|--------|--------------|
| 2026-05-12 | Dépôt initial (fichiers déposés un par un, structure cassée) | — |
| 2026-07-01 | Remise en état : reconstruction de l'arborescence, réparations, tests sandbox, build vert | 15/15 PASS, build + lint verts, rendu prod vérifié |
| 2026-07-01 | Générateur de lettres de résiliation (`/resiliation`) : détection du régime légal + lettre LRAR | 15/15 PASS (sandbox lettres), build vert, rendu prod vérifié |
| 2026-07-02 | Sauvegarde des lettres sur Supabase (`cancellation_letters`, auth anonyme, liste « Mes lettres ») | 34/34 PASS sandbox, 7/7 PASS navigateur (API Supabase simulée), contrat SQL vérifié en base, build vert |
| 2026-07-02 | Page Engagements (`/engagements`) : urgence de résiliation, total mensuel, pont vers la lettre | 52/52 PASS sandbox, 11/11 PASS navigateur, build vert |
| 2026-07-03 | Onglet Rappels (`/rappels`) : rappels auto avant la fenêtre de résiliation, nav inter-pages | 68/68 PASS sandbox, 13/13 PASS navigateur, build vert |
| 2026-07-03 | Fix déploiement Vercel (`vercel.json` invalide) + `.env.production` public + lien engagement↔lettre (`commitment_id`) | 70/70 PASS sandbox, 3/3 PASS navigateur (boucle fermée), build vert |
| 2026-07-03 | Next.js 15.5.20 (CVE) — **déploiement en ligne réussi : https://serein-v2.vercel.app** | build Vercel READY, pages vérifiées 200 |
| 2026-07-03 | Onboarding nettoyé : bank/PDF « Bientôt disponible », CTA vers l'app, formulations légales, zéro appel /api cassé | 10/10 PASS navigateur |
| 2026-07-03 | Bascule thème clair (crème/vert forêt/ambre) sur toute l'app | build vert, 3 pages vérifiées en capture, contraste OK |
| 2026-07-03 | Connexion (`/connexion`) : vrais comptes e-mail/mot de passe, nav connectée | 81/81 sandbox PASS, 7/7 navigateur PASS, build vert |
| 2026-07-03 | Tableau de bord (`/dashboard`) : résumé + atterrissage après connexion | 90/90 sandbox PASS, 9/9 navigateur PASS, build vert |
| 2026-07-09 | Brique 1 — Socle API : réponse standard 10 codes, validation Zod alignée base, services subscriptions/reminders, routes canoniques (couche additive) | 30/30 sandbox PASS, suite complète verte, lint 0 erreur, `tsc` src propre, build vert |
| 2026-07-09 | Brique 2 — Socle Storage durci : bucket privé `bank-statements`, helpers MIME/taille/chemin per-user testés, service uploads (URL signées courtes, suppression Storage+base), routes `/api/uploads*` ; suppression des routes mortes upload/analyze | 17/17 sandbox PASS, suite complète verte, lint 0 erreur, `tsc` src propre, build vert |
| 2026-07-09 | Brique 3 — Socle API `commitments` (le vrai cœur) : validation Zod alignée base (service_type/frequency/status/importance), service + routes `/api/commitments*` ; doublon subscriptions/commitments et dette reminders.commitment_id documentés | 19/19 sandbox PASS, suite complète verte, lint 0 erreur, `tsc` src propre, build vert |
| 2026-07-09 | Brique 4 — Engagements branchés sur le socle : façade `store.ts` (cloud) → `/api/commitments`, client typé `data/api.ts`, mode invité intact | Suite sandbox 394 PASS, E2E Playwright invité 6/6, smoke serveur 401/422 standard, lint 0, `tsc` src propre, build vert (connecté à valider sur preview) |
| 2026-07-09 | Brique 5 — dette rappels corrigée (migration : `commitment_id` nullable + CHECK cible présente) + Rappels branchés sur `/api/reminders` (factures incluses) | Sandbox 395 PASS, E2E Playwright Rappels invité 6/6, smoke `/api/reminders` 401 standard, lint 0, `tsc` src propre, build vert (connecté à valider sur preview) |
| 2026-07-09 | Brique 6 — Factures ponctuelles branchées sur le socle : validation Zod (mode/status + règles conditionnelles), service + routes `/api/factures*`, façade cloud rebranchée | Sandbox 412 PASS, E2E Playwright Factures invité 6/6, smoke `/api/factures` 401 standard, lint 0, `tsc` src propre, build vert (connecté à valider sur preview) |
| 2026-07-09 | Brique 7 — détection d'abonnements persistée : logique de conversion testée, façade `subscriptions`, `/analyse` enregistre, page `/abonnements` (dormants, suivre/ignorer) | Sandbox 433 PASS (dont 22 conversion), E2E Playwright détection invité 6/6, smoke `/api/subscriptions` 401 standard, lint 0, `tsc` src propre, build vert (connecté à valider sur preview) |
| 2026-07-14 | PanierMalin — capture du prix payé (encadré après scan) + magasin + ligne « 🏪 Le moins cher pour toi » (`bestStore`, 100 % historique perso) : la source de prix reste indépendante (tes achats, zéro partenaire) | Sandbox 554 PASS 0 FAIL (dont `beststore` 8/8), `node --check` index.html OK, contrat carte DOM linkedom 8/8, cache SW v23 ; rendu réel à confirmer sur téléphone |
| 2026-07-14 | PanierMalin — refonte n°1 « saisie intuitive » : le ticket importe tout d'un coup (`ticketToItems` + `normalizeItemName`), fini la validation ligne par ligne ; magasin demandé une fois ; accueil = Ma liste + « J'ai fait mes courses », code-barres en secondaire | Sandbox 569 PASS 0 FAIL (dont `ticket-import`), `node --check` OK, contrat DOM linkedom 15/15, cache SW v24 ; lecture réelle d'un ticket à confirmer sur téléphone |
| 2026-07-14 | PanierMalin — lecteur de ticket RÉEL (retour terrain « rien de détecté ») : `parseTicketText` gère code TVA en fin de ligne, rayons « >> », promos sur 2 lignes ; vrai ticket Leclerc figé en cas de test | Sandbox 579 PASS 0 FAIL, `paniermalin-ticket-reel.test.ts` 37 produits (avant : 0), non-régression ancien test verte, cache SW v25 |
| 2026-07-14 | PanierMalin — OCR fiabilisé (« lecture impossible » sur mobile) : CDN Tesseract de secours (jsdelivr→unpkg), vraie raison affichée, + plan B « coller le texte du ticket » (même parseur, `ingestTicketLines`) | Sandbox 579 PASS, IDs plan B (linkedom) + parse texte collé OK, `node --check` OK, cache SW v26 |
| 2026-07-14 | Fusion — principes gravés (`SEREIN-PLAN-FUSION.md`) + **routeur universel** `routerDocument(texte)→ courses/abonnement/demarche/inconnu` (Brique 6 candidate, `src/lib/router/logic.ts`) : signaux pondérés + garde-fou seuil/marge → `inconnu` si faible/ambigu ; `ROUTE_TO_SERVICE`. Logique pure, AUCUNE UI encore | Sandbox 592 PASS 0 FAIL (`router.test.ts` 13/13, dont le vrai ticket Leclerc), `src` tsc + lint clean, **build prod vert** |
| 2026-07-14 | Fusion — **le « + » branché** : page `/ajouter` (dépôt PDF/OCR ou collage) → `routerDocument` + `describeDestination` → carte d'orientation (override + `inconnu`→choix) ; relais même origine (`sessionStorage` → `/analyse`, `localStorage` → PanierMalin ouvre le ticket) ; « ＋ Ajouter » dans la nav | Sandbox 597 PASS 0 FAIL (`router.test.ts` 18/18 avec orientation), **build prod vert** (route `/ajouter`), `node --check` PanierMalin OK, cache SW v27 |
| 2026-07-14 | Fusion — **les 3 onglets verrouillés** (`FoyerTabs` : Accueil `/dashboard` · ＋ `/ajouter` · Mon foyer `/foyer`) remplacent la nav à 6 liens sur toute l'app ; les sections deviennent des cartes dans `/foyer` (`foyerSections()` pur) | Sandbox 614 PASS 0 FAIL (`foyer.test.ts` 10/10), **build prod vert** (27 pages, `/foyer` générée), nav swap sur 8 pages sans erreur |
| 2026-07-14 | Fix terrain (retour Juju) — ① `parseTicketText` gère le **copier-coller aplati** (tout sur une ligne : réinsertion de sauts après « prix+TVA » et autour des rayons `>>`) ; ② label de promo nettoyé ; ③ « ＋ Ajouter » ajouté à la **barre PanierMalin** (le « + » n'était que dans le menu Serein) | Sandbox 604 PASS 0 FAIL (ton copier-coller réel = **47 produits**, avant : 1), non-régression tickets classiques verte, `node --check` OK, cache SW v28 |

## Hébergement invité — PanierMalin
`public/paniermalin/` héberge l'app statique PanierMalin (projet séparé,
identité séparée) sur https://serein-v2.vercel.app/paniermalin/ — solution
provisoire pour disposer du HTTPS (caméra) sans second projet Vercel.
À déplacer sur son propre domaine quand PanierMalin redémarre sérieusement.
- **OCR fiabilisé + plan B « coller le texte » (2026-07-14)** : sur le téléphone
  de Juju, l'OCR photo échoue (« lecture impossible ») — le module Tesseract
  (gros téléchargement CDN) ne se charge pas toujours sur mobile. Fait : ① **CDN
  de secours** (jsdelivr → unpkg) ; ② message d'erreur qui montre **la vraie
  raison** (module / image / réseau) au lieu d'un texte vague, pour diagnostiquer ;
  ③ **plan B sans OCR** : un « ✍️ Coller le texte du ticket » (les tickets
  d'enseigne sont numériques → texte copiable) qui passe par le **même** parseur
  (`ingestTicketLines` factorisé, partagé photo + collage). Garantit que la
  fonction marche même si l'OCR coince, et isole le problème. Vérif : suite 579
  PASS, IDs plan B présents (linkedom), parse du texte collé OK, `node --check` OK.
  Cache SW v25→v26. ⚠️ Le chargement OCR réel reste à confirmer sur le tél (le
  message d'erreur nous dira la cause exacte au prochain essai).
- **Lecteur de ticket réel — formats enseignes (2026-07-14)** : Juju teste avec
  un **vrai ticket** (appli E.Leclerc) → « rien de détecté ». Le parseur cherchait
  le prix en **fin de ligne**, or les vraies enseignes ajoutent un **code TVA**
  après le prix (« RECEPTION 380G  3.57  1 » → il tombait sur le « 1 »), utilisent
  des **en-têtes de rayon** (« >> EPICERIE ») et mettent les **promos sur deux
  lignes** (« PAINS AU CHOCOLAT.360G » puis « 2 X 1.89€  3.78 »). `parseTicketText`
  réécrit : prix = décimale à 2 chiffres suivie d'un **code TVA optionnel** ;
  lignes « >> » ignorées ; **ligne « N X …€ » = total rattaché au produit de la
  ligne précédente** (report d'un `pending`) ; décimale DANS le nom (« 9X16.67G »)
  ne fausse plus le prix. Le vrai ticket de Juju est figé comme **cas de test
  terrain** : `paniermalin-ticket-reel.test.ts` → **37 produits** (avant : 0),
  prix/promos/rayons corrects. Non-régression : ancien `paniermalin-ticket.test.ts`
  toujours vert (tickets classiques). Suite **579 PASS 0 FAIL**. Cache SW v24→v25.
  💡 Insight : les tickets Leclerc sont **numériques dans l'appli** → une capture
  d'écran se lit mieux qu'une photo papier.
- **Refonte n°1 « saisie intuitive » — le ticket remplit tout (2026-07-14)** :
  retour cash de Juju (le créateur) : « trop compliqué pour juste une liste et un
  inventaire, pas de logique dans la navigation, trop de saisie, je n'ai moi-même
  pas envie de l'utiliser ». Décision (question posée) : **garder l'ambition
  (acheter intelligent / prix / inventaire) mais rendre la SAISIE intuitive.**
  Le ticket de caisse devient la **porte d'entrée** : une photo → `parseTicketText`
  → **`ticketToItems()`** importe **tout le ticket d'un coup** (chaque ligne =
  produit + prix + magasin + date), **fini la validation ligne par ligne** (avant :
  un menu déroulant Ignorer/Libre/Associer PAR LIGNE — la saisie de trop).
  `normalizeItemName()` fusionne le même produit d'un ticket à l'autre (id stable
  `libre-<nom>`), donc l'inventaire ET le suivi de prix se construisent **sans
  rien taper, sans scanner**. Magasin demandé **une seule fois** (mémorisé
  `pm.lastStore`), lignes mal lues retirables (✕). **Accueil refondu** : 2 actions
  claires — 🛒 Ma liste (quotidien) + 📸 « J'ai fait mes courses » (ticket) ; le
  scan code-barres passe en secondaire (`<details>`). Vérif : sandbox
  `paniermalin-ticket-import.test.ts` (import/fusion/magasin/robustesse),
  suite **569 PASS 0 FAIL**, `node --check` index.html OK, contrat DOM linkedom
  15/15 (id présents, accueil→liste/scan, code-barres en details, import depuis le
  champ magasin). Cache SW v23→v24. ⚠️ Caméra/OCR non testables en bac à sable
  (point d'injection `window.__pmOcr` conservé) : **lecture réelle d'un ticket à
  confirmer sur téléphone**. **Prochaine brique** : vues « Placard » et « Suivi de
  prix » en lecture (dérivées, zéro saisie) + remontée sur la liste (« tu paies ~X,
  le moins cher chez Y »).
- **Capture du prix payé + « le moins cher pour toi » (2026-07-14)** : retour de
  Juju « ça fonctionne mais toujours pas de tarif / où acheter moins cher /
  comment rester indépendants ». Diagnostic : le moteur Prix Intelligent était
  déjà complet, mais **rien ne demandait le prix** — le champ € était minuscule
  et caché, jamais rempli, donc la carte restait au message d'invite. Correctif :
  ① après un scan, **la fiche s'ouvre automatiquement** ; ② la carte affiche
  directement un encadré **« 💶 Combien tu l'as payé ? »** (gros champ prix +
  champ **magasin**, bouton Valider) qui allume tout le reste ; ③ nouvelle ligne
  **« 🏪 Le moins cher pour toi »** = le magasin où TU l'as eu le moins cher,
  calculé sur ton seul historique (fonction pure `bestStore()`). **C'est la
  réponse « rester indépendant » : la source de prix, c'est TES achats** — aucun
  partenaire, aucune enseigne rémunérée, rien de partagé ni vendu. Open Prices
  reste en bonus par-dessus (souvent vide en France). Helper `applyPaid()` :
  enregistre prix + magasin **sans doublonner** l'achat du jour (corrige aussi le
  double-comptage de l'ancien champ €). `recordPurchase()` accepte le magasin.
  Vérif : sandbox `paniermalin-beststore.test.ts` 8/8, suite **554 PASS 0 FAIL**,
  syntaxe du script `index.html` validée (`node --check`), contrat carte DOM
  (linkedom) 8/8 : capture → prix payé/habituel/économie/€ au kg/« moins cher
  pour toi » corrects. Cache SW v22→v23. ⚠️ Caméra/OCR/réseau non testables en
  bac à sable : logique pure + contrat DOM testés, **rendu réel à confirmer sur
  téléphone**.
- **Prix Intelligent — l'effet waouh (2026-07-09)** : sur la fiche produit (tap
  dans l'inventaire), au lieu du prix facial, une carte de décision :
  💳 prix carte fidélité · 🎁 après cagnotte · 💶 **vrai prix payé** · 📦 €/kg ·
  📈 prix habituel (moyenne perso) · 💰 **économie du jour** · 🔄 alternative la
  plus rentable au kilo (dans l'inventaire). Logique pure `smartPrice()` /
  `pricePerKg()` / `bestAlternative()` dans `logic.mjs`. Avantages fidélité
  (remise % / cagnotte €) **saisis** par l'utilisateur, persistés sur le produit.
  **Vision respectée : zéro partenariat rémunéré, données 100 % côté
  consommateur** (prix saisis + historique perso + Open Food Facts + lien fiche
  OFF). Vérif : sandbox `paniermalin-pricing.test.ts` 20/20, E2E Playwright UI
  8/8 (vrai prix, habituel, économie, alternative, recompute live avec remise).
  ⚠️ Cache SW bumpé v10→v12 (sinon l'ancienne page reste servie).
  Suite cadrée (non construite) : onglet Accueil = tableau de bord d'économies,
  cartes de fidélité stockées, notifications de baisse, mode sombre.
- **Audit leviers 2 & 3 (2026-07-09)** :
  - **#3 Scan iOS** : `scanOnce()` tente `BarcodeDetector` (Android, inchangé),
    et **à défaut charge ZXing à la volée** (`esm.sh/@zxing/browser`) pour
    scanner sur iPhone/Safari. Additif : le chemin Android qui marche n'est pas
    touché (aucune régression) ; iOS était sans scan → au pire reste sans scan.
    `stopScan()` arrête aussi ZXing. ⚠️ Non testable en bac à sable (caméra +
    CDN) → **à valider sur iPhone** ; E2E : clic scan sans crash JS, chemin
    Android intact.
  - **#2 Contribuer les prix** : Open Prices exige un **compte OFF + photo de
    preuve** pour poster → l'auto-contribution complète est un chantier non
    vérifiable ici. Livré la version sûre : lien **« 🤝 contribuer sur Open
    Prices »** sur la fiche produit (`openPricesProductUrl`) → l'utilisateur
    poste avec son compte (on l'arme, on n'agit pas à sa place). Testé (URL) + E2E.
  Cache SW v21→v22.
- **Open Prices — prix communautaires (2026-07-09, brique n°1 de l'audit)** :
  réponse à la faiblesse n°1 (donnée prix manuelle). La carte Prix Intelligent
  affiche un **« 💬 Prix communauté : dès X € · enseigne »** tiré d'Open Prices
  (base de prix ouverte d'Open Food Facts), **même sans saisie** de l'utilisateur.
  Zéro partenariat, données ouvertes, cohérent avec la ligne « famille OFF ».
  `openPricesUrl()` + `summarizeCommunityPrices()` (parseur TOLÉRANT : compte,
  plus bas, médiane, dernier relevé ; filtre EUR ; formes de champs variables
  gérées → null si inexploitable). Affichage **best-effort** (fetch côté client,
  non bloquant si l'API diffère/indispo). ⚠️ L'API Open Prices est **bloquée dans
  le bac à sable** : parseur testé contre le contrat documenté (sandbox
  `paniermalin-openprices.test.ts` 12/12) + E2E best-effort 4/4 (carte OK, fetch
  tenté, rien cassé si indispo) — **le rendu réel des prix communautaires est à
  vérifier sur un vrai téléphone**. Cache SW v20→v21.
- **Inventaire → liste « À racheter » en un tap (2026-07-09)** : ferme la boucle
  scan → inventaire → liste. Chaque produit de l'inventaire a un bouton **🛒**
  (→ **✓** s'il est déjà sur la liste) qui l'ajoute à la liste de courses.
  Helper pur `isOnList()` (insensible casse/espaces, ignore les pierres
  tombales). Vérif : sandbox `paniermalin-rebuy.test.ts` 5/5, E2E 3/3, suite
  533 PASS. Cache SW v19→v20.
- **Liste : ajout par code-barres et par photo (2026-07-09)** : retour de Juju.
  Dans l'écran Liste, en plus du manuel/autocomplétion : bouton **📷 Code-barres**
  (bascule sur la caméra, `scanMode='list'` → le produit scanné va dans la liste
  via `addEanToList`, nom trouvé dans la famille Open Food Facts) et **🖼️ Photo
  de ma liste** (OCR local Tesseract → `parseShoppingListPhoto()` retire
  puces/cases/numéros/quantités → articles proposés à ajouter un par un ou tous).
  Le scanner a été refactoré en `scanOnce()` réutilisable (inventaire OU liste).
  Vérif : sandbox `paniermalin-listphoto.test.ts` 11/11, E2E 6/6, suite 528 PASS.
  Cache SW v16→v18. ⚠️ scan/photo runtime non testables en sandbox (caméra +
  module OCR réseau) : logique pure testée + boutons/navigation E2E.
- **Thème clair forcé + vrai bouton clair/sombre (2026-07-09)** : `color-scheme:
  light` sur Serein + PanierMalin. Comme le navigateur de Juju forçait quand même
  le sombre, PanierMalin a désormais un **bouton ☀️/🌙** (barre du haut) : vrai
  thème sombre (variables CSS `:root[data-theme=dark]`), défaut **clair**, choix
  persistant (localStorage `pm.theme`), appliqué avant rendu (script `<head>`, pas
  de clignotement) + `colorScheme` posé sur `<html>` (prioritaire sur le
  navigateur). Vérif : E2E Playwright 7/7 (défaut clair, bascule sombre réelle,
  persistance, retour clair). SW v18→v19. Serein : toggle possible plus tard
  (Tailwind, plus gros chantier).
- **Barre du haut discrète + liste semi-auto (2026-07-09)** : retours de Juju.
  ① Les 3 pavés du haut (Accueil / Ma banque / Retour Serein) regroupés dans une
  **barre fine** : « ← Accueil » à gauche (masqué sur l'accueil), 🏦 Banque +
  🛡️ Serein en petit à droite ; les boutons « ← Accueil » par écran sont retirés.
  ③ **Saisie semi-automatique** de la liste : propositions pendant la frappe
  (`COMMON_GROCERIES` + récurrents + inventaire, `suggestListItems()` — préfixe
  puis contenu, sans accents/casse/ligatures, exclut ce qui est déjà dans la
  liste), la saisie 100 % manuelle reste possible (Entrée / +). Vérif : sandbox
  `paniermalin-autocomplete.test.ts` 12/12, E2E 8/8, suite 517 PASS. SW v15→v16.
- **Scan non-alimentaire (2026-07-09)** : retour de Juju « Vania ne marche pas ».
  Le scan n'interrogeait qu'Open Food Facts (alimentaire). Élargi à la famille :
  Open **Beauty** Facts (hygiène/cosmétique) puis Open **Products** Facts (le
  reste) — `PRODUCT_API_HOSTS`, `productApiUrl()`, `pickProduct()` (1re source
  reconnue). Données ouvertes, zéro partenariat. Vérif : sandbox
  `paniermalin-sources.test.ts` 9/9, suite 488 PASS. Cache SW v14→v15.
- **Enseignes & fidélité = liens, pas de carte stockée (2026-07-09)** : choix
  de Juju — on ne stocke AUCUNE carte de fidélité (donnée sensible), on donne des
  **liens officiels** vers les enseignes (offres/fidélité), + **ajout perso**
  d'une enseigne (nom + lien https) si absente, retirable. Sources fusionnées :
  liste par défaut (9 enseignes FR, sites officiels https) + liens distants
  (Supabase `liens_utiles`) + ajouts perso (localStorage, juste des liens).
  Logique pure `mergeEnseignes()` / `normalizeEnseigne()` / `isValidHttpsUrl()`
  (dédoublonnage insensible à la casse, https only). La section « Bons plans &
  cartes de fidélité » devient « 🏪 Enseignes & fidélité ». Vérif : sandbox
  `paniermalin-enseignes.test.ts` 16/16, E2E Playwright 6/6, suite 479 PASS.
  Cache SW v13→v14.
- **Accueil = tableau de bord (2026-07-09, remplace les onglets du bas)** :
  Juju n'aimait pas la barre d'onglets → direction « Accueil façon Revolut »
  (son choix). **Écran d'accueil par défaut** : 💰 économies du jour, 🎉 bonnes
  affaires du moment, 🔁 à racheter (tes essentiels/récurrents), gros bouton
  Scanner, accès rapides Liste/Inventaire/Plans. **La barre d'onglets du bas est
  supprimée** ; l'accueil est le hub, chaque écran a un « ← Accueil ». Logique
  pure `dashboardStats()` (économies = somme des prix sous l'habituel ; affaires ;
  récurrents). Vérif : sandbox `paniermalin-dashboard.test.ts` 10/10, E2E
  Playwright accueil 9/9, suite 463 PASS. Cache SW v12→v13.
- **Réorganisation en onglets (2026-07-09, remplacée le même jour)** : première
  tentative (barre d'onglets bas) — remplacée par l'Accueil ci-dessus après
  retour de Juju. Scan code-barres : confirmation renforcée « ✓ Ajouté à votre
  inventaire : … » (+ vibration) — conservée.
- **Listes v1 (2026-07-05)** : liste de courses (`listes.mjs`, logique pure
  testée 15/15) — ajout dédoublonné, cocher, ⭐ récurrent, « Nouvelle
  semaine » (les récurrents reviennent, les achats ponctuels sortent),
  partage famille en texte (navigator.share / presse-papiers, lisible sans
  app), suggestions « à racheter ? » depuis l'inventaire scanné (≥ 2 achats).
  Service worker passé en v3 pour propager la mise à jour.
- **Lecteur de ticket de caisse (Brique 3, 2026-07-06)** : photo → OCR
  **100 % sur l'appareil** (Tesseract.js `fra`, module chargé du CDN au
  premier usage — l'image ne part jamais). Parseur pur `parseTicketText`
  (prix fin de ligne, virgule/point, « 2 X » nettoyé, totaux/TVA/CB/
  n° ticket/remises/prix-au-kg exclus, bornes 0,05-500 €). Chaque ligne :
  Ignorer (défaut) / Entrée libre / Association à un produit scanné
  (suggestion par mots communs, pré-sélectionnée mais JAMAIS d'auto-import :
  bouton « Valider la sélection » obligatoire). Association → met à jour le
  prix + historique comme le champ prix. **HORS SCOPE documenté** :
  correspondance automatique ticket→fiche Open Food Facts (trop peu fiable
  en une brique). Point d'injection `window.__pmOcr` pour les tests.
  Testé : `sandbox/paniermalin-ticket.test.ts` 13 cas + 10 cas navigateur
  (OCR simulé). Service worker v7.
- **Retours utilisateur (2026-07-07)** :
  (1) **BUG import ticket corrigé** — l'attribut `capture` sur l'unique
  input forçait l'appareil photo sur mobile et empêchait de choisir une
  image de la galerie. Désormais DEUX entrées : « 📸 Prendre une photo »
  (capture) et « 🖼️ Importer une image » (sans capture), même traitement.
  (2) **Propositions d'achat promo** : `promoSuggestions` — produits achetés
  ≥ 2 fois dont le dernier prix est une promo vs VOS prix (priceSignal
  injecté) et pas déjà à prendre → boutons « + Nutella · 3,90 € » dans la
  carte liste, ajout en un tap.
  (3) **Accès dédié aux récurrents** : bouton « 🔁 Récurrents (n) » qui
  filtre la liste (cochés compris) / retour « Toute la liste ».
  Service worker v9.
- **Détail Nutri-Score enrichi (Brique 4, 2026-07-06)** : tap sur un produit
  → fiche dépliable (sucres, sel, matières grasses dont saturées, fibres,
  protéines /100 g, additifs E…), explications statiques Nutri-Score/NOVA,
  lien « fiche complète sur Open Food Facts ». AUCUN appel réseau
  supplémentaire : tout vient de la réponse OFF déjà stockée (champ
  `additives_tags` ajouté au fetch). Produits scannés avant la mise à jour →
  message doux « détails non disponibles, rescannez-le » (pas de re-fetch
  automatique en masse). Testé : `sandbox/paniermalin-detail.test.ts`
  10 cas + 9 cas navigateur. Service worker v6.
- **Synchro famille EN DIRECT (2026-07-05, v2)** : bouton « 👨‍👩‍👧 Synchro
  famille » → code secret 8 caractères + lien à partager ; chaque téléphone
  qui a le lien voit et modifie la même liste (tirage toutes les 8 s,
  fusion « la modification la plus récente gagne », pierres tombales pour
  les suppressions). Côté Supabase : table `paniermalin_lists` VERROUILLÉE
  (RLS sans policy) accessible uniquement via les fonctions `pm_get_list` /
  `pm_save_list` (security definer, code exigé — impossible d'énumérer les
  listes). Hors ligne : tout continue en local. Service worker v4.
| 2026-07-04 | Abonopack v1 : score de vigilance explicable + économies doublons sur le dashboard | 102/102 PASS sandbox, 7/7 PASS navigateur, build vert |
| 2026-07-04 | Analyse de relevé 100 % navigateur (`/analyse`, PDF + collage) + Unik v1 (conseil légal par engagement) | 116/116 PASS sandbox, 8/8 PASS navigateur, build vert |
| 2026-07-05 | Corrections retours : mode invité local (ajouts qui marchent sans réglage Supabase, migration à la connexion), lettres au bon terme par catégorie, annuaire 17 prestataires + lecture de contrat PDF + expéditeur mémorisé, hub racine Serein + PanierMalin | 146/146 PASS sandbox, 18/18 PASS navigateur (Supabase bloqué), build + lint verts |
| 2026-07-05 | Fix critique : la prod compilait avec l'ANCIEN projet Supabase (variables Vercel obsolètes) → config officielle inscrite dans le code (`supabase/config.ts`) + repli mémoire si localStorage bloqué | bundle en ligne vérifié (bon projet, ancien absent), 18/18 PASS navigateur |
| 2026-07-05 | Détection sur relevé d'1 mois (parseur réel + repli 1 occurrence) + Offres de référence télécom/énergie (ligne 💡 sur /engagements) + PanierMalin listes (courses, récurrents, partage famille) | 183/183 PASS sandbox, 13/13 PASS navigateur, build + lint verts |
| 2026-07-05 | a-b-c : parseur 2 lignes + « lignes non comprises » sur /analyse · offres streaming/sport/assurance · PanierMalin synchro famille en direct (code secret, fusion multi-téléphones, table verrouillée) | 197/197 PASS sandbox, 8/8 PASS navigateur (2 contextes synchronisés), build vert |
| 2026-07-05 | Brique 0 : pages légales (confidentialité/CGU/mentions), /compte + suppression RGPD (`delete_my_account`, cascade vérifiée), table `user_services`, textes PanierMalin nuancés | 210/210 PASS sandbox, 15/15 PASS navigateur, build + lint verts |
| 2026-07-06 | Brique 2 : table `liens_utiles` publique + logique partagée (https only) ; `<LiensUtiles/>` sur /engagements (eau/énergie + note commune) ; « Bons plans & fidélité » sur /paniermalin (6 enseignes) | 220/220 PASS sandbox, 8/8 PASS navigateur (table pleine + vide), build vert |
| 2026-07-06 | Brique 1 : factures ponctuelles — table dédiée + `facture_id` sur reminders, mode A calculé (ancre = échéance stockée) / mode B figé, rappels réutilisés, section /engagements + suggestions /rappels | 244/244 PASS sandbox, 10/10 PASS navigateur, build vert |
| 2026-07-06 | Brique 4 : détail Nutri-Score enrichi PanierMalin (tap → sucres/sel/gras/fibres/protéines/additifs, explications, lien OFF, zéro appel réseau en plus, vieux produits gérés) | 254/254 PASS sandbox, 9/9 PASS navigateur, build vert |
| 2026-07-06 | Brique 3 : lecteur de ticket OCR local (Tesseract.js fra), parseur tickets FR (totaux/TVA/CB exclus), validation humaine ligne par ligne (ignorer/libre/associer + suggestion), jamais d'auto-import | 267/267 PASS sandbox, 10/10 PASS navigateur (OCR simulé), build vert |
| 2026-07-06 | Navigation croisée (🧺 PanierMalin dans la nav Serein, 🛡️ Retour Serein en tête de PanierMalin) + menu « 🏦 Ma banque » (14 banques FR, lien direct, table partagée, masqué hors ligne) | 270/270 PASS sandbox, 9/9 PASS navigateur, build vert |
| 2026-07-06 | Dashboard administrateur /admin : RPC `admin_stats()` réservée à l'éditeur (vérifiée en base), chiffres agrégés (comptes, engagements, lettres, rappels, factures, listes famille) + répartitions, 3 états d'accès | 283/283 PASS sandbox, 10/10 PASS navigateur, build vert |
| 2026-07-06 | Export CSV RGPD : /api/export-csv (RLS via session + refiltre onlyMine, lecture seule), UTF-8+BOM `;` Excel FR, colonnes et valeurs en français, anti-injection formule, bouton sur /compte | 303/303 PASS sandbox, 4/4 PASS navigateur, build vert |
| 2026-07-07 | PanierMalin retours : bug import ticket corrigé (capture forçait l'appareil photo → 2 entrées photo/galerie), propositions d'achat promo (vs prix habituels perso), accès dédié « 🔁 Récurrents » | 309/309 PASS sandbox, 12/12 PASS navigateur, sw v9 |
| 2026-07-07 | Lecture de documents robuste : secours OCR local pour PDF scannés (Serein) + prétraitement image N/B Otsu avant OCR (PanierMalin), module partagé public/shared/pretraitement.mjs | 319/319 PASS sandbox, 7/7 PASS navigateur, build vert, sw v10 |
| 2026-07-07 | Pages légales : /positionnement (arme vs mandat, face Papernest/Ideel) + /confidentialite réécrite (documents → Mistral UE, TODO À COMPLÉTER) + Mentions Mistral + landing repositionnée ; retrait des affirmations « 100 % local » contradictoires. Aucune logique métier | 319/319 sandbox intacts, 24/24 navigateur, build + lint verts |
