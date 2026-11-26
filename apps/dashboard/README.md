# 🛡️ Dashboard Jokkoondiral (Refine.js + React)

**Rôle :** C'est l'espace de travail sécurisé des observateurs, modérateurs et fact-checkers. Ils y qualifient les signalements remontés du terrain et gèrent la plateforme.

**Pourquoi Refine.js ?**
C'est un framework basé sur React conçu pour les applications data-intensive (B2B, back-office). Il nous évite de recoder à la main toutes les logiques de CRUD, de pagination, de tri et d'authentification. Il se connecte nativement à l'API générée par NocoDB.


## 🧰 Outils hébergés

| Code | Outil | Phase | État |
|---|---|---|---|
| [M1](../../docs/outils/verification.md#m1) | File de modération | MVP | squelette Refine, routes vides |
| [D2](../../docs/outils/diffusion.md#d2) | Carte interne temps réel | MVP | à créer |
| [S1](../../docs/outils/socles.md#s1) | Identité, rôles, double authentification | MVP | `authProvider` ébauché, non branché |
| [C4](../../docs/outils/collecte.md#c4) | Saisie des appels par un opérateur | V1 | à créer |
| [A1](../../docs/outils/analyse.md#a1) | Tableau de bord statistiques | V1 | à créer |
| [M5](../../docs/outils/verification.md#m5) | Recoupement et doublons | V1 | à créer |
| [M6](../../docs/outils/verification.md#m6) | Veille désinformation | V2 | à créer |

> ⚠️ Aujourd'hui `VITE_NOCODB_API_TOKEN` envoie un jeton NocoDB complet au navigateur. Le retirer est la première tâche de S1 ([ADR-0002](../../docs/decisions/0002-couche-acces-donnees.md)).

---

## 🛠️ Comment ce projet a été initialisé

```bash
# Depuis la racine du monorepo
pnpm create refine-app@latest apps/dashboard

# Options stratégiques :
# Framework : React
# Bundler : Vite
# UI Framework : Headless (ou Tailwind CSS)
# Data Provider : Simple REST API (pour NocoDB)
# Auth Provider : Custom (JWT NocoDB)
```

---

## 🚀 Démarrage rapide

```bash
# Depuis la racine du monorepo
pnpm dev:dashboard
```

Le dashboard est accessible sur `http://localhost:5173`.

**Prérequis :** L'infrastructure Docker doit tourner (`pnpm dev:infra`).

---

## 🏗️ Structure attendue

```
src/
├── App.tsx          → Point d'entrée Refine (déclaration des ressources)
├── providers/       → dataProvider (API NocoDB) + authProvider (JWT)
├── features/        → Vues par métier (liste incidents, vue fact-checking)
├── components/      → Composants UI réutilisables
└── lib/             → Utilitaires (helpers, formatters)
```

**Règle d'or :** Ne réinventez pas la roue. Utilisez les hooks de Refine (`useTable`, `useForm`, `useUpdate`) pour interagir avec l'API NocoDB. Refine gère la pagination, les états de chargement et les erreurs pour vous.

---

## 🎯 Premières issues

- `[M1]` Vue `/reports` avec filtres `pending` / `verified` / `rejected`, affichage mobile, rafraîchissement automatique
- `[M1]` Adapter le fournisseur de données à l'API NocoDB (pagination, filtres) — `pnpm typecheck` échoue aujourd'hui sur `dataProvider.nocodb.ts`
- `[S1]` Retirer le jeton côté navigateur, brancher la connexion, contrôle d'accès par rôle
- `[D2]` Vue carte à côté de la file M1, couleur par gravité (M3)
