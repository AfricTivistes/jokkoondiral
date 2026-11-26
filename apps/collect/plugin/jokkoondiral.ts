// Plugin Vite : applique la configuration de l'instance au moment du build (et en dev).
// - valide le protocole + ses extensions, et le thème (contraste WCAG AA) : une erreur arrête le build ;
// - injecte les jetons de couleur, le titre et la couleur de thème dans index.html ;
// - génère manifest.webmanifest, copie le logo et l'icône du thème ;
// - génère le service worker avec la liste des fichiers à garder pour le hors ligne.
//
// Choisir une autre configuration sans toucher aux fichiers :
//   JK_THEME=sobre pnpm --filter collect build
//   JK_INSTANCE=/chemin/vers/instance.json pnpm --filter collect build

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import type { Plugin } from "vite";
// Chemins relatifs (et non @jokkoondiral/…) : Vite intègre alors ces sources dans la config
// qu'il compile, ce qui permet de builder avec Node 20 (qui ne lit pas le TypeScript).
import { appliquerExtensions, t, type Extension, type Protocole } from "../../../packages/protocole/src/index.ts";
import { surcharger, themeVersCss, verifierTheme, type Theme } from "../../../packages/shared/src/theme.ts";

const ID_VIRTUEL = "virtual:jokkoondiral";
const lireJson = <T>(chemin: string): T => {
  try {
    return JSON.parse(readFileSync(chemin, "utf8")) as T;
  } catch (e) {
    throw new Error(`Lecture impossible de ${chemin} : ${(e as Error).message}`);
  }
};

export interface Instance {
  nom: Record<string, string> | string;
  nom_court: string;
  description: Record<string, string> | string;
  theme: string;
  theme_surcharges?: Partial<Theme> | null;
  langues: string[];
  langue_defaut: string;
  protocole: string;
  extensions: string[];
  envoi: string;
  identification?: "appareils" | "codes";
  gps: "facultatif" | "desactive";
  purge_apres_envoi: boolean;
  textes: Record<string, Record<string, string> | string>;
  depot?: string;
}

export interface Configuration {
  instance: Instance;
  protocole: Protocole;
  theme: Theme;
  css: string;
  dossierTheme: string;
  avertissements: string[];
}

/** Charge et vérifie toute la configuration. Lève une erreur lisible si quelque chose ne va pas. */
export function chargerConfiguration(racineApp: string, env: NodeJS.ProcessEnv = process.env): Configuration {
  const cheminInstance = env.JK_INSTANCE ? resolve(env.JK_INSTANCE) : join(racineApp, "config/instance.json");
  const instance = lireJson<Instance>(cheminInstance);
  const dossierConfig = dirname(cheminInstance);

  // Protocole et extensions : d'abord dans le dossier de l'instance, sinon ceux du paquet @jokkoondiral/protocole.
  const dossierProtocoles = [join(dossierConfig, "protocoles"), resolve(racineApp, "../../packages/protocole/protocoles")];
  const trouver = (relatif: string) => {
    for (const d of dossierProtocoles) if (existsSync(join(d, relatif))) return join(d, relatif);
    throw new Error(`Fichier de protocole introuvable : ${relatif} (cherché dans ${dossierProtocoles.join(", ")})`);
  };
  const base = lireJson<Protocole>(trouver(`${instance.protocole}.json`));
  const extensions = (instance.extensions || []).map((n) => lireJson<Extension>(trouver(`extensions/${n}.json`)));
  const { protocole, erreurs } = appliquerExtensions(base, extensions);
  if (erreurs.length) throw new Error("Protocole invalide :\n- " + erreurs.join("\n- "));

  const nomTheme = env.JK_THEME || instance.theme;
  const dossierTheme = join(dossierConfig, "themes", nomTheme);
  const theme = surcharger(lireJson<Theme>(join(dossierTheme, "theme.json")), instance.theme_surcharges || undefined);
  const verif = verifierTheme(theme);
  if (verif.erreurs.length) throw new Error(`Thème « ${nomTheme} » refusé :\n- ` + verif.erreurs.join("\n- "));
  for (const f of [theme.logo, theme.icone]) {
    if (f && !existsSync(join(dossierTheme, f))) throw new Error(`Thème « ${nomTheme} » : fichier introuvable ${f}`);
  }
  return { instance, protocole, theme, css: themeVersCss(theme, verif.sombre), dossierTheme, avertissements: verif.avertissements };
}

const TYPES_MIME: Record<string, string> = { ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg" };
const echapper = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

function manifest(c: Configuration) {
  const l = c.instance.langue_defaut;
  const icone = c.theme.icone || c.theme.logo;
  return {
    name: t(c.instance.nom, l),
    short_name: c.instance.nom_court,
    description: t(c.instance.description, l),
    lang: l,
    start_url: "./",
    scope: "./",
    display: "standalone",
    background_color: c.theme.couleurs.fond,
    theme_color: c.theme.couleurs.primaire,
    icons: icone ? [{ src: `theme/${icone}`, sizes: "any", type: TYPES_MIME[extname(icone)] || "image/svg+xml", purpose: "any" }] : [],
  };
}

function serviceWorker(fichiers: string[], version: string) {
  return `// Généré au build : garde l'application en cache pour fonctionner sans réseau.
const CACHE = "jk-collect-${version}";
const FICHIERS = ${JSON.stringify(["./", ...fichiers])};
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHIERS))); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((cles) => Promise.all(cles.filter((k) => k.startsWith("jk-collect-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("message", (e) => { if (e.data === "activer") self.skipWaiting(); });
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  if (e.request.mode === "navigate") { e.respondWith(caches.match("index.html").then((r) => r || fetch(e.request))); return; }
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
`;
}

export default function jokkoondiral(racineApp: string): Plugin {
  let config: Configuration;
  const charger = () => {
    config = chargerConfiguration(racineApp);
    for (const a of config.avertissements) console.warn(`[jokkoondiral] ${a}`);
    return config;
  };
  return {
    name: "jokkoondiral",
    enforce: "post",
    buildStart() {
      charger();
      this.addWatchFile(join(racineApp, "config/instance.json"));
    },
    resolveId(id) {
      return id === ID_VIRTUEL ? "\0" + ID_VIRTUEL : null;
    },
    load(id) {
      if (id !== "\0" + ID_VIRTUEL) return null;
      const { instance, protocole, theme } = config;
      const publique = { ...instance, theme_surcharges: undefined };
      return [
        `export const instance = ${JSON.stringify(publique)};`,
        `export const protocole = ${JSON.stringify(protocole)};`,
        `export const theme = ${JSON.stringify({ id: theme.id, nom: theme.nom, logo: theme.logo ? `theme/${theme.logo}` : null, icone: theme.icone ? `theme/${theme.icone}` : null })};`,
      ].join("\n");
    },
    transformIndexHtml(html) {
      const c = config ?? charger();
      const l = c.instance.langue_defaut;
      const icone = c.theme.icone || c.theme.logo;
      const tete = [
        `<title>${echapper(t(c.instance.nom, l))}</title>`,
        `<meta name="description" content="${echapper(t(c.instance.description, l))}">`,
        `<meta name="theme-color" content="${c.theme.couleurs.primaire}">`,
        `<link rel="manifest" href="manifest.webmanifest">`,
        icone ? `<link rel="icon" href="theme/${icone}" type="${TYPES_MIME[extname(icone)] || "image/svg+xml"}">` : "",
        `<style id="jk-theme">\n${c.css}</style>`,
      ].filter(Boolean).join("\n");
      return html.replace("<!--jk-tete-->", tete).replace('lang="fr"', `lang="${l}"`);
    },
    configureServer(serveur) {
      serveur.middlewares.use((req, res, next) => {
        const chemin = (req.url || "").split("?")[0];
        if (chemin.endsWith("/manifest.webmanifest")) {
          res.setHeader("Content-Type", "application/manifest+json");
          res.end(JSON.stringify(manifest(config ?? charger())));
          return;
        }
        const m = chemin.match(/\/theme\/([\w.-]+)$/);
        if (m) {
          const c = config ?? charger();
          const fichier = join(c.dossierTheme, m[1]);
          if ([c.theme.logo, c.theme.icone].includes(m[1]) && existsSync(fichier)) {
            res.setHeader("Content-Type", TYPES_MIME[extname(fichier)] || "application/octet-stream");
            res.end(readFileSync(fichier));
            return;
          }
        }
        next();
      });
    },
    generateBundle(_options, bundle) {
      const c = config;
      for (const f of new Set([c.theme.logo, c.theme.icone].filter(Boolean) as string[])) {
        this.emitFile({ type: "asset", fileName: `theme/${f}`, source: readFileSync(join(c.dossierTheme, f)) });
      }
      this.emitFile({ type: "asset", fileName: "manifest.webmanifest", source: JSON.stringify(manifest(c), null, 2) });
      const fichiers = [...new Set([...Object.keys(bundle), "index.html", "manifest.webmanifest",
        ...[c.theme.logo, c.theme.icone].filter(Boolean).map((f) => `theme/${f}`)])].filter((f) => !f.endsWith(".map")).sort();
      const version = createHash("sha256").update(fichiers.join("|") + c.css + JSON.stringify(c.protocole)).digest("hex").slice(0, 12);
      this.emitFile({ type: "asset", fileName: "sw.js", source: serviceWorker(fichiers, version) });
    },
  };
}
