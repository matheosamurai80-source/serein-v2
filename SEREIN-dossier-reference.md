# SEREIN — Dossier de référence

> Document à consulter en premier avant toute intervention sur ce dépôt.
> Dernière mise à jour : 2026-07-01 (brique « remise en état du dépôt »)

## 1. Le produit

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
5. **ScreenConversion** — capture e-mail + choix banque ou import PDF

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

### Base de données
`supabase/schema.sql` — 5 tables historiques du tunnel : leads, uploads,
transactions, subscriptions, insights (service_role uniquement).
**Vérifié en base le 2026-07-02 : le schéma v5 à 12 tables est déjà déployé
dans le projet Supabase** (profiles, categories, uploads, transactions,
subscriptions, budgets, savings_goals, insights, activity_logs, commitments,
reminders, cancellation_letters — RLS partout, trigger `on_auth_user_created`
qui crée le profil à l'inscription, y compris anonyme). Le module Lettre
écrit désormais dans `cancellation_letters`.

### Design system (ce dépôt)
- Fond nuit `#0A0B09`, sauge `#82A884`, mousse `#375538`, ambre `#BE7D38`,
  blanc chaud `#F8F7F3` — définis dans `tailwind.config.ts`
  (chargé par Tailwind v4 via `@config` dans `src/app/globals.css`).
- Polices : Instrument Serif (display), Geist (texte), Geist Mono.
- NB : la charte « Crème/Vert forêt/Cormorant Garamond » du dossier global
  correspond à une autre itération — ce dépôt utilise la déclinaison sombre.

## 3. État des lieux — 2026-07-01

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

1. Activer « Anonymous sign-ins » dans Supabase, puis tester la sauvegarde
   d'une lettre en conditions réelles (le code est prêt et vérifié).
2. Page Engagements sur la table `commitments` (v6 validée dans Serein v1 —
   proto 4 onglets Suivi / Rappels / Offres / Lettre à consolider ici).
3. Relier `/resiliation` aux abonnements détectés (pré-remplissage) et à
   `commitment_id`.

## 5. Historique des briques

| Date | Brique | Vérification |
|------|--------|--------------|
| 2026-05-12 | Dépôt initial (fichiers déposés un par un, structure cassée) | — |
| 2026-07-01 | Remise en état : reconstruction de l'arborescence, réparations, tests sandbox, build vert | 15/15 PASS, build + lint verts, rendu prod vérifié |
| 2026-07-01 | Générateur de lettres de résiliation (`/resiliation`) : détection du régime légal + lettre LRAR | 15/15 PASS (sandbox lettres), build vert, rendu prod vérifié |
| 2026-07-02 | Sauvegarde des lettres sur Supabase (`cancellation_letters`, auth anonyme, liste « Mes lettres ») | 34/34 PASS sandbox, 7/7 PASS navigateur (API Supabase simulée), contrat SQL vérifié en base, build vert |
