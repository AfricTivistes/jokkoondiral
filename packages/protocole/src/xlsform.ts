// Structure du formulaire Kobo dérivée du protocole (extensions comprises).
// Source unique pour le XLSForm et pour le XML OpenRosa : les deux ne peuvent pas diverger.

import { renommer, versXPath } from "./expr.ts";
import { estObligatoire, t } from "./protocole.ts";
import type { Champ, Envoi, Option, PieceJointe, Protocole, Texte, ValeurLieu } from "./types.ts";

const LANGUES: Record<string, string> = { fr: "Français (fr)", en: "English (en)", wo: "Wolof (wo)", ff: "Pulaar (ff)", bm: "Bambara (bm)", ar: "العربية (ar)" };
export const nomLangue = (l: string) => LANGUES[l] || `${l} (${l})`;

export interface ElementFormulaire {
  kind: "champ" | "groupe";
  name: string;
  type?: string;
  label?: Texte;
  hint?: Texte;
  required?: boolean;
  relevant?: string;
  constraint?: string;
  constraint_message?: Texte;
  calculation?: string;
  appearance?: string;
  choices?: { list: string; options: Option[] } | null;
  items?: ElementFormulaire[];
  /** Valeur écrite dans le XML OpenRosa pour un envoi donné (undefined = élément omis). */
  valeur?: (e: Envoi & { code?: string }) => string | number | undefined;
}

const relevant = (c: Champ) => (c.si ? versXPath(c.si, (id) => id) : "");

function contrainte(c: Champ): string {
  const parts: string[] = [];
  if (c.type === "compteur") {
    parts.push(`. >= ${c.min ?? 0}`);
    if (c.max !== undefined) parts.push(`. <= ${c.max}`);
  }
  if (c.type === "date_heure") parts.push(". <= now()");
  if (c.valide) parts.push(versXPath(renommer(c.valide, { valeur: c.id }), (id) => id));
  return parts.map((p) => (parts.length > 1 ? `(${p})` : p)).join(" and ");
}

const TYPE_XLS: Record<Champ["type"], (c: Champ) => string> = {
  choix: (c) => `select_one l_${c.id}`,
  choix_multiple: (c) => `select_multiple l_${c.id}`,
  compteur: () => "integer",
  texte: () => "text",
  texte_long: () => "text",
  date_heure: () => "dateTime",
  lieu: () => "text",
  photo: () => "image",
};

function valeurChamp(c: Champ) {
  return (e: Envoi) => {
    const v = e.reponses[c.id];
    if (v === undefined || v === null || v === "") return undefined;
    switch (c.type) {
      case "choix_multiple": return (v as string[]).join(" ");
      case "lieu": return (v as ValeurLieu).texte;
      case "photo": return undefined; // les photos restent dans Jokkoondiral (coffre des preuves)
      case "compteur": return v as number;
      default: return String(v);
    }
  };
}

export function structure(proto: Protocole): ElementFormulaire[] {
  const items: ElementFormulaire[] = [
    { kind: "champ", type: "start", name: "start", valeur: (e) => e.debut },
    { kind: "champ", type: "end", name: "end", valeur: (e) => e.fin },
    { kind: "champ", type: "text", name: "code_collecteur", label: { fr: "Code collecteur", en: "Collector code" }, required: true, valeur: (e) => e.code },
    { kind: "champ", type: "calculate", name: "protocole", calculation: `'${proto.id}@${proto.version}'`, valeur: () => `${proto.id}@${proto.version}` },
    { kind: "champ", type: "calculate", name: "extensions", calculation: `'${(proto.extensions || []).join(" ")}'`, valeur: () => (proto.extensions || []).join(" ") || undefined },
    { kind: "champ", type: "calculate", name: "numero_suivi", calculation: "once(concat('JK-', translate(substr(uuid(), 0, 8), 'abcdef', 'ABCDEF')))", valeur: (e) => e.numero_suivi },
  ];
  for (const s of proto.sections) {
    const g: ElementFormulaire = { kind: "groupe", name: s.id, label: s.titre, items: [] };
    for (const c of s.champs) {
      g.items!.push({
        kind: "champ",
        name: c.id,
        type: TYPE_XLS[c.type](c),
        label: c.question,
        hint: c.aide,
        required: estObligatoire(c),
        relevant: relevant(c),
        constraint: contrainte(c),
        constraint_message: c.message_valide,
        appearance: c.type === "texte_long" ? "multiline" : c.type === "choix" && (c.options?.length || 0) > 6 ? "minimal" : undefined,
        choices: c.options ? { list: `l_${c.id}`, options: c.options } : null,
        valeur: valeurChamp(c),
      });
      if (c.type === "lieu") {
        g.items!.push({
          kind: "champ", name: `${c.id}_position`, type: "geopoint",
          label: { fr: "Position (facultative, seulement si c'est sans risque)", en: "Location (optional, only if safe)" },
          relevant: relevant(c),
          valeur: (e) => {
            const p = (e.reponses[c.id] as ValeurLieu | undefined)?.position;
            return p ? `${p.lat} ${p.lon} 0 ${p.precision ?? 0}` : undefined;
          },
        });
      }
    }
    items.push(g);
  }
  return items;
}

/** Lignes XLSForm (feuilles survey, choices, settings), prêtes à écrire en CSV. */
export function xlsform(proto: Protocole, { formId, titre }: { formId?: string; titre?: Texte } = {}) {
  const langues = proto.langues;
  const col = (base: string) => langues.map((l) => `${base}::${nomLangue(l)}`);
  const entete = ["type", "name", ...col("label"), ...col("hint"), "required", "relevant", "constraint", ...col("constraint_message"), "calculation", "appearance"];
  const survey: string[][] = [entete];
  const choices: string[][] = [["list_name", "name", ...col("label")]];
  const listes = new Set<string>();
  const lab = (x: Texte | undefined) => langues.map((l) => t(x, l));
  const ligne = (it: ElementFormulaire) => {
    if (it.kind === "groupe") {
      survey.push(["begin_group", it.name, ...lab(it.label), ...lab(undefined), "", "", "", ...lab(undefined), "", "field-list"]);
      it.items!.forEach(ligne);
      survey.push(["end_group", it.name, ...lab(undefined), ...lab(undefined), "", "", "", ...lab(undefined), "", ""]);
      return;
    }
    survey.push([it.type!, it.name, ...lab(it.label), ...lab(it.hint), it.required ? "yes" : "", it.relevant || "", it.constraint || "",
      ...lab(it.constraint_message), it.calculation || "", it.appearance || ""]);
    if (it.choices && !listes.has(it.choices.list)) {
      listes.add(it.choices.list);
      for (const o of it.choices.options) choices.push([it.choices.list, o.v, ...lab(o.label)]);
    }
  };
  structure(proto).forEach(ligne);
  const settings = [["form_title", "form_id", "version", "default_language"], [t(titre || proto.titre, langues[0]), formId || proto.id, proto.version, nomLangue(langues[0])]];
  return { survey, choices, settings };
}

/** Une feuille en CSV (RFC 4180). */
export const versCsv = (lignes: string[][]) =>
  lignes.map((l) => l.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n") + "\n";

export type { PieceJointe };
