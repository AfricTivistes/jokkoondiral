// Charge le protocole actif à partir de la même configuration que la PWA (apps/collect/config/instance.json) :
// le serveur valide donc exactement le formulaire que les observateurs remplissent.
//
// Variables d'environnement :
//   COLLECT_INSTANCE   chemin de instance.json (défaut : apps/collect/config/instance.json du dépôt)
//   PROTOCOLES_DIR     dossier des protocoles par défaut (défaut : packages/protocole/protocoles)

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { appliquerExtensions, type Extension, type Protocole } from '@jokkoondiral/protocole';

const lire = <T>(chemin: string): T => JSON.parse(readFileSync(chemin, 'utf8')) as T;

/** Racine du monorepo : premier dossier parent qui contient pnpm-workspace.yaml. */
function racineDuDepot(depart: string): string {
  let d = resolve(depart);
  while (!existsSync(join(d, 'pnpm-workspace.yaml'))) {
    const parent = dirname(d);
    if (parent === d) return resolve(depart);
    d = parent;
  }
  return d;
}

export function chargerProtocole(env: NodeJS.ProcessEnv = process.env, racineDepot = racineDuDepot(__dirname)): Protocole {
  const cheminInstance = env.COLLECT_INSTANCE || join(racineDepot, 'apps/collect/config/instance.json');
  const instance = lire<{ protocole: string; extensions?: string[] }>(cheminInstance);
  const dossiers = [join(dirname(cheminInstance), 'protocoles'), env.PROTOCOLES_DIR || join(racineDepot, 'packages/protocole/protocoles')];
  const trouver = (relatif: string) => {
    const f = dossiers.map((d) => join(d, relatif)).find(existsSync);
    if (!f) throw new Error(`Protocole introuvable : ${relatif} (cherché dans ${dossiers.join(', ')})`);
    return f;
  };
  const base = lire<Protocole>(trouver(`${instance.protocole}.json`));
  const extensions = (instance.extensions || []).map((n) => lire<Extension>(trouver(`extensions/${n}.json`)));
  const { protocole, erreurs } = appliquerExtensions(base, extensions);
  if (erreurs.length) throw new Error('Protocole invalide :\n- ' + erreurs.join('\n- '));
  return protocole;
}

/** Codes collecteurs autorisés (en attendant le registre des observateurs, outil R5). */
export const codesAutorises = (env: NodeJS.ProcessEnv = process.env) =>
  String(env.COLLECT_CODES || '').split(',').map((c) => c.trim().replace(/^["']|["']$/g, '').toUpperCase()).filter(Boolean);
