# 🧾 @jokkoondiral/protocole — moteur de formulaire guidé

**Outils concernés :** [C1](../../docs/outils/collecte.md#c1) (PWA de collecte), [M3](../../docs/outils/verification.md#m3) (qualification), [C3](../../docs/outils/collecte.md#c3) (codes SMS), [C7](../../docs/outils/collecte.md#c7) (KoBo / ODK).

Un **protocole JSON** décrit le formulaire. Le même fichier pilote :

- la **PWA** (`apps/collect`) : une question à la fois, conditions, règles ;
- la **validation serveur** (`apps/webhooks`) : mêmes règles, aucun champ inconnu ou caché accepté ;
- le **XLSForm** pour KoboToolbox / KoboCollect / ODK Collect, et le **XML OpenRosa** de la copie Kobo.

Les trois ne peuvent donc pas diverger. Fonctions pures, sans dépendance, sans DOM.

## Contenu

| Fichier | Rôle |
|---|---|
| `protocoles/incident-electoral.json` | Protocole de base de Jokkoondiral (provisoire) |
| `protocoles/extensions/*.json` | Extensions : champs, catégories ou sections ajoutés sans code |
| `src/expr.ts` | Petit langage d'expressions sûr (`si`, `valide`) + traduction XPath |
| `src/protocole.ts` | Validation, application des extensions |
| `src/moteur.ts` | Navigation question par question, vérification d'un champ, d'un envoi |
| `src/xlsform.ts` | Structure du formulaire Kobo, feuilles XLSForm |
| `src/openrosa.ts` | XML OpenRosa, identifiants (`uuid:…`, `JK-XXXXXXXX`) |
| `kobo/<protocole>/` | XLSForm généré (CSV) |

## Commandes

```bash
pnpm --filter @jokkoondiral/protocole test
pnpm --filter @jokkoondiral/protocole xlsform -- incident-electoral [extension ...]
```

## Types de champ

`choix`, `choix_multiple`, `compteur`, `texte`, `texte_long`, `date_heure` (jamais dans le futur), `lieu` (texte + GPS facultatif), `photo` (facultative, ≤ 3).

## Écrire ou étendre un protocole

Guide pas à pas : [docs/protocoles.md](../../docs/protocoles.md). Décision d'architecture : [ADR-0010](../../docs/decisions/0010-moteur-de-protocole.md).

Origine : réécriture TypeScript du moteur de [dofbi/collecte-guidee](https://github.com/dofbi/collecte-guidee) (AGPL-3.0).
