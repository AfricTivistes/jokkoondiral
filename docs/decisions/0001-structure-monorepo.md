# ADR-0001 — Structure du monorepo et convention de croissance

- **Statut :** acceptée
- **Outils concernés :** tous
- **Date :** 2026-11-26

## Contexte

Le dépôt contenait à sa racine un échafaudage Replit sans rapport avec le projet (`artifacts/`, `lib/`, `scripts/` Replit, `package.json` « workspace » sous licence MIT), et le vrai projet vivait dans un sous-dossier `situation-room/`. Le document « Orientation des besoins » prévoit 34 outils, dont plusieurs nouvelles apps (`apps/collect`, `apps/api`, `apps/voice`, éventuellement `apps/android`) et de nouvelles briques partagées. Il fallait une structure où un nouvel outil s'ajoute sans friction et qu'une OSC peut forker et personnaliser.

## Décision

1. Le projet vit **à la racine** du dépôt. L'échafaudage Replit est supprimé (l'`api-server` Replit ne contenait qu'une route `/healthz` ; l'API métier dépend d'[ADR-0002](./0002-couche-acces-donnees.md)).
2. Monorepo **pnpm workspaces**, sans outil de build supplémentaire (frugalité) :

   | Dossier | Contenu | Nommage |
   |---|---|---|
   | `apps/<nom>` | Une application **déployable** (un conteneur, un port) | `name` = `<nom>` |
   | `packages/<nom>` | Une **brique partagée** importée par plusieurs apps | `@situation-room/<nom>` |
   | `infra/` | SQL d'initialisation, migrations, référentiels pays (`infra/seed/<pays>/`) | — |
   | `docker/` | Dockerfiles et configuration Nginx | `Dockerfile.<app>` |
   | `scripts/` | Scripts de développement, d'import, GitHub | — |
   | `docs/` | Documentation ; `docs/outils/` = catalogue ; `docs/decisions/` = ADR | — |

3. **Un outil = un code** (C1…S7). Un outil vit soit dans une app existante, soit dans une nouvelle app, soit dans un package. Chaque README d'app ou de package liste les **outils hébergés**.
4. Chaque app et package expose les scripts `dev`, `build`, `typecheck` : la racine les lance tous avec `pnpm -r --if-present`.
5. Un outil **optionnel** (vocal, USSD…) est un service Docker Compose sous un **profil** (`profiles: [voice]`) : il ne démarre que si l'OSC l'active.
6. Ce qu'une OSC personnalise (canaux, nomenclature, référentiels, langues, identité visuelle) passe par **configuration et données**, jamais par une modification du code (voir `docs/PERSONNALISER.md`).
7. Garde-fou chaîne d'approvisionnement conservé : `minimumReleaseAge: 1440` dans `pnpm-workspace.yaml`.

## Conséquences

- Les chemins `situation-room/...` disparaissent de la documentation et des modèles GitHub.
- Ajouter un outil suit `docs/AJOUTER_UN_OUTIL.md`.
- Pas de dossiers vides « en attente » : une app est créée avec son premier code utile.
