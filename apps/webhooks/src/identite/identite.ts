// Identification des observateurs (outil R5, socles S1/S3).
//
// Mode « appareils » (recommandé) :
//   1. la coordination crée l'observateur (pseudonyme OBS-XXXX, bureau de vote) et génère un lien à usage unique ;
//   2. l'observateur ouvre le lien : son téléphone reçoit une clé propre (le serveur n'en garde que l'empreinte) ;
//   3. chaque envoi porte « Authorization: Appareil <id>.<secret> » ; un téléphone est révocable seul,
//      un observateur entier en le désactivant, et tout expire à la fin du scrutin.
// Mode « codes » : liste de codes partagés (COLLECT_CODES), pour une petite OSC ou le développement.

import { randomUUID } from 'node:crypto';
import { codesAutorises } from '../collecte/configuration';
import type { Observateur, Registre } from '../stockage/types';
import { aleatoire, chiffrer, codeObservateur, deriverCles, egal, empreinte, type Cles } from './crypto';

export type ModeIdentification = 'appareils' | 'codes';
export type ErreurAuth = 'non_active' | 'revoque' | 'inactif' | 'expire' | 'code';
export type ResultatAuth = { ok: true; observateur_code: string; appareil_id?: string } | { ok: false; erreur: ErreurAuth };

const DUREE_LIEN_MS = 48 * 3600 * 1000;
const DUREE_CACHE_MS = 60 * 1000;
const FORMAT_APPAREIL = /^Appareil ([0-9a-f-]{36})\.([A-Za-z0-9_-]{43})$/;
const FORMAT_JETON = /^[A-Za-z0-9_-]{43}$/;

export interface OptionsIdentite {
  mode: ModeIdentification;
  registre: Registre | null;
  env: NodeJS.ProcessEnv;
  /** Secret maître (JK_SECRET) : obligatoire en mode appareils. */
  secret?: string;
  /** Adresse de la PWA, pour fabriquer les liens d'activation (COLLECT_URL). */
  urlCollecte?: string;
  maintenant?: () => number;
}

export class Identite {
  readonly mode: ModeIdentification;
  private cles: Cles | null = null;
  private cache = new Map<string, { expire: number; resultat: ResultatAuth }>();
  private maintenant: () => number;

  constructor(private o: OptionsIdentite) {
    this.mode = o.mode;
    this.maintenant = o.maintenant ?? Date.now;
    if (o.mode === 'appareils') {
      if (!o.registre) throw new Error('Identification par appareils : un registre (nocodb ou postgres) est requis');
      this.cles = deriverCles(o.secret || '');
    }
  }

  private get registre(): Registre {
    return this.o.registre!;
  }
  private get iso() {
    return new Date(this.maintenant()).toISOString();
  }

  /** Vérifie l'auteur d'un envoi. `codeHerite` : code collecteur envoyé par une ancienne version de l'app. */
  async authentifier(autorisation: string | undefined, codeHerite?: string): Promise<ResultatAuth> {
    if (this.mode === 'codes') {
      const code = String((autorisation?.startsWith('Code ') ? autorisation.slice(5) : codeHerite) ?? '').trim().toUpperCase();
      return code && codesAutorises(this.o.env).includes(code) ? { ok: true, observateur_code: code } : { ok: false, erreur: 'code' };
    }
    const m = FORMAT_APPAREIL.exec(autorisation || '');
    if (!m) return { ok: false, erreur: 'non_active' };
    const [, id, secret] = m;
    const cle = `${id}.${empreinte(this.cles!.poivre, secret)}`;
    const memo = this.cache.get(cle);
    if (memo && memo.expire > this.maintenant()) return memo.resultat;

    const resultat = await this.verifierAppareil(id, secret);
    this.cache.set(cle, { expire: this.maintenant() + DUREE_CACHE_MS, resultat });
    if (resultat.ok) void this.registre.toucherAppareil(id, this.iso).catch(() => {});
    return resultat;
  }

  private async verifierAppareil(id: string, secret: string): Promise<ResultatAuth> {
    const a = await this.registre.appareil(id);
    if (!a || !egal(a.empreinte, empreinte(this.cles!.poivre, secret))) return { ok: false, erreur: 'non_active' };
    if (a.revoque_le) return { ok: false, erreur: 'revoque' };
    const o = await this.registre.observateurParId(a.observateur_id);
    if (!o || !o.actif) return { ok: false, erreur: 'inactif' };
    if (o.expire_le && Date.parse(o.expire_le) <= this.maintenant()) return { ok: false, erreur: 'expire' };
    return { ok: true, observateur_code: o.code, appareil_id: a.id };
  }

  /** Échange un jeton de lien contre une clé d'appareil. Le jeton ne sert qu'une fois. */
  async activer(jeton: unknown): Promise<{ status: number; corps: Record<string, unknown> }> {
    if (this.mode !== 'appareils') return { status: 404, corps: { ok: false, erreur: 'mode_codes' } };
    if (typeof jeton !== 'string' || !FORMAT_JETON.test(jeton)) return { status: 400, corps: { ok: false, erreur: 'jeton' } };
    const activation = await this.registre.consommerActivation(empreinte(this.cles!.poivre, jeton), this.iso);
    if (!activation) return { status: 410, corps: { ok: false, erreur: 'lien_invalide' } };
    const o = await this.registre.observateurParId(activation.observateur_id);
    if (!o || !o.actif || (o.expire_le && Date.parse(o.expire_le) <= this.maintenant())) return { status: 403, corps: { ok: false, erreur: 'inactif' } };
    const appareil = { id: randomUUID(), secret: aleatoire(32) };
    await this.registre.creerAppareil({ id: appareil.id, observateur_id: o.id, empreinte: empreinte(this.cles!.poivre, appareil.secret), cree_le: this.iso });
    await this.registre.ecrireLien(o.id, null); // le lien utilisé disparaît de l'écran de la coordination
    return { status: 201, corps: { ok: true, appareil_id: appareil.id, secret: appareil.secret, observateur: { code: o.code, bureau_vote: o.bureau_vote ?? null } } };
  }

  /** Crée un lien d'activation (48 h, usage unique) et l'écrit dans le registre (champ QR de NocoDB). */
  async creerLien(o: Observateur): Promise<{ lien: string; expire_le: string }> {
    if (this.mode !== 'appareils') throw new Error('Les liens d\'activation n\'existent qu\'en mode appareils');
    if (!o.actif) throw new Error(`${o.code} est désactivé`);
    const jeton = aleatoire(32);
    const expire_le = new Date(this.maintenant() + DUREE_LIEN_MS).toISOString();
    await this.registre.creerActivation({ empreinte: empreinte(this.cles!.poivre, jeton), observateur_id: o.id, expire_le });
    const base = (this.o.urlCollecte || 'http://localhost:5174/').replace(/#.*$/, '');
    const lien = `${base}#activer=${jeton}`;
    await this.registre.ecrireLien(o.id, lien);
    return { lien, expire_le };
  }

  /** Enrôle un observateur (pseudonyme généré) et renvoie son premier lien. */
  async creerObservateur(donnees: { bureau_vote?: string; expire_le?: string; telephone?: string }): Promise<{ observateur: Observateur; lien: string; expire_le: string }> {
    let code = codeObservateur();
    while (await this.registre.observateurParCode(code)) code = codeObservateur();
    const observateur: Observateur = {
      id: randomUUID(),
      code,
      bureau_vote: donnees.bureau_vote || null,
      actif: true,
      expire_le: donnees.expire_le || null,
      telephone_chiffre: donnees.telephone ? chiffrer(this.cles!.chiffrement, donnees.telephone) : null,
    };
    await this.registre.creerObservateur(observateur);
    return { observateur, ...(await this.creerLien(observateur)) };
  }

  /** Désactive un observateur : tous ses téléphones sont refusés (après au plus 60 s de cache). */
  async desactiver(code: string): Promise<boolean> {
    const o = await this.registre.observateurParCode(code);
    if (!o) return false;
    await this.registre.desactiverObservateur(o.id);
    this.cache.clear();
    return true;
  }

  /**
   * Webhook NocoDB « après mise à jour » sur la table observateurs : génère un lien pour chaque ligne
   * où « generer_lien » est cochée. Accepte aussi { "code": "OBS-XXXX" }.
   */
  async webhookLien(corps: unknown): Promise<{ status: number; corps: Record<string, unknown> }> {
    const c = (corps || {}) as {
      code?: string;
      ajouter?: { bureau_vote?: string; expire_le?: string; telephone?: string };
      desactiver?: string;
      data?: { rows?: Record<string, unknown>[] } & Record<string, unknown>;
    };
    // Désactivation directe : { "desactiver": "OBS-XXXXXX" } → tous ses téléphones refusés.
    if (typeof c.desactiver === 'string') {
      const ok = await this.desactiver(c.desactiver.trim().toUpperCase());
      return ok ? { status: 200, corps: { ok: true, desactive: c.desactiver.trim().toUpperCase() } } : { status: 404, corps: { ok: false, erreur: 'observateur_inconnu' } };
    }
    // Enrôlement direct (registre PostgreSQL sans NocoDB, scripts d'administration) :
    // { "ajouter": { "bureau_vote": "…", "expire_le": "2027-01-26T23:59:59Z" } } → pseudonyme + lien.
    if (c.ajouter && typeof c.ajouter === 'object') {
      const a = c.ajouter;
      if (a.expire_le && Number.isNaN(Date.parse(a.expire_le))) return { status: 400, corps: { ok: false, erreur: 'expire_le' } };
      const r = await this.creerObservateur({
        bureau_vote: typeof a.bureau_vote === 'string' ? a.bureau_vote.slice(0, 100) : undefined,
        expire_le: a.expire_le,
        telephone: typeof a.telephone === 'string' ? a.telephone.slice(0, 30) : undefined,
      });
      return { status: 201, corps: { ok: true, code: r.observateur.code, lien: r.lien, expire_le: r.expire_le } };
    }
    const lignes = c.code ? [{ code: c.code, generer_lien: true }] : c.data?.rows ?? (c.data ? [c.data] : []);
    let crees = 0;
    for (const l of lignes) {
      if (!(l.generer_lien === true || l.generer_lien === 1) || typeof l.code !== 'string') continue;
      const o = await this.registre.observateurParCode(l.code);
      if (!o || !o.actif) continue;
      await this.creerLien(o);
      crees++;
    }
    return { status: 200, corps: { ok: true, liens: crees } };
  }
}

/** Vérifie le secret partagé d'un webhook (comparaison en temps constant). */
export const webhookAutorise = (fourni: string | undefined, attendu: string | undefined) =>
  Boolean(attendu && fourni && egal(fourni, attendu));
