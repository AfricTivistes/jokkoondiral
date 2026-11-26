# 🗺️ Cartographie des compétences (Skills Map)

Pas besoin de tout maîtriser pour contribuer. Trouve ton profil : il te donne des **outils** (codes du [catalogue](./docs/outils/README.md)) et une **première tâche**. Les profils non techniques ont autant d'outils à leur portée que les développeurs.

## Vue d'ensemble

| Profil | Outils MVP | Outils V1 / V2 | Pour commencer |
|---|---|---|---|
| 🎨 Frontend et intégrateurs | D1, C1, S4 | D4, D5, A3 | Page d'accueil et carte Leaflet de D1 |
| ⚛️ React et produit | M1, D2, S1 | C4, A1, M5, M6 | Vue `/reports` de M1 avec filtres par statut |
| ⚙️ Backend et API | R1, R2, C3, M2 | D3, C7, R4, C5 | Médias WhatsApp dans R1 |
| 🗄️ Data et DevOps | M3, M4, R5, S5, S6, S3 | S2, A2, A4 | Migration SQL du modèle d'incident (M3) |
| 📱 Mobile Android | — | C2 | Évaluer ODK Collect contre C1 sur un téléphone bas de gamme |
| 🗣️ Data / IA, linguistes | — | C6, S4 (langues nationales) | Tester la transcription de vocaux en wolof et bambara |
| 🔎 Journalistes et fact-checkeurs | M3 (nomenclature), M1 (tests), S7 | M6, D4 | Rédiger [`docs/METHODOLOGY.md`](./docs/METHODOLOGY.md) |
| ⚖️ Juristes | S7, S3 (modèle de menace) | A4 (durées de conservation), D5 (licence) | Cadre légal de conservation des données d'observateurs |
| ✏️ Designers | C1, M1, D1 | D4 | Parcours de l'observateur en 3 écrans |
| 🌐 Traducteurs | S4 (anglais) | S4 (langues nationales) | Traduire les messages automatiques de R1 et R2 |

---

## 🎨 Frontend et intégrateurs
**Compétences :** HTML, CSS, Tailwind, Astro, un peu de JavaScript.
**Où :** `apps/public/` (et `apps/collect/` pour C1).
**Mission :** des pages légères, accessibles (WCAG), rapides en 3G : carte publique des incidents vérifiés, formulaire hors ligne, rapports.
**Outils :** [D1](./docs/outils/diffusion.md#d1) carte publique · [C1](./docs/outils/collecte.md#c1) formulaire PWA · [S4](./docs/outils/socles.md#s4) langues · puis [D4](./docs/outils/diffusion.md#d4), [D5](./docs/outils/diffusion.md#d5), [A3](./docs/outils/analyse.md#a3).

## ⚛️ React et produit
**Compétences :** React, hooks, TypeScript, back-office.
**Où :** `apps/dashboard/` (Refine.js).
**Mission :** l'espace privé des modérateurs : file de modération utilisable sur téléphone, carte interne temps réel, connexion et rôles.
**Outils :** [M1](./docs/outils/verification.md#m1) file de modération · [D2](./docs/outils/diffusion.md#d2) carte interne · [S1](./docs/outils/socles.md#s1) identité et rôles · puis [C4](./docs/outils/collecte.md#c4), [A1](./docs/outils/analyse.md#a1), [M5](./docs/outils/verification.md#m5), [M6](./docs/outils/verification.md#m6).

## ⚙️ Backend et API
**Compétences :** Node.js, Express, HTTP, JSON, API tierces.
**Où :** `apps/webhooks/` (puis `apps/api/` selon [ADR-0002](./docs/decisions/0002-couche-acces-donnees.md)).
**Mission :** brancher la plateforme sur le terrain : médias WhatsApp, SMS codés, coffre des preuves, alertes sortantes.
**Outils :** [R1](./docs/outils/reception.md#r1) WhatsApp · [R2](./docs/outils/reception.md#r2) SMS · [C3](./docs/outils/collecte.md#c3) SMS codé · [M2](./docs/outils/verification.md#m2) preuves · puis [D3](./docs/outils/diffusion.md#d3), [C7](./docs/outils/collecte.md#c7), [R4](./docs/outils/reception.md#r4), [C5](./docs/outils/collecte.md#c5).

## 🗄️ Data et DevOps
**Compétences :** SQL, PostgreSQL/PostGIS, Docker, Linux.
**Où :** `infra/postgres/`, `docker/`, `scripts/`.
**Mission :** le modèle d'incident, le journal d'audit, le registre des observateurs, les référentiels pays, un déploiement en une commande sur un petit VPS.
**Outils :** [M3](./docs/outils/verification.md#m3) · [M4](./docs/outils/verification.md#m4) · [R5](./docs/outils/reception.md#r5) · [S5](./docs/outils/socles.md#s5) · [S6](./docs/outils/socles.md#s6) · [S3](./docs/outils/socles.md#s3) · puis [S2](./docs/outils/socles.md#s2), [A2](./docs/outils/analyse.md#a2), [A4](./docs/outils/analyse.md#a4).

## 📱 Mobile Android
**Compétences :** Android, Capacitor, ODK.
**Mission :** une application hors ligne pour les zones longtemps coupées, si la PWA ne suffit pas ([ADR-0006](./docs/decisions/0006-application-mobile.md)).
**Outils :** [C2](./docs/outils/collecte.md#c2).

## 🗣️ Data / IA, linguistes
**Compétences :** transcription automatique (Whisper), langues nationales.
**Mission :** rendre les vocaux en wolof, bambara, pulaar… exploitables par les modérateurs.
**Outils :** [C6](./docs/outils/collecte.md#c6) · [S4](./docs/outils/socles.md#s4) (langues nationales).

## 🔎 Journalistes et fact-checkeurs
**Compétences :** vérification, droit électoral, terrain.
**Où :** `docs/`, issues GitHub, tests du dashboard.
**Mission :** vous êtes les garants du « pourquoi » : nomenclature des incidents, règles de vérification, circuit des rumeurs, tests d'usage.
**Outils :** [M3](./docs/outils/verification.md#m3) (nomenclature) · [M1](./docs/outils/verification.md#m1) (tests) · [S7](./docs/outils/socles.md#s7) · puis [M6](./docs/outils/verification.md#m6), [D4](./docs/outils/diffusion.md#d4).

## ⚖️ Juristes
**Mission :** modèle de menace, durées de conservation, licence des données ouvertes.
**Outils :** [S7](./docs/outils/socles.md#s7) · [S3](./docs/outils/socles.md#s3) · puis [A4](./docs/outils/analyse.md#a4), [D5](./docs/outils/diffusion.md#d5).

## ✏️ Designers
**Mission :** parcours de l'observateur, écran du modérateur sur téléphone, carte publique lisible.
**Outils :** [C1](./docs/outils/collecte.md#c1) · [M1](./docs/outils/verification.md#m1) · [D1](./docs/outils/diffusion.md#d1) · puis [D4](./docs/outils/diffusion.md#d4).

## 🌐 Traducteurs
**Mission :** anglais complet au MVP, puis langues nationales.
**Outils :** [S4](./docs/outils/socles.md#s4).

---

## 🤝 Pour tout le monde

1. Lis la fiche de ton outil dans [`docs/outils/`](./docs/outils/README.md) et le `README.md` du dossier où tu vas travailler.
2. Lance l'environnement : `bash scripts/setup.sh` puis `pnpm dev`.
3. Cherche une issue dont le titre commence par le code de ton outil (`[M1] …`), ou le label `good first issue`.
4. Crée une branche : `feat/m1-filtres-statut`.
5. Ouvre une pull request qui cite le code de l'outil.
