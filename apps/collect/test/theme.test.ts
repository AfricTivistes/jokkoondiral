import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { contraste, themeVersCss, verifierTheme, type Theme } from "@jokkoondiral/shared";
import { chargerConfiguration } from "../plugin/jokkoondiral";

const app = fileURLToPath(new URL("..", import.meta.url));
const lireTheme = (n: string): Theme => JSON.parse(readFileSync(join(app, "config/themes", n, "theme.json"), "utf8"));

test("les thèmes fournis passent le contrôle de contraste, mode sombre compris", () => {
  for (const n of readdirSync(join(app, "config/themes"))) {
    const r = verifierTheme(lireTheme(n));
    assert.deepEqual(r.erreurs, [], `thème ${n}`);
    assert.ok(r.sombre, `thème ${n} : mode sombre disponible`);
  }
});

test("un thème illisible est refusé avec un message clair", () => {
  const t = lireTheme("jokkoondiral");
  const r = verifierTheme({ ...t, couleurs: { ...t.couleurs, texte_sur_primaire: "#3DAA77" } });
  assert.ok(r.erreurs.some((e) => e.includes("texte_sur_primaire / primaire")));
  assert.ok(verifierTheme({ ...t, couleurs: { ...t.couleurs, primaire: "vert" } }).erreurs.some((e) => e.includes("invalide")));
  assert.ok(contraste("#000000", "#FFFFFF") > 20);
});

test("le CSS du thème ne contient que des jetons --jk-*", () => {
  const t = lireTheme("jokkoondiral");
  const css = themeVersCss(t, verifierTheme(t).sombre);
  assert.ok(css.includes("--jk-primaire: #1B5E40;"));
  assert.ok(css.includes("prefers-color-scheme: dark"));
  assert.ok(css.includes("--jk-cible-tactile: 48px;"));
});

test("la configuration se charge avec le thème par défaut, un autre thème ou une extension", () => {
  const defaut = chargerConfiguration(app, {});
  assert.equal(defaut.theme.id, "jokkoondiral");
  assert.equal(defaut.protocole.id, "incident_electoral");
  assert.equal(chargerConfiguration(app, { JK_THEME: "sobre" }).theme.id, "sobre");

  // Une OSC copie la configuration, active l'extension et surcharge la couleur primaire.
  const dossier = mkdtempSync(join(tmpdir(), "jk-instance-"));
  cpSync(join(app, "config/themes"), join(dossier, "themes"), { recursive: true });
  const instance = JSON.parse(readFileSync(join(app, "config/instance.json"), "utf8"));
  writeFileSync(join(dossier, "instance.json"), JSON.stringify({ ...instance, extensions: ["exemple-senegal"], theme_surcharges: { couleurs: { primaire: "#7A1F3D" } } }));
  const osc = chargerConfiguration(app, { JK_INSTANCE: join(dossier, "instance.json") });
  assert.deepEqual(osc.protocole.extensions, ["senegal@1.0.0"]);
  assert.ok(osc.css.includes("--jk-primaire: #7A1F3D;"));

  // Une surcharge illisible arrête le build.
  writeFileSync(join(dossier, "instance.json"), JSON.stringify({ ...instance, theme_surcharges: { couleurs: { primaire: "#F0F0F0" } } }));
  assert.throws(() => chargerConfiguration(app, { JK_INSTANCE: join(dossier, "instance.json") }), /contraste insuffisant/);

  // Un protocole local (dossier protocoles/ de l'instance) remplace celui du paquet.
  mkdirSync(join(dossier, "protocoles/extensions"), { recursive: true });
  writeFileSync(join(dossier, "protocoles/extensions/casse.json"), JSON.stringify({ id: "casse", version: "1", pour: "incident_electoral", ajouts: [{ type: "options", champ: "gravite", options: [{ v: "x", label: "x" }] }] }));
  writeFileSync(join(dossier, "instance.json"), JSON.stringify({ ...instance, extensions: ["casse"] }));
  assert.throws(() => chargerConfiguration(app, { JK_INSTANCE: join(dossier, "instance.json") }), /n'est pas ouverte/);
});

test("aucune couleur écrite en dur dans src/ (tout passe par les jetons du thème)", () => {
  const couleurEnDur = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;
  for (const f of readdirSync(join(app, "src"))) {
    if (!/\.(ts|css)$/.test(f)) continue;
    readFileSync(join(app, "src", f), "utf8").split("\n").forEach((ligne, i) => {
      assert.ok(!couleurEnDur.test(ligne), `${f}:${i + 1} contient une couleur en dur : ${ligne.trim()}`);
    });
  }
});
