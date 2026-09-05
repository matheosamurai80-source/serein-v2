# SEREIN — IDEA PARKING

> Rien ne se perd. Une idée qui ne peut plus changer la décision **du moment**
> vient ici, avec ce qui a été établi à son sujet et ce qui la débloquerait.
> Ouvert le 2026-09-03.

**Fil principal en cours :** Brique 8b — coffre chiffré, mode connecté
(bloquée : Supabase en pause).

---

## Statuts

`ACTIF` en cours · `PRÊT` cadré, attend son tour · `À CADRER` intuition à
démonter · `STOP` écarté, avec le motif · `ARCHIVÉ` hors périmètre Serein

---

## 1. Produit Serein — suite directe

### P-023 · `/transparence` sur données réelles — **PRÊT**
La page démontre le chiffrement sur un contrat AXA fictif codé en dur. Elle doit
afficher **les vrais engagements** de l'utilisateur, plus le nombre de lignes
restées en clair (`countLegacy()`, déjà écrit).
**Débloqué par :** Brique 8b.
**Pourquoi ça compte :** c'est la page qui porte la promesse. Une preuve sur une
donnée fictive n'est pas une preuve.

### P-024 · Chiffrer factures, garanties, rappels, PanierMalin — **PRÊT**
Mêmes champs sensibles, même mécanique (`sealRow`/`openRow`). Une brique par
module, jamais les quatre d'un coup.
**Attention :** déclarer les champs dans `tiers.ts` AVANT de brancher — le
fail-safe envoie au coffre tout champ non déclaré et casse les alertes.

### B1 / Brique 9 · `coutDeSortie(engagement)` — **PRÊT, prochaine brique métier**
Fonction pure : à partir d'un engagement, dire ce qu'il en coûte de partir.
- « Libre et gratuit » (énergie, mobile sans engagement, assurance après 1 an)
- « Loi Chatel : il te reste X mensualités, dont un quart dû »
- « Fenêtre de résiliation ouverte dans 12 jours »
- « Souscrit en ligne → résiliation en 3 clics obligatoire dans l'espace client »

**Ce qui est établi (2026-09-03, sources vérifiées) :**
- Énergie : aucun engagement, aucun frais, le nouveau fournisseur résilie l'ancien.
- Assurance : loi Hamon, résiliation à tout moment après un an, sans frais.
- Depuis le 01/06/2023, tout contrat souscrit en ligne doit être résiliable en
  ligne (art. L215-1-1 C. conso). Amende jusqu'à 75 000 €, DGCCRF active.
- Assurances : régime parallèle, décret n°2023-182 du 16/03/2023.
- Engagement 24 mois : totalité des mensualités dues la 1re année, puis Chatel
  réduit fortement (un quart des mensualités restantes).

**Pourquoi c'est le bon prochain pas :** zéro partenaire, zéro ORIAS, testable en
sandbox, et ça branche des données déjà présentes (`cancellation_notice_days`,
`anniversary_date`, `service_type`).

### B2 / P-021 · Pack « je m'installe » — **À CADRER**
Checklist d'emménagement : les contrats à ouvrir, dans l'ordre, avec les pièges,
qui pré-remplit les engagements dans Serein.
**Contrainte non négociable :** ne favoriser **aucun** fournisseur nommément.
Dès qu'on recommande un assureur, on quitte « armer le client » et on entre dans
l'intermédiation (ORIAS). C'est du contenu, pas du courtage.

---

## 2. Idées écartées, avec leur motif

### A · Forfait complet étudiant (Free + Leclerc + Direct Assurance + streaming) — **STOP**
**Motif :** le problème visé n'existe pas. Ces contrats sont déjà tous sans
engagement et sans frais de sortie. Il n'y a pas de verrou à faire sauter.
**Et :** sans commission, aucun revenu ; avec commission, c'est le modèle
Papernest que tu refuses. Plus le risque ORIAS.
**Ce qui survit :** l'intuition du besoin étudiant → voir B2.
**Ce qui la ferait revivre :** si le problème réel s'avérait être « je ne sais pas
quoi choisir » plutôt que « je suis bloqué », mais alors ce n'est plus un pack,
c'est un comparateur — autre produit, autre modèle.

### P-020 · Cession de contrat entre particuliers — **ARCHIVÉ (bonne idée, mauvaise cible)**
Ton intuition du mécanisme était juste : sortir d'un engagement sans payer la
pénalité. Mais elle ne s'applique pas aux contrats de ton pack.

**Établi :** le marché existe déjà pour l'automobile, structuré depuis 2019.
LLD 48 mois résiliée à mi-parcours = 8 à 14 mensualités de pénalité (6 000 à
12 000 €) contre 300 à 600 € pour un transfert. Rapport de 1 à 20 ou 1 à 30.
Le cédant peut demander une soulte de 500 à 3 000 €, légale et non imposable.
**Le mur :** accord obligatoire de l'organisme financier, avec étude de
solvabilité du repreneur. Un courtier note que l'option « reste peu proposée par
nos partenaires bancaires en France ».
**Seules cibles restantes :** salles de sport (12-24 mois) et mobile 24 mois.
L'auto est prise.
**Ce qui la ferait revivre :** un signal de demande sur les salles de sport —
c'est le seul segment avec engagement long, pénalité réelle et aucune plateforme.

---

## 3. Dette technique et organisation

### P-014 / P-018 · Nettoyage infrastructure — **PRÊT**
5 projets Vercel pour 3 dépôts GitHub ; 3 d'entre eux déploient le même repo
`serein-v2`. Et 2 projets Supabase (`serein-app`, `serein-ap`) pour une seule
app, tous deux en pause.
**Action :** ne garder qu'un projet Vercel et un Supabase. Vérifier lequel porte
les vraies données avant de supprimer quoi que ce soit.

### P-019 · Erreurs TypeScript dans `sandbox/` — **PRÊT**
Hors build (les tests tournent), mais `npx tsc --noEmit` n'est pas propre.
Confort, pas urgence.

### P-016 · Tutoiement / vouvoiement incohérent — **PRÊT**
`/engagements` vouvoie, `/foyer` tutoie. À trancher en une passe de copie.

---

## 4. Garées de longue date (rappel du dossier de référence)

- Chatbot assistant (guidé gratuit, ou IA générative = clé API payante à décider)
- Rappels par e-mail
- Extension de l'annuaire de résiliation
- Refonte de l'analyse vers Mistral OCR (clé API payante + accord d'envoi tiers)
- Slice 2 de la détection d'abonnements (statut « suivi », filtres, compteur nav)

---

## 5. Idées hors Serein — **ARCHIVÉ**

Explorées le 2026-09-03 avant de retomber sur Serein. Conservées au cas où tu
voudrais un second projet.

- **T1** Inspection pré-achat auto indépendante, métropole lilloise. Créneau
  vide sur Google Places ; concurrent réel = « je demande à un pote ». Test
  minimal cadré : 5 inspections payées ≥ 120 € en 4 semaines.
- **T2** Spécialisation sur une panne chronique (courroie humide PureTech, FAP/EGR).
- **T3** Achat-réparation-revente (vérifier le seuil légal de ventes/an).
- **T5** Mécanique itinérante à domicile.
- **Contexte utile :** parc français 39,7 M de voitures, âge moyen 11,5 ans (12+
  chez les particuliers), thermiques > 80 % du parc. Le vieillissement crée de la
  réparation, pas de la vente.
