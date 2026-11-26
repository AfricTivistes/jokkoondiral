// Adaptateur PostgreSQL classique (sans NocoDB) : signalements et registre des observateurs.
//
// DATABASE_URL           postgres://jk_collecte@db.mon-osc.org:5432/jokkoondiral
// PGPASSWORD(_FILE)      mot de passe du rôle (de préférence dans un fichier secret)
// PG_CA_CERT_FILE        certificat de l'autorité du serveur (sinon : autorités système)
//
// Base distante : TLS obligatoire et certificat vérifié (équivalent sslmode=verify-full).
// Rôle à droits minimaux : infra/postgres/roles/jk_collecte.sql.

import { readFileSync } from 'node:fs';
import { estHoteInterne, lireSecret, tlsDesactiveAutorise } from './securite';
import type { Activation, Appareil, DepotSignalements, EtatDepot, Observateur, Registre } from './types';

/** Interface minimale commune à pg.Pool et à PGlite (tests) : le même SQL tourne dans les deux. */
export interface Requeteur {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

/** Options de connexion `pg`, avec TLS imposé pour un hôte distant. */
export function optionsConnexion(env: NodeJS.ProcessEnv) {
  const brute = env.DATABASE_URL;
  if (!brute) throw new Error('DATABASE_URL manquant');
  const url = new URL(brute);
  const sslmode = url.searchParams.get('sslmode');
  url.searchParams.delete('sslmode'); // le TLS est réglé ci-dessous, pas par la chaîne de connexion
  const distant = !estHoteInterne(url.hostname);
  const ca = env.PG_CA_CERT_FILE ? readFileSync(env.PG_CA_CERT_FILE, 'utf8') : undefined;
  let ssl: false | { rejectUnauthorized: true; ca?: string; servername: string } = false;
  if (distant || ca || (sslmode && sslmode !== 'disable')) {
    if (sslmode === 'disable' && !tlsDesactiveAutorise(env)) throw new Error('DATABASE_URL : sslmode=disable interdit pour une base distante');
    if (sslmode !== 'disable') ssl = { rejectUnauthorized: true, ca, servername: url.hostname };
  }
  if (distant && !ssl && !tlsDesactiveAutorise(env)) throw new Error('DATABASE_URL : TLS obligatoire pour une base distante');
  return {
    connectionString: url.toString(),
    password: lireSecret(env, 'PGPASSWORD'),
    ssl,
    max: Number(env.PG_POOL_MAX || 5),
    connectionTimeoutMillis: 10000,
    statement_timeout: 15000,
    application_name: 'jokkoondiral-webhooks',
  };
}

export async function creerRequeteur(env: NodeJS.ProcessEnv): Promise<Requeteur> {
  const { Pool } = await import('pg');
  return new Pool(optionsConnexion(env)) as unknown as Requeteur;
}

const NOM_COLONNE = /^[a-z_][a-z0-9_]*$/;
const JSONB = new Set(['extra']);

export class DepotPostgres implements DepotSignalements {
  readonly nom = 'postgres' as const;
  readonly peutRetrouver = true;
  constructor(private db: Requeteur) {}
  async trouver(instanceID: string) {
    const { rows } = await this.db.query<{ numero_suivi: string }>('SELECT numero_suivi FROM base_reports WHERE instance_id = $1 LIMIT 1', [instanceID]);
    return rows[0] ?? null;
  }
  async enregistrer(ligne: Record<string, unknown>) {
    const colonnes = Object.keys(ligne).filter((k) => ligne[k] !== undefined);
    for (const c of colonnes) if (!NOM_COLONNE.test(c)) throw new Error(`colonne refusée : ${c}`);
    const valeurs = colonnes.map((c) => (JSONB.has(c) && ligne[c] !== null ? JSON.stringify(ligne[c]) : ligne[c]));
    const marques = colonnes.map((c, i) => (JSONB.has(c) ? `$${i + 1}::jsonb` : `$${i + 1}`));
    // ON CONFLICT : un renvoi simultané du même signalement ne crée jamais de doublon.
    await this.db.query(
      `INSERT INTO base_reports (${colonnes.map((c) => `"${c}"`).join(', ')}) VALUES (${marques.join(', ')}) ON CONFLICT (instance_id) WHERE instance_id IS NOT NULL DO NOTHING`,
      valeurs,
    );
  }
  async verifier(): Promise<EtatDepot> {
    try {
      await this.db.query('SELECT 1 FROM base_reports LIMIT 1');
      return { nom: 'postgres', role: 'signalements', ok: true };
    } catch (e) {
      return { nom: 'postgres', role: 'signalements', ok: false, detail: (e as Error).message };
    }
  }
}

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v === null || v === undefined ? null : String(v));

const versObservateur = (r: Record<string, unknown>): Observateur => ({
  id: String(r.id),
  code: String(r.code),
  bureau_vote: (r.bureau_vote as string) ?? null,
  actif: Boolean(r.actif),
  expire_le: iso(r.expire_le),
  telephone_chiffre: (r.telephone_chiffre as string) ?? null,
  lien_activation: (r.lien_activation as string) ?? null,
  generer_lien: Boolean(r.generer_lien),
});

export class RegistrePostgres implements Registre {
  readonly nom = 'postgres' as const;
  constructor(private db: Requeteur) {}
  async observateurParId(id: string) {
    const { rows } = await this.db.query('SELECT * FROM observateurs WHERE id = $1', [id]);
    return rows[0] ? versObservateur(rows[0]) : null;
  }
  async observateurParCode(code: string) {
    const { rows } = await this.db.query('SELECT * FROM observateurs WHERE code = $1', [code]);
    return rows[0] ? versObservateur(rows[0]) : null;
  }
  async creerObservateur(o: Observateur) {
    await this.db.query(
      'INSERT INTO observateurs (id, code, bureau_vote, actif, expire_le, telephone_chiffre) VALUES ($1, $2, $3, $4, $5, $6)',
      [o.id, o.code, o.bureau_vote ?? null, o.actif, o.expire_le ?? null, o.telephone_chiffre ?? null],
    );
  }
  async ecrireLien(id: string, lien: string | null) {
    await this.db.query('UPDATE observateurs SET lien_activation = $2, generer_lien = false WHERE id = $1', [id, lien]);
  }
  async desactiverObservateur(id: string) {
    await this.db.query('UPDATE observateurs SET actif = false, lien_activation = NULL WHERE id = $1', [id]);
  }
  async appareil(id: string) {
    const { rows } = await this.db.query('SELECT * FROM appareils WHERE id = $1', [id]);
    const r = rows[0];
    if (!r) return null;
    return {
      id: String(r.id),
      observateur_id: String(r.observateur_id),
      empreinte: String(r.empreinte),
      cree_le: iso(r.cree_le)!,
      dernier_usage: iso(r.dernier_usage),
      revoque_le: iso(r.revoque_le),
    } satisfies Appareil;
  }
  async creerAppareil(a: Appareil) {
    await this.db.query('INSERT INTO appareils (id, observateur_id, empreinte, cree_le) VALUES ($1, $2, $3, $4)', [a.id, a.observateur_id, a.empreinte, a.cree_le]);
  }
  async toucherAppareil(id: string, quand: string) {
    await this.db.query('UPDATE appareils SET dernier_usage = $2 WHERE id = $1', [id, quand]);
  }
  async creerActivation(a: Activation) {
    await this.db.query('INSERT INTO activations (empreinte, observateur_id, expire_le) VALUES ($1, $2, $3)', [a.empreinte, a.observateur_id, a.expire_le]);
  }
  async consommerActivation(empreinte: string, quand: string) {
    // Mise à jour conditionnelle atomique : un lien ne peut activer qu'un seul téléphone.
    const { rows } = await this.db.query(
      'UPDATE activations SET utilise_le = $2 WHERE empreinte = $1 AND utilise_le IS NULL AND expire_le > $2 RETURNING empreinte, observateur_id, expire_le, utilise_le',
      [empreinte, quand],
    );
    const r = rows[0];
    return r ? { empreinte: String(r.empreinte), observateur_id: String(r.observateur_id), expire_le: iso(r.expire_le)!, utilise_le: iso(r.utilise_le) } : null;
  }
  async verifier(): Promise<EtatDepot> {
    try {
      await this.db.query('SELECT 1 FROM observateurs LIMIT 1');
      await this.db.query('SELECT 1 FROM appareils LIMIT 1');
      await this.db.query('SELECT 1 FROM activations LIMIT 1');
      return { nom: 'postgres', role: 'registre', ok: true };
    } catch (e) {
      return { nom: 'postgres', role: 'registre', ok: false, detail: (e as Error).message };
    }
  }
}
