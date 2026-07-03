# SEREIN v2 — Instructions projet

App française de gestion financière personnelle, spécialisée dans la détection
et l'annulation d'abonnements. Ce dépôt contient le tunnel d'onboarding
(landing → question → simulation → réassurance → conversion) et le pipeline
d'analyse de relevés PDF (parseur → moteur de scoring → insights).

**Document de référence à consulter en premier : `SEREIN-dossier-reference.md`**

## Méthode BUILD — obligatoire sur tout

1. Se caler sur le dossier de référence avant toute chose
2. Étudier les options objectivement
3. Tester la logique métier en sandbox (script Node, PASS/FAIL) AVANT toute UI
4. Construire UNE SEULE brique intégrée et fonctionnelle — jamais de demi-fonctionnalités
5. Mettre à jour le dossier de référence après chaque livraison
6. Nommer et refuser explicitement toute expansion de périmètre (scope creep)

Format de sortie attendu à chaque livraison :
pas-à-pas visible → test sandbox montré → artifact livré → prochaine brique annoncée

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript strict
- Tailwind CSS v4 (`@config` pointe sur `tailwind.config.ts` pour le thème)
- Supabase (projet ID : xfcrryjhxqjdkzsymlro) — schéma dans `supabase/schema.sql`
- Zustand (store onboarding), Zod (validation), pdf-parse (extraction PDF)

## Commandes

- `npm run dev` — serveur de développement
- `npm run build` — build de production (doit rester vert)
- `npm run lint` — ESLint
- `npm run test:sandbox` — tests PASS/FAIL de la logique métier (parseur + scoring)

## Limite légale — à ne jamais franchir

Serein « arme le client » (détecte, alerte, génère des lettres) — il n'agit
JAMAIS à la place du client. C'est la limite qui évite la licence ORIAS.

## Contexte utilisateur

Juju est solo founder, novice en technique : proposer et exécuter, expliquer
en langage simple, ne pas demander de décisions techniques pointues.
