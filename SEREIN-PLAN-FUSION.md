# SEREIN — Plan de fusion (décisions d'architecture)

> Gravé le 2026-07-14. Ce document fige les **principes non négociables** de
> l'app unifiée (Serein + PanierMalin + Après + Jarvis). Rien ne se construit qui
> les contredise. Les briques, elles, vivent dans `SEREIN-dossier-reference.md`.

## Le principe qui règle tout

**L'utilisateur ne choisit jamais un service — il fait un seul geste, et l'app
route.** La palette de services existe **sous le capot**, jamais à l'écran.

Test de simplicité : *si tu dois expliquer où cliquer, c'est mal intégré.*
**Un geste, trois onglets, des cartes.**

## Les 5 principes (décidés, à ne pas rediscuter)

### 1. Une seule porte d'entrée : le bouton « + »
Photographier ou transférer **n'importe quoi**. Le pipeline OCR (Mistral, déjà
prévu comme sous-traitant UE) extrait le texte, puis le **routeur universel**
classe et dirige :
- **ticket de caisse** → Courses (PanierMalin)
- **facture / prélèvement** → Abonnements (Serein)
- **courrier** (préavis, hausse tarif, décès, déménagement) → Démarches (Après)

Un nouveau service = **une règle de routage en plus, zéro écran en plus**.
C'est ce qui rend la palette extensible sans complexifier.

### 2. L'accueil = « À faire », pas un tableau de bord
3 à 5 cartes triées **par urgence** :
*« Fenêtre de résiliation AXA : 12 j »*, *« Courses : 64 €/90 € cette semaine »*,
*« Déménagement : 2 étapes restantes »*. Tout le reste vit dans une **bibliothèque**
qu'on ne visite que si besoin. La complexité n'apparaît **que quand elle est
pertinente**.

### 3. Navigation : 3 onglets, verrouillés à vie
**Accueil · + · Mon foyer** (contrats, courses, documents, démarches).
Règle absolue : **un service ne crée jamais d'onglet, il crée des cartes.**

### 4. Sous le capot : un seul modèle de données
Tout est le même triplet **document → engagement → échéance**.
Le schéma actuel (`uploads`, `commitments`, `reminders`) le porte déjà.
Chaque service = **un détecteur + du contenu**, sur le modèle
`detecter…(situation)` : fonction **pure, testable en sandbox, PASS/FAIL** —
Méthode BUILD pur.

### 5. Sans partenariat, par construction
Chaque service se nourrit de ce que le client apporte (**ses documents**),
d'**open data** et de **lettres générées**. Informer et préparer, **jamais agir** :
le positionnement légal (Serein arme, n'agit pas → pas de mandat ORIAS) couvre
**toute la palette d'un coup**.

## Garde-fou de construction
Ces principes se **décident** maintenant ; **rien ne se construit avant la
Brique 1** de la fusion. On avance **une brique à la fois, sandbox d'abord**.

## Roadmap fusion (candidats)
- **Brique 6 — Routeur universel** ✅ (2026-07-14) : `routerDocument(texte) → type`
  + `describeDestination(type)` + `ROUTE_TO_SERVICE`. Fonction pure, sandbox 18/18.
- **Brique 7 — Brancher le « + »** ✅ (2026-07-14) : page `/ajouter` (dépôt PDF via
  `extractPdfText` ou collage de texte) → `routerDocument` → carte d'orientation
  (reconnaît + propose le bon service, override possible, `inconnu` → l'utilisateur
  choisit). **Relais même origine** : `sessionStorage['serein.intake']` récupéré
  par `/analyse` (pré-remplit le texte) ; `localStorage['pm.intakeTicket']` récupéré
  par PanierMalin (ouvre l'écran ticket + lit le texte). « ＋ Ajouter » ajouté à la
  nav Serein. **Reste à venir** : OCR image (photo) côté Serein, auto-analyse au
  relais, et le service Démarches (Après) réel.
- **Brique 8 — Les 3 onglets verrouillés** ✅ (2026-07-14) : `FoyerTabs`
  (Accueil `/dashboard` · ＋ `/ajouter` · Mon foyer `/foyer`) remplace la nav à
  6 liens sur toutes les pages de l'app. Les 6 sections deviennent des **cartes**
  dans `/foyer` (`foyerSections()`, pur, sandbox 10/10), groupées par famille
  (Contrats & abonnements · Démarches · Documents · Courses · Compte). L'Accueil
  reste `/dashboard` (déjà l'agrégateur d'urgence). **Reste à venir** : reframer
  l'Accueil en pur flux « À faire » (cartes par urgence) et, éventuellement,
  passer les onglets en barre basse (app feel).
