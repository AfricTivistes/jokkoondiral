// Moteur : fait avancer l'observateur question par question et vérifie les réponses.
// Fonctions pures (aucun accès au DOM ni au stockage) : les mêmes règles s'appliquent
// dans la PWA (pendant la saisie) et sur le serveur (à la réception).

import { evaluer, vrai, type ValeurExpr } from "./expr";
import { champs, estObligatoire, t } from "./protocole";
import type { Champ, Envoi, PieceJointe, Protocole, Reponses, Valeur, ValeurLieu } from "./types";

/** Marge tolérée pour une heure déclarée dans le futur (horloge du téléphone imprécise). */
const MARGE_FUTUR_MS = 5 * 60 * 1000;

const estVide = (v: unknown) =>
  v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0) ||
  (typeof v === "object" && !Array.isArray(v) && v !== null && "texte" in v && !String((v as ValeurLieu).texte || "").trim());

/** Variables disponibles pour les expressions : les réponses, simplifiées. */
function vars(reponses: Reponses): Record<string, ValeurExpr> {
  const out: Record<string, ValeurExpr> = {};
  for (const [k, v] of Object.entries(reponses)) {
    if (v && typeof v === "object" && !Array.isArray(v) && "texte" in v) out[k] = v.texte;
    else if (Array.isArray(v) && v.length && typeof v[0] === "object") out[k] = (v as PieceJointe[]).map((p) => p.id);
    else out[k] = v as ValeurExpr;
  }
  return out;
}

/** Un champ est affiché si sa condition est vraie avec les réponses déjà données. */
export function estVisible(c: Champ, reponses: Reponses): boolean {
  return vrai(c.si, vars(reponses));
}

/** Champs à poser, dans l'ordre, compte tenu des réponses actuelles. */
export function champsVisibles(proto: Protocole, reponses: Reponses): Champ[] {
  return champs(proto).filter((c) => estVisible(c, reponses));
}

/** Retire les réponses devenues sans objet (un champ caché par une réponse modifiée). */
export function nettoyer(proto: Protocole, reponses: Reponses): Reponses {
  const out: Reponses = {};
  for (const c of champs(proto)) {
    if (c.id in reponses && estVisible(c, out)) out[c.id] = reponses[c.id];
  }
  return out;
}

export type CodeErreur =
  | "obligatoire" | "type" | "option" | "exclusive" | "min" | "max" | "longueur" | "futur" | "date" | "position" | "regle";

export interface ErreurChamp {
  champ: string;
  code: CodeErreur;
  message?: string;
}

/** Vérifie la réponse à un champ. `maintenant` est injectable pour les tests. */
export function verifierChamp(c: Champ, valeur: Valeur | undefined, reponses: Reponses, langue = "fr", maintenant = Date.now()): ErreurChamp | null {
  const e = (code: CodeErreur, message?: string): ErreurChamp => ({ champ: c.id, code, message });
  if (estVide(valeur)) return estObligatoire(c) ? e("obligatoire") : null;
  const v = valeur as Valeur;
  switch (c.type) {
    case "choix":
      if (typeof v !== "string") return e("type");
      if (!c.options?.some((o) => o.v === v)) return e("option");
      break;
    case "choix_multiple": {
      if (!Array.isArray(v) || v.some((x) => typeof x !== "string")) return e("type");
      const liste = v as string[];
      if (liste.some((x) => !c.options?.some((o) => o.v === x))) return e("option");
      if (new Set(liste).size !== liste.length) return e("option");
      const exclusives = c.options?.filter((o) => o.exclusive).map((o) => o.v) || [];
      if (liste.length > 1 && liste.some((x) => exclusives.includes(x))) return e("exclusive");
      break;
    }
    case "compteur": {
      if (typeof v !== "number" || !Number.isInteger(v)) return e("type");
      if (v < (c.min ?? 0)) return e("min");
      if (c.max !== undefined && v > c.max) return e("max");
      break;
    }
    case "texte":
    case "texte_long":
      if (typeof v !== "string") return e("type");
      if (v.length > (c.max_longueur ?? (c.type === "texte" ? 200 : 2000))) return e("longueur");
      break;
    case "date_heure": {
      if (typeof v !== "string") return e("type");
      const d = Date.parse(v);
      if (Number.isNaN(d)) return e("date");
      if (d > maintenant + MARGE_FUTUR_MS) return e("futur");
      break;
    }
    case "lieu": {
      if (typeof v !== "object" || Array.isArray(v) || typeof (v as ValeurLieu).texte !== "string") return e("type");
      const l = v as ValeurLieu;
      if (l.texte.length > (c.max_longueur ?? 200)) return e("longueur");
      if (l.position) {
        const { lat, lon } = l.position;
        if (typeof lat !== "number" || typeof lon !== "number" || Math.abs(lat) > 90 || Math.abs(lon) > 180) return e("position");
      }
      break;
    }
    case "photo": {
      if (!Array.isArray(v)) return e("type");
      const pieces = v as PieceJointe[];
      if (pieces.some((p) => !p || typeof p !== "object" || typeof p.id !== "string" || typeof p.taille !== "number")) return e("type");
      if (pieces.length > (c.max ?? 3)) return e("max");
      break;
    }
  }
  if (c.valide && !vrai(c.valide, { ...vars(reponses), valeur: vars({ valeur: v }).valeur })) {
    return e("regle", t(c.message_valide, langue) || undefined);
  }
  return null;
}

/** Vérifie toutes les réponses : champs visibles valides, aucun champ inconnu ou caché. */
export function verifierReponses(proto: Protocole, reponses: Reponses, maintenant = Date.now()): ErreurChamp[] {
  const erreurs: ErreurChamp[] = [];
  const connus = new Set(champs(proto).map((c) => c.id));
  for (const k of Object.keys(reponses)) {
    if (!connus.has(k)) erreurs.push({ champ: k, code: "type", message: "champ inconnu du protocole" });
  }
  const vus: Reponses = {};
  for (const c of champs(proto)) {
    if (!estVisible(c, vus)) {
      if (c.id in reponses) erreurs.push({ champ: c.id, code: "type", message: "réponse à un champ non affiché" });
      continue;
    }
    const err = verifierChamp(c, reponses[c.id], vus, "fr", maintenant);
    if (err) erreurs.push(err);
    if (c.id in reponses) vus[c.id] = reponses[c.id];
  }
  return erreurs;
}

/** Vérification complète d'un envoi reçu par le serveur. */
export function verifierEnvoi(proto: Protocole, envoi: Envoi, maintenant = Date.now()): string[] {
  const err: string[] = [];
  if (!envoi || typeof envoi !== "object") return ["envoi illisible"];
  if (!/^uuid:[0-9a-f-]{36}$/i.test(envoi.instanceID || "")) err.push("instanceID invalide");
  if (!/^JK-[0-9A-F]{8}$/.test(envoi.numero_suivi || "")) err.push("numero_suivi invalide");
  if (envoi.protocole?.id !== proto.id) err.push(`protocole attendu ${proto.id}`);
  if (!envoi.reponses || typeof envoi.reponses !== "object") return [...err, "réponses manquantes"];
  for (const e of verifierReponses(proto, envoi.reponses, maintenant)) err.push(`${e.champ} : ${e.code}${e.message ? ` (${e.message})` : ""}`);
  return err;
}

// ── Navigation question par question ────────────────────────────────

export interface Etat {
  /** Id du champ affiché, ou null quand toutes les questions ont été posées (écran de relecture). */
  courant: string | null;
  reponses: Reponses;
  /** Champs visités, pour le bouton « question précédente ». */
  historique: string[];
}

export function demarrer(proto: Protocole, reponses: Reponses = {}): Etat {
  const premier = champsVisibles(proto, reponses)[0];
  return { courant: premier?.id ?? null, reponses, historique: [] };
}

/** Champ visible qui suit `id` (ou le premier) ; null s'il n'y en a plus. */
export function champSuivant(proto: Protocole, reponses: Reponses, id: string | null): Champ | null {
  const visibles = champsVisibles(proto, reponses);
  if (id === null) return visibles[0] ?? null;
  const tous = champs(proto);
  const pos = tous.findIndex((c) => c.id === id);
  return visibles.find((c) => tous.indexOf(c) > pos) ?? null;
}

/** Enregistre la réponse au champ courant et passe au suivant. Renvoie l'erreur si la réponse ne convient pas. */
export function repondre(proto: Protocole, etat: Etat, valeur: Valeur | undefined, langue = "fr"): { etat: Etat; erreur: ErreurChamp | null } {
  const c = champs(proto).find((x) => x.id === etat.courant);
  if (!c) return { etat, erreur: null };
  const erreur = verifierChamp(c, valeur, etat.reponses, langue);
  if (erreur) return { etat, erreur };
  const reponses: Reponses = { ...etat.reponses };
  if (estVide(valeur)) delete reponses[c.id];
  else reponses[c.id] = valeur as Valeur;
  const propres = nettoyer(proto, reponses);
  const suivant = champSuivant(proto, propres, c.id);
  return { etat: { courant: suivant?.id ?? null, reponses: propres, historique: [...etat.historique, c.id] }, erreur: null };
}

/** Revient à la question précédente (la réponse donnée est conservée et pré-remplie). */
export function precedent(etat: Etat): Etat | null {
  if (!etat.historique.length) return null;
  return { ...etat, courant: etat.historique[etat.historique.length - 1], historique: etat.historique.slice(0, -1) };
}

/** Rouvre une question depuis l'écran de relecture. */
export function allerA(proto: Protocole, etat: Etat, id: string): Etat {
  if (!champsVisibles(proto, etat.reponses).some((c) => c.id === id)) return etat;
  return { ...etat, courant: id };
}

/** Progression : position de la question courante parmi les questions visibles. */
export function progression(proto: Protocole, etat: Etat): { position: number; total: number } {
  const visibles = champsVisibles(proto, etat.reponses);
  const i = etat.courant ? visibles.findIndex((c) => c.id === etat.courant) : visibles.length;
  return { position: Math.max(0, i) + (etat.courant ? 1 : 0), total: visibles.length };
}

export function estComplet(proto: Protocole, reponses: Reponses): boolean {
  return verifierReponses(proto, reponses).length === 0;
}

/** Valeur numérique d'une expression calculée (utile pour un résumé). */
export const calculer = (expr: string, reponses: Reponses) => evaluer(expr, vars(reponses));
