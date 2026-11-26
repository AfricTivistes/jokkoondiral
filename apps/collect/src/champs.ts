// Rendu d'une question selon le type de champ du protocole.
// Chaque rendu reçoit la valeur actuelle et appelle `valider(valeur)` pour passer à la suite.

import { t, type Champ, type PieceJointe, type Valeur, type ValeurLieu } from "@jokkoondiral/protocole";
import { instance } from "virtual:jokkoondiral";
import { langue, tr } from "./i18n";
import { preparerPhoto } from "./photo";
import { pieces } from "./store";
import { bouton, boutonChoix, h } from "./ui";

export interface ContexteChamp {
  champ: Champ;
  valeur: Valeur | undefined;
  signalement: string;
  valider: (v: Valeur | undefined) => void;
}

const GRAVITES = new Set(["faible", "moyenne", "critique"]);

/** Pour un datetime-local : ISO → "AAAA-MM-JJTHH:MM" en heure locale. */
function versLocal(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function rendreChoix({ champ, valeur, valider }: ContexteChamp): HTMLElement {
  const l = langue();
  const liste = h("div", { class: "liste-choix", role: "radiogroup" });
  for (const o of champ.options || []) {
    liste.append(boutonChoix({
      titre: t(o.label, l),
      sous: o.aide ? t(o.aide, l) : undefined,
      choisi: valeur === o.v,
      role: "radio",
      repere: champ.id === "gravite" && GRAVITES.has(o.v) ? o.v : undefined,
      // Un choix unique passe directement à la question suivante.
      onclick: () => valider(o.v),
    }));
  }
  return liste;
}

function rendreChoixMultiple({ champ, valeur, valider }: ContexteChamp): HTMLElement {
  const l = langue();
  let choisis = new Set(Array.isArray(valeur) ? (valeur as string[]) : []);
  const liste = h("div", { class: "liste-choix" });
  const dessiner = () => {
    liste.replaceChildren(...(champ.options || []).map((o) => boutonChoix({
      titre: t(o.label, l),
      sous: o.aide ? t(o.aide, l) : undefined,
      choisi: choisis.has(o.v),
      onclick: () => {
        if (choisis.has(o.v)) choisis.delete(o.v);
        else if (o.exclusive) choisis = new Set([o.v]);
        else {
          for (const x of champ.options || []) if (x.exclusive) choisis.delete(x.v);
          choisis.add(o.v);
        }
        dessiner();
      },
    })));
  };
  dessiner();
  return h("div", null, liste, bouton(tr("continuer"), () => valider([...choisis]), "btn grand"));
}

function rendreCompteur({ champ, valeur, valider }: ContexteChamp): HTMLElement {
  const min = champ.min ?? 0;
  const entree = h("input", { type: "number", inputmode: "numeric", min, max: champ.max ?? null, value: typeof valeur === "number" ? valeur : "", id: `q-${champ.id}`, "aria-label": t(champ.question, langue()) });
  const lire = () => (entree.value === "" ? undefined : Math.round(Number(entree.value)));
  const regler = (delta: number) => {
    const n = Math.max(min, Math.min(champ.max ?? Infinity, (lire() ?? min) + delta));
    entree.value = String(n);
  };
  return h("div", null,
    h("div", { class: "compteur" },
      bouton("−", () => regler(-1), "btn fantome carre", { "aria-label": "−1" }),
      entree,
      bouton("+", () => regler(1), "btn fantome carre", { "aria-label": "+1" })),
    bouton(tr("continuer"), () => valider(lire()), "btn grand"));
}

function rendreTexte({ champ, valeur, valider }: ContexteChamp): HTMLElement {
  const long = champ.type === "texte_long";
  const max = champ.max_longueur ?? (long ? 2000 : 200);
  const attrs = { id: `q-${champ.id}`, maxlength: max, "aria-label": t(champ.question, langue()), autocomplete: "off" };
  const entree = long ? h("textarea", { ...attrs, rows: 6 }) : h("input", { ...attrs, type: "text" });
  entree.value = typeof valeur === "string" ? valeur : "";
  const compte = h("p", { class: "aide-champ", "aria-live": "polite" });
  const maj = () => { compte.textContent = tr("caracteres", { n: entree.value.length, max }); };
  entree.addEventListener("input", maj);
  maj();
  return h("div", null, entree, compte, bouton(tr("continuer"), () => valider(entree.value.trim() || undefined), "btn grand"));
}

function rendreDateHeure({ champ, valeur, valider }: ContexteChamp): HTMLElement {
  const entree = h("input", { type: "datetime-local", id: `q-${champ.id}`, max: versLocal(new Date().toISOString()), "aria-label": t(champ.question, langue()) });
  if (typeof valeur === "string") entree.value = versLocal(valeur);
  const lire = () => (entree.value ? new Date(entree.value).toISOString() : undefined);
  return h("div", null,
    entree,
    bouton(tr("maintenant"), () => { entree.value = versLocal(new Date().toISOString()); }, "btn fantome"),
    bouton(tr("continuer"), () => valider(lire()), "btn grand"));
}

function rendreLieu({ champ, valeur, valider }: ContexteChamp): HTMLElement {
  const actuel = (valeur as ValeurLieu | undefined) || { texte: "" };
  let position = actuel.position;
  const entree = h("input", { type: "text", id: `q-${champ.id}`, maxlength: champ.max_longueur ?? 200, autocomplete: "off", "aria-label": t(champ.question, langue()) });
  entree.value = actuel.texte || "";
  const zoneGps = h("div", { class: "zone-gps" });
  const dessinerGps = (message?: string) => {
    if (instance.gps === "desactive") { zoneGps.replaceChildren(); return; }
    const enfants: (HTMLElement | null)[] = [h("p", { class: "aide-champ" }, tr("positionAide"))];
    if (message) enfants.push(h("p", { class: "aide-champ", role: "status" }, message));
    if (position) {
      enfants.push(h("p", { class: "ok" }, tr("positionAjoutee", { p: Math.round(position.precision ?? 0) })));
      enfants.push(bouton(tr("positionRetirer"), () => { position = undefined; dessinerGps(); }, "btn fantome"));
    } else {
      enfants.push(bouton(tr("positionAjouter"), () => {
        if (!("geolocation" in navigator)) { dessinerGps(tr("positionRefusee")); return; }
        dessinerGps(tr("positionEnCours"));
        navigator.geolocation.getCurrentPosition(
          (p) => {
            position = { lat: Math.round(p.coords.latitude * 1e6) / 1e6, lon: Math.round(p.coords.longitude * 1e6) / 1e6, precision: Math.round(p.coords.accuracy) };
            dessinerGps();
          },
          () => dessinerGps(tr("positionRefusee")),
          { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
        );
      }, "btn fantome"));
    }
    zoneGps.replaceChildren(...enfants.filter((x): x is HTMLElement => Boolean(x)));
  };
  dessinerGps();
  return h("div", null, entree, zoneGps, bouton(tr("continuer"), () => {
    const texte = entree.value.trim();
    valider(texte ? { texte, ...(position ? { position } : {}) } : undefined);
  }, "btn grand"));
}

function rendrePhoto({ champ, valeur, signalement, valider }: ContexteChamp): HTMLElement {
  let liste: PieceJointe[] = Array.isArray(valeur) ? (valeur as PieceJointe[]) : [];
  const max = champ.max ?? 3;
  const vignettes = h("div", { class: "vignettes" });
  const etat = h("p", { class: "aide-champ", role: "status" });
  const urls: string[] = [];
  const entree = h("input", { type: "file", accept: "image/*", capture: "environment", class: "masque", id: `q-${champ.id}` });

  const dessiner = async () => {
    urls.splice(0).forEach((u) => URL.revokeObjectURL(u));
    const stockees = await pieces.lister(signalement);
    vignettes.replaceChildren(...liste.map((p) => {
      const blob = stockees.find((s) => s.id === p.id)?.blob;
      const url = blob ? URL.createObjectURL(blob) : "";
      if (url) urls.push(url);
      return h("figure", { class: "vignette" },
        url ? h("img", { src: url, alt: "" }) : null,
        bouton(tr("photoRetirer"), async () => {
          await pieces.supprimer(p.id);
          liste = liste.filter((x) => x.id !== p.id);
          dessiner();
        }, "btn fantome petit"));
    }));
    const plein = liste.length >= max;
    entree.disabled = plein;
    ajouter.classList.toggle("inactif", plein);
    ajouter.setAttribute("aria-disabled", String(plein));
    suite.textContent = liste.length ? tr("continuer") : tr("sansPhoto");
  };

  entree.addEventListener("change", async () => {
    const fichier = entree.files?.[0];
    entree.value = "";
    if (!fichier) return;
    etat.textContent = tr("photoTraitement");
    try {
      const blob = await preparerPhoto(fichier);
      const id = crypto.randomUUID();
      await pieces.ecrire({ id, signalement, blob, type: blob.type, taille: blob.size });
      liste = [...liste, { id, type: blob.type, taille: blob.size }];
      etat.textContent = "";
      dessiner();
    } catch {
      etat.textContent = tr("photoErreur");
    }
  });

  const ajouter = h("label", { class: "btn fantome", for: `q-${champ.id}` }, tr("photoAjouter"));
  const suite = bouton(tr("sansPhoto"), () => valider(liste.length ? liste : undefined), "btn grand");
  dessiner();
  return h("div", null, entree, vignettes, ajouter, etat, h("p", { class: "aide-champ" }, tr("photoAide")), suite);
}

const RENDUS: Record<Champ["type"], (c: ContexteChamp) => HTMLElement> = {
  choix: rendreChoix,
  choix_multiple: rendreChoixMultiple,
  compteur: rendreCompteur,
  texte: rendreTexte,
  texte_long: rendreTexte,
  date_heure: rendreDateHeure,
  lieu: rendreLieu,
  photo: rendrePhoto,
};

export const rendreChamp = (c: ContexteChamp) => RENDUS[c.champ.type](c);

/** Réponse lisible pour l'écran de relecture. */
export function resumeValeur(champ: Champ, valeur: Valeur | undefined): string {
  const l = langue();
  if (valeur === undefined || valeur === "") return tr("sansReponse");
  switch (champ.type) {
    case "choix": return t(champ.options?.find((o) => o.v === valeur)?.label, l) || String(valeur);
    case "choix_multiple": return (valeur as string[]).map((v) => t(champ.options?.find((o) => o.v === v)?.label, l) || v).join(", ") || tr("sansReponse");
    case "date_heure": return new Date(String(valeur)).toLocaleString(l === "en" ? "en-GB" : "fr-FR", { dateStyle: "medium", timeStyle: "short" });
    case "lieu": {
      const v = valeur as ValeurLieu;
      return v.position ? `${v.texte} · GPS ±${Math.round(v.position.precision ?? 0)} m` : v.texte;
    }
    case "photo": return `${(valeur as PieceJointe[]).length} photo(s)`;
    default: return String(valeur);
  }
}
