# ADR-0009 — Nom du projet : Jokkoondiral

- **Statut :** acceptée
- **Outils concernés :** tous
- **Date :** 2026-11-26

## Contexte

Le projet s'appelait « Situation Room » (Africa ElectionLab). La consultation des OSC qui fonde le catalogue d'outils porte déjà le nom **Jokkoondiral**. Garder deux noms brouillait le récit pour les OSC, les contributeurs et les partenaires.

## Décision

Le projet s'appelle **Jokkoondiral**. Le renommage couvre le texte et les identifiants techniques, tant qu'aucune instance n'est en production :

| Élément | Avant | Après |
|---|---|---|
| Dépôt GitHub | `AfricTivistes/situation-room` | `AfricTivistes/jokkoondiral` |
| Paquets npm | `@situation-room/<nom>` | `@jokkoondiral/<nom>` |
| Monorepo | `situation-room-monorepo` | `jokkoondiral-monorepo` |
| Conteneurs Docker | `situation-room-*` | `jokkoondiral-*` |
| Base de données (`DB_NAME`) | `situation_room` | `jokkoondiral` |
| Configuration Nginx | `docker/nginx/conf.d/situation-room.conf` | `docker/nginx/conf.d/jokkoondiral.conf` |

« Salle de situation » reste employé comme nom commun (la salle où l'équipe suit le scrutin, outil D2).

## Conséquences

- Les anciennes URL GitHub sont redirigées par GitHub après le renommage du dépôt ; mettre à jour le remote local : `git remote set-url origin https://github.com/AfricTivistes/jokkoondiral.git`.
- **Instance locale existante** : soit garder `DB_NAME=situation_room` dans son `.env`, soit recréer la base (`docker compose -f docker-compose.dev.yml down -v` puis `up -d`, ce qui **efface les données locales**). Les anciens conteneurs `situation-room-*` sont à supprimer à la main.
- Le document de travail « Orientation des besoins » est cité sous le nouveau nom.
