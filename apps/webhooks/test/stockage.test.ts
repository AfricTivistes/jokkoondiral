import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { clientNocoDB, DepotNocoDB } from '../src/stockage/nocodb';
import { DepotPostgres, optionsConnexion } from '../src/stockage/postgres';
import { lireSecret, verifierUrlSecurisee } from '../src/stockage/securite';
import { configurerStockage } from '../src/stockage';
import { basePostgres, fauxServeurs, SECRET_TEST } from './aides';

const ligne = (instance: string) => ({
  title: 'Achat de voix — Bureau 3', source: 'web', status: 'pending', instance_id: instance, numero_suivi: 'JK-0A1B2C3D',
  code_collecteur: 'OBS-AAAAAA', categorie: 'achat_voix', gravite: 'moyenne', extra: { x_sn_region: 'dakar' }, latitude: 14.7, longitude: -17.4,
});

test('PostgreSQL : insertion paramétrée, jsonb, dédoublonnage atomique (ON CONFLICT)', async () => {
  const db = await basePostgres();
  const depot = new DepotPostgres(db);
  const id = `uuid:${crypto.randomUUID()}`;
  assert.equal(await depot.trouver(id), null);
  await depot.enregistrer(ligne(id));
  await depot.enregistrer(ligne(id)); // renvoi : aucun doublon, aucune erreur
  const { rows } = await db.query<{ n: number; region: string }>("SELECT count(*)::int AS n, max(extra->>'x_sn_region') AS region FROM base_reports");
  assert.equal(rows[0].n, 1);
  assert.equal(rows[0].region, 'dakar');
  assert.deepEqual(await depot.trouver(id), { numero_suivi: 'JK-0A1B2C3D' });
  await assert.rejects(depot.enregistrer({ ...ligne(`uuid:${crypto.randomUUID()}`), 'nom"; DROP TABLE x;--': 1 }), /colonne refusée/);
  assert.equal((await depot.verifier()).ok, true);
  await db.close();
});

test('NocoDB : retrouve et enregistre via l\'API, le jeton reste côté serveur', async () => {
  const s = fauxServeurs();
  const depot = new DepotNocoDB(clientNocoDB({ NOCODB_API_URL: 'http://nocodb:8080/api/v1/db/data/v1/jk', NOCODB_API_TOKEN: 'jeton' }, s.f));
  const id = `uuid:${crypto.randomUUID()}`;
  await depot.enregistrer(ligne(id));
  assert.deepEqual(await depot.trouver(id), { numero_suivi: 'JK-0A1B2C3D' });
  assert.equal((await depot.verifier()).ok, true);
});

test('accès distant : HTTPS obligatoire, sauf réseau interne ou dérogation explicite', () => {
  assert.doesNotThrow(() => verifierUrlSecurisee('https://nocodb.osc.org/api', 'X', {}));
  assert.doesNotThrow(() => verifierUrlSecurisee('http://localhost:8080/api', 'X', {}));
  assert.doesNotThrow(() => verifierUrlSecurisee('http://nocodb:8080/api', 'X', {}), 'service Docker interne');
  assert.throws(() => verifierUrlSecurisee('http://nocodb.osc.org/api', 'X', {}), /HTTPS obligatoire/);
  assert.doesNotThrow(() => verifierUrlSecurisee('http://nocodb.osc.org/api', 'X', { AUTORISER_SANS_TLS: '1' }));
  assert.throws(() => clientNocoDB({ NOCODB_API_URL: 'http://app.nocodb.com/api/v1/db/data/noco/p1' }), /HTTPS obligatoire/);
});

test('PostgreSQL distant : TLS vérifié imposé, sslmode=disable refusé', () => {
  const o = optionsConnexion({ DATABASE_URL: 'postgres://jk_collecte@db.osc.org:5432/jk' });
  const ssl = o.ssl as { rejectUnauthorized: boolean; servername: string };
  assert.deepEqual({ r: ssl.rejectUnauthorized, s: ssl.servername }, { r: true, s: 'db.osc.org' });
  assert.throws(() => optionsConnexion({ DATABASE_URL: 'postgres://u@db.osc.org/jk?sslmode=disable' }), /interdit/);
  assert.equal(optionsConnexion({ DATABASE_URL: 'postgres://u@postgres:5432/jk' }).ssl, false, 'réseau Docker interne');
});

test('secrets lus depuis un fichier (*_FILE), jamais affichés', () => {
  const f = join(mkdtempSync(join(tmpdir(), 'jk-secret-')), 'jeton');
  writeFileSync(f, 'depuis-fichier\n');
  assert.equal(lireSecret({ NOCODB_API_TOKEN_FILE: f, NOCODB_API_TOKEN: 'ignore' }, 'NOCODB_API_TOKEN'), 'depuis-fichier');
  assert.equal(lireSecret({ NOCODB_API_TOKEN: 'direct' }, 'NOCODB_API_TOKEN'), 'direct');
  assert.throws(() => lireSecret({ X_FILE: '/inexistant' }, 'X'), /illisible/);
});

test('configuration : combinaisons refusées avec un message clair', async () => {
  const base = { JK_SECRET: SECRET_TEST, NOCODB_API_URL: 'http://localhost:8080/api', NOCODB_API_TOKEN: 't' };
  const s = fauxServeurs();
  await assert.rejects(configurerStockage({ ...base, STOCKAGE_SIGNALEMENTS: 'mongodb' }, { fetch: s.f }), /inconnu/);
  await assert.rejects(configurerStockage({ ...base, STOCKAGE_SIGNALEMENTS: 'kobo', KOBO_SUBMISSION_URL: 'https://kobo.test/s', KOBO_FORM_ID: 'f', KOBO_TOKEN: 'k' }, { fetch: s.f }), /registre des observateurs/);
  await assert.rejects(configurerStockage({ ...base, JK_SECRET: 'court' }, { fetch: s.f }), /32 caractères/);
  await assert.rejects(configurerStockage({ ...base, STOCKAGE_COPIES: 'nocodb' }, { fetch: s.f }), /déjà le dépôt principal/);

  const kobo = await configurerStockage({ STOCKAGE_SIGNALEMENTS: 'kobo', IDENTIFICATION: 'codes', KOBO_SUBMISSION_URL: 'https://kobo.test/s', KOBO_FORM_ID: 'f', KOBO_TOKEN: 'k' }, { fetch: s.f });
  assert.equal(kobo.principal.nom, 'kobo');
  assert.ok(kobo.avertissements.some((a) => a.includes('codes partagés')));

  const db = await basePostgres();
  const pg = await configurerStockage({ JK_SECRET: SECRET_TEST, STOCKAGE_SIGNALEMENTS: 'postgres', STOCKAGE_COPIES: 'kobo', KOBO_SUBMISSION_URL: 'https://kobo.test/s', KOBO_FORM_ID: 'f', KOBO_TOKEN: 'jeton-kobo-tres-secret' }, { fetch: s.f, requeteur: db });
  assert.deepEqual([pg.principal.nom, pg.copies.map((c) => c.nom), pg.registre?.nom], ['postgres', ['kobo'], 'postgres']);
  const sante = await pg.sante();
  assert.ok(sante.find((e) => e.role === 'principal')?.ok);
  assert.ok(!JSON.stringify(sante).includes('jeton-kobo-tres-secret') && !JSON.stringify(sante).includes(SECRET_TEST), 'aucun secret dans l\'état de santé');
  await db.close();
});
