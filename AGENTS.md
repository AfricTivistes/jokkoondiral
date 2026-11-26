# Instructions pour les agents IA

Ce dépôt suit les règles décrites dans [`docs/AGENT_INSTRUCTIONS.md`](./docs/AGENT_INSTRUCTIONS.md). Points essentiels :

- Le projet est organisé en **34 outils codés** (C1…S7) : lis la fiche de l'outil dans [`docs/outils/`](./docs/outils/README.md) avant de coder, et cite son code dans commits, branches et PR.
- Structure du monorepo et ajout d'un outil : [ADR-0001](./docs/decisions/0001-structure-monorepo.md), [`docs/AJOUTER_UN_OUTIL.md`](./docs/AJOUTER_UN_OUTIL.md).
- Décisions ouvertes (ne pas trancher seul) : [`docs/decisions/`](./docs/decisions/README.md).
- pnpm uniquement ; types dans `packages/shared` ; aucun cloud propriétaire obligatoire ; aucun jeton NocoDB dans le navigateur ; aucune donnée d'observateur publiée.
- Vérifier : `pnpm typecheck`.
