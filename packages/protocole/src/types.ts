// Types du protocole de collecte : un fichier JSON décrit le formulaire,
// le même fichier pilote la PWA, la validation serveur et le XLSForm Kobo.

/** Texte simple ou un texte par langue : { "fr": "…", "en": "…" }. */
export type Texte = string | Record<string, string>;

export const TYPES_CHAMP = [
  "choix",
  "choix_multiple",
  "compteur",
  "texte",
  "texte_long",
  "date_heure",
  "lieu",
  "photo",
] as const;
export type TypeChamp = (typeof TYPES_CHAMP)[number];

export interface Option {
  /** Valeur enregistrée : minuscules, chiffres et _. Ne plus la changer une fois la collecte lancée. */
  v: string;
  label: Texte;
  aide?: Texte;
  /** Code court réutilisable par le SMS codé (outil C3), ex. "VIO". */
  code?: string;
  /** Dans un choix multiple : cette option exclut toutes les autres (ex. « aucune »). */
  exclusive?: boolean;
}

export interface Champ {
  id: string;
  type: TypeChamp;
  question: Texte;
  aide?: Texte;
  /** Par défaut true. */
  obligatoire?: boolean;
  options?: Option[];
  /** La liste d'options peut être complétée par une extension. */
  ouverte?: boolean;
  /** Condition d'affichage (expression). */
  si?: string;
  /** Règle à respecter pour continuer (expression ; `valeur` désigne la réponse du champ). */
  valide?: string;
  message_valide?: Texte;
  min?: number;
  max?: number;
  /** Longueur maximale d'un texte. */
  max_longueur?: number;
  /** Champ du noyau : une extension ne peut ni le retirer ni le renommer. */
  verrouille?: boolean;
  /** Colonne de la table `base_reports` qui reçoit la valeur (champs du noyau seulement). */
  colonne?: string;
  /** Renseigné automatiquement pour les champs ajoutés par une extension. */
  extension?: string;
}

export interface Section {
  id: string;
  titre: Texte;
  champs: Champ[];
  extension?: string;
}

export interface Protocole {
  id: string;
  version: string;
  titre: Texte;
  description?: Texte;
  langues: string[];
  /** "provisoire" tant que la méthodologie n'est pas validée. */
  statut?: "provisoire" | "valide";
  sections: Section[];
  /** Extensions appliquées (id@version), renseigné par `appliquerExtensions`. */
  extensions?: string[];
}

export type AjoutExtension =
  | { type: "champs"; section: string; apres?: string; champs: Champ[] }
  | { type: "options"; champ: string; options: Option[] }
  | { type: "section"; apres?: string; section: Section };

export interface Extension {
  id: string;
  version: string;
  /** Id du protocole de base visé. */
  pour: string;
  titre?: Texte;
  ajouts: AjoutExtension[];
}

/** Position GPS facultative, jamais prise automatiquement. */
export interface Position {
  lat: number;
  lon: number;
  precision?: number;
}

export interface ValeurLieu {
  texte: string;
  position?: Position;
}

/** Métadonnées d'une photo jointe ; le fichier lui-même voyage à part. */
export interface PieceJointe {
  id: string;
  type: string;
  taille: number;
}

export type Valeur = string | number | string[] | ValeurLieu | PieceJointe[];
export type Reponses = Record<string, Valeur>;

/** Ce que la PWA envoie au serveur pour un signalement. */
export interface Envoi {
  instanceID: string;
  numero_suivi: string;
  protocole: { id: string; version: string; extensions: string[] };
  debut: string;
  fin: string;
  langue: string;
  reponses: Reponses;
}
