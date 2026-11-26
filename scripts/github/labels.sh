#!/usr/bin/env bash
# =============================================================
# Crée (ou met à jour) les labels GitHub du projet.
# Rejouable sans risque, y compris dans un fork :
#   GH_REPO=votre-org/votre-fork bash scripts/github/labels.sh
# Prérequis : gh (GitHub CLI) authentifié (gh auth login).
# =============================================================
set -euo pipefail
REPO="${GH_REPO:-AfricTivistes/jokkoondiral}"

label() { # nom couleur description
  gh label create "$1" --repo "$REPO" --color "$2" --description "$3" --force >/dev/null
  echo "✔ $1"
}

# Familles d'outils (docs/outils)
label "domaine:collecte"     "1D76DB" "Collecte terrain — outils C1–C7"
label "domaine:reception"    "0E8A16" "Réception multi-canal — outils R1–R5"
label "domaine:verification" "B60205" "Vérification et modération — outils M1–M6"
label "domaine:diffusion"    "FBCA04" "Diffusion et alertes — outils D1–D5"
label "domaine:analyse"      "5319E7" "Analyse et archives — outils A1–A4"
label "domaine:socles"       "555555" "Socles transverses — outils S1–S7"

# Phases (docs/ROADMAP.md)
label "phase:mvp"      "0B6623" "Attendu pour le MVP (premier scrutin pilote)"
label "phase:v1"       "3E8E41" "Attendu en V1"
label "phase:v2"       "8BC34A" "Attendu en V2"
label "phase:maintenu" "C5DEF5" "Maintenu sans nouvel investissement"

# Accueil et triage
label "profil:non-technique" "F9D0C4" "Pour journalistes, juristes, designers, traducteurs"
label "needs-triage"         "D4C5F9" "Pas encore évaluée par un mainteneur"
label "tech-camp"            "FEF2C0" "Réservée à un Tech Camp / hackathon"
label "good first issue"     "7057FF" "Bonne première contribution"
label "help wanted"          "008672" "Contribution recherchée"
