# 📥 Domaine 1 — Collecte terrain

> Fiches issues du document « Situation Room — Orientation des besoins » (consultation Jokkoondiral, 45 OSC, oct. 2026). Les chiffres « Données » portent sur 45 OSC sauf mention.

La collecte doit marcher pour tous les observateurs : smartphone récent ou téléphone basique, réseau 4G ou SMS seul. Sept outils couvrent cet éventail.

| Code | Outil | Phase | Où | Profil |
|---|---|---|---|---|
| [C1](#c1) | Formulaire web hors ligne (PWA) | MVP | nouvelle app `apps/collect` ou route dédiée de `apps/public` | frontend |
| [C2](#c2) | Application Android hors ligne | V1 | `apps/android` (si native) ; sinon configuration ODK documentée dans docs/ | mobile Android ou frontend (Capacitor) |
| [C3](#c3) | Parcours SMS codé | MVP | `apps/webhooks/src/parsers/sms.ts`, codes dans `packages/shared/src/constants.ts` | backend Node + fact-checkeur (définition des codes) |
| [C4](#c4) | Saisie des appels par un opérateur | V1 | `apps/dashboard`, ressource « nouveau signalement » | React |
| [C5](#c5) | USSD | V2 | `apps/webhooks/src/handlers/ussd.ts` | backend Node |
| [C6](#c6) | Signalement vocal en langues nationales | V2 | service optionnel `apps/voice` appelé par M2 | data / IA, linguistes bénévoles |
| [C7](#c7) | Import KoBo / ODK | V1 | `scripts/import-kobo` puis connecteur dans `apps/webhooks` | backend Node / data |

<a id="c1"></a>
## C1 · Formulaire web hors ligne (PWA)

**Phase :** MVP · **Profil :** frontend

- **Rôle :** formulaire de signalement installable depuis le navigateur, qui enregistre hors ligne et envoie dès que le réseau revient.
- **Données :** hors-ligne critique 30, secondaire 12 ; formulaire web voulu par 14 ; témoignage structuré 27 ; Android milieu/haut 32, iPhone 13.
- **Briques open source :** Astro ou Vite, Workbox (service worker), IndexedDB, compression d'image côté navigateur.
- **Où :** nouvelle app `apps/collect` ou route dédiée de `apps/public`.
- **État :** rien.

**Premières tâches**

- [ ] Schéma du formulaire partagé dans `packages/shared`
- [ ] File d'envoi locale
- [ ] Envoi des photos compressées
- [ ] Test en 2G simulée

Suivi : [issues `[C1]`](https://github.com/AfricTivistes/situation-room/issues?q=is%3Aissue+%22%5BC1%5D%22) · titre d'issue : `[C1] <tâche>`

<a id="c2"></a>
## C2 · Application Android hors ligne

**Phase :** V1 · **Profil :** mobile Android ou frontend (Capacitor)

- **Rôle :** application native pour les zones longtemps coupées, avec GPS, photo, audio et file d'envoi persistante.
- **Données :** app Android notée 3,83 / 5 (3e fonctionnalité) ; voulue comme canal par 9 ; Android bas de gamme 26.
- **Briques open source :** réutiliser ODK Collect (déjà utilisé par des répondants) avant d'écrire une app, ou Capacitor autour de C1.
- **Où :** `apps/android` (si native) ; sinon configuration ODK documentée dans docs/.
- **État :** rien.

**Premières tâches**

- [ ] Mesurer les limites de C1 sur un Android bas de gamme
- [ ] Prototype ODK branché sur l'API de réception

Suivi : [issues `[C2]`](https://github.com/AfricTivistes/situation-room/issues?q=is%3Aissue+%22%5BC2%5D%22) · titre d'issue : `[C2] <tâche>`

<a id="c3"></a>
## C3 · Parcours SMS codé

**Phase :** MVP · **Profil :** backend Node + fact-checkeur (définition des codes)

- **Rôle :** format de SMS court (code incident, bureau de vote, gravité) qu'un observateur sans internet envoie et que le système transforme en formulaire.
- **Données :** SMS voulu par 30 ; SMS outil principal pour 18 ; connexion faible ou SMS seulement pour 10 ; une OSC décrit exactement ce besoin (« coded SMS which will translate as answered form »).
- **Briques open source :** parseur maison simple ; s'inspirer du format FrontlineSMS / RapidSMS.
- **Où :** `apps/webhooks/src/parsers/sms.ts`, codes dans `packages/shared/src/constants.ts`.
- **État :** `sms.ts` insère le texte brut ; le format est un TODO.

**Premières tâches**

- [ ] Définir la grammaire du SMS avec des observateurs
- [ ] Parseur + tests
- [ ] Réponse d'erreur explicite

Suivi : [issues `[C3]`](https://github.com/AfricTivistes/situation-room/issues?q=is%3Aissue+%22%5BC3%5D%22) · titre d'issue : `[C3] <tâche>`

<a id="c4"></a>
## C4 · Saisie des appels par un opérateur

**Phase :** V1 · **Profil :** React

- **Rôle :** écran où un opérateur de permanence saisit un signalement reçu par téléphone.
- **Données :** appel téléphonique voulu par 27 (3e canal) ; téléphones basiques 19.
- **Briques open source :** formulaire Refine du dashboard (réutilise C1 et M3).
- **Où :** `apps/dashboard`, ressource « nouveau signalement ».
- **État :** rien.

**Premières tâches**

- [ ] Formulaire avec source « appel »
- [ ] Numéro de l'appelant rattaché au registre R5

Suivi : [issues `[C4]`](https://github.com/AfricTivistes/situation-room/issues?q=is%3Aissue+%22%5BC4%5D%22) · titre d'issue : `[C4] <tâche>`

<a id="c5"></a>
## C5 · USSD

**Phase :** V2 · **Profil :** backend Node

- **Rôle :** menu *123# pour signaler sans internet ni saisie libre.
- **Données :** USSD noté 3,33 / 5 (dernier) ; voulu comme canal par 4 seulement.
- **Briques open source :** API USSD d'Africa's Talking (même compte que R2).
- **Où :** `apps/webhooks/src/handlers/ussd.ts`.
- **État :** rien.

**Premières tâches**

- [ ] Arbre de menus à 3 niveaux maximum
- [ ] Coût par session par pays

Suivi : [issues `[C5]`](https://github.com/AfricTivistes/situation-room/issues?q=is%3Aissue+%22%5BC5%5D%22) · titre d'issue : `[C5] <tâche>`

<a id="c6"></a>
## C6 · Signalement vocal en langues nationales

**Phase :** V2 · **Profil :** data / IA, linguistes bénévoles

- **Rôle :** l'observateur envoie un message vocal (WhatsApp ou appel) dans sa langue ; il est stocké comme preuve et transcrit si possible.
- **Données :** audio 27 ; alternative « audio + photo » choisie par 17 ; langues citées : wolof 8, bambara 5, pulaar 3 et une douzaine d'autres ; une OSC demande « une application vocale en langues nationales », une autre développe déjà un chatbot vocal.
- **Briques open source :** Whisper (transcription auto-hébergeable), modèles communautaires pour les langues africaines.
- **Où :** service optionnel `apps/voice` appelé par M2.
- **État :** rien.

**Premières tâches**

- [ ] Stocker les vocaux comme preuves dès le MVP (M2)
- [ ] Évaluer la transcription en wolof et bambara

Suivi : [issues `[C6]`](https://github.com/AfricTivistes/situation-room/issues?q=is%3Aissue+%22%5BC6%5D%22) · titre d'issue : `[C6] <tâche>`

<a id="c7"></a>
## C7 · Import KoBo / ODK

**Phase :** V1 · **Profil :** backend Node / data

- **Rôle :** importer les formulaires et les réponses KoBoToolbox ou ODK pour que les OSC gardent leurs outils actuels.
- **Données :** KoBoToolbox outil principal pour 15, occasionnel pour 5 ; ODK et KoboCollect cités comme outil idéal.
- **Briques open source :** API REST de KoBoToolbox, format XLSForm.
- **Où :** `scripts/import-kobo` puis connecteur dans `apps/webhooks`.
- **État :** rien.

**Premières tâches**

- [ ] Correspondance des champs XLSForm vers le modèle d'incident (M3)
- [ ] Import ponctuel en script

Suivi : [issues `[C7]`](https://github.com/AfricTivistes/situation-room/issues?q=is%3Aissue+%22%5BC7%5D%22) · titre d'issue : `[C7] <tâche>`


---
[← Catalogue des outils](./README.md) · [Matrice besoins × outils](../BESOINS.md#matrice-besoins--outils) · [Phasage](../ROADMAP.md)
