-- =============================================================
-- Jokkoondiral – Registre des observateurs (outil R5, socles S1/S3)
-- =============================================================
-- Identification par appareil : la coordination enrôle un observateur
-- (pseudonyme, jamais de nom), lui remet un lien à usage unique ; son
-- téléphone reçoit une clé propre dont la base ne garde que l'empreinte.
-- Utilisé avec REGISTRE_OBSERVATEURS=postgres (ou par NocoDB branché
-- sur cette base : voir docs/nocodb-registre.md).
-- Idempotent : peut être rejoué sur une base existante.
-- =============================================================

CREATE TABLE IF NOT EXISTS observateurs (
    id                UUID PRIMARY KEY,
    -- Pseudonyme remis à l'observateur (OBS-XXXXXX). Aucune colonne de nom, volontairement.
    code              VARCHAR(16) NOT NULL UNIQUE,
    bureau_vote       VARCHAR(100),
    actif             BOOLEAN NOT NULL DEFAULT true,
    -- Fin de validité (ex. fin du scrutin) : au-delà, tous ses téléphones sont refusés.
    expire_le         TIMESTAMP WITH TIME ZONE,
    -- Numéro chiffré par le serveur (AES-256-GCM) ; illisible sans JK_SECRET.
    telephone_chiffre TEXT,
    -- Case cochée par la coordination dans NocoDB pour demander un lien (webhook).
    generer_lien      BOOLEAN NOT NULL DEFAULT false,
    -- Lien d'activation à usage unique (48 h), effacé dès qu'il a servi.
    lien_activation   TEXT,
    cree_le           TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS appareils (
    id              UUID PRIMARY KEY,
    observateur_id  UUID NOT NULL REFERENCES observateurs(id),
    -- HMAC-SHA256 du secret de l'appareil : le secret n'est jamais stocké.
    empreinte       CHAR(64) NOT NULL,
    cree_le         TIMESTAMP WITH TIME ZONE NOT NULL,
    dernier_usage   TIMESTAMP WITH TIME ZONE,
    -- Renseigner cette date suffit à refuser ce téléphone (perdu, saisi).
    revoque_le      TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_appareils_observateur ON appareils(observateur_id);

CREATE TABLE IF NOT EXISTS activations (
    -- HMAC-SHA256 du jeton du lien : le jeton n'est jamais stocké.
    empreinte       CHAR(64) PRIMARY KEY,
    observateur_id  UUID NOT NULL REFERENCES observateurs(id),
    expire_le       TIMESTAMP WITH TIME ZONE NOT NULL,
    utilise_le      TIMESTAMP WITH TIME ZONE
);

-- Chaque signalement indique le téléphone qui l'a envoyé (révocation, enquête en cas d'abus).
ALTER TABLE base_reports ADD COLUMN IF NOT EXISTS appareil_id UUID;

COMMENT ON TABLE observateurs IS 'Registre des observateurs : pseudonymes uniquement, aucune donnée nominative';
COMMENT ON COLUMN observateurs.actif IS 'Décocher pour refuser immédiatement tous les téléphones de cet observateur';
COMMENT ON COLUMN appareils.revoque_le IS 'Renseigner pour refuser ce téléphone seul';
