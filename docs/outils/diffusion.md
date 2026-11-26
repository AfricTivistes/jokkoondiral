# 📢 Domaine 4 — Diffusion et alertes

> Fiches issues du document « Situation Room — Orientation des besoins » (consultation Jokkoondiral, 45 OSC, oct. 2026). Les chiffres « Données » portent sur 45 OSC sauf mention.

Diffuser, c'est montrer au public ce qui est vérifié et prévenir l'équipe de ce qui est urgent. Le temps réel est demandé par 35 OSC, la carte publique par 24.

| Code | Outil | Phase | Où | Profil |
|---|---|---|---|---|
| [D1](#d1) | Carte publique | MVP | `apps/public` | frontend junior, designers |
| [D2](#d2) | Carte interne temps réel | MVP | `apps/dashboard` | React |
| [D3](#d3) | Alertes sortantes | V1 | `apps/webhooks/src/notify/` (service d'envoi), règles configurables dans `apps/dashboard` | backend Node |
| [D4](#d4) | Rapports publics | V2 | `apps/public` | frontend + journalistes |
| [D5](#d5) | Données ouvertes | V2 | `apps/public` | data |

<a id="d1"></a>
## D1 · Carte publique

**Phase :** MVP · **Profil :** frontend junior, designers

- **Rôle :** carte et liste des seuls incidents vérifiés, filtrables par type, zone et date, lisibles sur une connexion lente.
- **Données :** carte publique voulue par 24, notée 3,49 et non négociable pour 9 ; carte filtrable 13 ; par circonscription ou bureau 14 ; absence de cartographie citée 9 fois comme problème.
- **Briques open source :** Astro 5, Leaflet, tuiles OpenStreetMap mises en cache, GeoJSON.
- **Où :** `apps/public`.
- **État :** configuration Astro sans aucune page.

**Premières tâches**

- [ ] Page d'accueil, Header/Footer
- [ ] Carte Leaflet branchée sur les incidents verified
- [ ] Test sur Android bas de gamme

Suivi : [issues `[D1]`](https://github.com/AfricTivistes/situation-room/issues?q=is%3Aissue+%22%5BD1%5D%22) · titre d'issue : `[D1] <tâche>`

<a id="d2"></a>
## D2 · Carte interne temps réel

**Phase :** MVP · **Profil :** React

- **Rôle :** carte de la salle de situation montrant tous les signalements (y compris non vérifiés) au fil de l'eau, par gravité.
- **Données :** incidents en temps réel 35 (1re visualisation) ; carte interne 14 ; signalement en continu pour 21.
- **Briques open source :** Leaflet dans Refine ; rafraîchissement périodique ou Server-Sent Events.
- **Où :** `apps/dashboard`.
- **État :** rien.

**Premières tâches**

- [ ] Vue carte à côté de la file M1
- [ ] Couleur par gravité (M3)

Suivi : [issues `[D2]`](https://github.com/AfricTivistes/situation-room/issues?q=is%3Aissue+%22%5BD2%5D%22) · titre d'issue : `[D2] <tâche>`

<a id="d3"></a>
## D3 · Alertes sortantes

**Phase :** V1 · **Profil :** backend Node

- **Rôle :** prévenir coordinateurs et partenaires quand un incident critique, une preuve ou une tentative d'intrusion arrive.
- **Données :** alertes temps réel notées 3,80, non négociables pour 11 ; canaux : WhatsApp/Telegram 40, SMS 31, push 19, email 17 ; déclencheurs : incident critique 41, preuve reçue 32, intrusion 27, seuil dépassé 11, modération en attente 8.
- **Briques open source :** réutilise les fournisseurs de R1 et R2 ; Web Push pour le navigateur ; email SMTP.
- **Où :** `apps/webhooks/src/notify/` (service d'envoi), règles configurables dans `apps/dashboard`.
- **État :** rien.

**Premières tâches**

- [ ] Règle « gravité critique → WhatsApp aux coordinateurs »
- [ ] Limitation du nombre d'envois

Suivi : [issues `[D3]`](https://github.com/AfricTivistes/situation-room/issues?q=is%3Aissue+%22%5BD3%5D%22) · titre d'issue : `[D3] <tâche>`

<a id="d4"></a>
## D4 · Rapports publics

**Phase :** V2 · **Profil :** frontend + journalistes

- **Rôle :** publier des bilans (par journée, par région, final) et la méthodologie d'observation.
- **Données :** tableau de bord statistiques noté 3,34 ; 7 médias citoyens ; une OSC demande d'« avoir les résultats à temps » ; fonctions médias et plaidoyer des OSC.
- **Briques open source :** pages statiques Astro générées depuis les données ; export PDF.
- **Où :** `apps/public`.
- **État :** rien.

**Premières tâches**

- [ ] Gabarit de bilan journalier
- [ ] Page « Méthodologie »

Suivi : [issues `[D4]`](https://github.com/AfricTivistes/situation-room/issues?q=is%3Aissue+%22%5BD4%5D%22) · titre d'issue : `[D4] <tâche>`

<a id="d5"></a>
## D5 · Données ouvertes

**Phase :** V2 · **Profil :** data

- **Rôle :** exposer les incidents vérifiés en lecture (GeoJSON, CSV, flux) pour les médias, chercheurs et autres OSC.
- **Données :** export noté 3,64 ; accès aux données électorales cité comme problème ; valeur de transparence du projet.
- **Briques open source :** fichiers statiques générés par `apps/public` ; licence ouverte des données (ODbL).
- **Où :** `apps/public`.
- **État :** rien.

**Premières tâches**

- [ ] Schéma public anonymisé (aucun champ observateur)
- [ ] Décision de licence

Suivi : [issues `[D5]`](https://github.com/AfricTivistes/situation-room/issues?q=is%3Aissue+%22%5BD5%5D%22) · titre d'issue : `[D5] <tâche>`


---
[← Catalogue des outils](./README.md) · [Matrice besoins × outils](../BESOINS.md#matrice-besoins--outils) · [Phasage](../ROADMAP.md)
