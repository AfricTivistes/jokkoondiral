// Soumission OpenRosa (XML) pour envoyer une copie à KoboToolbox.
// Porté de dofbi/collecte-guidee (AGPL-3.0). La racine porte un identifiant provisoire :
// le serveur le remplace par le formulaire Kobo réel (KOBO_FORM_ID), connu de lui seul.

import { structure, type ElementFormulaire } from "./xlsform.ts";
import type { Envoi, Protocole } from "./types.ts";

export const RACINE_PROVISOIRE = "__FORM_ID__";

const esc = (s: string | number) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function versXml(proto: Protocole, envoi: Envoi, code: string): string {
  if (!/^uuid:[0-9a-f-]{36}$/i.test(envoi.instanceID || "")) throw new Error("instanceID invalide (attendu uuid:…)");
  const corps: string[] = [];
  const e = { ...envoi, code };
  const ecrire = (items: ElementFormulaire[], indent: string) => {
    for (const it of items) {
      if (it.kind === "groupe") {
        const avant = corps.length;
        corps.push(`${indent}<${it.name}>`);
        ecrire(it.items || [], indent + "  ");
        if (corps.length === avant + 1) corps.pop();
        else corps.push(`${indent}</${it.name}>`);
        continue;
      }
      const v = it.valeur?.(e);
      if (v === undefined || v === "" || (typeof v === "number" && !Number.isFinite(v))) continue;
      corps.push(`${indent}<${it.name}>${esc(v)}</${it.name}>`);
    }
  };
  ecrire(structure(proto), "  ");
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<${RACINE_PROVISOIRE} id="${RACINE_PROVISOIRE}">`,
    ...corps,
    `  <meta>`,
    `    <instanceID>${esc(envoi.instanceID)}</instanceID>`,
    `  </meta>`,
    `</${RACINE_PROVISOIRE}>`,
  ].join("\n");
}

/** Remplace la racine provisoire par le formulaire Kobo réel. */
export function finaliserXml(xml: string, formId: string, version?: string, racine = formId): string {
  const nom = /^[A-Za-z_][A-Za-z0-9_.-]*$/;
  if (!nom.test(formId) || !nom.test(racine)) throw new Error("KOBO_FORM_ID ou KOBO_ROOT_TAG invalide");
  const ouverture = `<${RACINE_PROVISOIRE} id="${RACINE_PROVISOIRE}">`;
  if (!xml.includes(ouverture) || !xml.trimEnd().endsWith(`</${RACINE_PROVISOIRE}>`)) throw new Error("Structure XML inattendue");
  const v = version ? ` version="${esc(version)}"` : "";
  return xml.replace(ouverture, `<${racine} id="${formId}"${v}>`).replace(new RegExp(`</${RACINE_PROVISOIRE}>\\s*$`), `</${racine}>`);
}

/** uuid v4 (crypto.randomUUID si disponible). */
export function uuid(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  const b = c.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Identifiants d'un nouveau signalement : instanceID OpenRosa et numéro de suivi remis à l'observateur. */
export function nouveauxIdentifiants(): { instanceID: string; numero_suivi: string } {
  const u = uuid();
  return { instanceID: `uuid:${u}`, numero_suivi: `JK-${u.slice(0, 8).toUpperCase()}` };
}
