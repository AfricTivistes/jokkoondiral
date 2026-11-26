# ADR-0011 — Stockage interchangeable sécurisé et identification des observateurs par appareil

- **Statut :** acceptée
- **Outils concernés :** R5, S1, S3, C1 (et C7 pour Kobo)
- **Date :** 2026-11-26
- **Tranche en partie :** [ADR-0002](./0002-couche-acces-donnees.md), pour l'**écriture** des signalements

## Contexte

La v0.1 de la collecte (ADR-0010) écrivait en dur dans NocoDB et identifiait les observateurs par une liste de codes partagés : ni identité individuelle, ni révocation d'un téléphone perdu ou saisi. Les OSC veulent choisir leur base (NocoDB, PostgreSQL classique ou KoboToolbox), toujours **distante** et jointe par un **accès sécurisé**. Menaces citées : intimidation (34 OSC), surveillance (25), piratage (22).

## Décision

1. **Deux interfaces** dans `apps/webhooks/src/stockage` : `DepotSignalements` et `Registre` (observateurs). Trois adaptateurs : `nocodb` (défaut), `postgres`, `kobo` (signalements seulement). Le choix se fait par configuration (`STOCKAGE_SIGNALEMENTS`, `STOCKAGE_COPIES`, `REGISTRE_OBSERVATEURS`), sans changement de code.
2. **Le service de réception est le point d'accès unique en écriture** : la PWA ne parle jamais à la base, et aucun jeton ne quitte le serveur.
3. **Accès sécurisé obligatoire** :
   - HTTPS pour NocoDB et Kobo distants ;
   - TLS vérifié pour PostgreSQL distant ;
   - comptes dédiés à droits minimaux ;
   - secrets lus depuis des fichiers (`*_FILE`, secrets Docker).

   Une configuration non sécurisée arrête le démarrage, sauf dérogation explicite de développement (`AUTORISER_SANS_TLS=1`).
4. **Identification par appareil** (`IDENTIFICATION=appareils`) :
   - pseudonyme `OBS-XXXXXX` ;
   - lien d'activation à usage unique, valable 48 h, affiché en QR par NocoDB ;
   - une clé par téléphone, dont seule l'empreinte HMAC est stockée ;
   - révocation par téléphone ou par observateur, expiration par scrutin ;
   - numéro de téléphone facultatif, chiffré en AES-256-GCM.

   Le mode `codes` reste disponible pour le développement.
5. **La coordination gère le registre dans NocoDB** (tableur, import CSV, champ QR). La génération du lien passe par un webhook protégé par un secret partagé ; une commande en ligne (`pnpm observateurs`) sert de repli.
6. Les copies (ex. Kobo) qui échouent sont reprises automatiquement depuis une file sur disque. Un échec du dépôt principal renvoie 503, et la PWA garde le signalement.

## Conséquences

- La lecture par le dashboard (M1, D2) reste à décider : ADR-0002 reste ouverte pour ce volet.
- Avec Kobo en principal, les photos restent sur le serveur et le registre doit vivre dans NocoDB ou PostgreSQL.
- Le registre NocoDB n'offre pas de mise à jour conditionnelle atomique. Un même lien ouvert deux fois à la même seconde pourrait activer deux téléphones ; avec PostgreSQL, la consommation est atomique.
- Une révocation prend effet en 60 s au plus (cache d'authentification).
- Le secret maître `JK_SECRET` doit être sauvegardé hors du serveur : le perdre rend les clés d'appareil et les numéros chiffrés inutilisables. Les observateurs devront alors être réactivés.
