// Création et mise à jour du schéma PostgreSQL à partir de infra/postgres/*.sql.
// Utile quand la base n'est pas créée par le PostgreSQL du docker-compose (base gérée : Render,
// VPS existant…). Chaque fichier n'est appliqué qu'une fois (table migrations_appliquees),
// dans une transaction. Les scripts eux-mêmes sont idempotents (IF NOT EXISTS).
//
//   MIGRER_AU_DEMARRAGE=1          applique les scripts manquants au démarrage du serveur
//   pnpm --filter webhooks migrer   même chose, à la demande
//   MIGRATIONS_DIR                 dossier des scripts (défaut : infra/postgres du dépôt)

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { Requeteur } from './postgres';

type AvecExec = Requeteur & { exec?: (sql: string) => Promise<unknown> };

function dossierParDefaut(): string {
  let d = resolve(__dirname);
  while (!existsSync(join(d, 'pnpm-workspace.yaml')) && dirname(d) !== d) d = dirname(d);
  return join(d, 'infra/postgres');
}

/** Applique les scripts `NN-nom.sql` pas encore appliqués, dans l'ordre. Renvoie leurs noms. */
export async function migrer(db: AvecExec, dossier = process.env.MIGRATIONS_DIR || dossierParDefaut()): Promise<string[]> {
  const executer = (sql: string) => (db.exec ? db.exec(sql) : db.query(sql));
  await executer('CREATE TABLE IF NOT EXISTS migrations_appliquees (nom VARCHAR(255) PRIMARY KEY, applique_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)');
  const { rows } = await db.query<{ nom: string }>('SELECT nom FROM migrations_appliquees');
  const deja = new Set(rows.map((r) => r.nom));
  const fichiers = readdirSync(dossier).filter((f) => /^\d+-[\w-]+\.sql$/.test(f)).sort();
  const appliquees: string[] = [];
  for (const f of fichiers) {
    if (deja.has(f)) continue;
    const sql = readFileSync(join(dossier, f), 'utf8');
    await executer('BEGIN');
    try {
      await executer(sql);
      await db.query('INSERT INTO migrations_appliquees (nom) VALUES ($1)', [f]);
      await executer('COMMIT');
    } catch (e) {
      await executer('ROLLBACK');
      throw new Error(`Migration ${f} échouée : ${(e as Error).message}`);
    }
    appliquees.push(f);
  }
  return appliquees;
}
