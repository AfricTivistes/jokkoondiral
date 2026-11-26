// Génère le XLSForm (feuilles survey, choices, settings en CSV) d'un protocole et de ses extensions,
// pour l'importer dans KoboToolbox ou l'utiliser seul dans KoboCollect / ODK Collect.
//
//   pnpm --filter @jokkoondiral/protocole xlsform -- incident-electoral [extension ...] [--sortie dossier]
//
// Exemple : pnpm --filter @jokkoondiral/protocole xlsform -- incident-electoral exemple-senegal

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { appliquerExtensions, versCsv, xlsform, type Extension, type Protocole } from "../src/index.ts";

const args = process.argv.slice(2).filter((a) => a !== "--");
const iSortie = args.indexOf("--sortie");
const sortie = iSortie >= 0 ? args.splice(iSortie, 2)[1] : null;
const [nomBase = "incident-electoral", ...nomsExt] = args;

const dossier = new URL("../protocoles/", import.meta.url);
const lire = <T>(chemin: string): T => JSON.parse(readFileSync(new URL(chemin, dossier), "utf8"));

const base = lire<Protocole>(`${nomBase}.json`);
const extensions = nomsExt.map((n) => lire<Extension>(`extensions/${n}.json`));
const { protocole, erreurs } = appliquerExtensions(base, extensions);
if (erreurs.length) {
  console.error("Protocole invalide :\n- " + erreurs.join("\n- "));
  process.exit(1);
}

const cible = sortie || join(new URL("../kobo/", import.meta.url).pathname, [protocole.id, ...nomsExt].join("+"));
mkdirSync(cible, { recursive: true });
const { survey, choices, settings } = xlsform(protocole);
writeFileSync(join(cible, "survey.csv"), versCsv(survey));
writeFileSync(join(cible, "choices.csv"), versCsv(choices));
writeFileSync(join(cible, "settings.csv"), versCsv(settings));
console.log(`XLSForm écrit dans ${cible} (${survey.length - 1} lignes, extensions : ${protocole.extensions?.join(", ") || "aucune"})`);
console.log("Ouvrez les trois CSV dans un tableur et enregistrez-les comme feuilles d'un même fichier .xlsx pour KoboToolbox.");
