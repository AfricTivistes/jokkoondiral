// Adaptateur KoboToolbox : soumission OpenRosa, comme principal ou comme copie.
// Kobo ne peut pas héberger le registre des observateurs, et ne permet pas de retrouver
// un signalement par instanceID ; il dédoublonne lui-même (réponse 202).
// Les photos restent sur le serveur Jokkoondiral (PIECES_DIR).

import { copierVersKobo, koboActif } from '../collecte/kobo';
import { verifierUrlSecurisee } from './securite';
import type { ContexteSignalement, DepotSignalements, EtatDepot } from './types';

export class DepotKobo implements DepotSignalements {
  readonly nom = 'kobo' as const;
  readonly peutRetrouver = false;
  constructor(private env: NodeJS.ProcessEnv, private f: typeof fetch = fetch) {
    if (!koboActif(env)) throw new Error('Kobo : KOBO_SUBMISSION_URL, KOBO_FORM_ID et KOBO_TOKEN (ou KOBO_USERNAME) sont requis');
    verifierUrlSecurisee(env.KOBO_SUBMISSION_URL!, 'KOBO_SUBMISSION_URL', env);
  }
  async trouver() {
    return null;
  }
  async enregistrer(_ligne: Record<string, unknown>, c: ContexteSignalement) {
    const r = await copierVersKobo(c.proto, c.envoi, c.observateur_code, this.env, this.f);
    if (!r.envoye) throw new Error(r.erreur || 'kobo');
  }
  async verifier(): Promise<EtatDepot> {
    try {
      // HEAD OpenRosa : vérifie l'accès sans rien soumettre.
      const rep = await this.f(this.env.KOBO_SUBMISSION_URL!, { method: 'HEAD', headers: { 'X-OpenRosa-Version': '1.0' }, signal: AbortSignal.timeout(10000) });
      return { nom: 'kobo', role: 'signalements', ok: rep.status < 500, detail: `HTTP ${rep.status}` };
    } catch (e) {
      return { nom: 'kobo', role: 'signalements', ok: false, detail: (e as Error).message };
    }
  }
}
