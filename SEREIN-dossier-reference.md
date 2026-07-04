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
- Page `/resiliation` : formulaire → régime détecté + lettre → copier /
  télécharger .txt / **sauvegarder dans son espace** (connexion anonyme
  Supabase → insert `cancellation_letters`, liste « Mes lettres »).
  C'est toujours le client qui envoie (limite ORIAS respectée).
- `src/lib/letters/db.ts` : correspondance régimes → `letter_type` v5
  (hamon→hamon, chatel_*→chatel, reste→standard) + validation avant insert.
- Testé par `sandbox/letters.test.ts` (19 cas PASS/FAIL) + parcours navigateur
  simulé au format exact de l'API Supabase (7 cas, dont anonyme désactivé).
- ⚠️ Action requise une fois : activer « Anonymous sign-ins » dans
  Supabase → Authentication → Providers (sinon la page l'explique en clair).

### Page Engagements — `/engagements` (le cœur du schéma v5)
- `src/lib/commitments/logic.ts` — logique testée : coût mensualisé (hebdo/
  mensuel/trimestriel/annuel/ponctuel), échéance effective (date explicite ou
  anniversaire − préavis), urgence (critique ≤ 7 j / bientôt ≤ 30 j / ok /
  dépassée), tri urgence puis coût, total mensuel des actifs, correspondance
  type de service → catégorie légale.
- Page : total récurrent /mois, formulaire d'ajout, liste triée par urgence
  avec badges, **« Générer la lettre → »** pré-remplit `/resiliation`
  (service + catégorie), « Résilié ✓ » (status cancelled), suppression.
  Même session anonyme que les lettres (RLS `user_id = auth.uid()`).
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
  `signInWithPassword` / `signUp`, redirection vers `/engagements`,
  message « vérifiez votre boîte mail » si confirmation requise,
  lien « continuer sans connexion » (l'anonyme reste possible).
- `src/components/ui/nav.tsx` : affiche l'e-mail connecté + « Déconnexion »,
  sinon un lien « Connexion » (via `onAuthStateChange`).
- Un compte réel supprime le besoin d'activer les connexions anonymes.
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

### Unik v1 — conseil légal par engagement (livré 2026-07-04)
- `src/lib/unik/logic.ts` : conseil court et juste par type de service
  (télécom → L.224-39 · énergie/eau → L.224-15 · assurance → Hamon/Chatel ·
  streaming/sport → Chatel reconduction, adapté selon qu'une échéance est
  connue) ; pas de conseil générique pour loyer/crédit/impôts.
- Affiché sur chaque carte d'engagement (« Unik · … »).

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

1. **Unik v1** : recommandations personnalisées par profil, au-dessus
   d'Abonopack (à cadrer avant de construire).
2. Activer « Anonymous sign-ins » dans Supabase (mode sans compte), puis
   tester lettres + engagements + rappels en conditions réelles.
2. Relier `/resiliation` aux abonnements détectés par l'analyse PDF
   (pré-remplissage depuis un abonnement repéré). [lien commitment_id fait]
3. Rappels e-mail/SMS (canaux `email`/`sms` déjà prévus au schéma) — nécessite
   un service d'envoi ; à cadrer avant de construire.

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
| 2026-07-04 | Abonopack v1 : score de vigilance explicable + économies doublons sur le dashboard | 102/102 PASS sandbox, 7/7 PASS navigateur, build vert |
| 2026-07-04 | Analyse de relevé 100 % navigateur (`/analyse`, PDF + collage) + Unik v1 (conseil légal par engagement) | 116/116 PASS sandbox, 8/8 PASS navigateur, build vert |
