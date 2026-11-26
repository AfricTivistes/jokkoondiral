-- =============================================================
-- Jokkoondiral – Colonnes de la collecte guidée (outil C1)
-- =============================================================
-- Ajoute à base_reports les champs du protocole « incident_electoral »
-- (champs du noyau marqués "colonne" dans packages/protocole/protocoles).
-- Les champs ajoutés par une extension vont dans `extra` (jsonb).
--
-- Exécuté automatiquement à la création du volume PostgreSQL.
-- Sur une base existante : psql -f infra/postgres/02-collecte.sql
-- (idempotent : IF NOT EXISTS partout).
-- =============================================================

ALTER TABLE base_reports
    ADD COLUMN IF NOT EXISTS instance_id      VARCHAR(64),
    ADD COLUMN IF NOT EXISTS numero_suivi     VARCHAR(16),
    ADD COLUMN IF NOT EXISTS code_collecteur  VARCHAR(32),
    ADD COLUMN IF NOT EXISTS protocole        VARCHAR(100),
    ADD COLUMN IF NOT EXISTS extensions       TEXT,
    ADD COLUMN IF NOT EXISTS lieu_texte       VARCHAR(255),
    ADD COLUMN IF NOT EXISTS heure_declaree   TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS categorie        VARCHAR(50),
    ADD COLUMN IF NOT EXISTS gravite          VARCHAR(20),
    ADD COLUMN IF NOT EXISTS source_information VARCHAR(20),
    ADD COLUMN IF NOT EXISTS confiance        VARCHAR(20),
    ADD COLUMN IF NOT EXISTS pieces_attendues INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS extra            JSONB;

-- Un même signalement renvoyé (réseau coupé au mauvais moment) ne crée jamais de doublon.
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_instance_id ON base_reports(instance_id) WHERE instance_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reports_gravite ON base_reports(gravite);
CREATE INDEX IF NOT EXISTS idx_reports_categorie ON base_reports(categorie);

COMMENT ON COLUMN base_reports.code_collecteur IS 'Code de l''observateur (jamais son nom). Ne jamais exposer sur le site public.';
COMMENT ON COLUMN base_reports.numero_suivi IS 'Numéro remis à l''observateur (JK-XXXXXXXX)';
COMMENT ON COLUMN base_reports.extra IS 'Réponses aux champs ajoutés par une extension du protocole';
