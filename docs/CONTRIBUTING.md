# Guide de Contribution Détaillé – Jokkoondiral

Ce guide technique est destiné aux développeurs souhaitant contribuer de manière structurée. Pour une version rapide, voir `CONTRIBUTING.md` à la racine du projet.

---

## 🏗️ Architecture globale à respecter

Avant de coder, lisez [`ARCHITECTURE.md`](./ARCHITECTURE.md) pour comprendre comment les applications communiquent entre elles et avec la base, puis la **fiche de l'outil** sur lequel vous travaillez dans [`outils/`](./outils/README.md). Chaque contribution se rattache à un code d'outil (C1…S7). Pour créer une nouvelle app ou un package : [`AJOUTER_UN_OUTIL.md`](./AJOUTER_UN_OUTIL.md).

La règle principale : **chaque application a une responsabilité unique**. Ne pas mélanger la logique métier entre les apps.

---

## A. Contribuer à `apps/public` (Astro)

**Outils hébergés :** D1 (MVP) · D4, D5, A3 (V2) · C1 possible

**Objectif :** Afficher les données publiques, accessibles à tous, même sans connexion rapide.

### Conventions
- Pages dans `src/pages/` — Astro génère les routes automatiquement
- Préférer les composants `.astro` natifs aux composants React
- N'utiliser React (`client:load`, `client:visible`) que pour les éléments interactifs (carte, formulaire)
- Toujours tester sur mobile et simuler une connexion 3G lente

### Ajouter une nouvelle page
```bash
# Créer src/pages/ma-page.astro
# Elle sera accessible à /ma-page automatiquement
```

### Intégrer la carte Leaflet
```tsx
// Dans un composant React : src/components/Map.tsx
// Importer Leaflet avec un client:load pour éviter les erreurs SSR
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
```

---

## B. Contribuer à `apps/dashboard` (Refine.js)

**Outils hébergés :** M1, D2, S1 (MVP) · C4, A1, M5 (V1) · M6, A3 (V2)

**Objectif :** Permettre aux modérateurs de valider ou rejeter les signalements.

### Conventions
- Utiliser **exclusivement** les hooks Refine pour les données (`useTable`, `useOne`, `useUpdate`)
- Déclarer toute nouvelle ressource dans `refine.config.ts`
- Ajouter les providers dans `src/providers/`
- Grouper les vues par domaine métier dans `src/features/`

### Ajouter une nouvelle vue de données
```tsx
// 1. Déclarer la ressource dans refine.config.ts
{ name: 'ma_table', list: '/ma-table', ... }

// 2. Créer la page dans src/features/ma-table/
// 3. Utiliser useTable pour lister les données
import { useTable } from '@refinedev/core';
const { tableQueryResult } = useTable({ resource: 'ma_table' });
```

### Modifier le statut d'un signalement
```tsx
import { useUpdate } from '@refinedev/core';
const { mutate: updateReport } = useUpdate();

updateReport({
  resource: 'base_reports',
  id: reportId,
  values: { status: 'verified' },
});
```

---

## C. Contribuer à `apps/webhooks` (Node.js)

**Outils hébergés :** R1, R2, C3 (MVP) · D3 (V1) · R4, C5 (V2) · R3 maintenu

**Objectif :** Connecter la plateforme aux canaux de terrain.

### Ajouter un nouveau canal
1. Créer `src/handlers/mon-canal.ts`
2. Exporter une fonction `handleMonCanalWebhook(req, res)`
3. Enregistrer la route dans `src/index.ts`
4. Documenter les pré-requis dans `apps/webhooks/README.md`

### Structure d'un handler
```typescript
import { Request, Response } from 'express';

export async function handleMonCanalWebhook(req: Request, res: Response): Promise<void> {
  const payload = req.body;

  // 1. Valider le payload
  // 2. Extraire les informations pertinentes
  // 3. Insérer dans NocoDB via fetch
  // 4. Répondre 200 immédiatement (les webhooks ont des timeouts courts)
  res.status(200).send('ok');
}
```

---

## D. Contribuer à `packages/shared`

**Outils hébergés :** M3 (types d'incident), S1 (rôles), S4 (traductions)

**Objectif :** Maintenir la cohérence des types entre toutes les applications.

### Règles strictes
- **Tout nouveau type** utilisé par 2+ applications → doit aller dans `packages/shared/src/types.ts`
- **Toute nouvelle constante** → `packages/shared/src/constants.ts`
- Toujours exporter depuis `src/index.ts`

### Vérifier la cohérence après modification
```bash
# Depuis la racine du monorepo
pnpm run typecheck
```

---

## E. Contribuer à `infra/postgres`

**Outils hébergés :** M3, M4, R5, S6 (MVP) · S2, A4 (V1)

**Objectif :** Modéliser la base de données pour les besoins métier.

### Conventions SQL
- Nommer les tables en `snake_case` et au pluriel (`election_incidents`, `polling_stations`)
- Toujours inclure `id SERIAL PRIMARY KEY`, `created_at`, `updated_at`
- Documenter les colonnes avec `COMMENT ON COLUMN`
- Créer des index pour les colonnes fréquemment filtrées

### Ajouter une table
1. Créer un nouveau fichier `infra/postgres/02-ma-table.sql`
2. Recréer les conteneurs : `docker-compose -f docker-compose.dev.yml down -v && docker-compose -f docker-compose.dev.yml up -d`
3. Vérifier que NocoDB détecte automatiquement la nouvelle table

---

## Labels GitHub

Les labels se créent avec `bash scripts/github/labels.sh` (rejouable dans un fork). Le **code de l'outil** n'est pas un label : il est dans le **titre** de l'issue (`[R1] …`), ce qui permet de chercher `"[R1]"`.

| Label | Usage |
|-------|-------|
| `domaine:collecte` · `domaine:reception` · `domaine:verification` · `domaine:diffusion` · `domaine:analyse` · `domaine:socles` | Famille de l'outil (une par issue) |
| `phase:mvp` · `phase:v1` · `phase:v2` · `phase:maintenu` | Phase de l'outil ([ROADMAP](./ROADMAP.md)) |
| `profil:non-technique` | Tâche pour journalistes, juristes, designers, traducteurs |
| `good first issue` | Issue bien délimitée, adaptée aux débutants et Tech Camps |
| `help wanted` | Le mainteneur cherche activement un contributeur |
| `needs-triage` | Issue non encore évaluée — ne pas assigner |
| `tech-camp` | Issue réservée pour un hackathon AfricTivistes |
| `bug` · `feature` · `documentation` · `question` | Type de demande |

Les issues MVP sont rattachées au **jalon MVP**.

### Workflow de triage

1. Toute nouvelle issue reçoit `needs-triage`.
2. Le mainteneur vérifie le code d'outil du titre, ajoute `domaine:*` et `phase:*`, puis retire `needs-triage`.
3. Une idée sans outil existant est discutée, puis reçoit un nouveau code et une fiche dans `docs/outils/` ([AJOUTER_UN_OUTIL.md](./AJOUTER_UN_OUTIL.md)).
4. Les participants commentent « Je m'en occupe ! » avant de coder.

---

## Processus de Pull Request

1. **Branche :** `feat/<code>-nom` ou `fix/<code>-nom` (ex. `feat/r1-medias`)
2. **Commits :** Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`)
3. **Outil :** citer le code de l'outil et l'issue (`Closes #12`)
4. **Description :** Expliquer le QUOI et le POURQUOI, pas le COMMENT
5. **Screenshot :** Obligatoire si modification de l'UI
6. **Revue :** Attendre la validation de `@dofbi` avant de merger
