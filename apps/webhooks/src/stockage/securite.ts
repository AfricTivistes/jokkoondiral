// Accès sécurisé aux bases distantes : secrets lus depuis des fichiers, transport chiffré obligatoire.

import { readFileSync } from 'node:fs';

/**
 * Lit un secret depuis la variable `NOM`, ou depuis le fichier indiqué par `NOM_FILE`
 * (convention des secrets Docker : le secret n'apparaît ni dans l'environnement ni dans `docker inspect`).
 */
export function lireSecret(env: NodeJS.ProcessEnv, nom: string): string | undefined {
  const fichier = env[`${nom}_FILE`];
  if (fichier) {
    try {
      return readFileSync(fichier, 'utf8').trim() || undefined;
    } catch (e) {
      throw new Error(`Secret ${nom}_FILE illisible (${fichier}) : ${(e as Error).message}`);
    }
  }
  const v = env[nom];
  return v ? v.trim() || undefined : undefined;
}

const HOTES_LOCAUX = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/** Hôte local ou nom de service Docker (pas de point : réseau interne du compose). */
export function estHoteInterne(hote: string): boolean {
  return HOTES_LOCAUX.has(hote) || !hote.includes('.');
}

export const tlsDesactiveAutorise = (env: NodeJS.ProcessEnv) => env.AUTORISER_SANS_TLS === '1';

/**
 * Refuse une URL distante sans HTTPS. Le réseau interne (localhost, service Docker) est accepté en HTTP.
 * `AUTORISER_SANS_TLS=1` lève le contrôle (développement uniquement, avertissement au démarrage).
 */
export function verifierUrlSecurisee(url: string, nom: string, env: NodeJS.ProcessEnv): void {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error(`${nom} : URL invalide « ${url} »`);
  }
  if (u.protocol === 'https:') return;
  if (u.protocol !== 'http:') throw new Error(`${nom} : protocole non pris en charge (${u.protocol})`);
  if (estHoteInterne(u.hostname) || tlsDesactiveAutorise(env)) return;
  throw new Error(`${nom} : ${u.hostname} est distant, HTTPS obligatoire (ou AUTORISER_SANS_TLS=1 en développement)`);
}
