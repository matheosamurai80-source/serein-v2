# SEREIN — Dossier de référence

> Document à consulter en premier avant toute intervention sur ce dépôt.
> Dernière mise à jour : 2026-07-01 (brique « remise en état du dépôt »)

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
- `POST /api/leads` — crée un lead (validation Zod, rate-limit)
- `POST /api/upload` — reçoit un relevé PDF (max 10 Mo, bucket Supabase `pdfs`)
- `POST /api/analyze` — extrait le texte (`pdf-parse`), parse les transactions
  (`src/lib/pdf/parser.ts`, formats bancaires français), détecte les
  récurrences et score l'inutilité (`src/lib/scoring/engine.ts`), écrit
  transactions/subscriptions/insights en base.

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

**Plan « prompt ultime » terminé (5/5).** Prochaines candidates à
prioriser avec Juju : chatbot assistant (guidé gratuit ou IA générative =
clé API payante), rappels e-mail, admin des liens utiles, facturation
`user_services`.

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

## Hébergement invité — PanierMalin
`public/paniermalin/` héberge l'app statique PanierMalin (projet séparé,
identité séparée) sur https://serein-v2.vercel.app/paniermalin/ — solution
provisoire pour disposer du HTTPS (caméra) sans second projet Vercel.
À déplacer sur son propre domaine quand PanierMalin redémarre sérieusement.
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
