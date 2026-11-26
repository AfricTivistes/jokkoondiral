# ADR-0010 — Moteur de protocole, extensions et thèmes pour la collecte (C1)

- **Statut :** acceptée
- **Outils concernés :** C1 (et M3, C3, C7, D1 qui réutiliseront le moteur ou les jetons)
- **Date :** 2026-11-26

## Contexte

L'issue #2 (C1) demande un formulaire de signalement hors ligne. Deux projets du même auteur existaient : `dofbi/collecte-guidee` (PWA sans dépendance, protocole JSON qui génère l'app et le XLSForm Kobo, proxy OpenRosa) et sa variante `dofbi/observatoire-incidents-soins` (logique conditionnelle XLSForm, numéro de suivi, langues). Les OSC veulent pouvoir **ajouter des questions** et **adapter le design** sans développeur. 15 OSC utilisent déjà KoboToolbox.

## Décision

1. **`packages/protocole`** : réécriture TypeScript du moteur de collecte-guidee, pure et testée. Un protocole JSON pilote la PWA, la validation serveur et le XLSForm ; les trois ne peuvent pas diverger.
2. **Noyau + extensions** : le protocole de base (`incident_electoral`) a des champs verrouillés reliés aux colonnes de `base_reports` ; une extension peut seulement **ajouter** (champs, options d'une liste ouverte, sections). Ids préfixés `x_<extension>_`, réponses dans `extra` (jsonb). Les signalements restent comparables entre OSC.
3. **`apps/collect`** : PWA Vite + TypeScript sans framework (≈ 15 Ko gzip), IndexedDB, service worker généré au build.
4. **Thèmes par jetons** : tout le style passe par des variables `--jk-*` générées depuis `config/themes/<nom>/theme.json` ; contrôle WCAG AA au build ; mode sombre dérivé. Jetons et contrôle dans `@jokkoondiral/shared` pour D1 et le dashboard.
5. **Réception** dans `apps/webhooks` (`POST /api/collect`), comme les autres canaux entrants : validation par le moteur, dédoublonnage par `instanceID`, écriture via le jeton NocoDB **côté serveur**. Copie Kobo **facultative** (OpenRosa) ; Jokkoondiral reste la source de vérité.
6. Photos réduites et sans EXIF sur le téléphone ; stockées sur disque avec SHA-256 (amorce de M2, conforme à la recommandation d'ADR-0007).

## Conséquences

- Cette route suit le modèle existant des webhooks (WhatsApp, SMS) ; elle **ne tranche pas** [ADR-0002](./0002-couche-acces-donnees.md). Si une API métier est retenue, `recevoirSignalement` (logique déjà isolée d'Express) y sera déplacée.
- Toute évolution du noyau (catégories, gravités) est une décision de méthode : `docs/METHODOLOGY.md`, issue `[M3]`.
- Les paquets partagés sont des modules ES en TypeScript avec imports `.ts` explicites (Node 22, tsx, Vite, esbuild) ; `apps/webhooks` passe à `tsx` (dev) et `esbuild` (build).
