// Lecture, validation et extension d'un protocole.

import { analyser, renommer, variables } from "./expr";
import { TYPES_CHAMP, type Champ, type Extension, type Option, type Protocole, type Section, type Texte } from "./types";

export const ID = /^[a-z][a-z0-9_]*$/;
const TYPES_A_OPTIONS = new Set(["choix", "choix_multiple"]);

/** Texte dans la langue demandée, repli sur le français puis sur la première langue disponible. */
export function t(txt: Texte | undefined, langue = "fr"): string {
  if (txt === undefined || txt === null) return "";
  if (typeof txt === "string") return txt;
  return txt[langue] ?? txt.fr ?? Object.values(txt)[0] ?? "";
}

/** Tous les champs, dans l'ordre du formulaire. */
export function champs(proto: Protocole): Champ[] {
  return proto.sections.flatMap((s) => s.champs);
}

export function indexChamps(proto: Protocole): Record<string, Champ> {
  return Object.fromEntries(champs(proto).map((c) => [c.id, c]));
}

export function sectionDe(proto: Protocole, idChamp: string): Section | undefined {
  return proto.sections.find((s) => s.champs.some((c) => c.id === idChamp));
}

export const estObligatoire = (c: Champ) => c.obligatoire !== false;

/**
 * Vérifie la cohérence d'un protocole. Renvoie la liste des erreurs (vide si tout va bien).
 * Contrôlé au build de la PWA, dans les tests et au démarrage du serveur.
 */
export function valider(proto: Protocole): string[] {
  const err: string[] = [];
  if (!proto || typeof proto !== "object") return ["Protocole absent ou illisible"];
  if (!ID.test(proto.id || "")) err.push(`id du protocole invalide : « ${proto.id} »`);
  if (!proto.version) err.push("version manquante");
  if (!Array.isArray(proto.langues) || !proto.langues.length) err.push("langues manquantes");
  if (!Array.isArray(proto.sections) || !proto.sections.length) return [...err, "aucune section"];

  const vus = new Set<string>();
  const sectionsVues = new Set<string>();
  for (const s of proto.sections) {
    if (!ID.test(s.id || "")) err.push(`id de section invalide : « ${s.id} »`);
    if (sectionsVues.has(s.id)) err.push(`section en double : ${s.id}`);
    sectionsVues.add(s.id);
    if (!Array.isArray(s.champs) || !s.champs.length) err.push(`section ${s.id} : aucun champ`);
    for (const c of s.champs || []) {
      const ou = `champ ${c.id}`;
      if (!ID.test(c.id || "")) err.push(`id de champ invalide : « ${c.id} »`);
      if (vus.has(c.id)) err.push(`${ou} : id en double`);
      if (!TYPES_CHAMP.includes(c.type)) err.push(`${ou} : type inconnu « ${c.type} »`);
      if (!c.question) err.push(`${ou} : question manquante`);
      if (TYPES_A_OPTIONS.has(c.type)) {
        if (!c.options?.length) err.push(`${ou} : options manquantes`);
        const valeurs = new Set<string>();
        for (const o of c.options || []) {
          if (!ID.test(o.v || "")) err.push(`${ou} : valeur d'option invalide « ${o.v} »`);
          if (valeurs.has(o.v)) err.push(`${ou} : option en double « ${o.v} »`);
          valeurs.add(o.v);
        }
      } else if (c.options) err.push(`${ou} : des options sur un champ de type ${c.type}`);
      for (const [cle, expr] of [["si", c.si], ["valide", c.valide]] as const) {
        if (!expr) continue;
        try {
          analyser(expr);
          for (const v of variables(expr)) {
            if (v === "valeur" && cle === "valide") continue;
            if (!vus.has(v) && v !== c.id) err.push(`${ou} : « ${cle} » utilise « ${v} », qui n'est pas un champ précédent`);
          }
        } catch (e) {
          err.push(`${ou} : « ${cle} » invalide (${(e as Error).message})`);
        }
      }
      vus.add(c.id);
    }
  }
  return err;
}

/** Copie profonde (les protocoles sont de simples données JSON). */
const copie = <T>(x: T): T => JSON.parse(JSON.stringify(x));

/**
 * Applique des extensions à un protocole de base. Une extension peut seulement AJOUTER :
 * des champs dans une section, des options à une liste « ouverte », une section.
 * Les ids ajoutés sont préfixés `x_<extension>_` : aucune collision, noms Kobo stables.
 */
export function appliquerExtensions(base: Protocole, extensions: Extension[] = []): { protocole: Protocole; erreurs: string[] } {
  const proto = copie(base);
  const erreurs: string[] = [];
  const idsBase = new Set(champs(base).map((c) => c.id));
  proto.extensions = [];

  for (const ext of extensions) {
    const ou = `extension ${ext?.id}`;
    if (!ext || !ID.test(ext.id || "")) { erreurs.push(`extension : id invalide « ${ext?.id} »`); continue; }
    if (ext.pour !== base.id) { erreurs.push(`${ou} : vise « ${ext.pour} », pas « ${base.id} »`); continue; }
    if (!ext.version) erreurs.push(`${ou} : version manquante`);
    const prefixe = `x_${ext.id}_`;

    // Les expressions d'une extension peuvent nommer ses propres champs sans préfixe.
    const locaux: Record<string, string> = {};
    for (const a of ext.ajouts || []) {
      const liste = a.type === "champs" ? a.champs : a.type === "section" ? a.section.champs : [];
      for (const c of liste || []) if (c?.id) locaux[c.id] = prefixe + c.id;
    }
    const preparer = (c: Champ): Champ => {
      if (c.verrouille || c.colonne) erreurs.push(`${ou} : le champ ${c.id} ne peut pas être verrouillé ni viser une colonne`);
      const n: Champ = { ...copie(c), id: prefixe + c.id, extension: ext.id };
      delete n.verrouille;
      delete n.colonne;
      if (n.si) n.si = renommer(n.si, locaux);
      if (n.valide) n.valide = renommer(n.valide, locaux);
      return n;
    };

    for (const a of ext.ajouts || []) {
      if (a.type === "champs") {
        const s = proto.sections.find((x) => x.id === a.section);
        if (!s) { erreurs.push(`${ou} : section inconnue « ${a.section} »`); continue; }
        const nouveaux = (a.champs || []).map(preparer);
        const pos = a.apres ? s.champs.findIndex((c) => c.id === a.apres || c.id === locaux[a.apres!]) : s.champs.length - 1;
        if (pos < 0) { erreurs.push(`${ou} : champ « ${a.apres} » introuvable dans ${a.section}`); continue; }
        s.champs.splice(pos + 1, 0, ...nouveaux);
      } else if (a.type === "options") {
        const c = champs(proto).find((x) => x.id === a.champ);
        if (!c) { erreurs.push(`${ou} : champ inconnu « ${a.champ} »`); continue; }
        if (!c.ouverte) { erreurs.push(`${ou} : la liste de « ${a.champ} » n'est pas ouverte aux extensions`); continue; }
        c.options = [...(c.options || []), ...copie(a.options || [] as Option[])];
      } else if (a.type === "section") {
        const s: Section = { ...copie(a.section), id: prefixe + a.section.id, extension: ext.id, champs: (a.section.champs || []).map(preparer) };
        const pos = a.apres ? proto.sections.findIndex((x) => x.id === a.apres) : proto.sections.length - 1;
        if (pos < 0) { erreurs.push(`${ou} : section « ${a.apres} » introuvable`); continue; }
        proto.sections.splice(pos + 1, 0, s);
      } else {
        erreurs.push(`${ou} : type d'ajout inconnu « ${(a as { type: string }).type} »`);
      }
    }
    proto.extensions.push(`${ext.id}@${ext.version}`);
  }

  // Le noyau doit rester intact : aucun champ verrouillé retiré ni déplacé hors de sa section.
  for (const s of base.sections) {
    const cible = proto.sections.find((x) => x.id === s.id);
    for (const c of s.champs) {
      if (c.verrouille && !cible?.champs.some((x) => x.id === c.id)) erreurs.push(`champ verrouillé retiré : ${c.id}`);
    }
  }
  for (const c of champs(proto)) {
    if (!c.extension && !idsBase.has(c.id)) erreurs.push(`champ inattendu : ${c.id}`);
  }
  erreurs.push(...valider(proto));
  return { protocole: proto, erreurs };
}

/** Libellé d'une valeur de choix. */
export function libelleOption(c: Champ, v: string, langue = "fr"): string {
  const o = c.options?.find((x) => x.v === v);
  return o ? t(o.label, langue) : v;
}
