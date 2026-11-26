// Module généré par plugin/jokkoondiral.ts à partir de config/instance.json.
declare module "virtual:jokkoondiral" {
  import type { Protocole } from "@jokkoondiral/protocole";
  type Texte = string | Record<string, string>;
  export const instance: {
    nom: Texte;
    nom_court: string;
    description: Texte;
    langues: string[];
    langue_defaut: string;
    envoi: string;
    gps: "facultatif" | "desactive";
    purge_apres_envoi: boolean;
    textes: Record<string, Texte>;
    depot?: string;
  };
  export const protocole: Protocole;
  export const theme: { id: string; nom: string; logo: string | null; icone: string | null };
}
