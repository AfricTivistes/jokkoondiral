# 🧱 Socles transverses

> Fiches issues du document « Jokkoondiral — Orientation des besoins » (consultation Jokkoondiral, 45 OSC, oct. 2026). Les chiffres « Données » portent sur 45 OSC sauf mention.

Les socles ne sont pas des outils visibles par l'observateur, mais tous les autres en dépendent. Ils doivent être posés tôt : les rajouter après coûte plus cher que de les construire d'abord.

| Code | Outil | Phase | Où | Profil |
|---|---|---|---|---|
| [S1](#s1) | Identité, rôles et double authentification | MVP | `apps/dashboard/src/providers/authProvider.ts`, rôles dans `packages/shared/src/types.ts` (`UserRole` existe) | backend + React |
| [S2](#s2) | Multi-organisations | V1 | `infra/postgres`, filtres dans toutes les apps | data/DevOps |
| [S3](#s3) | Sécurité et protection des observateurs | MVP, continu | infra/, `docker/nginx/`, revue transverse de toutes les apps | sécurité / DevOps (axe Hacker de l'ElectionLab) |
| [S4](#s4) | Langues | MVP (FR/EN), V2 (langues nationales) | `packages/shared/src/i18n/` | frontend + traducteurs |
| [S5](#s5) | Déploiement et hébergement | MVP (auto-hébergé), V1 (mode hébergé) | docker/, `docker-compose.yml`, `scripts/setup.sh`, `docs/DEPLOYMENT.md` | DevOps |
| [S6](#s6) | Référentiels | MVP | `infra/postgres`, `scripts/seed` | data + contributeurs locaux de chaque pays |
| [S7](#s7) | Documentation et guides | MVP, continu | docs/ (existe : ARCHITECTURE, SCHEMA, DEPLOYMENT…) | non techniques (journalistes, juristes, designers) |

<a id="s1"></a>
## S1 · Identité, rôles et double authentification

**Phase :** MVP · **Profil :** backend + React

- **Rôle :** comptes de l'équipe, rôles (admin, modérateur, observateur, lecteur), double authentification, sessions sûres.
- **Données :** piratage cité par 22 ; alertes « tentative d'intrusion » voulues par 27 ; « accès sécurisé pour les observateurs en zone à risques » (plusieurs pays).
- **Briques open source :** authentification NocoDB ou couche dédiée (voir Décisions) ; TOTP pour la 2FA.
- **Où :** `apps/dashboard/src/providers/authProvider.ts`, rôles dans `packages/shared/src/types.ts` (`UserRole` existe).
- **État :** authProvider du dashboard toujours ébauché ; côté terrain, chaque téléphone d'observateur est identifié par une clé propre et révocable ([ADR-0011](../decisions/0011-acces-aux-donnees-et-identite.md)). Reste : comptes de l'équipe, rôles, 2FA, retrait du jeton NocoDB du navigateur.

**Remarques des tests en ligne (novembre 2026)** : l'enrôlement et la désactivation reposent sur un seul secret partagé : quiconque le possède peut créer ou couper des observateurs, sans trace de qui l'a fait.

**Premières tâches**

- [ ] Supprimer le jeton côté navigateur
- [ ] Brancher la connexion
- [ ] Contrôle d'accès par rôle
- [ ] Rôle « coordinateur » autorisé à gérer les observateurs (R5), distinct de « modérateur »
- [ ] Remplacer le secret partagé `JK_WEBHOOK_SECRET` (qui donne tous les droits sur le registre) par des comptes nominatifs de la coordination ; le garder seulement pour le webhook NocoDB, sur le réseau interne
- [ ] 2FA obligatoire pour les comptes qui gèrent les observateurs


Suivi : [issues `[S1]`](https://github.com/AfricTivistes/jokkoondiral/issues?q=is%3Aissue+%22%5BS1%5D%22) · titre d'issue : `[S1] <tâche>`

<a id="s2"></a>
## S2 · Multi-organisations

**Phase :** V1 · **Profil :** data/DevOps

- **Rôle :** plusieurs OSC (coalition, réseau national) sur une même instance, chacune ne voyant que ses données, avec partage choisi.
- **Données :** multi-organisations noté 3,65, non négociable pour 6 ; 14 OSC sans capacité d'hébergement (instances mutualisées) ; coalitions d'observation fréquentes.
- **Briques open source :** colonne `organization_id` + Row Level Security de PostgreSQL.
- **Où :** `infra/postgres`, filtres dans toutes les apps.
- **État :** rien.

**Premières tâches**

- [ ] Ajouter `organization_id` dès le MVP même si une seule OSC l'utilise

Suivi : [issues `[S2]`](https://github.com/AfricTivistes/jokkoondiral/issues?q=is%3Aissue+%22%5BS2%5D%22) · titre d'issue : `[S2] <tâche>`

<a id="s3"></a>
## S3 · Sécurité et protection des observateurs

**Phase :** MVP, continu · **Profil :** sécurité / DevOps (axe Hacker de l'ElectionLab)

- **Rôle :** chiffrement des données sensibles, protection des preuves, détection d'intrusion, guide de menace.
- **Données :** sécurité et chiffrement noté 3,95 (2e), non négociable pour 8 ; menaces : intimidation 34, désinformation 34, surveillance 25, piratage 22 ; besoins exprimés : chiffrement des communications, protection contre la surveillance.
- **Briques open source :** chiffrement de colonnes pgcrypto, TLS par Nginx + Let's Encrypt, fail2ban ; Signal recommandé pour les échanges d'équipe.
- **Où :** infra/, `docker/nginx/`, revue transverse de toutes les apps.
- **État :** amorcé : HTTPS / TLS vérifié obligatoire vers les bases distantes, secrets en fichier (`*_FILE`), rôle PostgreSQL à droits minimaux, empreintes HMAC des clés, numéros chiffrés AES-256-GCM, photos sans EXIF, aucune donnée nominative. Reste : modèle de menace écrit, journal des connexions et alerte D3.

**Premières tâches**

- [ ] Modèle de menace écrit
- [ ] Chiffrement des numéros d'observateurs
- [ ] Journal des connexions et alerte D3

Suivi : [issues `[S3]`](https://github.com/AfricTivistes/jokkoondiral/issues?q=is%3Aissue+%22%5BS3%5D%22) · titre d'issue : `[S3] <tâche>`

<a id="s4"></a>
## S4 · Langues

**Phase :** MVP (FR/EN), V2 (langues nationales) · **Profil :** frontend + traducteurs

- **Rôle :** interfaces et messages automatiques traduisibles, sans code en dur.
- **Données :** multilingue noté 3,46, non négociable pour 8 ; français 17, anglais 10, wolof 8, bambara 5, arabe 7 (toutes variantes) ; 10 répondants anglophones.
- **Briques open source :** fichiers de traduction JSON partagés ; Weblate (auto-hébergé) pour les traducteurs bénévoles.
- **Où :** `packages/shared/src/i18n/`.
- **État :** libellés en français en dur dans `constants.ts`.

**Premières tâches**

- [ ] Extraire les libellés
- [ ] Anglais complet
- [ ] Gestion de l'arabe (écriture de droite à gauche)

Suivi : [issues `[S4]`](https://github.com/AfricTivistes/jokkoondiral/issues?q=is%3Aissue+%22%5BS4%5D%22) · titre d'issue : `[S4] <tâche>`

<a id="s5"></a>
## S5 · Déploiement et hébergement

**Phase :** MVP (auto-hébergé), V1 (mode hébergé) · **Profil :** DevOps

- **Rôle :** installer une instance complète en une commande sur un petit VPS, la mettre à jour, la sauvegarder ; proposer un mode hébergé par un tiers de confiance.
- **Données :** budget < 10 €/mois pour 9, < 30 €/mois pour 12 ; capacité interne 17, via VPS 13, aucune 14 ; auto-hébergement obligatoire 16.
- **Briques open source :** Docker Compose (en place), Nginx, script `setup.sh`.
- **Où :** docker/, `docker-compose.yml`, `scripts/setup.sh`, `docs/DEPLOYMENT.md`.
- **État :** Compose de production et de développement présents ; image NocoDB en latest (non figée).

**Premières tâches**

- [ ] Figer les versions d'images
- [ ] Mesurer la mémoire réelle sur 2 Go
- [ ] Procédure de mise à jour
- [ ] Modèle d'instance mutualisée

Suivi : [issues `[S5]`](https://github.com/AfricTivistes/jokkoondiral/issues?q=is%3Aissue+%22%5BS5%5D%22) · titre d'issue : `[S5] <tâche>`

<a id="s6"></a>
## S6 · Référentiels

**Phase :** MVP · **Profil :** data + contributeurs locaux de chaque pays

- **Rôle :** listes de référence par pays : découpage administratif, bureaux de vote avec coordonnées, nomenclature d'incidents, calendrier électoral.
- **Données :** granularité bureau de vote 23 ; saisie manuelle du lieu 13 (impossible sans liste) ; 18 pays représentés.
- **Briques open source :** table `polling_stations` (suggérée dans `docs/SCHEMA.md`), données OpenStreetMap et listes publiques des commissions électorales.
- **Où :** `infra/postgres`, `scripts/seed`.
- **État :** `scripts/seed.js` crée 28 incidents de démonstration ; aucun référentiel réel.

**Remarques des tests en ligne (novembre 2026)** : les lieux et bureaux de vote sont connus à l'avance (liste officielle, carte d'électeur) ; la saisie libre actuelle du lieu donne des données difficiles à regrouper par bureau.

**Premières tâches**

- [ ] Format d'import des bureaux de vote
- [ ] Premier jeu Sénégal
- [ ] Deux niveaux : **lieux de vote** (centre, commune, coordonnées GPS) et **bureaux** (numéro dans le lieu, inscrits), rattachés à un **scrutin** (A4)
- [ ] Import depuis la liste officielle publiée avant le scrutin (CSV de la commission électorale) ; vérifier la licence de réutilisation dans chaque pays
- [ ] Recherche par le **numéro de lieu ou de bureau imprimé sur la carte d'électeur** ; ne jamais stocker le numéro de carte de l'observateur
- [ ] Distribution **hors ligne** à la PWA, découpée par région (ordre de grandeur : quelques centaines de Ko pour un pays)
- [ ] Position du signalement tirée du référentiel plutôt que du GPS du téléphone (plus sûr pour l'observateur, plus précis)
- [ ] Même liste dans le XLSForm Kobo (`select_one_from_file`, choix en cascade région → commune → lieu → bureau), voir C7


Suivi : [issues `[S6]`](https://github.com/AfricTivistes/jokkoondiral/issues?q=is%3Aissue+%22%5BS6%5D%22) · titre d'issue : `[S6] <tâche>`

<a id="s7"></a>
## S7 · Documentation et guides

**Phase :** MVP, continu · **Profil :** non techniques (journalistes, juristes, designers)

- **Rôle :** guides pour observateurs, modérateurs et administrateurs ; méthodologie de vérification ; guide d'hygiène numérique.
- **Données :** manque de formation cité 8 fois ; 14 OSC observent pour la première fois ; besoins de « capacitation en sécurité numérique » ; complexité des outils citée 5 fois.
- **Briques open source :** Markdown dans docs/, site de documentation généré par Astro.
- **Où :** docs/ (existe : ARCHITECTURE, SCHEMA, DEPLOYMENT…).
- **État :** documentation développeur riche ; aucun guide utilisateur ; `METHODOLOGY.md` prévu mais absent.

**Premières tâches**

- [ ] Guide observateur d'une page (WhatsApp, SMS codé)
- [ ] Docs/`METHODOLOGY.md`

Suivi : [issues `[S7]`](https://github.com/AfricTivistes/jokkoondiral/issues?q=is%3Aissue+%22%5BS7%5D%22) · titre d'issue : `[S7] <tâche>`


---
[← Catalogue des outils](./README.md) · [Matrice besoins × outils](../BESOINS.md#matrice-besoins--outils) · [Phasage](../ROADMAP.md)
