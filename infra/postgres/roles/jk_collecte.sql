-- =============================================================
-- Rôle PostgreSQL à droits minimaux pour le service de réception
-- (STOCKAGE_SIGNALEMENTS=postgres et/ou REGISTRE_OBSERVATEURS=postgres).
-- =============================================================
-- NON exécuté automatiquement. À lancer une fois, par un administrateur :
--   psql "$ADMIN_DATABASE_URL" -v mdp="'un-mot-de-passe-long'" -f infra/postgres/roles/jk_collecte.sql
-- Puis côté service : DATABASE_URL=postgres://jk_collecte@hote:5432/jokkoondiral
-- et le mot de passe dans PGPASSWORD_FILE (secret Docker), jamais dans le dépôt.
-- =============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'jk_collecte') THEN
    CREATE ROLE jk_collecte LOGIN;
  END IF;
END $$;
ALTER ROLE jk_collecte PASSWORD :mdp;
-- Connexions chiffrées uniquement : à compléter dans pg_hba.conf par une ligne « hostssl ».

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM jk_collecte;

-- Signalements : lire (dédoublonnage) et ajouter. Ni modification, ni suppression.
GRANT SELECT (instance_id, numero_suivi), INSERT ON base_reports TO jk_collecte;
GRANT USAGE ON SEQUENCE base_reports_id_seq TO jk_collecte;

-- Registre : lecture, création d'appareils et d'activations, mises à jour limitées.
GRANT SELECT, INSERT ON observateurs, appareils, activations TO jk_collecte;
GRANT UPDATE (lien_activation, generer_lien, actif) ON observateurs TO jk_collecte;
GRANT UPDATE (dernier_usage) ON appareils TO jk_collecte;
GRANT UPDATE (utilise_le) ON activations TO jk_collecte;
