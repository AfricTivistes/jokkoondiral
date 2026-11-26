# 📊 Domaine 5 — Analyse et archives

> Fiches issues du document « Situation Room — Orientation des besoins » (consultation Jokkoondiral, 45 OSC, oct. 2026). Les chiffres « Données » portent sur 45 OSC sauf mention.

Après le scrutin, les données servent aux rapports, au plaidoyer et aux recours ; elles doivent aussi pouvoir disparaître pour protéger les observateurs.

| Code | Outil | Phase | Où | Profil |
|---|---|---|---|---|
| [A1](#a1) | Tableau de bord statistiques | V1 | `apps/dashboard` | React + data |
| [A2](#a2) | Export | V1 | bouton dans `apps/dashboard`, script dans scripts/ | data |
| [A3](#a3) | Carte de densité et clusters | V2 | `apps/dashboard` et `apps/public` | frontend / data |
| [A4](#a4) | Archivage et conservation | V1 | scripts/ et infra/ | data/DevOps + juristes (durées légales) |

<a id="a1"></a>
## A1 · Tableau de bord statistiques

**Phase :** V1 · **Profil :** React + data

- **Rôle :** chiffres clés en direct (signalements par statut, canal, zone, gravité, heure) pour l'équipe.
- **Données :** tableau de bord stats noté 3,34, non négociable pour 7 ; voulu comme visualisation par 11 ; « real-time monitoring dashboard, analytics and reporting » dans les verbatims.
- **Briques open source :** vues SQL + graphiques légers dans Refine ; Metabase en option pour les OSC qui ont de quoi l'héberger.
- **Où :** `apps/dashboard`.
- **État :** rien.

**Premières tâches**

- [ ] 5 indicateurs de base définis avec des coordinateurs
- [ ] Vues SQL correspondantes

Suivi : [issues `[A1]`](https://github.com/AfricTivistes/situation-room/issues?q=is%3Aissue+%22%5BA1%5D%22) · titre d'issue : `[A1] <tâche>`

<a id="a2"></a>
## A2 · Export

**Phase :** V1 · **Profil :** data

- **Rôle :** exporter incidents et preuves (CSV, GeoJSON, archive ZIP) pour les rapports et pour quitter l'outil à tout moment.
- **Données :** export noté 3,64, non négociable pour 6 ; Google Sheets utilisé par 19 OSC (principal ou occasionnel) ; souveraineté : contrôle préféré 26, auto-hébergement obligatoire 16.
- **Briques open source :** COPY PostgreSQL, ogr2ogr pour le GeoJSON.
- **Où :** bouton dans `apps/dashboard`, script dans scripts/.
- **État :** rien (NocoDB permet déjà un export CSV brut côté administration).

**Premières tâches**

- [ ] Export CSV filtré
- [ ] Export complet avec preuves

Suivi : [issues `[A2]`](https://github.com/AfricTivistes/situation-room/issues?q=is%3Aissue+%22%5BA2%5D%22) · titre d'issue : `[A2] <tâche>`

<a id="a3"></a>
## A3 · Carte de densité et clusters

**Phase :** V2 · **Profil :** frontend / data

- **Rôle :** repérer les zones chaudes et les tendances sur la durée du scrutin.
- **Données :** heatmap voulue par 4 ; cluster géographique 3 ; besoin minoritaire mais utile pour les grosses OSC (9 déploient plus de 200 observateurs).
- **Briques open source :** Leaflet.heat, PostGIS.
- **Où :** `apps/dashboard` et `apps/public`.
- **État :** rien.

**Premières tâches**

- [ ] Couche heatmap optionnelle sur D2

Suivi : [issues `[A3]`](https://github.com/AfricTivistes/situation-room/issues?q=is%3Aissue+%22%5BA3%5D%22) · titre d'issue : `[A3] <tâche>`

<a id="a4"></a>
## A4 · Archivage et conservation

**Phase :** V1 · **Profil :** data/DevOps + juristes (durées légales)

- **Rôle :** clôturer un scrutin, archiver ses données, puis pseudonymiser ou supprimer les données personnelles selon une durée choisie par l'OSC.
- **Données :** intimidation ou arrestation 34, surveillance 25 ; « authenticité des données personnelles », « protection renforcée de nos données » dans les verbatims ; scrutins successifs (locales puis législatives) chez plusieurs OSC.
- **Briques open source :** sauvegardes pg_dump chiffrées ; tâches planifiées.
- **Où :** scripts/ et infra/.
- **État :** rien.

**Premières tâches**

- [ ] Notion de « scrutin » dans le modèle
- [ ] Script de pseudonymisation
- [ ] Sauvegarde chiffrée quotidienne

Suivi : [issues `[A4]`](https://github.com/AfricTivistes/situation-room/issues?q=is%3Aissue+%22%5BA4%5D%22) · titre d'issue : `[A4] <tâche>`


---
[← Catalogue des outils](./README.md) · [Matrice besoins × outils](../BESOINS.md#matrice-besoins--outils) · [Phasage](../ROADMAP.md)
