import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { nouveauxIdentifiants, type Envoi } from '@jokkoondiral/protocole';
import { chargerProtocole } from '../src/collecte/configuration';
import { recevoirPiece, recevoirSignalement, versLigne, type Dependances } from '../src/collecte/reception';
import { FileCopies } from '../src/stockage/file-copies';
import { DepotNocoDB, clientNocoDB } from '../src/stockage/nocodb';
import { DepotKobo } from '../src/stockage/kobo';
import { fauxServeurs } from './aides';

const proto = chargerProtocole({});
const auteur = { observateur_code: 'OBS-7K2Q9M', appareil_id: '0b6c1c8e-1f4e-4c62-9a3e-1d2b3c4d5e6f' };
const KOBO = { KOBO_SUBMISSION_URL: 'https://kobo.test/submission', KOBO_FORM_ID: 'aB3cD4', KOBO_TOKEN: 'secret' };

function envoi(): Envoi {
  return {
    ...nouveauxIdentifiants(),
    protocole: { id: proto.id, version: proto.version, extensions: [] },
    debut: new Date(Date.now() - 60_000).toISOString(),
    fin: new Date().toISOString(),
    langue: 'fr',
    reponses: {
      lieu: { texte: 'Bureau 7, Thiès', position: { lat: 14.79, lon: -16.93, precision: 8 } },
      moment: 'maintenant',
      categorie: 'materiel',
      gravite: 'moyenne',
      description: 'Pas assez de bulletins.',
      source_information: 'vu',
      confiance: 'sur',
    },
  };
}

function deps(s: ReturnType<typeof fauxServeurs>, env: NodeJS.ProcessEnv = {}, avecKobo = false): Dependances {
  const e = { NOCODB_API_URL: 'http://nocodb:8080/api/v1/db/data/v1/jk', NOCODB_API_TOKEN: 't', ...KOBO, ...env };
  return {
    proto, env: e, journal: () => {},
    principal: new DepotNocoDB(clientNocoDB(e, s.f)),
    copies: avecKobo ? [new DepotKobo(e, s.f)] : [],
    file: new FileCopies(mkdtempSync(join(tmpdir(), 'jk-file-'))),
  };
}

test('un signalement valide est enregistré en « pending » avec le pseudonyme et l\'appareil', async () => {
  const s = fauxServeurs();
  const e = envoi();
  const r = await recevoirSignalement(e, auteur, deps(s));
  assert.equal(r.status, 201);
  assert.equal(r.corps.numero_suivi, e.numero_suivi);
  const l = s.tables.base_reports[0];
  assert.equal(l.status, 'pending');
  assert.equal(l.categorie, 'materiel');
  assert.equal(l.lieu_texte, 'Bureau 7, Thiès');
  assert.equal(l.latitude, 14.79);
  assert.equal(l.code_collecteur, 'OBS-7K2Q9M');
  assert.equal(l.appareil_id, auteur.appareil_id);
  assert.equal(l.heure_declaree, e.fin, '« en ce moment » = heure de fin de saisie');
  assert.match(String(l.title), /Matériel électoral manquant — Bureau 7/);
});

test('un envoi trafiqué est refusé (400) sans rien écrire', async () => {
  const s = fauxServeurs();
  const e = envoi();
  e.reponses.categorie = 'inventee';
  const r = await recevoirSignalement(e, auteur, deps(s));
  assert.equal(r.status, 400);
  assert.match(String(r.corps.detail), /categorie : option/);
  assert.equal(s.tables.base_reports.length, 0);
});

test('un renvoi du même signalement est reconnu sans doublon', async () => {
  const s = fauxServeurs();
  const e = envoi();
  await recevoirSignalement(e, auteur, deps(s));
  const r = await recevoirSignalement(e, auteur, deps(s));
  assert.equal(r.status, 200);
  assert.equal(r.corps.deja_recu, true);
  assert.equal(s.tables.base_reports.length, 1);
});

test('dépôt principal injoignable ou en erreur : 503, la PWA garde le signalement en file', async () => {
  const panne = (async () => { throw new Error('ECONNREFUSED'); }) as typeof fetch;
  assert.equal((await recevoirSignalement(envoi(), auteur, deps({ ...fauxServeurs(), f: panne }))).status, 503);
  assert.equal((await recevoirSignalement(envoi(), auteur, deps(fauxServeurs({ nocodbStatut: 500 })))).status, 503);
});

test('copie Kobo : envoyée si configurée ; en cas d\'échec, mise en file puis reprise', async () => {
  const ok = fauxServeurs();
  assert.equal((await recevoirSignalement(envoi(), auteur, deps(ok, {}, true))).status, 201);
  assert.ok(ok.appels.includes('POST https://kobo.test/submission'));

  const ko = fauxServeurs({ koboStatut: 500 });
  let horloge = Date.now();
  const d = deps(ko, {}, true);
  d.file = new FileCopies(mkdtempSync(join(tmpdir(), 'jk-file-')), () => horloge);
  assert.equal((await recevoirSignalement(envoi(), auteur, d)).status, 201, 'la réception ne dépend pas de la copie');
  assert.equal(await d.file.taille(), 1);
  assert.equal(await d.file.traiter(d.copies, proto), 0, 'pas encore l\'heure de réessayer');
  horloge += 61_000;
  const reparee = deps(fauxServeurs(), {}, true);
  assert.equal(await d.file.traiter(reparee.copies, proto), 1);
  assert.equal(await d.file.taille(), 0);
});

test('les champs d\'extension vont dans `extra`', () => {
  const e = envoi();
  const avecExtension = { ...proto, sections: proto.sections.map((s) => s.id === 'lieu' ? { ...s, champs: [...s.champs, { id: 'x_sn_region', type: 'choix' as const, question: 'Région', options: [{ v: 'dakar', label: 'Dakar' }], extension: 'sn' }] } : s) };
  e.reponses.x_sn_region = 'dakar';
  const l = versLigne(avecExtension, e, auteur);
  assert.deepEqual(l.extra, { x_sn_region: 'dakar' });
  assert.ok(!('x_sn_region' in l));
});

test('une photo est stockée avec son empreinte SHA-256, une seule fois', async () => {
  const s = fauxServeurs();
  const e = envoi();
  const dossier = mkdtempSync(join(tmpdir(), 'jk-pieces-'));
  const d = deps(s, { PIECES_DIR: dossier });
  await recevoirSignalement(e, auteur, d);
  const pieceId = crypto.randomUUID();
  const base = { instanceID: e.instanceID, pieceId, type: 'image/jpeg', contenu: Buffer.from('faux jpeg') };
  const r = await recevoirPiece(base, auteur, d);
  assert.equal(r.status, 201);
  const fichier = join(dossier, e.instanceID.replace('uuid:', ''), `${pieceId}.jpg`);
  assert.ok(existsSync(fichier));
  const meta = JSON.parse(readFileSync(`${fichier}.json`, 'utf8'));
  assert.equal(meta.sha256, r.corps.sha256);
  assert.equal(meta.observateur_code, 'OBS-7K2Q9M');
  assert.equal((await recevoirPiece(base, auteur, d)).corps.deja_recue, true);
  assert.equal((await recevoirPiece({ ...base, type: 'application/pdf' }, auteur, d)).status, 415);
  assert.equal((await recevoirPiece({ ...base, pieceId: '../../etc' }, auteur, d)).status, 400);
  assert.equal((await recevoirPiece({ ...base, instanceID: `uuid:${crypto.randomUUID()}` }, auteur, d)).status, 404);
});
