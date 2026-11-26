// Petit langage d'expressions pour les conditions (`si`) et les règles (`valide`) des champs.
// Partagé par la PWA, le serveur et le générateur XLSForm : une seule grammaire, aucune
// évaluation de code arbitraire.
//
// Grammaire : nombres, chaînes 'entre apostrophes', identifiants de champ,
// + - * / ( ), comparaisons == != > >= < <=, and / or, not(x),
// selected(champ, 'valeur'), count(champ), sum(a, b, ...), round(x).
// Inspiré du moteur de dofbi/collecte-guidee (AGPL-3.0).

type Jeton =
  | { t: "num"; v: number; debut: number; fin: number }
  | { t: "str"; v: string; debut: number; fin: number }
  | { t: "id"; v: string; debut: number; fin: number }
  | { t: "op"; v: string; debut: number; fin: number };

export type Noeud =
  | { k: "num"; v: number }
  | { k: "str"; v: string }
  | { k: "var"; v: string }
  | { k: "neg"; a: Noeud }
  | { k: "fn"; f: Fonction; args: Noeud[] }
  | { k: "bin"; op: string; a: Noeud; b: Noeud };

type Fonction = "sum" | "round" | "not" | "selected" | "count";
const FONCTIONS: Fonction[] = ["sum", "round", "not", "selected", "count"];

const JETON = /\s*(?:(\d+(?:\.\d+)?)|'([^']*)'|([a-z_][a-z0-9_]*)|(>=|<=|==|!=|[-+*/(),<>]))/y;

export function decouper(src: string): Jeton[] {
  const out: Jeton[] = [];
  let i = 0;
  while (i < src.length) {
    if (/^\s*$/.test(src.slice(i))) break;
    JETON.lastIndex = i;
    const m = JETON.exec(src);
    if (!m) throw new Error(`Expression invalide près de « ${src.slice(i)} »`);
    const debut = m.index + (m[0].length - m[0].trimStart().length);
    const fin = JETON.lastIndex;
    if (m[1] !== undefined) out.push({ t: "num", v: Number(m[1]), debut, fin });
    else if (m[2] !== undefined) out.push({ t: "str", v: m[2], debut, fin });
    else if (m[3] !== undefined) {
      out.push(m[3] === "and" || m[3] === "or" ? { t: "op", v: m[3], debut, fin } : { t: "id", v: m[3], debut, fin });
    } else out.push({ t: "op", v: m[4], debut, fin });
    i = fin;
  }
  return out;
}

export function analyser(src: string): Noeud {
  const jetons = decouper(src);
  let p = 0;
  const regarder = () => jetons[p];
  const manger = (v?: string) => {
    const j = jetons[p];
    if (!j || (v && j.v !== v)) throw new Error(`Attendu « ${v} » dans « ${src} »`);
    p++;
    return j;
  };
  const binaire = (suivant: () => Noeud, ops: string[]) => (): Noeud => {
    let gauche = suivant();
    while (regarder() && regarder().t === "op" && ops.includes(String(regarder().v))) {
      const op = String(manger().v);
      gauche = { k: "bin", op, a: gauche, b: suivant() };
    }
    return gauche;
  };
  const primaire = (): Noeud => {
    const j = regarder();
    if (!j) throw new Error(`Expression incomplète : « ${src} »`);
    if (j.t === "num") { p++; return { k: "num", v: j.v }; }
    if (j.t === "str") { p++; return { k: "str", v: j.v }; }
    if (j.t === "op" && j.v === "(") { p++; const e = ou(); manger(")"); return e; }
    if (j.t === "op" && j.v === "-") { p++; return { k: "neg", a: primaire() }; }
    if (j.t === "id") {
      p++;
      if (regarder() && regarder().v === "(") {
        p++;
        const args: Noeud[] = [];
        if (regarder() && regarder().v !== ")") {
          args.push(ou());
          while (regarder() && regarder().v === ",") { p++; args.push(ou()); }
        }
        manger(")");
        if (!FONCTIONS.includes(j.v as Fonction)) throw new Error(`Fonction inconnue : ${j.v}`);
        const f = j.v as Fonction;
        if ((f === "selected" || f === "count") && args[0]?.k !== "var") throw new Error(`${f}() attend un champ en premier argument`);
        if (f === "selected" && args[1]?.k !== "str") throw new Error(`selected() attend une valeur 'entre apostrophes'`);
        return { k: "fn", f, args };
      }
      return { k: "var", v: j.v };
    }
    throw new Error(`Symbole inattendu « ${j.v} » dans « ${src} »`);
  };
  const mul = binaire(primaire, ["*", "/"]);
  const add = binaire(mul, ["+", "-"]);
  const cmp = binaire(add, [">", ">=", "<", "<=", "==", "!="]);
  const et = binaire(cmp, ["and"]);
  const ou = binaire(et, ["or"]);
  const arbre = ou();
  if (p !== jetons.length) throw new Error(`Fin inattendue dans « ${src} »`);
  return arbre;
}

/** Identifiants de champ utilisés par une expression. */
export function variables(src: string): string[] {
  const out = new Set<string>();
  const parcourir = (n: Noeud) => {
    if (n.k === "var") out.add(n.v);
    if ("a" in n && n.a) parcourir(n.a);
    if (n.k === "bin") parcourir(n.b);
    if (n.k === "fn") n.args.forEach(parcourir);
  };
  parcourir(analyser(src));
  return [...out];
}

/** Renomme des identifiants dans une expression (utilisé pour préfixer les champs d'extension). */
export function renommer(src: string, correspondances: Record<string, string>): string {
  let out = "";
  let curseur = 0;
  for (const j of decouper(src)) {
    if (j.t === "id" && correspondances[j.v]) {
      out += src.slice(curseur, j.debut) + correspondances[j.v];
      curseur = j.fin;
    }
  }
  return out + src.slice(curseur);
}

export type ValeurExpr = string | number | boolean | string[] | null | undefined | object;

const vide = (x: unknown) => x === undefined || x === null || x === "" || (Array.isArray(x) && x.length === 0);

/** Évalue une expression. Une variable absente vaut `undefined` : toute comparaison avec elle est fausse. */
export function evaluer(src: string, vars: Record<string, ValeurExpr>): unknown {
  const nombre = (x: unknown) => (vide(x) ? NaN : Number(x));
  const ev = (n: Noeud): unknown => {
    switch (n.k) {
      case "num": return n.v;
      case "str": return n.v;
      case "var": return vars[n.v];
      case "neg": return -nombre(ev(n.a));
      case "fn": {
        if (n.f === "not") return !Boolean(ev(n.args[0]));
        if (n.f === "round") return Math.round(nombre(ev(n.args[0])));
        if (n.f === "sum") return n.args.reduce((s, a) => { const v = nombre(ev(a)); return s + (Number.isNaN(v) ? 0 : v); }, 0);
        const v = vars[(n.args[0] as { v: string }).v];
        const liste = Array.isArray(v) ? v.map(String) : vide(v) ? [] : [String(v)];
        if (n.f === "count") return liste.length;
        return liste.includes((n.args[1] as { v: string }).v);
      }
      case "bin": {
        const a = ev(n.a), b = ev(n.b);
        switch (n.op) {
          case "and": return Boolean(a) && Boolean(b);
          case "or": return Boolean(a) || Boolean(b);
          case "==": return !vide(a) && !vide(b) && String(a) === String(b);
          case "!=": return !vide(a) && String(a) !== String(b);
        }
        const x = nombre(a), y = nombre(b);
        switch (n.op) {
          case "+": return x + y;
          case "-": return x - y;
          case "*": return x * y;
          case "/": return y === 0 ? NaN : x / y;
          case ">": return x > y;
          case ">=": return x >= y;
          case "<": return x < y;
          case "<=": return x <= y;
        }
      }
    }
    throw new Error("Nœud d'expression inconnu");
  };
  return ev(analyser(src));
}

export const vrai = (src: string | undefined, vars: Record<string, ValeurExpr>) => (src ? Boolean(evaluer(src, vars)) : true);

/** Traduit en XPath pour le XLSForm (KoboCollect, Enketo). `nom(id)` donne le nom du champ dans le formulaire. */
export function versXPath(src: string, nom: (id: string) => string): string {
  const q = (s: string) => `'${s.replace(/'/g, "")}'`;
  const tx = (n: Noeud): string => {
    switch (n.k) {
      case "num": return String(n.v);
      case "str": return q(n.v);
      case "var": return `\${${nom(n.v)}}`;
      case "neg": return `-(${tx(n.a)})`;
      case "fn": {
        if (n.f === "not") return `not(${tx(n.args[0])})`;
        if (n.f === "round") return `round(${tx(n.args[0])})`;
        if (n.f === "count") return `count-selected(${tx(n.args[0])})`;
        if (n.f === "selected") return `selected(${tx(n.args[0])}, ${tx(n.args[1])})`;
        return `(${n.args.map((a) => (a.k === "var" ? `if(string-length(${tx(a)}) = 0, 0, number(${tx(a)}))` : tx(a))).join(" + ")})`;
      }
      case "bin": {
        const op = ({ "/": "div", "==": "=" } as Record<string, string>)[n.op] || n.op;
        return `(${tx(n.a)} ${op} ${tx(n.b)})`;
      }
    }
  };
  return tx(analyser(src));
}
