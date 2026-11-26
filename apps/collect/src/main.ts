// PWA de collecte Jokkoondiral (outil C1) : une question à la fois, hors ligne, relecture avant envoi.

import "./styles.css";
import {
  allerA, champs, champsVisibles, demarrer, nouveauxIdentifiants, precedent, progression, repondre, sectionDe, t,
  verifierReponses, type Champ, type Etat, type Valeur,
} from "@jokkoondiral/protocole";
import { instance, protocole, theme } from "virtual:jokkoondiral";
import { rendreChamp, resumeValeur } from "./champs";
import { langue, setLangue, tr } from "./i18n";
import { demanderPersistance, reglages, signalements, type AppareilActive, type Signalement } from "./store";
import { envoyerFile, type Evenement } from "./sync";
import { bouton, boutonConfirme, formaterDate, h, messageErreur, pastille } from "./ui";

const racine = document.getElementById("app")!;
let notice: string | null = null;
let majDisponible: ServiceWorker | null = null;

const texteInstance = (cle: string) => t(instance.textes[cle], langue());
const modeIdentification = instance.identification ?? "appareils";
const index = Object.fromEntries(champs(protocole).map((c) => [c.id, c]));

// ── Envoi ───────────────────────────────────────────────────────────

async function synchroniser(manuel = false) {
  const purge = await reglages.lire("purge", instance.purge_apres_envoi);
  await envoyerFile({ url: instance.envoi, purge, protocole, langue: langue(), identification: modeIdentification }, (e: Evenement) => {
    if (e.type === "code") notice = tr("codeManquant");
    if (e.type === "auth") notice = tr(`auth.${e.erreur}`);
    if (e.type === "reseau" && manuel) notice = tr("erreurReseau");
    if (e.type === "erreur") notice = e.erreur === "code" ? tr("erreurCode") : tr("erreurServeur", { detail: e.erreur });
  });
  if (ecranCourant === "accueil") accueil();
}

// ── Mise en page commune ────────────────────────────────────────────

let ecranCourant = "accueil";
/** Jeton de rendu : un écran préparé de façon asynchrone ne s'affiche pas si un autre l'a remplacé entre-temps. */
let rendu = 0;
const nouveauRendu = () => ++rendu;

function entete(): HTMLElement {
  const enLigne = navigator.onLine;
  return h("header", { class: "entete" },
    h("button", { class: "marque", type: "button", onclick: () => accueil(), "aria-label": instance.nom_court },
      (theme.icone || theme.logo) ? h("img", { src: (theme.icone || theme.logo)!, alt: "", class: "logo" }) : null,
      h("span", null, h("strong", null, instance.nom_court), h("span", { class: "sous-titre" }, t(protocole.titre, langue())))),
    pastille(enLigne ? tr("enLigne") : tr("horsLigne"), enLigne ? "ok" : "attention"));
}

function afficher(ecran: string, ...contenu: (HTMLElement | null)[]) {
  ecranCourant = ecran;
  const bandeaux: HTMLElement[] = [];
  if (majDisponible) {
    bandeaux.push(h("div", { class: "bandeau" }, h("span", null, tr("maj")),
      bouton(tr("recharger"), () => majDisponible?.postMessage("activer"), "btn petit")));
  }
  if (notice) bandeaux.push(h("div", { class: "notice", role: "status" }, notice));
  racine.replaceChildren(entete(), ...bandeaux, h("main", { class: "page" }, ...contenu.filter(Boolean) as HTMLElement[]));
  window.scrollTo(0, 0);
  racine.querySelector<HTMLElement>("main h1, main input, main textarea")?.focus({ preventScroll: true });
}

// ── Accueil ─────────────────────────────────────────────────────────

async function accueil() {
  const jeton = nouveauRendu();
  const liste = (await signalements.lister()).sort((a, b) => (b.maj || "").localeCompare(a.maj || ""));
  const brouillons = liste.filter((s) => s.statut === "brouillon");
  const file = liste.filter((s) => s.statut === "en_attente" || s.statut === "erreur");
  const envoyes = liste.filter((s) => s.statut === "envoye");
  const nb = await reglages.lire("nb_envoyes", 0);
  if (jeton !== rendu) return;

  const carte = (s: Signalement) => h("button", { class: "carte-signalement", type: "button", onclick: () => ouvrir(s) },
    h("span", { class: "titre-signalement" }, resumeSignalement(s)),
    h("span", { class: "doux petit" }, `${s.numero_suivi} · ${formaterDate(s.debut, langue())}`),
    pastille(tr(`statut.${s.statut}`), s.statut === "erreur" ? "erreur" : s.statut === "envoye" ? "ok" : "neutre"),
    s.erreur ? h("span", { class: "doux petit" }, s.erreur) : null);

  const section = (titre: string, items: Signalement[], extra?: HTMLElement | null) =>
    items.length ? h("section", { class: "carte" }, h("div", { class: "carte-tete" }, h("h2", null, `${titre} (${items.length})`), extra || null), h("div", { class: "liste" }, ...items.map(carte))) : null;

  const appareil = await reglages.lire<AppareilActive | null>("appareil", null);
  const activationEnAttente = await reglages.lire<string | null>("activation_en_attente", null);
  if (jeton !== rendu) return;
  const carteActivation = modeIdentification === "appareils" && !appareil
    ? h("section", { class: "carte activation", role: "status" },
      h("h2", null, activationEnAttente ? tr("activationEnAttente") : tr("nonActive")),
      h("p", null, tr("nonActiveAide")))
    : null;

  afficher("accueil",
    carteActivation,
    h("section", { class: "carte accueil" },
      theme.logo && theme.icone && theme.logo !== theme.icone ? h("img", { src: theme.logo, alt: instance.nom_court, class: "logo-complet" }) : null,
      h("h1", null, t(instance.nom, langue())),
      h("p", null, texteInstance("accueil")),
      bouton(tr("nouveau"), () => nouveau(), "btn grand")),
    h("p", { class: "securite" }, texteInstance("securite")),
    section(tr("aEnvoyer"), file, navigator.onLine ? bouton(tr("envoyerMaintenant"), () => { notice = null; synchroniser(true); }, "btn petit") : null),
    section(tr("brouillons"), brouillons),
    section(tr("envoyes"), envoyes),
    !liste.length ? h("p", { class: "doux centre" }, tr("aucun")) : null,
    nb ? h("p", { class: "doux petit centre" }, `${nb} · ${tr("envoyes").toLowerCase()}`) : null,
    h("nav", { class: "pied" },
      bouton(tr("reglages"), () => ecranReglages(), "lien"),
      bouton(tr("aPropos"), () => aPropos(), "lien")),
    appareil ? h("p", { class: "doux petit centre" }, `${tr("observateur")} ${appareil.observateur.code}${appareil.observateur.bureau_vote ? ` · ${appareil.observateur.bureau_vote}` : ""}`) : null,
    h("p", { class: "doux petit centre" }, texteInstance("organisation")));
}

function resumeSignalement(s: Signalement): string {
  const r = s.etat.reponses;
  const morceaux = [r.categorie ? resumeValeur(index.categorie, r.categorie) : null, r.lieu ? resumeValeur(index.lieu, r.lieu) : null].filter(Boolean);
  return morceaux.join(" · ") || tr("statut.brouillon");
}

// ── Saisie ──────────────────────────────────────────────────────────

async function nouveau() {
  notice = null;
  const ids = nouveauxIdentifiants();
  const s: Signalement = { id: ids.instanceID, numero_suivi: ids.numero_suivi, statut: "brouillon", etat: demarrer(protocole), debut: new Date().toISOString() };
  await signalements.ecrire(s);
  demanderPersistance();
  question(s);
}

function ouvrir(s: Signalement) {
  if (s.statut === "envoye") return confirmation(s);
  if (s.statut === "en_attente" || s.statut === "erreur") {
    if (s.recu) return confirmation(s);
    return relecture({ ...s, statut: "brouillon" });
  }
  if (s.etat.courant === null) return relecture(s);
  question(s);
}

async function enregistrer(s: Signalement, etat: Etat): Promise<Signalement> {
  return signalements.ecrire({ ...s, etat });
}

function question(s: Signalement, erreur: string | null = null) {
  nouveauRendu();
  const champ: Champ | undefined = s.etat.courant ? index[s.etat.courant] : undefined;
  if (!champ) return relecture(s);
  const l = langue();
  const { position, total } = progression(protocole, s.etat);
  const section = sectionDe(protocole, champ.id);
  const valider = async (v: Valeur | undefined) => {
    const { etat, erreur: e } = repondre(protocole, s.etat, v, l);
    if (e) return question(s, e.message || tr(`erreurs.${e.code}`));
    const maj = await enregistrer(s, etat);
    etat.courant ? question(maj) : relecture(maj);
  };
  const retour = precedent(s.etat);
  afficher("question",
    h("div", { class: "progression", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": total, "aria-valuenow": position },
      h("span", { class: "progression-barre", style: `width:${Math.round((position / Math.max(total, 1)) * 100)}%` })),
    h("p", { class: "etape" }, `${section ? t(section.titre, l) : ""} · ${tr("question")} ${position} ${tr("sur")} ${total}`),
    h("section", { class: "carte question" },
      h("h1", { tabindex: -1 }, t(champ.question, l)),
      champ.aide ? h("p", { class: "doux" }, t(champ.aide, l)) : null,
      messageErreur(erreur),
      rendreChamp({ champ, valeur: s.etat.reponses[champ.id], signalement: s.id, valider }),
      champ.obligatoire === false && champ.type !== "photo" ? bouton(tr("passer"), () => valider(undefined), "lien") : null),
    h("nav", { class: "navigation" },
      retour ? bouton(tr("precedente"), async () => question(await enregistrer(s, retour)), "btn fantome") : bouton(tr("accueil"), () => accueil(), "btn fantome")));
}

function relecture(s: Signalement) {
  nouveauRendu();
  const l = langue();
  const erreurs = verifierReponses(protocole, s.etat.reponses);
  const lignes = champsVisibles(protocole, s.etat.reponses).map((c) =>
    h("div", { class: "ligne-relecture" + (erreurs.some((e) => e.champ === c.id) ? " a-corriger" : "") },
      h("dt", null, t(c.question, l)),
      h("dd", null, resumeValeur(c, s.etat.reponses[c.id])),
      bouton(tr("modifier"), async () => question(await enregistrer(s, allerA(protocole, s.etat, c.id))), "lien")));
  afficher("relecture",
    h("section", { class: "carte" },
      h("h1", { tabindex: -1 }, tr("relire")),
      h("p", { class: "doux" }, tr("relireAide")),
      h("p", null, h("span", { class: "doux" }, `${tr("numeroSuivi")} : `), h("strong", { class: "numero" }, s.numero_suivi)),
      h("dl", { class: "relecture" }, ...lignes),
      erreurs.length ? messageErreur(tr("erreurs.obligatoire")) : null,
      bouton(tr("envoyer"), async () => {
        if (verifierReponses(protocole, s.etat.reponses).length) return relecture(s);
        const fini = await signalements.ecrire({ ...s, statut: "en_attente", fin: new Date().toISOString(), erreur: null });
        confirmation(fini);
        synchroniser().then(async () => {
          const apres = await signalements.lire(fini.id);
          if (ecranCourant === "confirmation") confirmation(apres || { ...fini, statut: "envoye" });
        });
      }, "btn grand", { disabled: erreurs.length > 0 })),
    h("nav", { class: "navigation" },
      bouton(tr("accueil"), () => accueil(), "btn fantome"),
      boutonConfirme(tr("supprimer"), tr("confirmerSuppression"), async () => { await signalements.supprimer(s.id); accueil(); })));
}

function confirmation(s: Signalement) {
  nouveauRendu();
  const recu = s.statut === "envoye" || Boolean(s.recu);
  afficher("confirmation",
    h("section", { class: "carte confirmation" },
      h("h1", { tabindex: -1 }, recu ? tr("recu") : tr("statut.en_attente")),
      h("p", { class: "doux" }, tr("numeroSuivi")),
      h("p", { class: "numero grand-numero" }, s.numero_suivi),
      h("p", null, tr("numeroSuiviAide")),
      !recu ? h("p", { class: "doux" }, tr("enFile")) : null,
      s.erreur ? messageErreur(s.erreur) : null,
      bouton(tr("retourAccueil"), () => accueil(), "btn grand")));
}

// ── Réglages et à propos ────────────────────────────────────────────

async function ecranReglages(message: string | null = null) {
  const jeton = nouveauRendu();
  const code = h("input", { type: "text", id: "code", autocomplete: "off", autocapitalize: "characters", value: await reglages.lire("code", "") });
  const appareil = await reglages.lire<AppareilActive | null>("appareil", null);
  const choixLangue = h("select", { id: "langue" }, ...instance.langues.map((l) => h("option", { value: l, selected: l === langue() }, l.toUpperCase())));
  const purge = h("input", { type: "checkbox", id: "purge", checked: await reglages.lire("purge", instance.purge_apres_envoi) });
  if (jeton !== rendu) return;

  // Mode appareils : l'identité vient du lien d'activation, pas d'un code saisi.
  const identite = modeIdentification === "codes"
    ? [h("label", { for: "code" }, tr("code")), code, h("p", { class: "aide-champ" }, tr("codeAide"))]
    : appareil
      ? [h("p", null, h("span", { class: "doux" }, `${tr("observateur")} : `), h("strong", { class: "numero" }, appareil.observateur.code)),
        appareil.observateur.bureau_vote ? h("p", null, h("span", { class: "doux" }, `${tr("bureau")} : `), appareil.observateur.bureau_vote) : null,
        h("p", { class: "aide-champ" }, tr("desactiverAide")),
        boutonConfirme(tr("desactiverTelephone"), tr("confirmerDesactivation"), async () => {
          await reglages.ecrire("appareil", null);
          ecranReglages();
        })]
      : [h("p", { class: "message-erreur" }, tr("nonActive")), h("p", { class: "aide-champ" }, tr("nonActiveAide"))];

  afficher("reglages",
    h("section", { class: "carte formulaire" },
      h("h1", { tabindex: -1 }, tr("reglages")),
      message ? h("p", { class: "ok", role: "status" }, message) : null,
      ...identite,
      h("label", { for: "langue" }, tr("langue")), choixLangue,
      h("label", { class: "case" }, purge, h("span", null, tr("purge"))), h("p", { class: "aide-champ" }, tr("purgeAide")),
      bouton(tr("enregistrer"), async () => {
        if (modeIdentification === "codes") await reglages.ecrire("code", code.value.trim().toUpperCase());
        await reglages.ecrire("langue", choixLangue.value);
        await reglages.ecrire("purge", purge.checked);
        setLangue(choixLangue.value);
        notice = null;
        ecranReglages(tr("enregistres"));
        synchroniser();
      }, "btn grand")),
    h("nav", { class: "navigation" }, bouton(tr("accueil"), () => accueil(), "btn fantome")));
}

// ── Activation du téléphone ─────────────────────────────────────────

/**
 * Le lien de la coordination ouvre l'app avec #activer=<jeton>. Le jeton est dans le fragment :
 * il n'est jamais envoyé au serveur web (ni dans ses journaux, ni dans le Referer).
 * Il est échangé une seule fois contre la clé de ce téléphone ; sans réseau, l'échange attend.
 */
function lireJetonActivation(): string | null {
  const m = location.hash.match(/^#activer=([A-Za-z0-9_-]{43})$/);
  if (!m) return null;
  history.replaceState(null, "", location.pathname + location.search);
  return m[1];
}

async function activer(): Promise<void> {
  const jetonActivation = await reglages.lire<string | null>("activation_en_attente", null);
  if (!jetonActivation || !navigator.onLine) return;
  let rep: Response;
  try {
    rep = await fetch(`${instance.envoi}/activation`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jeton: jetonActivation }) });
  } catch {
    return; // réseau coupé : nouvel essai au retour du réseau
  }
  const corps = await rep.json().catch(() => ({})) as Record<string, unknown>;
  await reglages.ecrire("activation_en_attente", null);
  if (rep.status === 201 && corps.ok) {
    const appareil: AppareilActive = {
      id: String(corps.appareil_id),
      secret: String(corps.secret),
      observateur: corps.observateur as AppareilActive["observateur"],
      active_le: new Date().toISOString(),
    };
    await reglages.ecrire("appareil", appareil);
    notice = `${tr("active")} — ${tr("activeAide", { code: appareil.observateur.code })}`;
    synchroniser();
  } else {
    notice = rep.status === 410 ? tr("lienInvalide") : tr("activationRefusee");
  }
  if (ecranCourant === "accueil") accueil();
}

function aPropos() {
  nouveauRendu();
  const l = langue();
  afficher("apropos",
    h("section", { class: "carte" },
      h("h1", { tabindex: -1 }, tr("aPropos")),
      h("p", null, t(instance.description, l)),
      h("p", null, `${tr("protocole")} : ${t(protocole.titre, l)} (${protocole.id} ${protocole.version})`),
      protocole.statut === "provisoire" ? h("p", { class: "doux" }, tr("provisoire")) : null,
      protocole.extensions?.length ? h("p", null, `${tr("extensions")} : ${protocole.extensions.join(", ")}`) : null,
      instance.depot ? h("p", null, h("a", { href: instance.depot, rel: "noopener" }, tr("code_source"))) : null),
    h("nav", { class: "navigation" }, bouton(tr("accueil"), () => accueil(), "btn fantome")));
}

// ── Démarrage ───────────────────────────────────────────────────────

async function demarrerApp() {
  setLangue(await reglages.lire("langue", instance.langue_defaut));
  const jetonLien = lireJetonActivation();
  if (jetonLien && modeIdentification === "appareils") {
    // Un nouveau lien remplace l'éventuelle clé précédente (téléphone réattribué).
    await reglages.ecrire("activation_en_attente", jetonLien);
  }
  window.addEventListener("online", () => { if (ecranCourant === "accueil") accueil(); activer().then(() => synchroniser()); });
  window.addEventListener("offline", () => { if (ecranCourant === "accueil") accueil(); });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") synchroniser(); });
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").then((reg) => {
      reg.addEventListener("updatefound", () => {
        const nouveau = reg.installing;
        nouveau?.addEventListener("statechange", () => {
          if (nouveau.state === "installed" && navigator.serviceWorker.controller) {
            majDisponible = nouveau;
            if (ecranCourant === "accueil") accueil();
          }
        });
      });
    }).catch(() => {});
    // Recharger seulement lors d'une mise à jour acceptée, jamais à la première installation
    // (sinon la page se recharge au milieu d'une saisie).
    const avaitControleur = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (avaitControleur) location.reload(); });
  }
  await accueil();
  await activer();
  synchroniser();
}

demarrerApp();
