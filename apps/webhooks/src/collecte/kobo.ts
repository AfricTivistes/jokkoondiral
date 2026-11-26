// Connecteur KoboToolbox (facultatif) : envoie une copie OpenRosa de chaque signalement reçu.
// Porté du proxy de dofbi/collecte-guidee (AGPL-3.0). Jokkoondiral reste la source de vérité :
// un échec côté Kobo n'empêche jamais l'enregistrement du signalement.
//
// Activé si KOBO_SUBMISSION_URL, KOBO_FORM_ID et KOBO_TOKEN (ou KOBO_USERNAME + KOBO_PASSWORD) sont définis.
// Le jeton Kobo ne quitte jamais le serveur.

import { finaliserXml, versXml, type Envoi, type Protocole } from '@jokkoondiral/protocole';
import { lireSecret, verifierUrlSecurisee } from '../stockage/securite';

type Env = NodeJS.ProcessEnv;

export const koboActif = (env: Env) => Boolean(env.KOBO_SUBMISSION_URL && env.KOBO_FORM_ID && (lireSecret(env, 'KOBO_TOKEN') || env.KOBO_USERNAME));

function authentifications(env: Env): string[] {
  const out: string[] = [];
  const jeton = lireSecret(env, 'KOBO_TOKEN');
  if (jeton) out.push(`Token ${jeton}`);
  if (env.KOBO_USERNAME) out.push(`Basic ${Buffer.from(`${env.KOBO_USERNAME}:${lireSecret(env, 'KOBO_PASSWORD') || ''}`).toString('base64')}`);
  return out;
}

export interface ResultatKobo {
  envoye: boolean;
  statut?: number;
  erreur?: string;
}

export async function copierVersKobo(proto: Protocole, envoi: Envoi, code: string, env: Env = process.env, fetchFn: typeof fetch = fetch): Promise<ResultatKobo> {
  if (!koboActif(env)) return { envoye: false, erreur: 'inactif' };
  verifierUrlSecurisee(env.KOBO_SUBMISSION_URL!, 'KOBO_SUBMISSION_URL', env);
  let xml: string;
  try {
    xml = finaliserXml(versXml(proto, envoi, code), env.KOBO_FORM_ID!, env.KOBO_FORM_VERSION, env.KOBO_ROOT_TAG || env.KOBO_FORM_ID);
  } catch (e) {
    return { envoye: false, erreur: `xml : ${(e as Error).message}` };
  }
  let statut = 0;
  for (const auth of authentifications(env)) {
    const form = new FormData();
    form.append('xml_submission_file', new Blob([xml], { type: 'text/xml' }), 'submission.xml');
    try {
      const rep = await fetchFn(env.KOBO_SUBMISSION_URL!, { method: 'POST', headers: { 'X-OpenRosa-Version': '1.0', Authorization: auth }, body: form, signal: AbortSignal.timeout(20000) });
      statut = rep.status;
    } catch {
      return { envoye: false, erreur: 'kobo_injoignable' };
    }
    if (statut !== 401 && statut !== 403) break;
  }
  // 201 : créée · 202 : déjà reçue (même instanceID), traitée comme un succès.
  if (statut === 201 || statut === 202) return { envoye: true, statut };
  return { envoye: false, statut, erreur: statut === 401 || statut === 403 ? 'kobo_authentification' : `kobo_${statut}` };
}
