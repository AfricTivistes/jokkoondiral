// Petits composants d'interface, sans dépendance. Le style vient de styles.css (jetons --jk-*).

type Attributs = Record<string, string | number | boolean | null | undefined | ((e: Event) => void)>;
type Enfant = Node | string | null | undefined | false | Enfant[];

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: Attributs | null, ...enfants: Enfant[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") e.className = String(v);
    else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v as EventListener);
    else e.setAttribute(k, v === true ? "" : String(v));
  }
  const ajouter = (x: Enfant) => {
    if (Array.isArray(x)) x.forEach(ajouter);
    else if (x !== null && x !== undefined && x !== false) e.append(x);
  };
  enfants.forEach(ajouter);
  return e;
}

/** Bouton principal ou secondaire. */
export const bouton = (libelle: string, onclick: () => void, classe = "btn", attrs: Attributs = {}) =>
  h("button", { class: classe, type: "button", onclick, ...attrs }, libelle);

/** Gros bouton de réponse (titre + précision), avec repère coloré facultatif. */
export function boutonChoix(opts: { titre: string; sous?: string; choisi?: boolean; repere?: string; role?: string; onclick: () => void }) {
  return h("button", {
    class: "choix" + (opts.choisi ? " choisi" : ""),
    type: "button",
    role: opts.role || null,
    "aria-pressed": opts.role ? null : String(Boolean(opts.choisi)),
    "aria-checked": opts.role ? String(Boolean(opts.choisi)) : null,
    onclick: opts.onclick,
  },
  opts.repere ? h("span", { class: `repere repere-${opts.repere}`, "aria-hidden": "true" }) : null,
  h("span", { class: "choix-texte" }, h("b", null, opts.titre), opts.sous ? h("small", null, opts.sous) : null));
}

/** Bouton en deux temps pour les actions destructives (pas de boîte de dialogue native). */
export function boutonConfirme(libelle: string, libelleConfirmation: string, action: () => void, classe = "btn danger fantome") {
  let arme = false;
  let minuterie: ReturnType<typeof setTimeout>;
  const b = h("button", { class: classe, type: "button", onclick: () => {
    if (!arme) {
      arme = true;
      b.textContent = libelleConfirmation;
      minuterie = setTimeout(() => { arme = false; b.textContent = libelle; }, 4000);
      return;
    }
    clearTimeout(minuterie);
    action();
  } }, libelle);
  return b;
}

/** Pastille d'état (statut d'un signalement, réseau). */
export const pastille = (texte: string, variante: string) => h("span", { class: `pastille ${variante}` }, texte);

/** Message d'erreur annoncé aux lecteurs d'écran. */
export const messageErreur = (texte: string | null) => (texte ? h("p", { class: "message-erreur", role: "alert" }, texte) : null);

export function formaterDate(iso: string, langue: string): string {
  try {
    return new Date(iso).toLocaleString(langue === "en" ? "en-GB" : "fr-FR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}
