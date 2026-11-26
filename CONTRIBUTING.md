# Contribuer à la Situation Room 🌍

Merci de ton intérêt pour ce projet civique ! Ce dépôt est né dans le cadre du projet AHEAD Africa et du programme Digitalise Youth. Notre but est de fournir un outil souverain de monitoring électoral aux Organisations de la Société Civile (OSC).

Que tu sois développeur junior, expert en cybersécurité, designer ou fact-checker, ta contribution a un impact direct sur la transparence démocratique.

## 🤝 Nos Valeurs
1. **Frugalité :** Le code doit pouvoir tourner sur des serveurs peu performants et dans des zones à faible connectivité.
2. **Inclusion :** Nous utilisons des technologies accessibles et documentons au maximum pour permettre aux juniors d'apprendre.
3. **Qualité :** S'agissant de données électorales, la rigueur est de mise. Chaque Pull Request (PR) est revue avec attention.

## 🔧 Prérequis

- **Node.js ≥ 20** — [nodejs.org](https://nodejs.org/)
- **pnpm ≥ 10** — `npm install -g pnpm@latest` — requis pour lire le lockfile (`lockfileVersion: 9.0`)
- **Docker & Docker Compose** — pour lancer NocoDB et PostgreSQL en local

## 🧭 Le projet est organisé par outils

La Situation Room est une boîte à outils de **34 outils codés** (C1…S7) en 6 familles : collecte, réception, vérification, diffusion, analyse, socles. Chaque contribution se rattache à un outil.

- Catalogue et fiches : [`docs/outils/`](./docs/outils/README.md)
- Quel outil pour ton profil : [`SKILLS_MAP.md`](./SKILLS_MAP.md)
- Pourquoi chaque outil existe : [`docs/BESOINS.md`](./docs/BESOINS.md)
- Quand il est attendu (MVP, V1, V2) : [`docs/ROADMAP.md`](./docs/ROADMAP.md)

## 🚀 Comment commencer ?

1. **Choisir un outil** dans [SKILLS_MAP.md](./SKILLS_MAP.md) et lire sa fiche.
2. **Trouver une issue** dont le titre commence par le code de l'outil (`[R1] …`), filtrer par label `domaine:*` / `phase:mvp`, ou chercher `good first issue`.
3. **Pas d'issue ?** Ouvre-la avec le modèle **« Tâche sur un outil »** : une issue = une tâche, titre `[CODE] verbe + objet` (ex. `[R1] Télécharger les médias WhatsApp`).
4. **Signaler son intention :** commente « Je m'en occupe ! ».
5. **Créer une branche :** `feat/r1-medias-whatsapp`, `fix/m1-pagination`, `docs/s7-guide-observateur`.
6. **Coder & tester** en local (`pnpm typecheck`, `docker compose -f docker-compose.dev.yml up -d`).
7. **Ouvrir une pull request** qui cite le code de l'outil et l'issue (`Closes #12`). Si l'interface change, ajoute une capture d'écran.

Nouvel outil ou projet existant à intégrer : [docs/AJOUTER_UN_OUTIL.md](./docs/AJOUTER_UN_OUTIL.md). Décision d'architecture à proposer : [docs/decisions/](./docs/decisions/README.md).

### Labels

| Label | Sens |
|---|---|
| `domaine:collecte` · `domaine:reception` · `domaine:verification` · `domaine:diffusion` · `domaine:analyse` · `domaine:socles` | Famille de l'outil |
| `phase:mvp` · `phase:v1` · `phase:v2` · `phase:maintenu` | Quand l'outil est attendu |
| `profil:non-technique` | Tâche pour journalistes, juristes, designers, traducteurs |
| `good first issue` · `help wanted` | Accueil des nouveaux venus |
| `bug` · `documentation` · `question` | Type |

## 📜 Conventions de code

### Commits
Nous utilisons les [Conventional Commits](https://www.conventionalcommits.org/) :
```
feat(r1): download WhatsApp media
fix(d1): map rendering issue on mobile
docs: update SKILLS_MAP for data profiles
chore: update pnpm dependencies
```

### TypeScript
- Merci d'utiliser les types partagés dans `packages/shared` plutôt que de les redéfinir.
- Préfère les types explicites aux `any`.
- Commente la logique métier complexe.
- Utilise des variables explicites (en anglais).

### Structure des branches
```
main          → Production stable
develop       → Intégration des features
feat/<code>-xxx → Nouvelle fonctionnalité (ex. feat/r1-medias)
fix/<code>-xxx  → Correction de bug
docs/xxx        → Documentation uniquement
```

## 🌐 Recommandations d'architecture

### Ce que nous encourageons
- Utiliser `packages/shared` pour les types et constantes partagés
- Lire le `README.md` de chaque sous-dossier avant de coder
- Tester en local avec `docker-compose.dev.yml` avant de soumettre une PR
- Documenter les choix techniques importants dans le dossier `docs/`

### Ce que nous refusons
- Les dépendances vers des services cloud propriétaires (AWS, Vercel, Firebase, Supabase)
- Les ORM lourds comme Prisma ou TypeORM
- Tout jeton d'API NocoDB exposé dans le navigateur (voir [ADR-0002](./docs/decisions/0002-couche-acces-donnees.md))
- Toute donnée d'observateur envoyée vers le site public ou les données ouvertes
- Le code sans commentaires pour la logique métier complexe
- Les PR qui cassent la structure du monorepo

## 💬 Besoin d'aide ?

Rejoins la communauté "La Forge Citoyenne" sur notre canal dédié ou tague `@dofbi` (Tech Lead) sur GitHub. Il n'y a pas de mauvaises questions !

## 🏆 Reconnaissance

Tous les contributeurs sont listés dans le fichier `CONTRIBUTORS.md`. Les meilleures contributions issues des Tech Camps peuvent bénéficier d'un soutien financier via le mécanisme de sous-subvention #Tech4Good (5 subventions de 5 000 €).
