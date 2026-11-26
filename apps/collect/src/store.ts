// Stockage local (IndexedDB) : signalements, photos et réglages.
// Repli en mémoire si IndexedDB est indisponible (navigation privée stricte) : l'app reste
// utilisable, mais rien ne survit au rechargement.

import type { Etat } from "@jokkoondiral/protocole";

export type Statut = "brouillon" | "en_attente" | "envoye" | "erreur";

export interface Signalement {
  /** instanceID OpenRosa (uuid:…), clé du signalement. */
  id: string;
  numero_suivi: string;
  statut: Statut;
  etat: Etat;
  debut: string;
  fin?: string;
  maj?: string;
  /** Le serveur a accepté les réponses ; il reste peut-être des photos à envoyer. */
  recu?: boolean;
  erreur?: string | null;
}

export interface Piece {
  id: string;
  signalement: string;
  blob: Blob;
  type: string;
  taille: number;
  envoyee?: boolean;
}

/** Clé du téléphone, reçue à l'activation. Le secret ne quitte le téléphone que dans l'en-tête des envois. */
export interface AppareilActive {
  id: string;
  secret: string;
  observateur: { code: string; bureau_vote: string | null };
  active_le: string;
}

type NomStore = "signalements" | "pieces" | "reglages";
const BASE = "jk-collect";
const VERSION = 1;
let ouverture: Promise<IDBDatabase | null> | null = null;
const memoire: Record<NomStore, Map<string, unknown>> = { signalements: new Map(), pieces: new Map(), reglages: new Map() };

function ouvrir(): Promise<IDBDatabase | null> {
  if (ouverture) return ouverture;
  ouverture = new Promise((resolve) => {
    try {
      const req = indexedDB.open(BASE, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("signalements")) db.createObjectStore("signalements", { keyPath: "id" });
        if (!db.objectStoreNames.contains("pieces")) db.createObjectStore("pieces", { keyPath: "id" }).createIndex("signalement", "signalement");
        if (!db.objectStoreNames.contains("reglages")) db.createObjectStore("reglages", { keyPath: "k" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return ouverture;
}

const attendre = <T>(r: IDBRequest<T>) => new Promise<T>((ok, ko) => { r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });

async function operation<T>(nom: NomStore, mode: IDBTransactionMode, enBase: (s: IDBObjectStore) => Promise<T>, enMemoire: (m: Map<string, unknown>) => T): Promise<T> {
  const db = await ouvrir();
  if (!db) return enMemoire(memoire[nom]);
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(nom, mode);
    let resultat: T;
    enBase(tx.objectStore(nom)).then((r) => { resultat = r; }, reject);
    tx.oncomplete = () => resolve(resultat);
    tx.onerror = () => reject(tx.error);
  });
}

export const signalements = {
  lister: () => operation("signalements", "readonly", (s) => attendre(s.getAll() as IDBRequest<Signalement[]>), (m) => [...m.values()] as Signalement[]),
  lire: (id: string) => operation("signalements", "readonly", (s) => attendre(s.get(id) as IDBRequest<Signalement | undefined>), (m) => m.get(id) as Signalement | undefined),
  ecrire: (x: Signalement) => {
    const s = { ...x, maj: new Date().toISOString() };
    return operation("signalements", "readwrite", async (st) => { await attendre(st.put(s)); return s; }, (m) => { m.set(s.id, structuredClone(s)); return s; });
  },
  supprimer: async (id: string) => {
    for (const p of await pieces.lister(id)) await pieces.supprimer(p.id);
    return operation("signalements", "readwrite", async (s) => { await attendre(s.delete(id)); }, (m) => { m.delete(id); });
  },
};

export const pieces = {
  lister: (signalement: string) =>
    operation("pieces", "readonly",
      (s) => attendre(s.index("signalement").getAll(signalement) as IDBRequest<Piece[]>),
      (m) => ([...m.values()] as Piece[]).filter((p) => p.signalement === signalement)),
  ecrire: (p: Piece) => operation("pieces", "readwrite", async (s) => { await attendre(s.put(p)); return p; }, (m) => { m.set(p.id, p); return p; }),
  supprimer: (id: string) => operation("pieces", "readwrite", async (s) => { await attendre(s.delete(id)); }, (m) => { m.delete(id); }),
};

export const reglages = {
  lire: async <T>(k: string, defaut: T): Promise<T> => {
    const r = await operation("reglages", "readonly", (s) => attendre(s.get(k) as IDBRequest<{ k: string; v: T } | undefined>), (m) => m.get(k) as { k: string; v: T } | undefined);
    return r === undefined || r === null ? defaut : r.v;
  },
  ecrire: <T>(k: string, v: T) => operation("reglages", "readwrite", async (s) => { await attendre(s.put({ k, v })); }, (m) => { m.set(k, { k, v }); }),
};

/** Demande au navigateur de ne pas effacer les données en cas de manque d'espace. */
export async function demanderPersistance(): Promise<boolean> {
  try {
    return navigator.storage?.persist ? await navigator.storage.persist() : false;
  } catch {
    return false;
  }
}
