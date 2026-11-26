// File de reprise des copies : un signalement qu'une copie (ex. Kobo) n'a pas pu recevoir
// est gardé sur disque et retenté plus tard, avec un délai croissant (1, 2, 4… min, 1 h au plus).
// Le dépôt principal, lui, n'utilise pas cette file : en cas d'échec, la PWA garde le signalement.

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Envoi, Protocole } from '@jokkoondiral/protocole';
import type { DepotSignalements } from './types';

interface Element {
  cible: string;
  ligne: Record<string, unknown>;
  envoi: Envoi;
  observateur_code: string;
  tentatives: number;
  prochain_essai: number;
  derniere_erreur?: string;
}

const DELAI_MAX = 60 * 60 * 1000;

export class FileCopies {
  constructor(private dossier: string, private maintenant: () => number = Date.now) {}

  async ajouter(cible: string, ligne: Record<string, unknown>, envoi: Envoi, observateur_code: string, erreur: string) {
    await mkdir(this.dossier, { recursive: true });
    const e: Element = { cible, ligne, envoi, observateur_code, tentatives: 1, prochain_essai: this.maintenant() + 60_000, derniere_erreur: erreur };
    const nom = `${cible}-${envoi.instanceID.replace(/[^0-9a-z-]/gi, '')}.json`;
    await writeFile(join(this.dossier, nom), JSON.stringify(e));
  }

  async taille(): Promise<number> {
    try {
      return (await readdir(this.dossier)).filter((f) => f.endsWith('.json')).length;
    } catch {
      return 0;
    }
  }

  /** Retente les éléments dus. Renvoie le nombre de copies réussies. */
  async traiter(depots: DepotSignalements[], proto: Protocole, journal: (m: string) => void = () => {}): Promise<number> {
    let fichiers: string[];
    try {
      fichiers = (await readdir(this.dossier)).filter((f) => f.endsWith('.json'));
    } catch {
      return 0;
    }
    let reussies = 0;
    for (const f of fichiers) {
      const chemin = join(this.dossier, f);
      const e = JSON.parse(await readFile(chemin, 'utf8')) as Element;
      if (e.prochain_essai > this.maintenant()) continue;
      const depot = depots.find((d) => d.nom === e.cible);
      if (!depot) continue;
      try {
        await depot.enregistrer(e.ligne, { proto, envoi: e.envoi, observateur_code: e.observateur_code });
        await rm(chemin);
        reussies++;
        journal(`🔁 Copie ${e.cible} réussie pour ${e.envoi.numero_suivi} après ${e.tentatives} tentative(s)`);
      } catch (err) {
        const delai = Math.min(DELAI_MAX, 60_000 * 2 ** e.tentatives);
        await writeFile(chemin, JSON.stringify({ ...e, tentatives: e.tentatives + 1, prochain_essai: this.maintenant() + delai, derniere_erreur: (err as Error).message }));
      }
    }
    return reussies;
  }
}
