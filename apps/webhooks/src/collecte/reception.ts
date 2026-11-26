// Réception des signalements de la PWA de collecte (outil C1).
// Logique indépendante d'Express (dépendances injectées) : testable avec `node --test`.
//
// POST /api/collect                       { code, envoi }  → base_reports (status = pending)
// POST /api/collect/:instanceID/pieces    une photo par requête → disque (amorce du coffre des preuves, M2)

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { champs, libelleOption, verifierEnvoi, type Envoi, type Protocole, type ValeurLieu } from '@jokkoondiral/protocole';
import { codesAutorises } from './configuration';
import { copierVersKobo } from './kobo';

export interface Dependances {
  proto: Protocole;
  env: NodeJS.ProcessEnv;
  fetch: typeof fetch;
  journal?: (message: string) => void;
  maintenant?: () => number;
}

export interface Reponse {
  status: number;
  corps: Record<string, unknown>;
}

const TAILLE_PIECE_MAX = 3 * 1024 * 1024;
const TYPES_PIECE: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const INSTANCE = /^uuid:[0-9a-f-]{36}$/i;
const ID_PIECE = /^[0-9a-f-]{36}$/i;

const nocodb = (env: NodeJS.ProcessEnv) => ({
  url: env.NOCODB_API_URL || 'http://localhost:8080/api/v1/db/data/v1/jokkoondiral',
  jeton: env.NOCODB_API_TOKEN || '',
});

/** Cherche un signalement déjà reçu (dédoublonnage par instanceID). */
async function trouverParInstance(instanceID: string, d: Dependances): Promise<Record<string, unknown> | null> {
  const { url, jeton } = nocodb(d.env);
  const where = encodeURIComponent(`(instance_id,eq,${instanceID})`);
  const rep = await d.fetch(`${url}/base_reports?where=${where}&limit=1`, { headers: { 'xc-token': jeton } });
  if (!rep.ok) throw new Error(`NocoDB ${rep.status}`);
  const donnees = (await rep.json()) as { list?: Record<string, unknown>[] };
  return donnees.list?.[0] ?? null;
}

/** Ligne base_reports : colonnes du noyau (champs « colonne ») + champs d'extension dans `extra`. */
export function versLigne(proto: Protocole, envoi: Envoi, code: string): Record<string, unknown> {
  const r = envoi.reponses;
  const ligne: Record<string, unknown> = {};
  const extra: Record<string, unknown> = {};
  for (const c of champs(proto)) {
    if (!(c.id in r)) continue;
    const v = r[c.id];
    if (c.extension) { extra[c.id] = v; continue; }
    if (!c.colonne) continue;
    ligne[c.colonne] = c.type === 'lieu' ? (v as ValeurLieu).texte : v;
  }
  const lieu = r.lieu as ValeurLieu | undefined;
  const categorie = typeof r.categorie === 'string' ? libelleOption(champs(proto).find((c) => c.id === 'categorie')!, r.categorie) : 'Signalement';
  return {
    ...ligne,
    title: [categorie, lieu?.texte].filter(Boolean).join(' — ').slice(0, 255),
    source: 'web',
    status: 'pending',
    latitude: lieu?.position?.lat ?? null,
    longitude: lieu?.position?.lon ?? null,
    // « En ce moment » : l'heure de l'incident est celle de la fin de saisie.
    heure_declaree: ligne.heure_declaree ?? (r.moment === 'maintenant' ? envoi.fin : null),
    instance_id: envoi.instanceID,
    numero_suivi: envoi.numero_suivi,
    code_collecteur: code,
    protocole: `${envoi.protocole.id}@${envoi.protocole.version}`,
    extensions: (envoi.protocole.extensions || []).join(' ') || null,
    extra: Object.keys(extra).length ? extra : null,
    pieces_attendues: Array.isArray(r.photos) ? r.photos.length : 0,
  };
}

export async function recevoirSignalement(corps: unknown, d: Dependances): Promise<Reponse> {
  const journal = d.journal ?? console.log;
  const codes = codesAutorises(d.env);
  if (!codes.length) return { status: 500, corps: { ok: false, erreur: 'configuration', detail: 'COLLECT_CODES vide' } };
  const { code, envoi } = (corps || {}) as { code?: unknown; envoi?: Envoi };
  const codeNormalise = String(code ?? '').trim().toUpperCase();
  if (!codes.includes(codeNormalise)) return { status: 401, corps: { ok: false, erreur: 'code' } };

  const erreurs = verifierEnvoi(d.proto, envoi as Envoi, d.maintenant?.());
  if (erreurs.length) return { status: 400, corps: { ok: false, erreur: 'soumission', detail: erreurs.slice(0, 5).join(' ; ') } };
  const e = envoi as Envoi;

  try {
    const existant = await trouverParInstance(e.instanceID, d);
    if (existant) return { status: 200, corps: { ok: true, deja_recu: true, numero_suivi: e.numero_suivi } };
    const { url, jeton } = nocodb(d.env);
    const rep = await d.fetch(`${url}/base_reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'xc-token': jeton },
      body: JSON.stringify(versLigne(d.proto, e, codeNormalise)),
    });
    if (!rep.ok) {
      journal(`❌ Collecte : NocoDB a refusé ${e.numero_suivi} (HTTP ${rep.status})`);
      return { status: 502, corps: { ok: false, erreur: 'base', detail: `HTTP ${rep.status}` } };
    }
  } catch (err) {
    journal(`❌ Collecte : base injoignable (${(err as Error).message})`);
    return { status: 503, corps: { ok: false, erreur: 'base_injoignable' } };
  }

  journal(`📥 Collecte : signalement ${e.numero_suivi} enregistré (pending)`);
  // Copie Kobo facultative : son échec n'annule pas la réception.
  const kobo = await copierVersKobo(d.proto, e, codeNormalise, d.env, d.fetch);
  if (kobo.erreur && kobo.erreur !== 'inactif') journal(`⚠️ Collecte : copie Kobo échouée pour ${e.numero_suivi} (${kobo.erreur})`);
  return { status: 201, corps: { ok: true, numero_suivi: e.numero_suivi } };
}

export interface PieceRecue {
  instanceID: string;
  code: string;
  pieceId: string;
  type: string;
  contenu: Buffer;
}

/** Enregistre une photo sur disque avec son empreinte SHA-256 et l'heure de réception serveur. */
export async function recevoirPiece(p: PieceRecue, d: Dependances): Promise<Reponse> {
  if (!codesAutorises(d.env).includes(String(p.code || '').trim().toUpperCase())) return { status: 401, corps: { ok: false, erreur: 'code' } };
  if (!INSTANCE.test(p.instanceID) || !ID_PIECE.test(p.pieceId)) return { status: 400, corps: { ok: false, erreur: 'identifiant' } };
  const extension = TYPES_PIECE[p.type];
  if (!extension) return { status: 415, corps: { ok: false, erreur: 'type' } };
  if (!p.contenu?.length || p.contenu.length > TAILLE_PIECE_MAX) return { status: 413, corps: { ok: false, erreur: 'taille' } };

  try {
    if (!(await trouverParInstance(p.instanceID, d))) return { status: 404, corps: { ok: false, erreur: 'signalement_inconnu' } };
  } catch {
    return { status: 503, corps: { ok: false, erreur: 'base_injoignable' } };
  }

  const dossier = join(d.env.PIECES_DIR || 'pieces', p.instanceID.replace(/^uuid:/, ''));
  const fichier = join(dossier, `${p.pieceId}.${extension}`);
  if (existsSync(fichier)) return { status: 200, corps: { ok: true, deja_recue: true } };
  const empreinte = createHash('sha256').update(p.contenu).digest('hex');
  await mkdir(dossier, { recursive: true });
  await writeFile(fichier, p.contenu);
  await writeFile(`${fichier}.json`, JSON.stringify({
    instance_id: p.instanceID,
    piece_id: p.pieceId,
    type: p.type,
    taille: p.contenu.length,
    sha256: empreinte,
    recue_le: new Date(d.maintenant?.() ?? Date.now()).toISOString(),
  }, null, 2));
  return { status: 201, corps: { ok: true, sha256: empreinte } };
}
