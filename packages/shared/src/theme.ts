// Thèmes visuels : une OSC change couleurs, polices et logo dans un fichier JSON,
// sans toucher au CSS ni au code. Toutes les apps lisent les mêmes jetons (--jk-*).
// Le contrôle de contraste (WCAG AA) empêche de publier un thème illisible.

export interface CouleursTheme {
  primaire: string;
  texte_sur_primaire: string;
  secondaire: string;
  accent: string;
  texte_sur_accent: string;
  fond: string;
  surface: string;
  texte: string;
  texte_doux: string;
  bordure: string;
  gravite_faible: string;
  gravite_moyenne: string;
  gravite_critique: string;
  succes: string;
  alerte: string;
  erreur: string;
}

export interface Theme {
  id: string;
  nom: string;
  couleurs: CouleursTheme;
  polices?: { texte?: string; titres?: string };
  /** Rayon des angles, en px. */
  rayon?: number;
  /** Taille du texte courant, en px (16 à 20). */
  taille_base?: number;
  /** Fichiers d'image relatifs au dossier du thème. */
  logo?: string;
  icone?: string;
  /** "auto" : palette sombre dérivée ; "desactive" ; ou couleurs sombres fournies. */
  mode_sombre?: "auto" | "desactive" | Partial<CouleursTheme>;
}

export const COULEURS_REQUISES: (keyof CouleursTheme)[] = [
  "primaire", "texte_sur_primaire", "secondaire", "accent", "texte_sur_accent", "fond", "surface",
  "texte", "texte_doux", "bordure", "gravite_faible", "gravite_moyenne", "gravite_critique", "succes", "alerte", "erreur",
];

const POLICE_SYSTEME = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function rgb(hex: string): [number, number, number] {
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

const hex = (c: number[]) => "#" + c.map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0")).join("").toUpperCase();

/** Mélange deux couleurs : t = 0 → a, t = 1 → b. */
export function melanger(a: string, b: string, t: number): string {
  const x = rgb(a), y = rgb(b);
  return hex(x.map((v, i) => v + (y[i] - v) * t));
}

function luminance(c: string): number {
  const [r, g, b] = rgb(c).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Rapport de contraste WCAG entre deux couleurs (1 à 21). */
export function contraste(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Paires vérifiées : [premier plan, arrière-plan, rapport minimal, usage]. */
const PAIRES: [keyof CouleursTheme, keyof CouleursTheme, number, string][] = [
  ["texte", "fond", 4.5, "texte courant sur le fond"],
  ["texte", "surface", 4.5, "texte courant sur les cartes"],
  ["texte_doux", "surface", 4.5, "texte secondaire"],
  ["texte_sur_primaire", "primaire", 4.5, "texte des boutons principaux"],
  ["texte_sur_accent", "accent", 4.5, "texte sur la couleur d'accent"],
  ["primaire", "surface", 4.5, "liens et boutons secondaires"],
  ["erreur", "surface", 4.5, "messages d'erreur"],
  ["gravite_faible", "surface", 3, "repère de gravité faible"],
  ["gravite_moyenne", "surface", 3, "repère de gravité moyenne"],
  ["gravite_critique", "surface", 3, "repère de gravité critique"],
  ["bordure", "surface", 1.2, "bordures"],
];

function verifierCouleurs(c: Partial<CouleursTheme>, prefixe = ""): string[] {
  const err: string[] = [];
  for (const k of COULEURS_REQUISES) {
    if (!c[k]) err.push(`${prefixe}couleur manquante : ${k}`);
    else if (!HEX.test(c[k]!)) err.push(`${prefixe}couleur invalide pour ${k} : « ${c[k]} » (attendu #RRGGBB)`);
  }
  if (err.length) return err;
  for (const [a, b, min, usage] of PAIRES) {
    const r = contraste(c[a]!, c[b]!);
    if (r < min) err.push(`${prefixe}contraste insuffisant ${a} / ${b} (${usage}) : ${r.toFixed(2)} < ${min}`);
  }
  return err;
}

/** Palette sombre dérivée de la palette claire. */
export function paletteSombre(theme: Theme): CouleursTheme {
  const c = theme.couleurs;
  if (theme.mode_sombre && typeof theme.mode_sombre === "object") return { ...c, ...theme.mode_sombre } as CouleursTheme;
  const fond = melanger(c.texte, "#000000", 0.35);
  const surface = melanger(fond, "#FFFFFF", 0.07);
  const eclaircir = (x: string) => melanger(x, "#FFFFFF", 0.45);
  return {
    primaire: eclaircir(c.primaire),
    texte_sur_primaire: fond,
    secondaire: eclaircir(c.secondaire),
    accent: c.accent,
    texte_sur_accent: c.texte_sur_accent,
    fond,
    surface,
    texte: c.fond,
    texte_doux: melanger(c.fond, surface, 0.3),
    bordure: melanger(surface, "#FFFFFF", 0.18),
    gravite_faible: eclaircir(c.gravite_faible),
    gravite_moyenne: eclaircir(c.gravite_moyenne),
    gravite_critique: eclaircir(c.gravite_critique),
    succes: eclaircir(c.succes),
    alerte: eclaircir(c.alerte),
    erreur: eclaircir(c.erreur),
  };
}

export interface ResultatTheme {
  erreurs: string[];
  avertissements: string[];
  /** Palette sombre retenue, ou null si désactivée ou illisible. */
  sombre: CouleursTheme | null;
}

/** Vérifie un thème. Les erreurs bloquent la publication ; un mode sombre illisible est simplement désactivé. */
export function verifierTheme(theme: Theme): ResultatTheme {
  const erreurs: string[] = [];
  const avertissements: string[] = [];
  if (!theme || typeof theme !== "object") return { erreurs: ["thème illisible"], avertissements, sombre: null };
  if (!theme.id) erreurs.push("id du thème manquant");
  if (!theme.nom) erreurs.push("nom du thème manquant");
  erreurs.push(...verifierCouleurs(theme.couleurs || {}));
  if (theme.taille_base !== undefined && (theme.taille_base < 16 || theme.taille_base > 20)) erreurs.push("taille_base doit être comprise entre 16 et 20 px");
  if (theme.rayon !== undefined && (theme.rayon < 0 || theme.rayon > 32)) erreurs.push("rayon doit être compris entre 0 et 32 px");
  let sombre: CouleursTheme | null = null;
  if (!erreurs.length && theme.mode_sombre !== "desactive") {
    const candidat = paletteSombre(theme);
    const e = verifierCouleurs(candidat, "mode sombre : ");
    if (e.length) {
      if (typeof theme.mode_sombre === "object") erreurs.push(...e);
      else avertissements.push("mode sombre dérivé désactivé (contraste insuffisant) : " + e.join(" ; "));
    } else sombre = candidat;
  }
  return { erreurs, avertissements, sombre };
}

/** Applique des surcharges ponctuelles (ex. { "couleurs": { "primaire": "#…" } }). */
export function surcharger(theme: Theme, surcharges?: Partial<Omit<Theme, "couleurs">> & { couleurs?: Partial<CouleursTheme> }): Theme {
  if (!surcharges) return theme;
  return { ...theme, ...surcharges, couleurs: { ...theme.couleurs, ...(surcharges.couleurs || {}) } as CouleursTheme };
}

const variablesCouleurs = (c: CouleursTheme) =>
  Object.entries(c).map(([k, v]) => `  --jk-${k.replace(/_/g, "-")}: ${v};`).join("\n");

/** Feuille de style des jetons : seul endroit où des couleurs apparaissent. */
export function themeVersCss(theme: Theme, sombre: CouleursTheme | null): string {
  const p = theme.polices || {};
  const lignes = [
    ":root {",
    "  color-scheme: light;",
    variablesCouleurs(theme.couleurs),
    `  --jk-police: ${p.texte || POLICE_SYSTEME};`,
    `  --jk-police-titres: ${p.titres || p.texte || POLICE_SYSTEME};`,
    `  --jk-rayon: ${theme.rayon ?? 12}px;`,
    `  --jk-taille-base: ${theme.taille_base ?? 17}px;`,
    "  --jk-cible-tactile: 48px;",
    "}",
  ];
  if (sombre) {
    lignes.push("@media (prefers-color-scheme: dark) {", "  :root {", "    color-scheme: dark;", variablesCouleurs(sombre).replace(/^/gm, "  "), "  }", "}");
  }
  return lignes.join("\n") + "\n";
}
