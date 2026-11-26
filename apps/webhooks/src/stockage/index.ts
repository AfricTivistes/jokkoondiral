// Choix du stockage par configuration (aucun changement de code d'une OSC à l'autre).
//
// STOCKAGE_SIGNALEMENTS   nocodb (défaut) | postgres | kobo     — dépôt principal, source de vérité
// STOCKAGE_COPIES         liste facultative, ex. "kobo"         — copies avec reprise automatique
// IDENTIFICATION          appareils (défaut) | codes
// REGISTRE_OBSERVATEURS   nocodb | postgres                     — défaut : celui du dépôt principal
// DATA_DIR                dossier de travail (file de reprise des copies)

import { join } from 'node:path';
import { Identite, type ModeIdentification } from '../identite/identite';
import { FileCopies } from './file-copies';
import { DepotKobo } from './kobo';
import { clientNocoDB, DepotNocoDB, RegistreNocoDB, type ClientNocoDB } from './nocodb';
import { migrer } from './migrations';
import { creerRequeteur, DepotPostgres, RegistrePostgres, type Requeteur } from './postgres';
import { lireSecret, tlsDesactiveAutorise } from './securite';
import type { DepotSignalements, EtatDepot, Registre } from './types';

export * from './types';

export interface Stockage {
  principal: DepotSignalements;
  copies: DepotSignalements[];
  registre: Registre | null;
  identite: Identite;
  file: FileCopies;
  avertissements: string[];
  /** Scripts SQL appliqués au démarrage (MIGRER_AU_DEMARRAGE=1). */
  migrations: string[];
  sante(): Promise<EtatDepot[]>;
}

const NOMS = ['nocodb', 'postgres', 'kobo'] as const;
type NomDepot = (typeof NOMS)[number];

export interface OptionsStockage {
  fetch?: typeof fetch;
  /** Connexion PostgreSQL déjà ouverte (tests : PGlite). */
  requeteur?: Requeteur;
}

export async function configurerStockage(env: NodeJS.ProcessEnv, opts: OptionsStockage = {}): Promise<Stockage> {
  const f = opts.fetch ?? fetch;
  const avertissements: string[] = [];
  const nomPrincipal = (env.STOCKAGE_SIGNALEMENTS || 'nocodb') as NomDepot;
  if (!NOMS.includes(nomPrincipal)) throw new Error(`STOCKAGE_SIGNALEMENTS inconnu : ${nomPrincipal} (attendu : ${NOMS.join(', ')})`);

  // Compatibilité : avec KOBO_* renseigné et STOCKAGE_COPIES absent, Kobo reste une copie (comportement de la v0.1).
  const copiesDemandees = env.STOCKAGE_COPIES !== undefined
    ? env.STOCKAGE_COPIES.split(',').map((x) => x.trim()).filter(Boolean)
    : env.KOBO_SUBMISSION_URL && nomPrincipal !== 'kobo' ? ['kobo'] : [];
  for (const c of copiesDemandees) {
    if (!NOMS.includes(c as NomDepot)) throw new Error(`STOCKAGE_COPIES : dépôt inconnu « ${c} »`);
    if (c === nomPrincipal) throw new Error(`STOCKAGE_COPIES : « ${c} » est déjà le dépôt principal`);
  }

  const mode = (env.IDENTIFICATION || 'appareils') as ModeIdentification;
  if (mode !== 'appareils' && mode !== 'codes') throw new Error(`IDENTIFICATION inconnue : ${mode} (appareils ou codes)`);
  const nomRegistre = mode === 'codes' ? null : (env.REGISTRE_OBSERVATEURS || nomPrincipal);
  if (nomRegistre === 'kobo') throw new Error('Kobo ne peut pas héberger le registre des observateurs : REGISTRE_OBSERVATEURS=nocodb ou postgres (ou IDENTIFICATION=codes)');
  if (nomRegistre && nomRegistre !== 'nocodb' && nomRegistre !== 'postgres') throw new Error(`REGISTRE_OBSERVATEURS inconnu : ${nomRegistre}`);

  let nocodb: ClientNocoDB | null = null;
  let requeteur: Requeteur | null = opts.requeteur ?? null;
  const obtenirNocodb = () => (nocodb ??= clientNocoDB(env, f));
  const obtenirPg = async () => (requeteur ??= await creerRequeteur(env));
  const fabriquer = async (nom: NomDepot): Promise<DepotSignalements> =>
    nom === 'nocodb' ? new DepotNocoDB(obtenirNocodb()) : nom === 'postgres' ? new DepotPostgres(await obtenirPg()) : new DepotKobo(env, f);

  // Schéma créé ou mis à jour avant tout accès (base gérée : Render, VPS existant…).
  let migrations: string[] = [];
  if (env.MIGRER_AU_DEMARRAGE === '1' && (nomPrincipal === 'postgres' || nomRegistre === 'postgres' || copiesDemandees.includes('postgres'))) {
    migrations = await migrer(await obtenirPg());
  }

  const principal = await fabriquer(nomPrincipal);
  const copies = await Promise.all(copiesDemandees.map((c) => fabriquer(c as NomDepot)));
  const registre: Registre | null = nomRegistre === 'nocodb' ? new RegistreNocoDB(obtenirNocodb()) : nomRegistre === 'postgres' ? new RegistrePostgres(await obtenirPg()) : null;

  if (mode === 'codes') avertissements.push('IDENTIFICATION=codes : codes partagés, sans révocation par téléphone. À réserver au développement ou à une très petite équipe.');
  if (tlsDesactiveAutorise(env)) avertissements.push('AUTORISER_SANS_TLS=1 : connexions non chiffrées autorisées vers des bases distantes. Jamais en production.');
  if (nomPrincipal === 'kobo') avertissements.push('Kobo en dépôt principal : les photos restent sur le serveur (PIECES_DIR) et le dédoublonnage est fait par Kobo.');

  const identite = new Identite({ mode, registre, env, secret: lireSecret(env, 'JK_SECRET'), urlCollecte: env.COLLECT_URL });
  const file = new FileCopies(join(env.DATA_DIR || 'donnees', 'file-copies'));

  return {
    principal,
    copies,
    registre,
    identite,
    file,
    avertissements,
    migrations,
    async sante() {
      const etats = await Promise.all([principal, ...copies].map(async (d, i) => ({ ...(await d.verifier()), role: i === 0 ? 'principal' : 'copie' })));
      if (registre) etats.push(await registre.verifier());
      etats.push({ nom: 'file-copies', role: 'reprise', ok: true, detail: `${await file.taille()} en attente` });
      return etats;
    },
  };
}
