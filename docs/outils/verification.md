# 🔎 Domaine 3 — Vérification et modération

> Fiches issues du document « Jokkoondiral — Orientation des besoins » (consultation Jokkoondiral, 45 OSC, oct. 2026). Les chiffres « Données » portent sur 45 OSC sauf mention.

C'est le cœur de la crédibilité : rien n'est publié sans vérification, et chaque décision est traçable. L'absence de vérification est citée 10 fois parmi les problèmes actuels, les données dispersées 7 fois.

| Code | Outil | Phase | Où | Profil |
|---|---|---|---|---|
| [M1](#m1) | File de modération | MVP | `apps/dashboard` | React + fact-checkeurs (tests d'usage) |
| [M2](#m2) | Coffre des preuves | MVP | module partagé appelé par `apps/webhooks` ; table `evidences` dans `infra/postgres` | backend Node + data/DevOps |
| [M3](#m3) | Qualification de l'incident | MVP | `infra/postgres` (table `election_incidents`, suggérée dans `docs/SCHEMA.md`), types dans `packages/shared/src/types.ts` | data + juristes et fact-checkeurs (nomenclature) |
| [M4](#m4) | Journal d'audit | MVP | `infra/postgres` | data/DevOps |
| [M5](#m5) | Recoupement et doublons | V1 | vue SQL + panneau dans `apps/dashboard` | data |
| [M6](#m6) | Veille désinformation et fact-checking | V2 | ressource « rumeurs » dans `apps/dashboard`, publication dans `apps/public` | fact-checkeurs et journalistes + React |

<a id="m1"></a>
## M1 · File de modération

**Phase :** MVP · **Profil :** React + fact-checkeurs (tests d'usage)

- **Rôle :** liste des signalements entrants, filtrable par statut, canal, gravité et zone, avec fiche détail et boutons valider / rejeter / demander un complément.
- **Données :** espace de modération privé noté 3,46 et non négociable pour 8 ; signalement en continu pour 21 OSC, plusieurs fois par heure pour 11 ; coordinateurs sur smartphone 19, sur les deux supports 22.
- **Briques open source :** `Refine.js` (`useTable`, `useForm`), déjà choisi.
- **Où :** `apps/dashboard`.
- **État :** deux pages vides avec TODO dans `App.tsx` ; fournisseur de données générique non adapté à NocoDB.

**Premières tâches**

- [ ] Vue `/reports` avec filtres pending/verified/rejected
- [ ] Affichage mobile
- [ ] Rafraîchissement automatique

Suivi : [issues `[M1]`](https://github.com/AfricTivistes/jokkoondiral/issues?q=is%3Aissue+%22%5BM1%5D%22) · titre d'issue : `[M1] <tâche>`

<a id="m2"></a>
## M2 · Coffre des preuves

**Phase :** MVP · **Profil :** backend Node + data/DevOps

- **Rôle :** stocker photos, vocaux, vidéos et documents rattachés à un signalement, avec empreinte et horodatage de réception.
- **Données :** preuves multimédia notées 4,02 / 5 (1re) ; photo 41, texte 36, vidéo 33, audio 27, document scanné 24 ; horodatage obligatoire et non modifiable pour 25.
- **Briques open source :** stockage disque du VPS (ou MinIO si volume) ; sharp / ffmpeg pour compresser ; SHA-256 natif de Node.
- **Où :** module partagé appelé par `apps/webhooks` ; table `evidences` dans `infra/postgres`.
- **État :** rien.

**Premières tâches**

- [ ] Table des preuves
- [ ] Calcul d'empreinte à la réception
- [ ] Quotas et purge
- [ ] Lecture protégée (jamais d'URL publique devinée)

Suivi : [issues `[M2]`](https://github.com/AfricTivistes/jokkoondiral/issues?q=is%3Aissue+%22%5BM2%5D%22) · titre d'issue : `[M2] <tâche>`

<a id="m3"></a>
## M3 · Qualification de l'incident

**Phase :** MVP · **Profil :** data + juristes et fact-checkeurs (nomenclature)

- **Rôle :** donner à chaque signalement une catégorie, une gravité, un lieu (bureau de vote, commune, région) et l'heure déclarée par l'observateur.
- **Données :** niveau géographique bureau de vote 23, national 10, commune 7 ; géolocalisation automatique 27, saisie manuelle 13 ; alertes sur « incident critique » voulues par 41 (nécessite une gravité).
- **Briques open source :** PostGIS pour les zones ; nomenclature d'incidents à définir avec les fact-checkeurs.
- **Où :** `infra/postgres` (table `election_incidents`, suggérée dans `docs/SCHEMA.md`), types dans `packages/shared/src/types.ts`.
- **État :** `base_reports` n'a que titre, description, source, statut et coordonnées.

**Premières tâches**

- [ ] Nomenclature d'incidents (`docs/METHODOLOGY.md`)
- [ ] Migration SQL
- [ ] Types partagés

Suivi : [issues `[M3]`](https://github.com/AfricTivistes/jokkoondiral/issues?q=is%3Aissue+%22%5BM3%5D%22) · titre d'issue : `[M3] <tâche>`

<a id="m4"></a>
## M4 · Journal d'audit

**Phase :** MVP · **Profil :** data/DevOps

- **Rôle :** enregistrer qui a changé quoi et quand (statut, qualification, suppression), sans possibilité de réécriture.
- **Données :** horodatage non modifiable 25 ; désinformation citée comme menace par 34 ; « fiabilité des données » et « standards internationaux » dans les verbatims.
- **Briques open source :** déclencheurs PostgreSQL vers une table en ajout seul.
- **Où :** `infra/postgres`.
- **État :** rien.

**Premières tâches**

- [ ] Table `audit_log` et déclencheurs
- [ ] Affichage de l'historique dans la fiche M1

Suivi : [issues `[M4]`](https://github.com/AfricTivistes/jokkoondiral/issues?q=is%3Aissue+%22%5BM4%5D%22) · titre d'issue : `[M4] <tâche>`

<a id="m5"></a>
## M5 · Recoupement et doublons

**Phase :** V1 · **Profil :** data

- **Rôle :** regrouper les signalements proches (même lieu, même heure, même type) pour vérifier plus vite et repérer les incidents confirmés par plusieurs sources.
- **Données :** alertes sur « seuil dépassé » voulues par 11, « cluster géographique » par 3 ; pics de signalements le jour du scrutin.
- **Briques open source :** requêtes PostGIS de proximité (`ST_DWithin`).
- **Où :** vue SQL + panneau dans `apps/dashboard`.
- **État :** rien.

**Premières tâches**

- [ ] Règle simple distance + fenêtre de temps
- [ ] Badge « confirmé par N sources »

Suivi : [issues `[M5]`](https://github.com/AfricTivistes/jokkoondiral/issues?q=is%3Aissue+%22%5BM5%5D%22) · titre d'issue : `[M5] <tâche>`

<a id="m6"></a>
## M6 · Veille désinformation et fact-checking

**Phase :** V2 · **Profil :** fact-checkeurs et journalistes + React

- **Rôle :** suivre les rumeurs qui circulent, les rattacher aux incidents vérifiés ou les démentir publiquement.
- **Données :** désinformation citée par 34 OSC (2e menace ex aequo) ; 7 médias citoyens parmi les répondants.
- **Briques open source :** méthodes et formats ClaimReview (schema.org) pour publier les vérifications.
- **Où :** ressource « rumeurs » dans `apps/dashboard`, publication dans `apps/public`.
- **État :** rien.

**Premières tâches**

- [ ] Définir le circuit « rumeur → vérifiée / démentie » dans `docs/METHODOLOGY.md`

Suivi : [issues `[M6]`](https://github.com/AfricTivistes/jokkoondiral/issues?q=is%3Aissue+%22%5BM6%5D%22) · titre d'issue : `[M6] <tâche>`


---
[← Catalogue des outils](./README.md) · [Matrice besoins × outils](../BESOINS.md#matrice-besoins--outils) · [Phasage](../ROADMAP.md)
