// =============================================================
// Handler Collecte (PWA hors ligne, outil C1) – Jokkoondiral Webhooks
// =============================================================
// Reçoit les signalements de apps/collect et leurs photos, active les
// téléphones des observateurs et génère les liens d'activation.
// Protocole et stockage sont chargés une fois au démarrage.
// Configuration : voir .env.example (STOCKAGE_*, IDENTIFICATION, JK_SECRET…).
// =============================================================

import express, { Request, Response, Router } from 'express';
import { chargerProtocole } from '../collecte/configuration';
import { recevoirPiece, recevoirSignalement, type Dependances } from '../collecte/reception';
import { webhookAutorise, type ErreurAuth } from '../identite/identite';
import { lireSecret } from '../stockage/securite';
import { configurerStockage, type Stockage } from '../stockage';

const MESSAGES_AUTH: Record<ErreurAuth, string> = {
  non_active: 'Téléphone non activé',
  revoque: 'Téléphone désactivé par la coordination',
  inactif: 'Observateur désactivé',
  expire: 'Accès expiré',
  code: 'Code collecteur refusé',
};

export async function routeurCollecte(env: NodeJS.ProcessEnv = process.env): Promise<{ routeur: Router; stockage: Stockage }> {
  const proto = chargerProtocole(env);
  const stockage = await configurerStockage(env);
  for (const a of stockage.avertissements) console.warn(`⚠️  ${a}`);
  if (stockage.migrations.length) console.log(`🧱 Schéma PostgreSQL : ${stockage.migrations.join(', ')} appliqué(s)`);
  console.log(`🧾 Collecte : protocole ${proto.id}@${proto.version}${proto.extensions?.length ? ` + ${proto.extensions.join(', ')}` : ''}`);
  console.log(`🗄️  Stockage : ${stockage.principal.nom}${stockage.copies.length ? ` (copies : ${stockage.copies.map((c) => c.nom).join(', ')})` : ''} · identification : ${stockage.identite.mode}${stockage.registre ? ` (registre ${stockage.registre.nom})` : ''}`);
  for (const etat of await stockage.sante()) {
    if (!etat.ok) console.warn(`⚠️  ${etat.nom} (${etat.role}) injoignable au démarrage : ${etat.detail}`);
  }

  const deps = (): Dependances => ({ proto, principal: stockage.principal, copies: stockage.copies, file: stockage.file, env });
  const secretWebhook = lireSecret(env, 'JK_WEBHOOK_SECRET');
  const routeur = Router();
  const repondre = (res: Response, r: { status: number; corps: Record<string, unknown> }) => res.status(r.status).set('Cache-Control', 'no-store').json(r.corps);

  // Reprise des copies échouées, toutes les minutes.
  setInterval(() => { void stockage.file.traiter(stockage.copies, proto, console.log).catch(() => {}); }, 60_000).unref();

  const authentifier = async (req: Request, res: Response, codeHerite?: string) => {
    const auth = await stockage.identite.authentifier(req.get('Authorization'), codeHerite ?? req.get('X-Code-Collecteur'));
    if (!auth.ok) {
      repondre(res, { status: 401, corps: { ok: false, erreur: auth.erreur, detail: MESSAGES_AUTH[auth.erreur] } });
      return null;
    }
    return auth;
  };

  routeur.post('/', express.json({ limit: '64kb' }), async (req: Request, res: Response) => {
    try {
      const auteur = await authentifier(req, res, req.body?.code);
      if (!auteur) return;
      repondre(res, await recevoirSignalement(req.body?.envoi, auteur, deps()));
    } catch (e) {
      console.error(`❌ Collecte : ${(e as Error).message}`);
      repondre(res, { status: 503, corps: { ok: false, erreur: 'base_injoignable' } });
    }
  });

  routeur.post('/:instanceID/pieces', express.raw({ type: 'image/*', limit: '3mb' }), async (req: Request, res: Response) => {
    try {
      const auteur = await authentifier(req, res);
      if (!auteur) return;
      repondre(res, await recevoirPiece({
        instanceID: String(req.params.instanceID),
        pieceId: String(req.get('X-Piece-Id') || ''),
        type: String(req.get('Content-Type') || '').split(';')[0].trim(),
        contenu: Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0),
      }, auteur, deps()));
    } catch (e) {
      console.error(`❌ Collecte (photo) : ${(e as Error).message}`);
      repondre(res, { status: 503, corps: { ok: false, erreur: 'base_injoignable' } });
    }
  });

  // Activation d'un téléphone à partir du lien remis par la coordination.
  routeur.post('/activation', express.json({ limit: '2kb' }), async (req: Request, res: Response) => {
    try {
      repondre(res, await stockage.identite.activer(req.body?.jeton));
    } catch (e) {
      console.error(`❌ Activation : ${(e as Error).message}`);
      repondre(res, { status: 503, corps: { ok: false, erreur: 'base_injoignable' } });
    }
  });

  // Webhook NocoDB « générer le lien » (réseau interne, secret partagé obligatoire).
  routeur.post('/observateurs/lien', express.json({ limit: '256kb' }), async (req: Request, res: Response) => {
    if (!webhookAutorise(req.get('X-Jk-Webhook'), secretWebhook)) return repondre(res, { status: 401, corps: { ok: false, erreur: 'webhook' } });
    try {
      repondre(res, await stockage.identite.webhookLien(req.body));
    } catch (e) {
      repondre(res, { status: 500, corps: { ok: false, erreur: (e as Error).message } });
    }
  });

  // État des dépôts (aucun secret, aucune donnée).
  routeur.get('/sante', async (_req: Request, res: Response) => {
    const etats = await stockage.sante();
    repondre(res, { status: etats.every((e) => e.ok) ? 200 : 503, corps: { ok: etats.every((e) => e.ok), identification: stockage.identite.mode, depots: etats } });
  });

  return { routeur, stockage };
}
