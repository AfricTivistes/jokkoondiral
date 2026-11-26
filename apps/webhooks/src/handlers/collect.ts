// =============================================================
// Handler Collecte (PWA hors ligne, outil C1) – Jokkoondiral Webhooks
// =============================================================
// Reçoit les signalements de apps/collect et leurs photos.
// Le protocole est chargé une fois au démarrage, depuis la même
// configuration que la PWA (voir src/collecte/configuration.ts).
//
// Variables : COLLECT_CODES (obligatoire), NOCODB_API_URL, NOCODB_API_TOKEN,
// PIECES_DIR, COLLECT_INSTANCE, PROTOCOLES_DIR, KOBO_* (facultatives).
// =============================================================

import express, { Request, Response, Router } from 'express';
import { chargerProtocole } from '../collecte/configuration';
import { recevoirPiece, recevoirSignalement, type Dependances } from '../collecte/reception';

export function routeurCollecte(): Router {
  const proto = chargerProtocole();
  console.log(`🧾 Collecte : protocole ${proto.id}@${proto.version}${proto.extensions?.length ? ` + ${proto.extensions.join(', ')}` : ''}`);
  const deps = (): Dependances => ({ proto, env: process.env, fetch });
  const routeur = Router();

  routeur.post('/', express.json({ limit: '64kb' }), async (req: Request, res: Response) => {
    const r = await recevoirSignalement(req.body, deps());
    res.status(r.status).set('Cache-Control', 'no-store').json(r.corps);
  });

  routeur.post('/:instanceID/pieces', express.raw({ type: 'image/*', limit: '3mb' }), async (req: Request, res: Response) => {
    const r = await recevoirPiece({
      instanceID: String(req.params.instanceID),
      code: String(req.get('X-Code-Collecteur') || ''),
      pieceId: String(req.get('X-Piece-Id') || ''),
      type: String(req.get('Content-Type') || '').split(';')[0].trim(),
      contenu: Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0),
    }, deps());
    res.status(r.status).set('Cache-Control', 'no-store').json(r.corps);
  });

  return routeur;
}
