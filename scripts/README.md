# ⚙️ Scripts d'Automatisation

**Rôle :** Faciliter la vie des développeurs (Developer Experience).

Lors d'un Tech Camp, le temps est précieux. Ce dossier contient des scripts bash ou Node.js pour automatiser les tâches répétitives.

---

## Scripts disponibles

### `setup.sh` – Initialisation complète
```bash
bash scripts/setup.sh
```
Lance l'installation complète : création du `.env`, installation des dépendances pnpm, démarrage de Docker (PostgreSQL + NocoDB).

---

### `seed.js` – Données de démonstration
```bash
# Après avoir démarré l'infrastructure (pnpm dev:infra) :
pnpm seed

# Ou directement :
node scripts/seed.js
```
Insère 28 signalements fictifs dans NocoDB pour animer la carte et le dashboard lors des démonstrations ou hackathons. Couvre 5 villes (Dakar, Abidjan, Bamako, Cotonou, Lomé), 4 sources (web, telegram, sms, whatsapp) et les 3 statuts (pending, verified, rejected).

**Prérequis :**
1. `pnpm dev:infra` — NocoDB et PostgreSQL doivent être en cours d'exécution
2. `NOCODB_API_TOKEN` doit être défini dans le fichier `.env`

---

### `github/` – Organisation du dépôt GitHub
```bash
pnpm github:labels        # labels domaine:*, phase:*, profil:*, triage (rejouable)
pnpm github:issues-mvp    # jalon MVP + une issue par outil MVP (idempotent, --dry-run possible)
```
Les issues sont générées depuis `github/issues-mvp.json` (fiches de `docs/outils/`). Dans un fork : préfixer par `GH_REPO=votre-org/votre-fork`. Prérequis : `gh auth login`.

---

## Scripts à créer (idéal pour contribuer !)

### `import-kobo` – Import KoBoToolbox / ODK (outil [C7](../docs/outils/collecte.md#c7))
Correspondance des champs XLSForm vers le modèle d'incident, import ponctuel.

### Pseudonymisation et sauvegarde chiffrée (outil [A4](../docs/outils/analyse.md#a4))


### `reset-db.sh` – Réinitialiser la base de données
Utile lors des démonstrations ou pour repartir de zéro. Supprime les données et relance le SQL initial.

---

## Règle

**Si vous tapez une commande longue plus de deux fois, automatisez-la et mettez le script ici !**

Les scripts doivent être documentés avec un commentaire d'en-tête expliquant leur utilité.
