## Outil(s)

<!-- Code(s) de l'outil du catalogue (docs/outils) : ex. R1, M2. « aucun » pour la doc ou l'infra générale. -->

Outil : 

## Issue liée

Closes #

## Description

<!-- Le QUOI et le POURQUOI, pas le COMMENT (ça, c'est dans le code) -->

## Type de changement

- [ ] 🐛 Correction de bug
- [ ] ✨ Nouvelle fonctionnalité d'un outil
- [ ] 🧰 Nouvel outil / nouvelle app ou package (voir `docs/AJOUTER_UN_OUTIL.md`)
- [ ] ♻️ Refactoring (pas de changement de comportement)
- [ ] 📝 Documentation uniquement
- [ ] 🔧 Configuration / infrastructure
- [ ] 🧭 Décision d'architecture (ADR dans `docs/decisions/`)

## Famille

- [ ] 📥 Collecte (C) · [ ] 📡 Réception (R) · [ ] 🔎 Vérification (M) · [ ] 📢 Diffusion (D) · [ ] 📊 Analyse (A) · [ ] 🧱 Socles (S)

## Capture d'écran

<!-- OBLIGATOIRE si l'interface change (apps/public, apps/dashboard…) — avant / après si pertinent -->

## Checklist

- [ ] Commits au format Conventional Commits avec le code de l'outil (`feat(r1): …`)
- [ ] `pnpm typecheck` passe pour les paquets modifiés
- [ ] Testé en local (`docker compose -f docker-compose.dev.yml up -d`)
- [ ] Aucune dépendance obligatoire à un cloud propriétaire (AWS, Firebase, Supabase…)
- [ ] Aucun jeton d'API exposé dans le navigateur, aucune donnée d'observateur rendue publique
- [ ] Types créés ou modifiés dans `packages/shared`
- [ ] Fiche de l'outil (`docs/outils/<domaine>.md`, rubriques **Où** / **État**) et README mis à jour si nécessaire
