import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chiffrer, codeObservateur, dechiffrer, deriverCles, egal } from '../src/identite/crypto';
import { Identite, webhookAutorise } from '../src/identite/identite';
import { clientNocoDB, RegistreNocoDB } from '../src/stockage/nocodb';
import { RegistrePostgres } from '../src/stockage/postgres';
import type { Registre } from '../src/stockage/types';
import { basePostgres, fauxServeurs, SECRET_TEST } from './aides';

test('cryptographie : clés dérivées, chiffrement du téléphone, comparaison en temps constant', () => {
  const cles = deriverCles(SECRET_TEST);
  const c = chiffrer(cles.chiffrement, '+221 77 000 00 00');
  assert.ok(!c.includes('77'), 'le numéro n\'apparaît pas en clair');
  assert.equal(dechiffrer(cles.chiffrement, c), '+221 77 000 00 00');
  assert.throws(() => dechiffrer(deriverCles(SECRET_TEST + 'x').chiffrement, c), 'une autre clé ne déchiffre pas');
  assert.ok(egal('abc', 'abc') && !egal('abc', 'abd') && !egal('abc', 'ab'));
  assert.match(codeObservateur(), /^OBS-[0-9A-HJKMNP-TV-Z]{6}$/);
  assert.throws(() => deriverCles('trop-court'), /32 caractères/);
});

/** Le même scénario contre les deux registres : NocoDB (simulé) et PostgreSQL (réel, PGlite). */
async function scenario(nom: string, fabriquer: () => Promise<{ registre: Registre; fermer: () => Promise<void> }>) {
  test(`identité par appareil (${nom}) : enrôlement, activation unique, envoi, révocation, expiration`, async () => {
    const { registre, fermer } = await fabriquer();
    let horloge = Date.parse('2027-01-24T08:00:00Z');
    const id = new Identite({ mode: 'appareils', registre, env: {}, secret: SECRET_TEST, urlCollecte: 'https://osc.org/collect/', maintenant: () => horloge });

    // 1. Enrôlement : pseudonyme, numéro chiffré, lien à usage unique.
    const { observateur, lien } = await id.creerObservateur({ bureau_vote: 'Bureau 12', telephone: '+221770000000', expire_le: '2027-01-26T00:00:00Z' });
    assert.match(observateur.code, /^OBS-/);
    assert.ok(!(observateur.telephone_chiffre || '').includes('770000000'));
    assert.match(lien, /^https:\/\/osc\.org\/collect\/#activer=[A-Za-z0-9_-]{43}$/);
    assert.equal((await registre.observateurParCode(observateur.code))?.lien_activation, lien, 'lien visible par la coordination (QR NocoDB)');
    const jeton = lien.split('#activer=')[1];

    // 2. Activation : une clé par téléphone, le lien ne sert qu'une fois puis disparaît.
    const act = await id.activer(jeton);
    assert.equal(act.status, 201);
    assert.deepEqual(act.corps.observateur, { code: observateur.code, bureau_vote: 'Bureau 12' });
    assert.equal((await id.activer(jeton)).status, 410, 'lien déjà utilisé');
    assert.equal((await registre.observateurParCode(observateur.code))?.lien_activation, null);
    const entete = `Appareil ${act.corps.appareil_id}.${act.corps.secret}`;

    // 3. Envois : clé valide acceptée ; mauvais secret, format inconnu refusés.
    assert.deepEqual(await id.authentifier(entete), { ok: true, observateur_code: observateur.code, appareil_id: act.corps.appareil_id });
    assert.deepEqual(await id.authentifier(`Appareil ${act.corps.appareil_id}.${'A'.repeat(43)}`), { ok: false, erreur: 'non_active' });
    assert.deepEqual(await id.authentifier(undefined), { ok: false, erreur: 'non_active' });
    assert.deepEqual(await id.authentifier('Code EQ01'), { ok: false, erreur: 'non_active' });

    // 4. Un lien expiré (48 h) ne sert plus.
    const { lien: lien2 } = await id.creerLien(observateur);
    horloge += 49 * 3600 * 1000;
    assert.equal((await id.activer(lien2.split('#activer=')[1])).status, 410);

    // 5. Fin du scrutin : tous les téléphones sont refusés (cache de 60 s dépassé).
    assert.deepEqual(await id.authentifier(entete), { ok: false, erreur: 'expire' });

    // 6. Désactivation par la coordination : effet immédiat.
    const { observateur: o2 } = await id.creerObservateur({ bureau_vote: 'Bureau 4' });
    const { lien: l2 } = await id.creerLien(o2);
    const a2 = await id.activer(l2.split('#activer=')[1]);
    const e2 = `Appareil ${a2.corps.appareil_id}.${a2.corps.secret}`;
    assert.equal((await id.authentifier(e2)).ok, true);
    assert.equal(await id.desactiver(o2.code), true);
    assert.deepEqual(await id.authentifier(e2), { ok: false, erreur: 'inactif' });
    await assert.rejects(id.creerLien({ ...o2, actif: false }), /désactivé/);
    await new Promise((r) => setTimeout(r, 100));
    await fermer();
  });
}

scenario('NocoDB', async () => {
  const s = fauxServeurs();
  return { registre: new RegistreNocoDB(clientNocoDB({ NOCODB_API_URL: 'http://nocodb:8080/api/v1/db/data/v1/jk', NOCODB_API_TOKEN: 't' }, s.f)), fermer: async () => {} };
});

scenario('PostgreSQL', async () => {
  const db = await basePostgres();
  return { registre: new RegistrePostgres(db), fermer: () => db.close() };
});

test('révocation d\'un seul téléphone (PostgreSQL) : les autres appareils de l\'observateur restent valides', async () => {
  const db = await basePostgres();
  const id = new Identite({ mode: 'appareils', registre: new RegistrePostgres(db), env: {}, secret: SECRET_TEST });
  const { observateur, lien } = await id.creerObservateur({});
  const a = await id.activer(lien.split('#activer=')[1]);
  const { lien: lienB } = await id.creerLien(observateur);
  const b = await id.activer(lienB.split('#activer=')[1]);
  await db.query('UPDATE appareils SET revoque_le = now() WHERE id = $1', [a.corps.appareil_id]);
  const neuf = new Identite({ mode: 'appareils', registre: new RegistrePostgres(db), env: {}, secret: SECRET_TEST }); // sans cache
  assert.deepEqual(await neuf.authentifier(`Appareil ${a.corps.appareil_id}.${a.corps.secret}`), { ok: false, erreur: 'revoque' });
  assert.equal((await neuf.authentifier(`Appareil ${b.corps.appareil_id}.${b.corps.secret}`)).ok, true);
  await new Promise((r) => setTimeout(r, 100)); // laisser finir la mise à jour « dernier_usage » faite en arrière-plan
  await db.close();
});

test('webhook NocoDB « générer le lien » : secret obligatoire, lignes cochées seulement', async () => {
  const s = fauxServeurs();
  const registre = new RegistreNocoDB(clientNocoDB({ NOCODB_API_URL: 'http://nocodb:8080/api/v1/db/data/v1/jk', NOCODB_API_TOKEN: 't' }, s.f));
  const id = new Identite({ mode: 'appareils', registre, env: {}, secret: SECRET_TEST });
  const { observateur } = await id.creerObservateur({});
  await registre.ecrireLien(observateur.id, null);
  assert.equal(webhookAutorise('mauvais', 'secret-webhook'), false);
  assert.equal(webhookAutorise(undefined, undefined), false, 'sans secret configuré, le webhook est fermé');
  assert.equal(webhookAutorise('secret-webhook', 'secret-webhook'), true);
  const r = await id.webhookLien({ type: 'records.after.update', data: { rows: [{ code: observateur.code, generer_lien: true }, { code: 'OBS-INCONNU', generer_lien: true }, { code: observateur.code, generer_lien: false }] } });
  assert.equal(r.corps.liens, 1);
  const ajout = await id.webhookLien({ ajouter: { bureau_vote: 'Bureau 9' } });
  assert.equal(ajout.status, 201);
  assert.match(String(ajout.corps.code), /^OBS-/);
  assert.match(String(ajout.corps.lien), /#activer=/);
  assert.equal((await id.webhookLien({ ajouter: { expire_le: 'pas-une-date' } })).status, 400);
  assert.equal((await id.webhookLien({ desactiver: String(ajout.corps.code).toLowerCase() })).status, 200);
  assert.equal((await registre.observateurParCode(String(ajout.corps.code)))?.actif, false);
  assert.equal((await id.webhookLien({ desactiver: 'OBS-INCONNU' })).status, 404);
  const ligne = s.tables.observateurs.find((l) => l.code === observateur.code)!;
  assert.match(String(ligne.lien_activation), /#activer=/);
  assert.equal(ligne.generer_lien, false, 'la case est décochée après génération');
});

test('mode codes partagés : compatible avec l\'ancienne app (code dans le corps ou X-Code-Collecteur)', async () => {
  const id = new Identite({ mode: 'codes', registre: null, env: { COLLECT_CODES: 'EQ01, eq02' } });
  assert.deepEqual(await id.authentifier(undefined, 'eq01'), { ok: true, observateur_code: 'EQ01' });
  assert.deepEqual(await id.authentifier('Code EQ02'), { ok: true, observateur_code: 'EQ02' });
  assert.deepEqual(await id.authentifier(undefined, 'XX'), { ok: false, erreur: 'code' });
  assert.equal((await id.activer('x')).status, 404);
});
