# 🔗 Shared Workspace (@situation-room/shared)

**Rôle :** Dans un monorepo, plusieurs applications (`public`, `dashboard`, `webhooks`) partagent la même logique métier. Ce dossier centralise les Types TypeScript et les constantes pour éviter la duplication de code.

---

## 🧰 Outils concernés

[M3](../../docs/outils/verification.md#m3) (modèle d'incident : catégorie, gravité, lieu), [S1](../../docs/outils/socles.md#s1) (rôles `UserRole`), [S4](../../docs/outils/socles.md#s4) (traductions, futur `src/i18n/`), [C1](../../docs/outils/collecte.md#c1) (schéma du formulaire). Une brique partagée plus large (parseur SMS, preuves) devient son propre package `packages/<nom>` — voir [AJOUTER_UN_OUTIL.md](../../docs/AJOUTER_UN_OUTIL.md).

## 📦 Ce que l'on y met

- **`src/types.ts` :** La définition stricte de ce qu'est un "Signalement", un "Utilisateur", un "Rôle".
- **`src/constants.ts` :** Les listes figées (ex: `REPORT_STATUSES`, `SOURCE_LABELS`).
- **`src/index.ts` :** Le barrel export – exporte tout le reste.

---

## 🔧 Comment l'utiliser dans une autre application

Dans le `package.json` de votre application (`apps/public`, `apps/dashboard`...) :
```json
{
  "dependencies": {
    "@situation-room/shared": "workspace:*"
  }
}
```

Puis dans votre code TypeScript :
```typescript
import { BaseReport, REPORT_STATUSES } from '@situation-room/shared';
```

---

## ⚠️ Règle importante

**Si vous modifiez un type ici, l'erreur remontera automatiquement dans toutes les autres applications lors de la compilation TypeScript.** C'est ce qui rend l'architecture robuste et cohérente.

Avant de modifier un type, vérifiez où il est utilisé avec une recherche dans le dépôt.
