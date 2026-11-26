import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { nouveauxIdentifiants, type Envoi } from '@jokkoondiral/protocole';
import { chargerProtocole } from '../src/collecte/configuration';
import { recevoirPiece, recevoirSignalement, versLigne, type Dependances } from '../src/collecte/reception';

const proto = chargerProtocole({});

/** Faux NocoDB (+ faux Kobo) en mémoire, qui note les appels. */
function fauxServeurs(options: { koboStatut?: number; nocodbStatut?: number } = {}) {
  const lignes: Record<string, unknown>[] = [];
  const appels: string[] = [];
  const f = (async (url: string | URL, init?: RequestInit) => {
    const u = String(url);
    appels.push(`${init?.method || 'GET'} ${u}`);
    if (u.startsWith('https://kobo.test')) return new Response('', { status: options.koboStatut ?? 201 });
    if (init?.method === 'POST') {
      if (options.nocodbStatut) return new Response('{}', { status: options.nocodbStatut });
      lignes.push(JSON.parse(String(init.body)));
      return new Response('{}', { status: 200 });
    }
    const id = decodeURIComponent(u).match(/\(instance_id,eq,([^)]+)\)/)?.[1];
    return Response.json({ list: lignes.filter((l) => l.instance_id === id) });
  }) as typeof fetch;
  return { f, lignes, appels };
}

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

const deps = (f: typeof fetch, env: NodeJS.ProcessEnv = {}): Dependances => ({ proto, fetch: f, journal: () => {}, env: { COLLECT_CODES: 'EQ01, eq02', ...env } });

test('un signalement valide est enregistré en « pending » avec ses colonnes', async () => {
  const s = fauxServeurs();
  const e = envoi();
  const r = await recevoirSignalement({ code: 'eq01', envoi: e }, deps(s.f));
  assert.equal(r.status, 201);
  assert.equal(r.corps.numero_suivi, e.numero_suivi);
  const l = s.lignes[0];
  assert.equal(l.status, 'pending');
  assert.equal(l.source, 'web');
  assert.equal(l.categorie, 'materiel');
  assert.equal(l.lieu_texte, 'Bureau 7, Thiès');
  assert.equal(l.latitude, 14.79);
  assert.equal(l.code_collecteur, 'EQ01');
  assert.equal(l.heure_declaree, e.fin, '« en ce moment » = heure de fin de saisie');
  assert.match(String(l.title), /Matériel électoral manquant — Bureau 7/);
});

test('code collecteur absent ou inconnu : 401 ; configuration vide : 500', async () => {
  const s = fauxServeurs();
  assert.equal((await recevoirSignalement({ code: 'XX', envoi: envoi() }, deps(s.f))).status, 401);
  assert.equal((await recevoirSignalement({ envoi: envoi() }, deps(s.f))).status, 401);
  assert.equal((await recevoirSignalement({ code: 'EQ01', envoi: envoi() }, { ...deps(s.f), env: {} })).status, 500);
  assert.equal(s.lignes.length, 0);
});

test('un envoi trafiqué est refusé (400) sans rien écrire', async () => {
  const s = fauxServeurs();
  const e = envoi();
  e.reponses.categorie = 'inventee';
  const r = await recevoirSignalement({ code: 'EQ01', envoi: e }, deps(s.f));
  assert.equal(r.status, 400);
  assert.match(String(r.corps.detail), /categorie : option/);
  assert.equal(s.lignes.length, 0);
});

test('un renvoi du même signalement est reconnu sans doublon', async () => {
  const s = fauxServeurs();
  const e = envoi();
  await recevoirSignalement({ code: 'EQ01', envoi: e }, deps(s.f));
  const r = await recevoirSignalement({ code: 'EQ01', envoi: e }, deps(s.f));
  assert.equal(r.status, 200);
  assert.equal(r.corps.deja_recu, true);
  assert.equal(s.lignes.length, 1);
});

test('base injoignable : 503, la PWA garde le signalement en file', async () => {
  const f = (async () => { throw new Error('ECONNREFUSED'); }) as typeof fetch;
  assert.equal((await recevoirSignalement({ code: 'EQ01', envoi: envoi() }, deps(f))).status, 503);
  const s = fauxServeurs({ nocodbStatut: 500 });
  assert.equal((await recevoirSignalement({ code: 'EQ01', envoi: envoi() }, deps(s.f))).status, 502);
});

test('copie Kobo : envoyée si configurée, son échec ne bloque pas la réception', async () => {
  const kobo = { KOBO_SUBMISSION_URL: 'https://kobo.test/submission', KOBO_FORM_ID: 'aB3cD4', KOBO_TOKEN: 'secret' };
  const ok = fauxServeurs();
  assert.equal((await recevoirSignalement({ code: 'EQ01', envoi: envoi() }, deps(ok.f, kobo))).status, 201);
  assert.ok(ok.appels.some((a) => a === 'POST https://kobo.test/submission'));
  const ko = fauxServeurs({ koboStatut: 500 });
  assert.equal((await recevoirSignalement({ code: 'EQ01', envoi: envoi() }, deps(ko.f, kobo))).status, 201);
  const sansKobo = fauxServeurs();
  await recevoirSignalement({ code: 'EQ01', envoi: envoi() }, deps(sansKobo.f));
  assert.ok(!sansKobo.appels.some((a) => a.includes('kobo')));
});

test('les champs d\'extension vont dans `extra`', () => {
  const e = envoi();
  const avecExtension = { ...proto, sections: proto.sections.map((s) => s.id === 'lieu' ? { ...s, champs: [...s.champs, { id: 'x_sn_region', type: 'choix' as const, question: 'Région', options: [{ v: 'dakar', label: 'Dakar' }], extension: 'sn' }] } : s) };
  e.reponses.x_sn_region = 'dakar';
  const l = versLigne(avecExtension, e, 'EQ01');
  assert.deepEqual(l.extra, { x_sn_region: 'dakar' });
  assert.ok(!('x_sn_region' in l));
});

test('une photo est stockée avec son empreinte SHA-256, une seule fois', async () => {
  const s = fauxServeurs();
  const e = envoi();
  await recevoirSignalement({ code: 'EQ01', envoi: e }, deps(s.f));
  const dossier = mkdtempSync(join(tmpdir(), 'jk-pieces-'));
  const d = deps(s.f, { PIECES_DIR: dossier });
  const pieceId = crypto.randomUUID();
  const contenu = Buffer.from('faux jpeg');
  const base = { instanceID: e.instanceID, code: 'EQ01', pieceId, type: 'image/jpeg', contenu };
  const r = await recevoirPiece(base, d);
  assert.equal(r.status, 201);
  const fichier = join(dossier, e.instanceID.replace('uuid:', ''), `${pieceId}.jpg`);
  assert.ok(existsSync(fichier));
  const meta = JSON.parse(readFileSync(`${fichier}.json`, 'utf8'));
  assert.equal(meta.sha256, r.corps.sha256);
  assert.equal((await recevoirPiece(base, d)).corps.deja_recue, true);
  assert.equal((await recevoirPiece({ ...base, type: 'application/pdf' }, d)).status, 415);
  assert.equal((await recevoirPiece({ ...base, code: 'XX' }, d)).status, 401);
  assert.equal((await recevoirPiece({ ...base, pieceId: '../../etc' }, d)).status, 400);
  assert.equal((await recevoirPiece({ ...base, instanceID: `uuid:${crypto.randomUUID()}` }, d)).status, 404);
});
