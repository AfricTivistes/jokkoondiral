# Instructions Système pour les Agents IA (Cursor, OpenCode, Claude, etc.)

**Contexte :** Tu travailles sur le projet "Situation Room", une infrastructure open source de Civic Tech pour le monitoring électoral en Afrique. Le Tech Lead est "dofbi" de l'équipe IT AfricTivistes.

**Mission :** Aider les contributeurs à construire les **34 outils** de la Situation Room (codes C1…S7, 6 familles), lors de Tech Camps ou en continu. Les participants ont des niveaux variés (juniors à seniors).

**À lire avant de coder :** la fiche de l'outil concerné dans `docs/outils/`, puis `docs/ARCHITECTURE.md` et les décisions dans `docs/decisions/`. Chaque tâche se rattache à un code d'outil : cite-le dans les commits (`feat(r1): …`), les branches (`feat/r1-…`) et les PR.

---

## Règles absolues

1. **Zéro Cloud Propriétaire :** Ne propose JAMAIS d'utiliser des services comme AWS S3, Vercel, Firebase ou Supabase. Tout doit être conteneurisé (Docker) et auto-hébergé sur un simple VPS Linux.

2. **Frugalité :** L'outil doit être léger. Limite les dépendances npm. Préfère les solutions natives. L'objectif est de fonctionner sur un VPS avec 1-2 Go de RAM.

3. **Structure du monorepo** (ADR-0001) :
   - `apps/public` → Astro (D1 carte publique, D4 rapports, D5 données ouvertes)
   - `apps/dashboard` → Refine.js/React (M1 modération, D2 carte interne, S1 comptes…)
   - `apps/webhooks` → Node.js (R1 WhatsApp, R2 SMS, C3 SMS codé, R3 Telegram, D3 alertes)
   - `packages/shared` → Types et constantes TypeScript
   - Nouvelle app ou package : suivre `docs/AJOUTER_UN_OUTIL.md`, ne pas créer de dossier hors de cette convention.

4. **Base de données :** PostgreSQL 16 administré via NocoDB. Ne propose pas d'ORM lourds (Prisma/TypeORM). La couche d'accès aux données est une **décision ouverte** (ADR-0002 : API métier devant NocoDB recommandée) : ne crée pas de nouvelle API ou de routes CRUD sans validation du Tech Lead, et **n'expose jamais de jeton NocoDB dans le navigateur**.

5. **Code pour les humains :** Le code sera lu et modifié par des développeurs juniors lors de Tech Camps de 5 jours. Commente la logique métier complexe. Utilise des variables explicites (en anglais). Écris de petites fonctions avec un seul rôle.

6. **Types partagés :** Si tu crées de nouveaux types ou interfaces TypeScript, place-les dans `packages/shared/src/types.ts` et exporte-les depuis `packages/shared/src/index.ts`.

7. **Gestionnaire de paquets :** Utilise toujours `pnpm`. Jamais npm ou yarn.

8. **Protection des observateurs :** aucune donnée d'observateur (nom, numéro, identifiant) ne doit sortir vers `apps/public` ou des exports publics. Les numéros sont destinés à être chiffrés en base (S3).

---

## Architecture des API

État actuel (en révision, voir `docs/decisions/0002-couche-acces-donnees.md`) — NocoDB génère automatiquement une API REST depuis la base PostgreSQL. Pour interagir avec les données :
- **NE PAS** créer des routes Express pour des CRUD classiques tant que l'ADR-0002 n'est pas tranchée
- **UTILISER** l'API REST NocoDB : `http://localhost:8080/api/v1/db/data/v1/{table_name}`
- **UTILISER** les hooks Refine.js (`useTable`, `useForm`, `useUpdate`) dans le dashboard

---

## En cas de doute

**En cas de doute sur l'architecture, demande confirmation au Tech Lead avant d'écrire de gros volumes de code.**

Ne présume pas. Demande. Le contexte civique et la rigueur sont plus importants que la vitesse d'exécution.
