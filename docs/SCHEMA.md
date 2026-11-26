# Schéma de base de données – Jokkoondiral

Ce document décrit le modèle de données actuel et les conventions à suivre pour l'étendre.

---

## Schéma initial (boilerplate)

```sql
Table: base_reports
┌─────────────┬─────────────────────────────────────────┬──────────┐
│ Colonne     │ Type                                    │ Défaut   │
├─────────────┼─────────────────────────────────────────┼──────────┤
│ id          │ SERIAL PRIMARY KEY                      │ auto     │
│ title       │ VARCHAR(255) NOT NULL                   │ —        │
│ description │ TEXT                                    │ null     │
│ source      │ VARCHAR(50) NOT NULL                    │ 'web'    │
│ status      │ VARCHAR(50) NOT NULL                    │ 'pending'│
│ latitude    │ DECIMAL(10,8)                           │ null     │
│ longitude   │ DECIMAL(11,8)                           │ null     │
│ created_at  │ TIMESTAMP WITH TIME ZONE                │ NOW()    │
│ updated_at  │ TIMESTAMP WITH TIME ZONE                │ NOW()    │
└─────────────┴─────────────────────────────────────────┴──────────┘
```

### Valeurs autorisées
- `source` : `'web'` | `'whatsapp'` | `'telegram'` | `'sms'`
- `status` : `'pending'` | `'verified'` | `'rejected'`

---

## Tables métier à créer — par outil

Chaque table du modèle cible est portée par un outil du [catalogue](./outils/README.md). Les schémas ci-dessous sont des **propositions** à affiner dans la PR de l'outil.

| Table / colonne | Outil | Phase | Rôle | État |
|---|---|---|---|---|
| `base_reports` | R1–R3, M1 | MVP | Signalement brut reçu | ✅ existe |
| `election_incidents` (ou colonnes ajoutées à `base_reports`) | [M3](./outils/verification.md#m3) | MVP | Catégorie, gravité, lieu, heure déclarée | proposée ci-dessous |
| `observers` | [R5](./outils/reception.md#r5) | MVP | Registre des observateurs ; numéros chiffrés (S3) | proposée ci-dessous |
| `polling_stations` | [S6](./outils/socles.md#s6) | MVP | Bureaux de vote par pays | proposée ci-dessous |
| `evidences` | [M2](./outils/verification.md#m2) | MVP | Preuves : fichier, type, empreinte SHA-256, horodatage serveur | à concevoir |
| `audit_log` | [M4](./outils/verification.md#m4) | MVP | Journal en ajout seul, alimenté par déclencheurs | à concevoir |
| `incident_categories` | [M3](./outils/verification.md#m3) | MVP | Nomenclature par pays ([METHODOLOGY.md](./METHODOLOGY.md)) | à concevoir |
| `organization_id` sur toutes les tables | [S2](./outils/socles.md#s2) | à poser dès le MVP | Multi-organisations + Row Level Security | à concevoir |
| `elections` (scrutin) | [A4](./outils/analyse.md#a4) | V1 | Clôture, archivage, pseudonymisation | à concevoir |
| `rumors` | [M6](./outils/verification.md#m6) | V2 | Veille désinformation | à concevoir |

> **Protection des observateurs.** Aucune colonne de `observers` ne doit être lisible par `apps/public` ni incluse dans les données ouvertes (D5).

### `election_incidents` (M3 — qualification)
```sql
CREATE TABLE election_incidents (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES base_reports(id),  -- Lien avec le signalement brut
    incident_type VARCHAR(100),  -- ex: 'bureau_ferme', 'violence', 'bourrage_urne'
    region VARCHAR(100),
    commune VARCHAR(100),
    polling_station_code VARCHAR(50),
    severity VARCHAR(20) DEFAULT 'medium',  -- 'low', 'medium', 'high', 'critical'
    verified_by INTEGER,  -- ID du modérateur
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### `polling_stations` (S6 — bureaux de vote)
```sql
CREATE TABLE polling_stations (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    region VARCHAR(100),
    commune VARCHAR(100),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    total_voters INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### `observers` (R5 — observateurs déployés)
```sql
CREATE TABLE observers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE,           -- Numéro WhatsApp/SMS de l'observateur
    telegram_id VARCHAR(50),            -- ID Telegram
    assigned_station_id INTEGER REFERENCES polling_stations(id),
    organization VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## Conventions de nommage

| Élément | Convention | Exemple |
|---------|-----------|---------|
| Tables | `snake_case`, pluriel | `election_incidents` |
| Colonnes | `snake_case` | `created_at` |
| Clés étrangères | `<table_singulier>_id` | `report_id` |
| Index | `idx_<table>_<colonne>` | `idx_reports_status` |
| Contraintes | `ck_<table>_<colonne>` | `ck_reports_status` |

---

## Extensions PostgreSQL utiles

```sql
-- Géolocalisation avancée (distances, zones géographiques)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Recherche full-text en français
CREATE EXTENSION IF NOT EXISTS unaccent;

-- UUID si vous préférez aux SERIAL integers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

---

## NocoDB et l'API automatique

Une fois vos tables créées, NocoDB les détecte automatiquement et génère :
- **API REST :** `GET/POST/PATCH/DELETE /api/v1/db/data/v1/jokkoondiral/<table_name>`
- **API GraphQL :** `/api/v1/db/data/v1/jokkoondiral/graphql`
- **Interface visuelle :** Accessible sur `http://localhost:8080`

Aucun code backend supplémentaire n'est nécessaire pour le CRUD de base. Attention : l'usage direct de cette API par les applications est en révision ([ADR-0002](./decisions/0002-couche-acces-donnees.md)) — ne jamais exposer un jeton NocoDB dans le navigateur.
