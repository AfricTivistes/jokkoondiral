// Primitives cryptographiques de l'identification des observateurs (node:crypto uniquement).
//
// Un seul secret maître (JK_SECRET ou JK_SECRET_FILE, 32 caractères au moins) donne, par dérivation HKDF :
// - le « poivre » des empreintes HMAC (jetons d'activation, secrets d'appareil) ;
// - la clé AES-256-GCM qui chiffre les numéros de téléphone.
// Une fuite de la base seule ne révèle ni secret d'appareil ni numéro.

import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto';

export interface Cles {
  poivre: Buffer;
  chiffrement: Buffer;
}

export function deriverCles(secretMaitre: string): Cles {
  if (!secretMaitre || secretMaitre.length < 32) throw new Error('JK_SECRET doit faire au moins 32 caractères (openssl rand -base64 48)');
  const derive = (info: string) => Buffer.from(hkdfSync('sha256', secretMaitre, 'jokkoondiral', info, 32));
  return { poivre: derive('empreintes'), chiffrement: derive('chiffrement-telephone') };
}

/** Valeur aléatoire en base64url (32 octets par défaut : 256 bits). */
export const aleatoire = (octets = 32) => randomBytes(octets).toString('base64url');

export const empreinte = (poivre: Buffer, valeur: string) => createHmac('sha256', poivre).update(valeur).digest('hex');

/** Comparaison en temps constant (évite de deviner une empreinte caractère par caractère). */
export function egal(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function chiffrer(cle: Buffer, texte: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', cle, iv);
  const corps = Buffer.concat([c.update(texte, 'utf8'), c.final()]);
  return `v1.${Buffer.concat([iv, c.getAuthTag(), corps]).toString('base64url')}`;
}

export function dechiffrer(cle: Buffer, chiffre: string): string {
  if (!chiffre.startsWith('v1.')) throw new Error('format chiffré inconnu');
  const b = Buffer.from(chiffre.slice(3), 'base64url');
  const d = createDecipheriv('aes-256-gcm', cle, b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8');
}

// Alphabet de Crockford sans I, L, O, U : lisible et dicté sans confusion.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Pseudonyme d'observateur, ex. OBS-7K2Q9M. */
export function codeObservateur(longueur = 6): string {
  const b = randomBytes(longueur);
  return 'OBS-' + [...b].map((x) => ALPHABET[x % 32]).join('');
}
