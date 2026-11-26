# 📡 Domaine 2 — Réception multi-canal

> Fiches issues du document « Jokkoondiral — Orientation des besoins » (consultation Jokkoondiral, 45 OSC, oct. 2026). Les chiffres « Données » portent sur 45 OSC sauf mention.

Tous les canaux aboutissent au même signalement normalisé, rattaché à un observateur connu. C'est le domaine le plus avancé du dépôt (`apps/webhooks`), mais en texte seul.

| Code | Outil | Phase | Où | Profil |
|---|---|---|---|---|
| [R1](#r1) | Passerelle WhatsApp | MVP | `apps/webhooks/src/handlers/whatsapp.ts` | backend Node |
| [R2](#r2) | Passerelle SMS | MVP | `apps/webhooks/src/handlers/sms.ts` | backend Node |
| [R3](#r3) | Bot Telegram | maintenu | `apps/webhooks/src/handlers/telegram.ts` | backend Node |
| [R4](#r4) | Email entrant | V2 | `apps/webhooks/src/handlers/email.ts` | backend Node |
| [R5](#r5) | Registre des observateurs | MVP | `infra/postgres` (table `observers`, suggérée dans `docs/SCHEMA.md`), écrans dans `apps/dashboard` | data/DevOps + React |

<a id="r1"></a>
## R1 · Passerelle WhatsApp

**Phase :** MVP · **Profil :** backend Node

- **Rôle :** recevoir textes, photos, vocaux, vidéos et positions envoyés au numéro WhatsApp de l'OSC, et accuser réception.
- **Données :** WhatsApp voulu par 40, outil principal pour 39 ; photo 41, vidéo 33, audio 27.
- **Briques open source :** API WhatsApp Cloud de Meta (service tiers, voir Décisions) ; téléchargement des médias vers M2.
- **Où :** `apps/webhooks/src/handlers/whatsapp.ts`.
- **État :** reçoit le texte ; ignore les médias (`message.type !== 'text'`) ; jeton de vérification par défaut en dur ; pas de vérification de signature.

**Premières tâches**

- [ ] Téléchargement des médias
- [ ] Vérification de la signature `X-Hub-Signature-256`
- [ ] Message de confirmation avec numéro de suivi

Suivi : [issues `[R1]`](https://github.com/AfricTivistes/jokkoondiral/issues?q=is%3Aissue+%22%5BR1%5D%22) · titre d'issue : `[R1] <tâche>`

<a id="r2"></a>
## R2 · Passerelle SMS

**Phase :** MVP · **Profil :** backend Node

- **Rôle :** recevoir les SMS (libres ou codés, voir C3) et répondre par SMS.
- **Données :** SMS voulu par 30 ; téléphones basiques 19 ; connexion très faible pour 3.
- **Briques open source :** API Africa's Talking (service tiers) ; alternative auto-hébergée : passerelle Android type SMSSync ou RapidPro.
- **Où :** `apps/webhooks/src/handlers/sms.ts`.
- **État :** reçoit et insère le texte brut ; aucune réponse à l'expéditeur.

**Premières tâches**

- [ ] Brancher le parseur C3
- [ ] Abstraction « fournisseur SMS » pour changer d'opérateur par pays

Suivi : [issues `[R2]`](https://github.com/AfricTivistes/jokkoondiral/issues?q=is%3Aissue+%22%5BR2%5D%22) · titre d'issue : `[R2] <tâche>`

<a id="r3"></a>
## R3 · Bot Telegram

**Phase :** maintenu · **Profil :** backend Node

- **Rôle :** recevoir les signalements Telegram, avec position partagée.
- **Données :** Telegram voulu par 12 ; outil principal pour 5 seulement.
- **Briques open source :** Bot API Telegram.
- **Où :** `apps/webhooks/src/handlers/telegram.ts`.
- **État :** texte + position, fonctionnel.

**Premières tâches**

- [ ] Aligner sur le format commun de R1 (médias, accusé de réception) sans y investir plus

Suivi : [issues `[R3]`](https://github.com/AfricTivistes/jokkoondiral/issues?q=is%3Aissue+%22%5BR3%5D%22) · titre d'issue : `[R3] <tâche>`

<a id="r4"></a>
## R4 · Email entrant

**Phase :** V2 · **Profil :** backend Node

- **Rôle :** transformer un email (avec pièces jointes) envoyé à une adresse dédiée en signalement.
- **Données :** email voulu comme canal par 20 ; document scanné 24.
- **Briques open source :** relevé IMAP (bibliothèque imapflow) ou webhook d'un serveur mail auto-hébergé.
- **Où :** `apps/webhooks/src/handlers/email.ts`.
- **État :** rien.

**Premières tâches**

- [ ] Relevé périodique d'une boîte
- [ ] Pièces jointes vers M2

Suivi : [issues `[R4]`](https://github.com/AfricTivistes/jokkoondiral/issues?q=is%3Aissue+%22%5BR4%5D%22) · titre d'issue : `[R4] <tâche>`

<a id="r5"></a>
## R5 · Registre des observateurs

**Phase :** MVP · **Profil :** data/DevOps + React

- **Rôle :** enrôler les observateurs (numéro, identifiant Telegram, affectation à un bureau de vote) et rattacher chaque message entrant à son auteur.
- **Données :** 22 OSC déploient 1 à 10 observateurs, 9 en déploient plus de 200 ; granularité « bureau de vote » voulue par 23 ; intimidation 34 (d'où la protection de ces données).
- **Briques open source :** table PostgreSQL + import CSV.
- **Où :** `infra/postgres` (table `observers`, suggérée dans `docs/SCHEMA.md`), écrans dans `apps/dashboard`.
- **État :** première version (PR « identité et stockage ») : registre `observateurs` / `appareils` / `activations` dans NocoDB ou PostgreSQL, pseudonymes `OBS-XXXXXX`, enrôlement par lien/QR à usage unique, révocation par téléphone ou par observateur, expiration par scrutin, numéros chiffrés. Gestion dans NocoDB ([nocodb-registre.md](../nocodb-registre.md)) ou `pnpm observateurs`. Reste : rattacher les numéros WhatsApp/SMS entrants (R1, R2), écran dans le dashboard. **Testé en ligne** en novembre 2026 avec un registre PostgreSQL (activation par lien, envoi rattaché au pseudonyme) ; registre NocoDB à tester en ligne.

**Remarques des tests en ligne (novembre 2026)** : création, lien à usage unique, désactivation et expiration fonctionnent, mais la coordination n'a ni écran, ni réactivation, ni révocation par téléphone, ni vue d'ensemble. Elle passe aujourd'hui par un webhook à secret partagé (`curl`) ou par NocoDB.

**Premières tâches**

- [ ] Table et import CSV
- [ ] Liste blanche des numéros (messages d'inconnus mis à part)
- [ ] Chiffrement des numéros (S3)
- [ ] Écran « Observateurs » dans le dashboard : liste (pseudonyme, bureau, statut, téléphones activés, dernier envoi), sans donnée nominative
- [ ] Actions : créer + QR, nouveau lien, **réactiver** un observateur désactivé (aujourd'hui il faut en créer un nouveau), **révoquer un seul téléphone** (aujourd'hui seulement en base)
- [ ] Route de lecture protégée de l'état du registre (aujourd'hui aucune)
- [ ] QR imprimables en lot (fiche par bureau) ; import CSV depuis l'écran
- [ ] Affectation à un bureau **du référentiel S6** (aujourd'hui `bureau_vote` en texte libre)
- [ ] Envoi du lien par SMS ou WhatsApp, en option (réutilise les fournisseurs de D3, R1, R2)


Suivi : [issues `[R5]`](https://github.com/AfricTivistes/jokkoondiral/issues?q=is%3Aissue+%22%5BR5%5D%22) · titre d'issue : `[R5] <tâche>`


---
[← Catalogue des outils](./README.md) · [Matrice besoins × outils](../BESOINS.md#matrice-besoins--outils) · [Phasage](../ROADMAP.md)
