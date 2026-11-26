# ADR-0002 — Couche d'accès aux données

- **Statut :** tranchée pour l'écriture des signalements par [ADR-0011](./0011-acces-aux-donnees-et-identite.md) ; ouverte pour la lecture (dashboard)
- **Outils concernés :** S1, S3, M2, M4, M1
- **Source :** document « Orientation des besoins », section « Décisions à trancher »

## Contexte

Jeton NocoDB complet exposé dans le navigateur par le dashboard ; sécurité notée 3,95 / 5 ; piratage cité 22 fois.

## Options

1. API NocoDB appelée directement par les apps
2. petite API métier devant NocoDB

## Recommandation

Petite API métier (`apps/api`) pour l'écriture, les preuves, les rôles et l'audit ; NocoDB gardé comme interface d'administration.

## Conséquences

Remplace la règle « l'API est fournie par NocoDB, pas de routes Express pour le CRUD » (`docs/ARCHITECTURE.md`). Tant que la décision n'est pas prise, aucune nouvelle app ne doit exposer de jeton NocoDB côté navigateur.

## Décision

_À compléter lors de la décision : option retenue, date, qui a décidé. Passer alors le statut à « acceptée »._
