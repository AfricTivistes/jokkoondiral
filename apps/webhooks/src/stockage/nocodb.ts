// Adaptateur NocoDB (API REST v1) : signalements (base_reports) et registre des observateurs.
//
// NOCODB_API_URL         ex. https://nocodb.mon-osc.org/api/v1/db/data/v1/jokkoondiral
//                        (NocoDB cloud : https://app.nocodb.com/api/v1/db/data/noco/<id de base>)
// NOCODB_API_TOKEN(_FILE) jeton d'un compte NocoDB DÉDIÉ, éditeur sur cette base seulement.
//
// Les tables peuvent être créées par SQL (infra/postgres) ou dans l'interface NocoDB
// (docs/nocodb-registre.md) : les lignes sont retrouvées par nos propres colonnes, la clé
// primaire NocoDB (Id ou id) n'est utilisée que pour les mises à jour.

import { lireSecret, verifierUrlSecurisee } from './securite';
import type { Activation, Appareil, DepotSignalements, EtatDepot, Observateur, Registre } from './types';

type Ligne = Record<string, unknown>;

export interface ClientNocoDB {
  lister(table: string, where?: Record<string, string>, limite?: number): Promise<Ligne[]>;
  creer(table: string, ligne: Ligne): Promise<void>;
  modifier(table: string, ligne: Ligne, patch: Ligne): Promise<void>;
  sante(): Promise<EtatDepot>;
}

/** Échappe une valeur pour le filtre `where` de NocoDB (virgules et parenthèses interdites). */
const valeurFiltre = (v: string) => {
  if (/[(),~]/.test(v)) throw new Error('valeur de filtre non autorisée');
  return v;
};

export function clientNocoDB(env: NodeJS.ProcessEnv, f: typeof fetch = fetch): ClientNocoDB {
  const base = (env.NOCODB_API_URL || 'http://localhost:8080/api/v1/db/data/v1/jokkoondiral').replace(/\/+$/, '');
  verifierUrlSecurisee(base, 'NOCODB_API_URL', env);
  const jeton = lireSecret(env, 'NOCODB_API_TOKEN') || '';
  const entetes = { 'xc-token': jeton, 'Content-Type': 'application/json' };
  const appel = async (chemin: string, init: RequestInit = {}) => {
    const rep = await f(`${base}/${chemin}`, { ...init, headers: { ...entetes, ...(init.headers || {}) }, signal: AbortSignal.timeout(15000) });
    if (!rep.ok) throw new Error(`NocoDB ${rep.status} sur ${chemin.split('?')[0]}`);
    return rep;
  };
  return {
    async lister(table, where = {}, limite = 1) {
      const conditions = Object.entries(where).map(([k, v]) => `(${k},eq,${valeurFiltre(v)})`).join('~and');
      const q = new URLSearchParams({ limit: String(limite) });
      if (conditions) q.set('where', conditions);
      const donnees = (await (await appel(`${table}?${q}`)).json()) as { list?: Ligne[] };
      return donnees.list || [];
    },
    async creer(table, ligne) {
      await appel(table, { method: 'POST', body: JSON.stringify(ligne) });
    },
    async modifier(table, ligne, patch) {
      const cle = ligne.Id ?? ligne.id;
      if (cle === undefined || cle === null) throw new Error(`NocoDB : clé primaire introuvable dans ${table}`);
      await appel(`${table}/${encodeURIComponent(String(cle))}`, { method: 'PATCH', body: JSON.stringify(patch) });
    },
    async sante() {
      if (!jeton) return { nom: 'nocodb', role: '', ok: false, detail: 'NOCODB_API_TOKEN manquant' };
      try {
        await appel('base_reports?limit=1');
        return { nom: 'nocodb', role: '', ok: true };
      } catch (e) {
        return { nom: 'nocodb', role: '', ok: false, detail: (e as Error).message };
      }
    },
  };
}

export class DepotNocoDB implements DepotSignalements {
  readonly nom = 'nocodb' as const;
  readonly peutRetrouver = true;
  constructor(private client: ClientNocoDB) {}
  async trouver(instanceID: string) {
    const [l] = await this.client.lister('base_reports', { instance_id: instanceID });
    return l ? { numero_suivi: l.numero_suivi as string | undefined } : null;
  }
  async enregistrer(ligne: Ligne) {
    await this.client.creer('base_reports', ligne);
  }
  async verifier() {
    return { ...(await this.client.sante()), role: 'signalements' };
  }
}

const versObservateur = (l: Ligne): Observateur => ({
  id: String(l.observateur_id ?? l.id),
  code: String(l.code),
  bureau_vote: (l.bureau_vote as string) ?? null,
  actif: l.actif === true || l.actif === 1 || l.actif === 'true',
  expire_le: (l.expire_le as string) ?? null,
  telephone_chiffre: (l.telephone_chiffre as string) ?? null,
  lien_activation: (l.lien_activation as string) ?? null,
  generer_lien: l.generer_lien === true || l.generer_lien === 1,
});

/**
 * Registre dans NocoDB. Colonnes attendues (docs/nocodb-registre.md) :
 * observateurs(observateur_id, code, bureau_vote, actif, expire_le, telephone_chiffre, generer_lien, lien_activation)
 * appareils(appareil_id, observateur_id, empreinte, cree_le, dernier_usage, revoque_le)
 * activations(empreinte, observateur_id, expire_le, utilise_le)
 */
export class RegistreNocoDB implements Registre {
  readonly nom = 'nocodb' as const;
  constructor(private client: ClientNocoDB) {}

  private async ligneObservateur(id: string) {
    return (await this.client.lister('observateurs', { observateur_id: id }))[0] ?? null;
  }
  async observateurParId(id: string) {
    const l = await this.ligneObservateur(id);
    return l ? versObservateur(l) : null;
  }
  async observateurParCode(code: string) {
    const [l] = await this.client.lister('observateurs', { code });
    return l ? versObservateur(l) : null;
  }
  async creerObservateur(o: Observateur) {
    const { id, ...reste } = o;
    await this.client.creer('observateurs', { observateur_id: id, ...reste });
  }
  async ecrireLien(id: string, lien: string | null) {
    const l = await this.ligneObservateur(id);
    if (l) await this.client.modifier('observateurs', l, { lien_activation: lien, generer_lien: false });
  }
  async desactiverObservateur(id: string) {
    const l = await this.ligneObservateur(id);
    if (l) await this.client.modifier('observateurs', l, { actif: false, lien_activation: null });
  }
  async appareil(id: string) {
    const [l] = await this.client.lister('appareils', { appareil_id: id });
    if (!l) return null;
    return {
      id: String(l.appareil_id),
      observateur_id: String(l.observateur_id),
      empreinte: String(l.empreinte),
      cree_le: String(l.cree_le),
      dernier_usage: (l.dernier_usage as string) ?? null,
      revoque_le: (l.revoque_le as string) ?? null,
    } satisfies Appareil;
  }
  async creerAppareil(a: Appareil) {
    const { id, ...reste } = a;
    await this.client.creer('appareils', { appareil_id: id, ...reste });
  }
  async toucherAppareil(id: string, quand: string) {
    const [l] = await this.client.lister('appareils', { appareil_id: id });
    if (l) await this.client.modifier('appareils', l, { dernier_usage: quand });
  }
  async creerActivation(a: Activation) {
    await this.client.creer('activations', { ...a });
  }
  async consommerActivation(empreinte: string, quand: string) {
    // NocoDB n'offre pas de mise à jour conditionnelle atomique : un même lien ouvert deux fois
    // à la même seconde pourrait activer deux téléphones (risque faible, signalé dans la doc).
    const [l] = await this.client.lister('activations', { empreinte });
    if (!l || l.utilise_le || Date.parse(String(l.expire_le)) <= Date.parse(quand)) return null;
    await this.client.modifier('activations', l, { utilise_le: quand });
    return { empreinte, observateur_id: String(l.observateur_id), expire_le: String(l.expire_le), utilise_le: quand };
  }
  async verifier() {
    try {
      await this.client.lister('observateurs');
      await this.client.lister('appareils');
      await this.client.lister('activations');
      return { nom: 'nocodb', role: 'registre', ok: true };
    } catch (e) {
      return { nom: 'nocodb', role: 'registre', ok: false, detail: (e as Error).message };
    }
  }
}
