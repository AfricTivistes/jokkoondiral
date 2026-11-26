// Interfaces de stockage : la réception des signalements et l'identification des observateurs
// ne connaissent que ces contrats ; NocoDB, PostgreSQL et Kobo en sont des implémentations.

import type { Envoi, Protocole } from '@jokkoondiral/protocole';

export interface EtatDepot {
  nom: string;
  role: string;
  ok: boolean;
  detail?: string;
}

/** Contexte complet d'un signalement, utile aux dépôts qui ne stockent pas une simple ligne (Kobo). */
export interface ContexteSignalement {
  proto: Protocole;
  envoi: Envoi;
  observateur_code: string;
}

export interface DepotSignalements {
  readonly nom: 'nocodb' | 'postgres' | 'kobo';
  /** Le dépôt sait-il retrouver un signalement par instanceID ? (Kobo : non, il dédoublonne lui-même.) */
  readonly peutRetrouver: boolean;
  trouver(instanceID: string): Promise<{ numero_suivi?: string } | null>;
  /** Enregistre la ligne ; lève une erreur si le dépôt la refuse ou est injoignable. */
  enregistrer(ligne: Record<string, unknown>, contexte: ContexteSignalement): Promise<void>;
  verifier(): Promise<EtatDepot>;
}

export interface Observateur {
  id: string;
  /** Pseudonyme remis à l'observateur (OBS-XXXX) : jamais de nom. */
  code: string;
  bureau_vote?: string | null;
  actif: boolean;
  /** Fin de validité (ex. fin du scrutin), ISO. */
  expire_le?: string | null;
  /** Numéro chiffré (AES-256-GCM), facultatif. */
  telephone_chiffre?: string | null;
  lien_activation?: string | null;
  generer_lien?: boolean;
}

export interface Appareil {
  id: string;
  observateur_id: string;
  /** HMAC-SHA256 du secret de l'appareil : le secret lui-même n'est jamais stocké. */
  empreinte: string;
  cree_le: string;
  dernier_usage?: string | null;
  revoque_le?: string | null;
}

export interface Activation {
  /** HMAC-SHA256 du jeton du lien : le jeton lui-même n'est jamais stocké. */
  empreinte: string;
  observateur_id: string;
  expire_le: string;
  utilise_le?: string | null;
}

export interface Registre {
  readonly nom: 'nocodb' | 'postgres';
  observateurParId(id: string): Promise<Observateur | null>;
  observateurParCode(code: string): Promise<Observateur | null>;
  creerObservateur(o: Observateur): Promise<void>;
  /** Met à jour le lien affiché à la coordination (null pour l'effacer) et remet « générer le lien » à faux. */
  ecrireLien(observateurId: string, lien: string | null): Promise<void>;
  /** Désactive l'observateur : tous ses téléphones sont refusés. */
  desactiverObservateur(observateurId: string): Promise<void>;
  appareil(id: string): Promise<Appareil | null>;
  creerAppareil(a: Appareil): Promise<void>;
  toucherAppareil(id: string, quand: string): Promise<void>;
  creerActivation(a: Activation): Promise<void>;
  /** Marque l'activation utilisée si elle est valide ; renvoie null sinon (déjà utilisée, expirée, inconnue). */
  consommerActivation(empreinte: string, quand: string): Promise<Activation | null>;
  verifier(): Promise<EtatDepot>;
}
