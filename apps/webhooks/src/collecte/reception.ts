// Réception des signalements de la PWA de collecte (outil C1).
// Logique indépendante d'Express et du stockage (dépendances injectées) : testable avec `node --test`.
//
// POST /api/collect                       { envoi }  → dépôt principal (status = pending) + copies
// POST /api/collect/:instanceID/pieces    une photo par requête → disque (amorce du coffre des preuves, M2)
// L'auteur (observateur authentifié) est établi en amont par l'identification (src/identite).

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { champs, libelleOption, verifierEnvoi, type Envoi, type Protocole, type ValeurLieu } from '@jokkoondiral/protocole';
import type { FileCopies } from '../stockage/file-copies';
import type { DepotSignalements } from '../stockage/types';

export interface Auteur {
  observateur_code: string;
  appareil_id?: string;
}

export interface Dependances {
  proto: Protocole;
  principal: DepotSignalements;
  copies: DepotSignalements[];
  file: FileCopies;
  env: NodeJS.ProcessEnv;
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

/** Ligne base_reports : colonnes du noyau (champs « colonne ») + champs d'extension dans `extra`. */
export function versLigne(proto: Protocole, envoi: Envoi, auteur: Auteur): Record<string, unknown> {
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
    // Pseudonyme de l'observateur (OBS-XXXX ou code partagé) : jamais son nom.
    code_collecteur: auteur.observateur_code,
    appareil_id: auteur.appareil_id ?? null,
    protocole: `${envoi.protocole.id}@${envoi.protocole.version}`,
    extensions: (envoi.protocole.extensions || []).join(' ') || null,
    extra: Object.keys(extra).length ? extra : null,
    pieces_attendues: Array.isArray(r.photos) ? r.photos.length : 0,
  };
}

export async function recevoirSignalement(envoi: unknown, auteur: Auteur, d: Dependances): Promise<Reponse> {
  const journal = d.journal ?? console.log;
  const erreurs = verifierEnvoi(d.proto, envoi as Envoi, d.maintenant?.());
  if (erreurs.length) return { status: 400, corps: { ok: false, erreur: 'soumission', detail: erreurs.slice(0, 5).join(' ; ') } };
  const e = envoi as Envoi;
  const ligne = versLigne(d.proto, e, auteur);
  const contexte = { proto: d.proto, envoi: e, observateur_code: auteur.observateur_code };

  try {
    if (d.principal.peutRetrouver && (await d.principal.trouver(e.instanceID))) {
      return { status: 200, corps: { ok: true, deja_recu: true, numero_suivi: e.numero_suivi } };
    }
    await d.principal.enregistrer(ligne, contexte);
  } catch (err) {
    // La PWA garde le signalement en file et réessaiera : aucune perte.
    journal(`❌ Collecte : dépôt ${d.principal.nom} indisponible pour ${e.numero_suivi} (${(err as Error).message})`);
    return { status: 503, corps: { ok: false, erreur: 'base_injoignable' } };
  }
  journal(`📥 Collecte : ${e.numero_suivi} enregistré dans ${d.principal.nom} (pending, ${auteur.observateur_code})`);

  // Copies : un échec n'annule pas la réception ; le signalement entre dans la file de reprise.
  for (const copie of d.copies) {
    try {
      await copie.enregistrer(ligne, contexte);
    } catch (err) {
      await d.file.ajouter(copie.nom, ligne, e, auteur.observateur_code, (err as Error).message);
      journal(`⚠️ Collecte : copie ${copie.nom} différée pour ${e.numero_suivi} (${(err as Error).message})`);
    }
  }
  return { status: 201, corps: { ok: true, numero_suivi: e.numero_suivi } };
}

export interface PieceRecue {
  instanceID: string;
  pieceId: string;
  type: string;
  contenu: Buffer;
}

/** Enregistre une photo sur disque avec son empreinte SHA-256 et l'heure de réception serveur. */
export async function recevoirPiece(p: PieceRecue, auteur: Auteur, d: Dependances): Promise<Reponse> {
  if (!INSTANCE.test(p.instanceID) || !ID_PIECE.test(p.pieceId)) return { status: 400, corps: { ok: false, erreur: 'identifiant' } };
  const extension = TYPES_PIECE[p.type];
  if (!extension) return { status: 415, corps: { ok: false, erreur: 'type' } };
  if (!p.contenu?.length || p.contenu.length > TAILLE_PIECE_MAX) return { status: 413, corps: { ok: false, erreur: 'taille' } };

  if (d.principal.peutRetrouver) {
    try {
      if (!(await d.principal.trouver(p.instanceID))) return { status: 404, corps: { ok: false, erreur: 'signalement_inconnu' } };
    } catch {
      return { status: 503, corps: { ok: false, erreur: 'base_injoignable' } };
    }
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
    observateur_code: auteur.observateur_code,
    recue_le: new Date(d.maintenant?.() ?? Date.now()).toISOString(),
  }, null, 2));
  return { status: 201, corps: { ok: true, sha256: empreinte } };
}
