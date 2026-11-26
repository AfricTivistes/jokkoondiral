# 🎛️ Forker et personnaliser Jokkoondiral

Jokkoondiral est un **bien commun** : chaque OSC installe sa propre instance, sur son serveur, avec ses données. Ce guide liste ce qu'une organisation peut adapter, et où.

> **Principe** ([ADR-0001](./decisions/0001-structure-monorepo.md)) : on personnalise par **configuration et données**, pas en modifiant le code. Ainsi une OSC peut récupérer les mises à jour du dépôt principal sans conflit.

## Ce qu'on peut adapter

| Quoi | Où aujourd'hui | Outil |
|---|---|---|
| Domaine, mots de passe, secrets | `.env` (copie de `.env.example`) | S5 |
| Canaux activés (WhatsApp, SMS, Telegram…) | Variables du canal dans `.env` + enregistrement du webhook chez le fournisseur. Aujourd'hui toutes les routes de `apps/webhooks` sont actives ; un interrupteur par canal reste à créer | R1–R4 |
| Services optionnels (vocal, USSD…) | Profils Docker Compose : `docker compose --profile voice up -d` | C5, C6 |
| Statuts, canaux, libellés | `packages/shared/src/constants.ts` (en attendant les fichiers de traduction) | M3, S4 |
| Questions du formulaire de signalement (champs, catégories locales, sections) | Extension de protocole, activée dans `apps/collect/config/instance.json` — [protocoles.md](./protocoles.md) | C1 |
| Nomenclature d'incidents commune (catégories, gravités) | Noyau du protocole, après validation dans `docs/METHODOLOGY.md` | M3 |
| Découpage administratif, bureaux de vote | `infra/seed/<pays>/` (format à définir) | S6 |
| Langues de l'interface | `packages/shared/src/i18n/` (prévu) | S4 |
| Couleurs, logo, polices, mode sombre de la PWA de collecte | `apps/collect/config/themes/<nom>/theme.json` — [personnaliser-le-design.md](./personnaliser-le-design.md) | C1 |
| Identité visuelle du site public | `apps/public` (à brancher sur les mêmes jetons de thème) | D1 |
| Durée de conservation des données | Paramètre d'instance (prévu, [ADR-0008](./decisions/0008-conservation-donnees.md)) | A4 |

Les lignes « prévu » correspondent à des outils pas encore construits : c'est une bonne contribution à faire **dans le dépôt principal** pour que toutes les OSC en profitent.

## Garder son fork à jour

```bash
git remote add upstream https://github.com/AfricTivistes/jokkoondiral.git
git fetch upstream
git merge upstream/main      # ou rebase, selon votre pratique
```

Pour limiter les conflits : ne modifiez pas les fichiers de code pour une simple personnalisation ; ajoutez vos données dans `infra/seed/<pays>/` et vos réglages dans `.env`.

## Recréer les labels et le jalon GitHub dans votre fork

```bash
gh auth login
GH_REPO=votre-org/votre-fork bash scripts/github/labels.sh
GH_REPO=votre-org/votre-fork node scripts/github/issues-mvp.mjs   # optionnel
```

## Obligations de la licence AGPL-3.0

- Utiliser l'outil tel quel pour vos propres scrutins : **aucune obligation supplémentaire**.
- Modifier le code **et** le mettre à disposition d'autres (distribution ou service en ligne) : publier vos modifications sous AGPL-3.0.
- Conserver la mention de licence.

Mieux encore : proposez vos améliorations au dépôt principal par une pull request.
