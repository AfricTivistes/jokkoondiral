// Applique le schéma PostgreSQL (infra/postgres/*.sql) sur la base indiquée par DATABASE_URL.
//   pnpm --filter webhooks migrer
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { creerRequeteur } from '../src/stockage/postgres';
import { migrer } from '../src/stockage/migrations';

const racine = resolve(__dirname, '../../..');
if (existsSync(join(racine, '.env'))) process.loadEnvFile(join(racine, '.env'));

creerRequeteur(process.env)
  .then(async (db) => {
    const faites = await migrer(db);
    console.log(faites.length ? `Migrations appliquées : ${faites.join(', ')}` : 'Schéma déjà à jour.');
    process.exit(0);
  })
  .catch((e) => {
    console.error(`Erreur : ${(e as Error).message}`);
    process.exit(1);
  });
