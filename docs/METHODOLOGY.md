# ⚖️ Méthodologie d'observation et de vérification

> **Statut : à rédiger.** Ce document est le chantier des **fact-checkeurs, journalistes et juristes** (outils M3, M6, S7). Il fixe les règles que le code appliquera : sans lui, la file de modération (M1) et la qualification (M3) ne peuvent pas être construites correctement. Ouvre une issue `[M3]` ou `[S7]` pour prendre une section.

## 1. Nomenclature des incidents (M3)

À définir avec des observateurs expérimentés et rendre adaptable par pays ([PERSONNALISER.md](./PERSONNALISER.md)).

Liste **provisoire** utilisée par la PWA de collecte (C1), dans `packages/protocole/protocoles/incident-electoral.json`. À valider ou corriger ici.

| Catégorie (`v`) | Code SMS (C3) | Libellé | Gravité par défaut |
|---|---|---|---|
| `ouverture` | OUV | Bureau fermé ou ouverture tardive | _à définir_ |
| `materiel` | MAT | Matériel électoral manquant | _à définir_ |
| `violence` | VIO | Intimidation ou violence | _à définir_ |
| `achat_voix` | ACH | Achat de voix | _à définir_ |
| `fraude` | FRA | Fraude ou bourrage d'urne | _à définir_ |
| `observateurs` | OBS | Observateurs ou délégués refusés | _à définir_ |
| `depouillement` | DEP | Irrégularité au dépouillement | _à définir_ |
| `autre` | AUT | Autre | _à définir_ |

Une OSC peut ajouter des catégories locales par extension ([protocoles.md](./protocoles.md)) ; une catégorie utile à toutes doit entrer ici.

Niveaux de gravité provisoires : **faible** (le vote continue normalement), **moyenne** (le vote est perturbé), **critique** (danger pour des personnes ou vote arrêté ; déclenchera les alertes D3). À valider.

## 2. Circuit de vérification (M1)

Statuts actuels du code : `pending` → `verified` | `rejected`.

À préciser :

- Qu'est-ce qui suffit pour passer un signalement à « vérifié » (preuve, deuxième source, observateur enrôlé) ?
- Quand demander un complément à l'observateur ?
- Qui peut annuler une vérification, et comment c'est tracé (M4) ?

## 3. Rumeurs et désinformation (M6)

Circuit « rumeur → vérifiée / démentie », publication au format ClaimReview.

## 4. Grammaire du SMS codé (C3)

Format court (code incident, bureau de vote, gravité), à tester avec des observateurs.

## 5. Protection des observateurs

Ce qui n'est jamais publié, durées de conservation (A4, [ADR-0008](./decisions/0008-conservation-donnees.md)), consignes d'hygiène numérique (S3, S7).
