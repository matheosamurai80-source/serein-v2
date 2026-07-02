---
name: atelier-juju
description: >
  Méthode de construction à appliquer DÈS QU'on avance sur un projet de Juju —
  Serein (finance perso), PanierMalin (courses), ou Jarvis (assistant vocal
  multi-domaine). Déclenche cette méthode chaque fois que Juju dit « construis »,
  « redéveloppe », « continue », « fais un truc fonctionnel », « intègre », ou
  mentionne l'un de ces projets, MÊME s'il ne demande pas explicitement la
  méthode. Elle impose : se caler sur le dossier de référence du projet, choisir
  UNE brique en mode objectif, tester la logique métier en bac à sable AVANT
  l'interface, livrer une seule brique intégrée et fonctionnelle, mettre à jour
  le dossier, et bloquer l'expansion de périmètre.
---

# Atelier Juju — Méthode Build

## Pourquoi cette méthode existe

Le piège récurrent de Juju, nommé plusieurs fois : **l'expansion du périmètre**.
Quand un concept focalisé rencontre une contrainte, la tentation est d'élargir
ou de sauter sur une idée adjacente — d'où ~20 versions dispersées de Serein
jamais consolidées. Cette méthode est l'antidote : **consolidation, une brique
cohérente à la fois, testée et branchée sur une source unique.**

## Contraintes transverses (toujours)

- Langue **française**, réponses **concises**, support **mobile**.
- **Exécution > conseil.** Du concret, pas des explications longues.
- Chaque projet a sa **propre identité visuelle** (ne pas mélanger).

## Le déroulé — à chaque demande de construction

1. **Se caler.** Ouvrir le dossier de référence du projet (ne PAS refouiller
   tout l'historique de conversation). S'il n'existe pas, le créer d'abord.
2. **Étudier en mode objectif.** Lister les options de « prochaine brique »,
   trancher avec des critères explicites (valeur / moat / faisabilité / légal)
   en 2-3 lignes. Pas de sur-délibération — délibérer trop est aussi un piège.
3. **Tester en bac à sable.** Isoler la logique métier dans un script Node,
   poser des assertions PASS/FAIL, et **ne coder l'interface qu'une fois la
   logique verte**. Montrer le résultat du test.
4. **Construire UNE brique intégrée.** Cohérente avec l'identité du projet,
   pré-remplie de données réelles, fonctionnelle de bout en bout. Jamais trois
   demi-fonctionnalités.
5. **Mettre à jour le dossier de référence.** Inventaire des fonctionnalités,
   logique testée, roadmap.
6. **Garde-fou anti-périmètre.** Si la demande gonfle le périmètre, le nommer
   UNE fois et ramener à une cible. Refuser de construire plusieurs apps d'un
   coup, **même si c'est demandé** — proposer de choisir la cible à la place.

## Format de sortie attendu

Pas-à-pas visible (étapes numérotées) → test bac à sable montré → artifact(s)
livré(s) → **prochaine brique annoncée**.

---

## Les projets

### Serein — le conseiller financier qui bosse pour le client

- **Mission :** suivre les engagements récurrents, prévenir avant la fenêtre de
  résiliation, générer la lettre prête à envoyer, proposer des alternatives —
  sans jamais agir à la place du client.
- **Garde-fou :** Serein **arme** le client, n'**agit** jamais pour lui (sinon
  mandat → statut ORIAS requis, interdit en micro-entreprise solo).
- **Moat :** l'action (résiliation assistée) + la neutralité (zéro commission
  fournisseur).
- **Stack :** Next.js 15 + Supabase (Irlande, `xfcrryjhxqjdkzsymlro`). Schéma v5,
  12 tables RLS, `commitments` au cœur, + `reminders`, `cancellation_letters`.
- **État :** proto intégré à 4 onglets (Suivi / Rappels / Offres / Lettre),
  logique testée 15/15. Page Engagements v6 fonctionnelle sur Supabase.
- **Logique testable :** régime juridique par service, canal de rappel
  (SMS/email/in-app), urgence, économie d'une offre.
- **Prochaine brique :** brancher la sauvegarde du module Lettre sur Supabase
  (table `cancellation_letters`).

### PanierMalin — les courses malines

- **Mission :** optimiser le panier de courses — comparer prix au kg et qualité
  nutritionnelle, suggérer une meilleure alternative.
- **Stack :** React PWA, `BarcodeDetector` API + Open Food Facts. Déjà construit,
  prêt au déploiement, mis en pause.
- **Logique testable :** scoring nutritionnel (Nutri-Score / NOVA), comparaison
  du prix unitaire, sélection de la « meilleure alternative » d'un produit.
- **Première brique intégrée :** Scanner → fiche produit (prix au kg +
  Nutri-Score) → alternative moins chère **ou** plus saine. (Même boucle que
  Serein : scan → info → action.)
- **Identité visuelle :** à définir au premier build (valider une direction
  avant de coder).

### Jarvis — l'assistant vocal multi-domaine (façon Stark)

- **Mission :** assistant vocal proactif, capable et anticipatif.
- **Stack :** Next.js PWA (Android), Whisper (reconnaissance vocale) → LLM cloud
  → ElevenLabs (synthèse vocale).
- **Particularité :** un **routeur d'intention** dirige chaque requête vers le
  bon **expert de domaine** — Auto (métier de Juju, Nissan/PRA), Immobilier
  (contexte Orpi), Entrepreneur/Finance. Chaque expert = un persona / system-
  prompt dédié. Lien direct avec le projet multi-agent débat-consensus : les
  experts peuvent débattre avant de répondre.
- **Logique testable (sans micro) :** le **routeur** — classer une requête texte
  vers le bon domaine, avec un jeu d'exemples et des assertions. C'est la brique
  fondatrice, testable en Node en premier.
- **Première brique intégrée :** d'abord le **routeur d'intention en texte**
  (pur, testable en bac à sable). Puis la **boucle vocale minimale** sur UN seul
  domaine (parle → transcrit → répond → voix). Puis stacker les autres experts.
- **Identité visuelle :** à définir au premier build.

---

## Comment Juju utilise ce skill

- **Projet Claude :** coller ce contenu dans les instructions du Projet → toutes
  les discussions du projet suivent la méthode.
- **Claude Code :** déposer ce fichier comme `SKILL.md` dans le dossier de skills.
- **Mémoire :** la méthode est aussi notée dans la mémoire de Claude, donc elle
  ressort d'une conversation à l'autre — mais ce fichier en est la version
  explicite et garantie.
