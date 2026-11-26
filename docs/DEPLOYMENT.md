# Guide de Déploiement – Jokkoondiral

Ce guide explique comment déployer Jokkoondiral sur un VPS Linux basique (1-2 Go de RAM).

---

## Prérequis serveur

- **OS :** Ubuntu 22.04 LTS ou Debian 12 (recommandé)
- **RAM :** 1 Go minimum, 2 Go recommandé
- **Stockage :** 20 Go minimum
- **Réseau :** Un nom de domaine pointant vers votre IP (ex: `jokkoondiral.votreOSC.org`)
- **Logiciels :** Docker + Docker Compose (voir ci-dessous)

---

## Étape 1 – Préparer le serveur

```bash
# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer Docker
curl -fsSL https://get.docker.com | bash
sudo usermod -aG docker $USER

# Installer Docker Compose
sudo apt install docker-compose -y

# Vérifier l'installation
docker --version
docker-compose --version
```

---

## Étape 2 – Cloner et configurer

```bash
# Cloner le dépôt sur votre serveur
git clone https://github.com/AfricTivistes/jokkoondiral.git
cd jokkoondiral

# Créer et configurer le fichier .env
cp .env.example .env
nano .env
```

**Variables obligatoires à modifier dans `.env` :**
```
DB_PASSWORD=un_mot_de_passe_solide_12_caracteres_min
JWT_SECRET=une_longue_chaine_aleatoire_ici
DOMAIN=jokkoondiral.votreOSC.org
```

Générer une clé aléatoire solide :
```bash
openssl rand -hex 32
```

---

## Étape 3 – Obtenir les certificats SSL (Let's Encrypt)

Avant de lancer la stack complète, obtenir les certificats SSL :

```bash
# Lancer uniquement Nginx en mode HTTP pour la validation
docker-compose up -d nginx

# Obtenir le certificat (remplacer avec votre vrai domaine et email)
docker run --rm \
  -v "$(pwd)/certbot_certs:/etc/letsencrypt" \
  -v "$(pwd)/certbot_www:/var/www/certbot" \
  certbot/certbot certonly \
  --webroot -w /var/www/certbot \
  -d jokkoondiral.votreOSC.org \
  --email contact@votreOSC.org \
  --agree-tos --no-eff-email
```

---

## Étape 4 – Configurer Nginx

Modifier le fichier `docker/nginx/conf.d/jokkoondiral.conf` :
```bash
# Remplacer "votre-domaine.org" par votre vrai domaine
sed -i 's/votre-domaine.org/jokkoondiral.votreOSC.org/g' docker/nginx/conf.d/jokkoondiral.conf
```

---

## Étape 5 – Lancer la stack complète

```bash
# Construire les images Docker
docker-compose build

# Lancer tous les services
docker-compose up -d

# Vérifier que tout tourne
docker-compose ps

# Consulter les logs en cas de problème
docker-compose logs -f
```

---

## Étape 6 – Configurer NocoDB

1. Ouvrir `https://jokkoondiral.votreOSC.org/nocodb/`
2. Créer un compte administrateur
3. Se connecter à la base PostgreSQL déjà existante
4. Générer un **API Token** dans Paramètres → API Tokens
5. Ajouter ce token dans `.env` : `NOCODB_API_TOKEN=votre_token`
6. Redémarrer les webhooks : `docker-compose restart webhooks`

---

## Étape 7 – Collecte : secrets, identification et base de données

**Secret maître** (empreintes des clés de téléphone, chiffrement des numéros) :

```bash
mkdir -p secrets && openssl rand -base64 48 > secrets/jk_secret && chmod 600 secrets/jk_secret
```

Sauvegardez ce fichier **hors du serveur** : sans lui, les téléphones activés et les numéros chiffrés deviennent inutilisables. Le dossier `secrets/` est ignoré par git.

**Choisir où vont les données** (`.env`, détails dans [ADR-0011](./decisions/0011-acces-aux-donnees-et-identite.md)) :

| Votre situation | Réglage |
|---|---|
| Installation complète du dépôt (PostgreSQL + NocoDB) | `STOCKAGE_SIGNALEMENTS=nocodb` (défaut) |
| Base PostgreSQL existante, sans NocoDB | `STOCKAGE_SIGNALEMENTS=postgres`, `DATABASE_URL`, rôle `infra/postgres/roles/jk_collecte.sql` |
| OSC déjà sur KoboToolbox | `STOCKAGE_SIGNALEMENTS=kobo` + registre `nocodb` ou `postgres` ; ou Kobo en copie : `STOCKAGE_COPIES=kobo` |

**Base distante : accès sécurisé obligatoire.** Le service refuse de démarrer sinon.

- NocoDB ou Kobo distants : **HTTPS** uniquement, avec un compte dédié à droits minimaux (éditeur d'une seule base ; « ajouter des soumissions » pour Kobo).
- PostgreSQL distant : **TLS avec certificat vérifié** (`PG_CA_CERT_FILE` si l'autorité n'est pas publique), rôle `jk_collecte` sans droit de modification ni de suppression, ligne `hostssl` dans `pg_hba.conf`, port 5432 ouvert **uniquement** à l'adresse du serveur Jokkoondiral (pare-feu). Mieux encore : un réseau privé entre les deux machines (WireGuard) ou un tunnel SSH.
- Jetons et mots de passe dans des **fichiers secrets** (`NOCODB_API_TOKEN_FILE`, `PGPASSWORD_FILE`, `KOBO_TOKEN_FILE`), jamais dans le dépôt.
- Rotation : un jeton compromis se révoque dans l'outil concerné (NocoDB, Kobo, PostgreSQL), puis on remplace le fichier et on redémarre `webhooks`.

**Base gérée** (PostgreSQL hors docker-compose : hébergeur, VPS existant) : les scripts `infra/postgres/*.sql` ne s'exécutent pas tout seuls. Mettre `MIGRER_AU_DEMARRAGE=1` (le serveur applique chaque script une seule fois, au démarrage) ou lancer `pnpm --filter webhooks migrer` avec `DATABASE_URL`.

**Vérifier** : `curl https://votre-domaine.org/webhooks/api/collect/sante` donne l'état de chaque base, sans aucun secret.

**Enrôler les observateurs** : voir [nocodb-registre.md](./nocodb-registre.md). Sans NocoDB, utiliser le webhook protégé `{"ajouter": …}` (même guide) ou `pnpm observateurs`.

**Tester avant de déployer** : un environnement de test complet (Netlify + Render) est décrit dans [TESTER_EN_LIGNE.md](./TESTER_EN_LIGNE.md).

## Maintenance

### Mises à jour
```bash
git pull origin main
docker-compose build
docker-compose up -d
```

### Sauvegardes de la base de données
```bash
# Créer une sauvegarde
docker exec jokkoondiral-db pg_dump -U postgres jokkoondiral > backup_$(date +%Y%m%d).sql

# Automatiser avec cron (chaque jour à 3h du matin)
echo "0 3 * * * docker exec jokkoondiral-db pg_dump -U postgres jokkoondiral > /home/ubuntu/backups/backup_$(date +%Y%m%d).sql" | crontab -
```

### Surveillance des ressources
```bash
# Voir la consommation RAM/CPU de chaque conteneur
docker stats
```

---

## Ressources utiles

- [Documentation NocoDB](https://docs.nocodb.com/)
- [Documentation Refine.js](https://refine.dev/docs/)
- [Documentation Astro](https://docs.astro.build/)
- [Africa's Talking (SMS)](https://developers.africastalking.com/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
