// Aides de test : faux NocoDB (API v1 en mémoire), faux Kobo, vrai PostgreSQL embarqué (PGlite).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import type { Requeteur } from '../src/stockage/postgres';

type Ligne = Record<string, unknown>;

/** Faux serveur NocoDB : GET ?where=(col,eq,val)~and(...), POST, PATCH /table/:Id. Kobo : statut configurable. */
export function fauxServeurs(options: { koboStatut?: number; nocodbStatut?: number } = {}) {
  const tables: Record<string, Ligne[]> = { base_reports: [], observateurs: [], appareils: [], activations: [] };
  const appels: string[] = [];
  let suivant = 1;
  const f = (async (url: string | URL, init?: RequestInit) => {
    const u = new URL(String(url));
    const methode = init?.method || 'GET';
    appels.push(`${methode} ${u.origin}${u.pathname}`);
    if (u.hostname === 'kobo.test') return new Response('', { status: options.koboStatut ?? 201 });
    if (options.nocodbStatut) return new Response('{}', { status: options.nocodbStatut });
    const morceaux = u.pathname.split('/').filter(Boolean);
    const iTable = morceaux.findIndex((m) => m in tables);
    if (iTable < 0) return new Response('{}', { status: 404 });
    const table = tables[morceaux[iTable]];
    if (methode === 'POST') {
      table.push({ Id: suivant++, ...JSON.parse(String(init!.body)) });
      return Response.json({});
    }
    if (methode === 'PATCH') {
      const ligne = table.find((l) => String(l.Id) === morceaux[iTable + 1]);
      if (!ligne) return new Response('{}', { status: 404 });
      Object.assign(ligne, JSON.parse(String(init!.body)));
      return Response.json({});
    }
    const conditions = [...(u.searchParams.get('where') || '').matchAll(/\((\w+),eq,([^)]*)\)/g)];
    const list = table.filter((l) => conditions.every(([, c, v]) => String(l[c]) === v));
    return Response.json({ list: list.slice(0, Number(u.searchParams.get('limit') || 25)) });
  }) as typeof fetch;
  return { f, tables, appels };
}

const sql = (nom: string) => readFileSync(join(__dirname, '../../../infra/postgres', nom), 'utf8');

/** PostgreSQL réel (WASM) initialisé avec les scripts du dépôt : le SQL des adaptateurs est vraiment exécuté. */
export async function basePostgres(): Promise<Requeteur & { close(): Promise<void> }> {
  const db = new PGlite();
  for (const f of ['01-init.sql', '02-collecte.sql', '03-observateurs.sql']) await db.exec(sql(f));
  return db as unknown as Requeteur & { close(): Promise<void> };
}

export const SECRET_TEST = 'secret-de-test-tres-long-pour-hkdf-0123456789';
