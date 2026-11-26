# 🧾 Protocoles et extensions : ajouter des champs sans code

Le formulaire de signalement (outil [C1](./outils/collecte.md#c1)) est décrit par un **protocole JSON**. Une OSC qui a besoin d'une question en plus (région, nombre de personnes touchées, catégorie locale…) écrit une **extension** : un petit fichier JSON, sans toucher au code. La PWA, le serveur et le formulaire Kobo la prennent en compte tous les trois.

## Le principe : un noyau commun + des ajouts

| | Noyau (`incident-electoral.json`) | Extension (`extensions/<nom>.json`) |
|---|---|---|
| Qui l'écrit | Le projet Jokkoondiral (méthodologie commune) | Une OSC, un pays, un scrutin |
| Ce qu'il contient | Lieu, moment, catégorie, gravité, description, source, confiance, photo | Des champs, des options ou des sections **en plus** |
| Peut être modifié par l'autre ? | — | **Non** : une extension n'enlève ni ne renomme rien du noyau |
| Où vont les réponses | Colonnes de `base_reports` | Colonne `extra` (JSON) |

Pourquoi ? Le noyau garantit que les signalements de toutes les OSC restent **comparables** (même catégorie, même gravité). Les extensions donnent la souplesse locale.

## Écrire une extension en 4 étapes

1. **Créer le fichier** `packages/protocole/protocoles/extensions/mon-osc.json` (ou `config/protocoles/extensions/` à côté de votre `instance.json`, pour une configuration propre à votre déploiement) :

   ```json
   {
     "id": "mon_osc",
     "version": "1.0.0",
     "pour": "incident_electoral",
     "ajouts": []
   }
   ```

2. **Ajouter ce dont vous avez besoin** dans `ajouts` (voir les trois types ci-dessous).
3. **L'activer** dans `apps/collect/config/instance.json` : `"extensions": ["mon-osc"]` (nom du fichier, sans `.json`).
4. **Vérifier** : `pnpm --filter collect build`. Une erreur (champ inconnu, liste fermée, condition invalide) arrête le build avec un message clair. Puis régénérer le formulaire Kobo si vous l'utilisez : `pnpm --filter @jokkoondiral/protocole xlsform -- incident-electoral mon-osc`.

Exemple complet et fonctionnel : [`extensions/exemple-senegal.json`](../packages/protocole/protocoles/extensions/exemple-senegal.json).

## Les trois types d'ajout

**Des champs dans une section existante** (`apres` : après quel champ ; sans `apres`, à la fin de la section) :

```json
{ "type": "champs", "section": "lieu", "apres": "lieu", "champs": [
  { "id": "region", "type": "choix", "obligatoire": false,
    "question": { "fr": "Région", "en": "Region" },
    "options": [ { "v": "dakar", "label": "Dakar" }, { "v": "thies", "label": "Thiès" } ] }
] }
```

**Des options dans une liste ouverte** (seules les listes marquées `"ouverte": true` dans le noyau l'acceptent ; aujourd'hui : `categorie`) :

```json
{ "type": "options", "champ": "categorie", "options": [
  { "v": "carte_electeur", "code": "CAR", "label": { "fr": "Carte d'électeur refusée", "en": "Voter card refused" } }
] }
```

**Une nouvelle section** (`apres` : après quelle section) :

```json
{ "type": "section", "apres": "source", "section": { "id": "temoins", "titre": "Témoins", "champs": [ … ] } }
```

## Référence d'un champ

| Clé | Obligatoire | Rôle |
|---|---|---|
| `id` | oui | Minuscules, chiffres, `_`. **Ne plus le changer** une fois la collecte lancée |
| `type` | oui | `choix`, `choix_multiple`, `compteur`, `texte`, `texte_long`, `date_heure`, `lieu`, `photo` |
| `question` | oui | Texte ou `{ "fr": "…", "en": "…" }` |
| `aide` | | Précision sous la question |
| `obligatoire` | | `true` par défaut |
| `options` | pour les choix | `[{ "v": "valeur", "label": …, "aide": …, "code": "SMS", "exclusive": true }]` |
| `si` | | Condition d'affichage, ex. `gravite == 'critique'` |
| `valide` | | Règle, ex. `valeur <= 500` ; `message_valide` pour le message |
| `min`, `max` | | Bornes d'un compteur ; nombre maximal de photos |
| `max_longueur` | | Longueur maximale d'un texte |

Expressions (`si`, `valide`) : nombres, `'textes'`, identifiants de champs **précédents**, `== != > >= < <=`, `and`, `or`, `not(…)`, `selected(champ, 'v')`, `count(champ)`, `sum(…)`, `round(…)`. Dans une extension, nommez vos propres champs sans préfixe : le moteur les renomme `x_<extension>_<id>` automatiquement.

## Ce qu'une extension ne peut pas faire

- retirer, renommer ou déplacer un champ du noyau ;
- ajouter des options à une liste fermée (ex. `gravite`) ;
- écrire dans une colonne de la base (ses réponses vont dans `extra`).

Si le noyau lui-même doit changer (nouvelle catégorie pour tous, nouvelle gravité), c'est une décision de méthode : ouvrez une issue `[M3]` et voyez [METHODOLOGY.md](./METHODOLOGY.md).
