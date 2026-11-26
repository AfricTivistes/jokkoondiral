// File d'envoi : chaque signalement terminé attend ici jusqu'à ce que le serveur confirme
// sa réception. Déclenchée au démarrage, au retour du réseau, au retour sur l'app et à la demande.
// Les photos partent après les réponses, une par une ; une coupure reprend là où elle s'est arrêtée.

import type { Envoi } from "@jokkoondiral/protocole";
import { pieces, reglages, signalements, type AppareilActive, type Signalement } from "./store";

export type Evenement =
  | { type: "reseau" }
  | { type: "envoye"; id: string }
  | { type: "erreur"; id: string; erreur: string }
  | { type: "code" }
  /** Le serveur refuse l'auteur : téléphone non activé, désactivé, observateur inactif ou accès expiré. */
  | { type: "auth"; erreur: string };

let enCours = false;

export function versEnvoi(s: Signalement, proto: { id: string; version: string; extensions?: string[] }, langue: string): Envoi {
  return {
    instanceID: s.id,
    numero_suivi: s.numero_suivi,
    protocole: { id: proto.id, version: proto.version, extensions: proto.extensions || [] },
    debut: s.debut,
    fin: s.fin || new Date().toISOString(),
    langue,
    reponses: s.etat.reponses,
  };
}

async function lireJson(rep: Response): Promise<Record<string, unknown>> {
  try {
    return (await rep.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** En-têtes d'authentification : clé de l'appareil (mode appareils) ou code partagé (mode codes). */
export async function authentification(mode: "appareils" | "codes"): Promise<{ entetes: Record<string, string>; code?: string } | null> {
  if (mode === "codes") {
    const code = await reglages.lire("code", "");
    return code ? { entetes: { Authorization: `Code ${code}`, "X-Code-Collecteur": code }, code } : null;
  }
  const appareil = await reglages.lire<AppareilActive | null>("appareil", null);
  return appareil ? { entetes: { Authorization: `Appareil ${appareil.id}.${appareil.secret}` } } : null;
}

export async function envoyerFile(
  options: { url: string; purge: boolean; protocole: { id: string; version: string; extensions?: string[] }; langue: string; identification: "appareils" | "codes" },
  notifier: (e: Evenement) => void = () => {},
): Promise<void> {
  if (enCours) return;
  enCours = true;
  try {
    const liste = (await signalements.lister()).filter((s) => s.statut === "en_attente" || s.statut === "erreur");
    if (!liste.length || !navigator.onLine) return;
    const auth = await authentification(options.identification);
    if (!auth) { notifier(options.identification === "codes" ? { type: "code" } : { type: "auth", erreur: "non_active" }); return; }

    for (const candidat of liste) {
      // L'observateur a pu le rouvrir entre-temps : on relit son état.
      let s = await signalements.lire(candidat.id);
      if (!s || !["en_attente", "erreur"].includes(s.statut)) continue;

      if (!s.recu) {
        let rep: Response;
        try {
          rep = await fetch(options.url, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...auth.entetes },
            body: JSON.stringify({ envoi: versEnvoi(s, options.protocole, options.langue), ...(auth.code ? { code: auth.code } : {}) }),
          });
        } catch {
          notifier({ type: "reseau" });
          return; // réseau coupé : la file reste intacte
        }
        const corps = await lireJson(rep);
        if (rep.status === 401 || rep.status === 403) {
          const erreur = String(corps.erreur || "code");
          await signalements.ecrire({ ...s, statut: "erreur", erreur });
          notifier(erreur === "code" ? { type: "code" } : { type: "auth", erreur });
          return;
        }
        if (!rep.ok || !corps.ok) {
          const erreur = [corps.erreur || `HTTP ${rep.status}`, corps.detail].filter(Boolean).join(" : ");
          await signalements.ecrire({ ...s, statut: "erreur", erreur: String(erreur) });
          notifier({ type: "erreur", id: s.id, erreur: String(erreur) });
          continue;
        }
        s = await signalements.ecrire({ ...s, recu: true, erreur: null });
      }

      // Photos : une requête par fichier, pour tenir sur une connexion lente.
      for (const p of await pieces.lister(s.id)) {
        if (p.envoyee) continue;
        let rep: Response;
        try {
          rep = await fetch(`${options.url}/${encodeURIComponent(s.id)}/pieces`, {
            method: "POST",
            headers: { "Content-Type": p.type, "X-Piece-Id": p.id, ...auth.entetes },
            body: p.blob,
          });
        } catch {
          notifier({ type: "reseau" });
          return;
        }
        if (!rep.ok) {
          const corps = await lireJson(rep);
          const erreur = `photo : ${corps.erreur || `HTTP ${rep.status}`}`;
          await signalements.ecrire({ ...s, statut: "erreur", erreur });
          notifier({ type: "erreur", id: s.id, erreur });
          s = undefined;
          break;
        }
        await pieces.ecrire({ ...p, envoyee: true });
      }
      if (!s) continue;

      if (options.purge) await signalements.supprimer(s.id);
      else {
        await signalements.ecrire({ ...s, statut: "envoye", erreur: null });
        for (const p of await pieces.lister(s.id)) await pieces.supprimer(p.id);
      }
      await reglages.ecrire("nb_envoyes", (await reglages.lire("nb_envoyes", 0)) + 1);
      notifier({ type: "envoye", id: s.id });
    }
  } finally {
    enCours = false;
  }
}
