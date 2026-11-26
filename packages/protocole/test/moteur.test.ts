import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  analyser, evaluer, renommer, variables, versXPath,
  valider, appliquerExtensions, champs,
  demarrer, repondre, precedent, champsVisibles, verifierEnvoi, verifierReponses, progression,
  xlsform, versXml, finaliserXml, nouveauxIdentifiants,
  type Envoi, type Extension, type Protocole,
} from "../src/index.ts";

const lire = <T>(p: string): T => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const base = lire<Protocole>("../protocoles/incident-electoral.json");
const senegal = lire<Extension>("../protocoles/extensions/exemple-senegal.json");

// ── Expressions ─────────────────────────────────────────────────────

test("expressions : comparaisons, chaînes, fonctions", () => {
  assert.equal(evaluer("a == 'x' and b > 2", { a: "x", b: 3 }), true);
  assert.equal(evaluer("a != 'x'", { a: "y" }), true);
  assert.equal(evaluer("a != 'x'", {}), false, "une variable absente rend la comparaison fausse");
  assert.equal(evaluer("selected(m, 'b')", { m: ["a", "b"] }), true);
  assert.equal(evaluer("count(m) > 1", { m: ["a", "b"] }), true);
  assert.equal(evaluer("not(a == 'x')", { a: "x" }), false);
  assert.equal(evaluer("sum(a, b) * 2", { a: 1 }), 2);
  assert.deepEqual(variables("selected(m, 'b') or n >= 3").sort(), ["m", "n"]);
  assert.throws(() => analyser("alert(1)"), /Fonction inconnue/);
  assert.throws(() => analyser("a ="), /invalide|inattendu/);
});

test("expressions : renommage et XPath", () => {
  assert.equal(renommer("region == 'dakar' and gravite == 'critique'", { region: "x_sn_region" }), "x_sn_region == 'dakar' and gravite == 'critique'");
  assert.equal(versXPath("moment == 'plus_tot'", (id) => id), "(${moment} = 'plus_tot')");
  assert.equal(versXPath("selected(m, 'a') and count(m) <= 2", (id) => id), "(selected(${m}, 'a') and (count-selected(${m}) <= 2))");
});

// ── Protocole et extensions ─────────────────────────────────────────

test("le protocole de base est valide", () => {
  assert.deepEqual(valider(base), []);
});

test("une extension ajoute champs, options et section sans toucher au noyau", () => {
  const { protocole, erreurs } = appliquerExtensions(base, [senegal]);
  assert.deepEqual(erreurs, []);
  const ids = champs(protocole).map((c) => c.id);
  assert.equal(ids[ids.indexOf("lieu") + 1], "x_senegal_region", "champ inséré après « lieu »");
  assert.ok(ids.includes("x_senegal_personnes_touchees"));
  assert.ok(champs(protocole).find((c) => c.id === "categorie")!.options!.some((o) => o.v === "carte_electeur"));
  assert.deepEqual(protocole.extensions, ["senegal@1.0.0"]);
  for (const c of champs(base)) assert.ok(ids.includes(c.id), `champ du noyau conservé : ${c.id}`);
});

test("une extension ne peut pas ajouter d'options à une liste fermée ni viser une colonne", () => {
  const ext: Extension = {
    id: "mauvaise", version: "1.0.0", pour: "incident_electoral",
    ajouts: [
      { type: "options", champ: "gravite", options: [{ v: "extreme", label: "Extrême" }] },
      { type: "champs", section: "incident", champs: [{ id: "pirate", type: "texte", question: "?", colonne: "status" }] },
      { type: "champs", section: "inconnue", champs: [{ id: "a", type: "texte", question: "?" }] },
    ],
  };
  const { erreurs } = appliquerExtensions(base, [ext]);
  assert.ok(erreurs.some((e) => e.includes("n'est pas ouverte")));
  assert.ok(erreurs.some((e) => e.includes("colonne")));
  assert.ok(erreurs.some((e) => e.includes("section inconnue")));
});

test("une extension pour un autre protocole ou en conflit est refusée", () => {
  const autre: Extension = { id: "x", version: "1", pour: "autre_protocole", ajouts: [] };
  assert.ok(appliquerExtensions(base, [autre]).erreurs.some((e) => e.includes("vise")));
  const doublon: Extension = { id: "d", version: "1", pour: "incident_electoral", ajouts: [{ type: "options", champ: "categorie", options: [{ v: "violence", label: "x" }] }] };
  assert.ok(appliquerExtensions(base, [doublon]).erreurs.some((e) => e.includes("option en double")));
});

test("une condition qui vise un champ absent ou postérieur est refusée", () => {
  const p: Protocole = { ...base, sections: [{ id: "s", titre: "S", champs: [{ id: "a", type: "texte", question: "?", si: "b == 'x'" }, { id: "b", type: "texte", question: "?" }] }] };
  assert.ok(valider(p).some((e) => e.includes("n'est pas un champ précédent")));
});

// ── Moteur ──────────────────────────────────────────────────────────

test("le parcours pose une question à la fois et suit les conditions", () => {
  let etat = demarrer(base);
  assert.equal(etat.courant, "lieu");
  const r1 = repondre(base, etat, undefined);
  assert.equal(r1.erreur?.code, "obligatoire");
  etat = repondre(base, etat, { texte: "Bureau 12, école Ndiaye" }).etat;
  assert.equal(etat.courant, "moment");
  etat = repondre(base, etat, "maintenant").etat;
  assert.equal(etat.courant, "categorie", "« heure » sautée quand l'incident est en cours");
  const retour = precedent(etat)!;
  assert.equal(retour.courant, "moment");
  etat = repondre(base, retour, "plus_tot").etat;
  assert.equal(etat.courant, "heure");
  const futur = new Date(Date.now() + 3600_000).toISOString();
  assert.equal(repondre(base, etat, futur).erreur?.code, "futur");
  etat = repondre(base, etat, new Date(Date.now() - 3600_000).toISOString()).etat;
  etat = repondre(base, etat, "violence").etat;
  assert.equal(repondre(base, etat, "inexistante").erreur?.code, "option");
  etat = repondre(base, etat, "critique").etat;
  etat = repondre(base, etat, "Des militants empêchent l'entrée du bureau.").etat;
  etat = repondre(base, etat, "vu").etat;
  etat = repondre(base, etat, "sur").etat;
  assert.equal(etat.courant, "photos");
  etat = repondre(base, etat, undefined).etat;
  assert.equal(etat.courant, null, "fin du parcours : relecture");
  assert.deepEqual(verifierReponses(base, etat.reponses), []);
  assert.deepEqual(progression(base, etat), { position: 9, total: 9 });
});

test("changer une réponse efface les réponses devenues sans objet", () => {
  let etat = demarrer(base, { lieu: { texte: "École" }, moment: "plus_tot", heure: new Date(Date.now() - 60_000).toISOString() });
  etat = { ...etat, courant: "moment" };
  etat = repondre(base, etat, "maintenant").etat;
  assert.ok(!("heure" in etat.reponses));
  assert.ok(!champsVisibles(base, etat.reponses).some((c) => c.id === "heure"));
});

// ── Envoi, XLSForm, OpenRosa ────────────────────────────────────────

function envoiComplet(proto: Protocole): Envoi {
  const ids = nouveauxIdentifiants();
  return {
    ...ids,
    protocole: { id: proto.id, version: proto.version, extensions: proto.extensions || [] },
    debut: new Date(Date.now() - 120_000).toISOString(),
    fin: new Date().toISOString(),
    langue: "fr",
    reponses: {
      lieu: { texte: "Bureau 4 <école>", position: { lat: 14.69, lon: -17.44, precision: 12 } },
      moment: "maintenant",
      categorie: "achat_voix",
      gravite: "moyenne",
      description: "Distribution de billets devant le bureau.",
      source_information: "rapporte",
      confiance: "assez_sur",
    },
  };
}

test("le serveur accepte un envoi complet et refuse un envoi trafiqué", () => {
  const e = envoiComplet(base);
  assert.match(e.numero_suivi, /^JK-[0-9A-F]{8}$/);
  assert.deepEqual(verifierEnvoi(base, e), []);
  assert.ok(verifierEnvoi(base, { ...e, reponses: { ...e.reponses, heure: "2020-01-01T00:00:00Z" } }).some((x) => x.includes("non affiché")));
  assert.ok(verifierEnvoi(base, { ...e, reponses: { ...e.reponses, inconnu: "x" } }).some((x) => x.includes("inconnu")));
  assert.ok(verifierEnvoi(base, { ...e, instanceID: "pas-un-uuid" }).some((x) => x.includes("instanceID")));
});

test("le XLSForm inclut les extensions, les conditions et les listes", () => {
  const { protocole } = appliquerExtensions(base, [senegal]);
  const { survey, choices, settings } = xlsform(protocole);
  const noms = survey.map((l) => l[1]);
  assert.ok(noms.includes("x_senegal_region"));
  assert.ok(noms.includes("lieu_position"));
  const heure = survey.find((l) => l[1] === "heure")!;
  assert.ok(heure.includes("(${moment} = 'plus_tot')"));
  assert.ok(choices.some((l) => l[0] === "l_categorie" && l[1] === "carte_electeur"));
  assert.equal(settings[1][1], "incident_electoral");
});

test("le XML OpenRosa échappe les valeurs et se finalise côté serveur", () => {
  const e = envoiComplet(base);
  const xml = versXml(base, e, "EQ01");
  assert.ok(xml.includes("<lieu>Bureau 4 &lt;école&gt;</lieu>"));
  assert.ok(xml.includes("<lieu_position>14.69 -17.44 0 12</lieu_position>"));
  assert.ok(xml.includes("<code_collecteur>EQ01</code_collecteur>"));
  assert.ok(!xml.includes("<heure>"), "champ non affiché omis");
  const final = finaliserXml(xml, "aB3cD4", "v1");
  assert.ok(final.startsWith(`<?xml version="1.0" encoding="UTF-8"?>\n<aB3cD4 id="aB3cD4" version="v1">`));
  assert.throws(() => finaliserXml(xml, "<script>"), /invalide/);
});
