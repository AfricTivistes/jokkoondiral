# 🧭 Décisions d'architecture (ADR)

Chaque choix structurant est consigné dans un court fichier : contexte, options, recommandation, décision. Un contributeur sait ainsi **pourquoi** le code est comme il est, et une OSC qui forke sait ce qu'elle peut changer.

| ADR | Décision | Statut | Outils |
|---|---|---|---|
| [0001](./0001-structure-monorepo.md) | Structure du monorepo et convention de croissance | ✅ acceptée | tous |
| [0009](./0009-nom-du-projet.md) | Nom du projet : Jokkoondiral (texte et identifiants techniques) | ✅ acceptée | tous |
| [0010](./0010-moteur-de-protocole.md) | Moteur de protocole, extensions et thèmes pour la collecte (C1) | ✅ acceptée | C1, M3, C3, C7 |
| [0011](./0011-acces-aux-donnees-et-identite.md) | Stockage interchangeable sécurisé (NocoDB, PostgreSQL, Kobo) et identification par appareil | ✅ acceptée | R5, S1, S3, C1 |
| [0002](./0002-couche-acces-donnees.md) | Couche d'accès aux données (API métier devant NocoDB ?) | 🟡 tranchée pour l'écriture (ADR-0011), ouverte pour la lecture | S1, S3, M2, M4, M1 |
| [0003](./0003-couverture-linguistique.md) | Couverture linguistique (FR/EN dès le MVP ?) | 🟠 proposée | S4 |
| [0004](./0004-mode-hebergement.md) | Mode d'hébergement (auto + tiers de confiance ?) | 🟠 proposée | S5, S2, A2 |
| [0005](./0005-acces-whatsapp.md) | Accès WhatsApp (API officielle Meta ?) | 🟠 proposée | R1, D3 |
| [0006](./0006-application-mobile.md) | Application mobile (PWA puis Android ?) | 🟠 proposée | C1, C2 |
| [0007](./0007-stockage-preuves.md) | Stockage des preuves (disque VPS + quotas ?) | 🟠 proposée | M2 |
| [0008](./0008-conservation-donnees.md) | Conservation des données personnelles | 🟠 proposée | A4, S3, R5 |

**Proposer une décision :** copie [`0000-modele.md`](./0000-modele.md) avec le numéro suivant, ouvre une PR, discute-la dans la PR. Une décision acceptée ne se modifie pas : on en écrit une nouvelle qui la remplace.
