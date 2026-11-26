# 🎯 Besoins — ce que disent les OSC

Chaque outil de la Situation Room répond à un besoin exprimé par des organisations de la société civile (OSC) qui observent les élections. Ce document résume ces besoins et les relie aux outils du [catalogue](./outils/README.md).

> **Source.** Consultation Jokkoondiral : 45 réponses valides (54 reçues, 9 tests exclus), 18 pays, extraction du 14 septembre 2026. Synthèse du document « Situation Room — Orientation des besoins » (oct. 2026). Aucune donnée nominative n'est reprise ici ; les verbatims sont anonymisés.

## Les cinq constats qui guident tout

1. **WhatsApp est le point d'entrée** : 39 OSC l'utilisent déjà comme outil principal. Les outils partent de cette habitude, ils ne la remplacent pas.
2. **Le réseau tombera** : 41 OSC citent les coupures internet. Chaque outil de collecte a une voie hors ligne ou SMS.
3. **La preuve fait la crédibilité** : les preuves multimédia sont la fonctionnalité la mieux notée (4,02 / 5).
4. **Les observateurs sont exposés** : intimidation (34), surveillance (25), piratage (22). La sécurité est un socle, pas un outil à part.
5. **Toutes les OSC ne peuvent pas héberger** : 14 n'en ont pas la capacité alors que 42 tiennent au contrôle de leurs données.

## Domaines et chiffres qui les fondent

| Domaine | Outils | Ce qu'il couvre | Chiffre qui le fonde |
|---|---|---|---|
| 📥 Collecte terrain | 7 (C1–C7) | Les façons de signaler, du smartphone au téléphone basique | Hors-ligne critique pour 30 OSC ; téléphones basiques chez 19 |
| 📡 Réception multi-canal | 5 (R1–R5) | L'arrivée des messages et l'identification de l'observateur | WhatsApp voulu par 40, SMS par 30 |
| 🔎 Vérification | 6 (M1–M6) | Le tri, les preuves, la qualification, la traçabilité | Photo 41 ; horodatage non modifiable exigé par 25 |
| 📢 Diffusion et alertes | 5 (D1–D5) | Les cartes, les alertes, les rapports publics | Temps réel voulu par 35 ; alertes WhatsApp/Telegram par 40 |
| 📊 Analyse et archives | 4 (A1–A4) | Les statistiques, l'export, la conservation | Export noté 3,64 / 5 ; 15 OSC utilisent déjà KoBo |
| 🧱 Socles transverses | 7 (S1–S7) | Identité, sécurité, langues, déploiement, référentiels, docs | Intimidation citée par 34 ; 19 répondants hors pays cibles |

## Qui a répondu

| Dimension | Répartition (sur 45) |
|---|---|
| Pays (18) | Sénégal 8 · Tchad 6 · Mali 6 · Soudan du Sud 4 · Bénin 3 · Côte d'Ivoire 3 · RDC 3 · Congo-Brazzaville 2 · 10 pays à 1 réponse |
| Pays cibles du programme | 26 dans les 11 pays cibles · 19 hors liste, dont 10 anglophones |
| Type d'organisation (plusieurs choix) | OSC nationale 23 · Org. jeunesse 11 · Civic tech 9 · Mouvement jeunes 7 · Média citoyen 7 · Autre 4 |
| Expérience de l'observation | 5 ans et + 21 · 3–4 ans 1 · 1–2 ans 9 · première fois 14 |
| Observateurs déployés | 1–10 : 22 · 11–50 : 10 · 51–150 : 4 · 200+ : 9 |
| Maturité numérique (1–5) | 1 : 3 · 2 : 6 · 3 : 22 · 4 : 11 · 5 : 3 |

Deux profils tirent le produit dans deux directions : une moitié de petites structures (1 à 10 observateurs, souvent première observation) qui ont besoin de simplicité et d'un hébergement fourni, et 13 grosses OSC (plus de 50 observateurs) qui ont besoin de volume, de rôles et de contrôle.

**Limites.** Le pays de 12 répondants a été déduit de leur organisation. L'échantillon est déclaratif et non représentatif (Sénégal, Tchad et Mali pèsent 20 réponses sur 45). 44 notations de fonctionnalités exploitables.

## Réalités terrain

Réseaux instables, téléphones modestes, climat de menace : ces trois contraintes fixent l'architecture plus que la liste des fonctionnalités.

- **Connectivité** : variable selon les zones 27 · faible (2G/3G) 7 · très faible (SMS seulement) 3 · bonne 8. Hors-ligne jugé critique par 30 OSC, y compris 5 bien connectées (coupures pendant les scrutins).
- **Menaces** (plusieurs choix) : coupures internet 41 · intimidation ou arrestation 34 · désinformation 34 · surveillance 25 · piratage 22.
- **Appareils des observateurs** : Android milieu/haut de gamme 32 · Android bas de gamme 26 · téléphones basiques 19 · iPhone 13. 9 OSC n'ont que des téléphones basiques ou Android bas de gamme.
- **Coordination** : coordinateurs sur smartphone 19, sur les deux supports 22, ordinateur seul 3 → le dashboard doit être utilisable sur mobile.

| Budget et hébergement | Réponses |
|---|---|
| Coût serveur maximal | < 10 €/mois 9 · < 30 €/mois 12 · sans contrainte 9 · ne sait pas 15 |
| Priorité de contrôle | Contrôle préféré 26 · auto-hébergement obligatoire 16 · cloud tiers accepté 3 |
| Capacité d'hébergement | Équipe interne 17 · via VPS ou cloud 13 · aucune 14 · ne sait pas 1 |

10 OSC veulent garder le contrôle sans avoir de capacité d'hébergement : un mode hébergé par un tiers de confiance, avec export complet, est prévu à côté de l'auto-hébergement (S5, [ADR-0004](./decisions/0004-mode-hebergement.md)).

## Pratiques actuelles

| Outil | Principal | Occasionnel | Jamais |
|---|---|---|---|
| WhatsApp | 39 | 2 | 0 |
| SMS | 18 | 10 | 2 |
| KoBoToolbox / KoboCollect | 15 | 5 | 7 |
| Google Sheets | 9 | 10 | 5 |
| Telegram | 5 | 11 | 8 |
| Application maison | 4 | 5 | 14 |
| Ushahidi | 1 | 4 | 14 |

La Situation Room ne se positionne pas comme une migration depuis Ushahidi, mais depuis « WhatsApp + KoBo + tableur ». L'import KoBo (C7) est un levier d'adoption.

Problèmes déclarés : connectivité 27 · absence de vérification 10 · absence de cartographie 9 · sécurité 8 · manque de formation 8 · données dispersées 7 · complexité des outils 5.

> « Plateforme web sécurisée plus un signalement par SMS/WhatsApp, avec carte interactive publique et espace de modération privé. Simple, fiable, adaptée aux faibles connexions. » (Mali)
>
> « Observers send coded SMS which will translate as an answered form on the dashboard. » (Afrique australe)
>
> « Une application vocale en langues nationales. » (Mali)

## Besoins fonctionnels

Les notes sont serrées (3,33 à 4,02 / 5) : c'est la mention « non négociable » qui départage. Signalement multi-canal (12), hors-ligne (11), alertes (11) et géolocalisation (10) sont les plus souvent exigés sans compromis. Les deux fonctionnalités en tête, **preuves** et **sécurité**, sont celles que le dépôt ne couvre pas encore.

| Axe | Ce que demandent les OSC (sur 45) | Implication produit |
|---|---|---|
| Canaux de signalement | WhatsApp 40 · SMS 30 · appel 27 · email 20 · formulaire web 14 · Telegram 12 · app Android 9 · USSD 4 | WhatsApp et SMS d'abord ; saisie des appels par un opérateur ; Telegram secondaire |
| Preuves | Photo 41 · texte 36 · vidéo 33 · audio 27 · témoignage structuré 27 · document scanné 24 · GPS seul 11 | Pièces jointes dès le MVP ; vidéo indispensable pour 2 seulement |
| Intégrité | Horodatage obligatoire et non modifiable 25 · modifiable 15 · inutile 5 | Horodatage serveur + heure déclarée, empreinte de chaque preuve |
| Fréquence | En continu 21 · quelques fois par heure 11 · par jour 8 · une fois par tour 5 | Flux temps réel côté modération, files d'attente en pic le jour J |
| Géolocalisation | Automatique 27 · manuelle 13 · inutile 4 · bureau de vote 23, national 10, commune 7 | GPS + choix dans une liste de bureaux de vote |
| Alertes sortantes | WhatsApp/Telegram 40 · SMS 31 · push 19 · email 17 ; incident critique 41, preuve reçue 32, intrusion 27 | Alertes sur gravité « critique » et événement de sécurité |
| Visualisation | Temps réel 35 · carte publique 24 · carte interne 14 · par circonscription 14 · filtrable 13 · stats 11 · heatmap 4 | Carte interne temps réel + carte publique des vérifiés |
| Langues | Français 17 · anglais 10 · wolof 8 · bambara 5 · arabe 7 · pulaar 3 · swahili, lingala, sérère 2 | FR/EN au MVP, fichiers de langue ouverts, vocal comme voie d'inclusion |

## Besoins non fonctionnels

Ils s'appliquent à **tous** les outils : une PR qui les contredit est refusée.

| Exigence | Ce qui la fonde | Critère |
|---|---|---|
| Protection des observateurs | Intimidation 34, surveillance 25 | Identité jamais publiée ; numéros chiffrés en base ; pseudonymisation après le scrutin |
| Intégrité des preuves | Horodatage non modifiable 25 ; désinformation 34 | SHA-256 + horodatage serveur à la réception ; journal d'audit |
| Sécurité des accès | Piratage 22 ; alertes intrusion 27 | Rôles, 2FA modérateurs, **aucun jeton d'API dans le navigateur** |
| Résilience réseau | Coupures 41 ; hors-ligne critique 30 | File d'envoi hors ligne ; bascule SMS ; tuiles de carte en cache |
| Légèreté | Android bas de gamme 26 | Formulaire utilisable en 2G ; images compressées avant envoi |
| Frugalité | Budget < 10 €/mois (9) ou < 30 €/mois (12) | Instance complète sur un VPS de 2 Go de RAM ; médias purgeables |
| Souveraineté | Contrôle 26, auto-hébergement obligatoire 16 | Docker en une commande ; export complet à tout moment |
| Accessibilité d'hébergement | 14 OSC sans capacité | Mode hébergé par un tiers de confiance, une instance isolée par OSC |
| Inclusion | Langues nombreuses ; téléphones basiques 19 | Interface traduisible ; parcours SMS et appel |
| Mobilité des coordinateurs | Smartphone 19, les deux 22 | Dashboard responsive |

## Matrice besoins × outils

Chaque réponse proposée dans le formulaire est couverte par au moins un outil, et chacun des 34 outils répond à au moins un besoin. Un développeur vérifie qu'un outil répond à une demande réelle ; le pilotage vérifie qu'un besoin a son outil.

| Besoin exprimé (consultation) | OSC (sur 45) | Outils qui y répondent |
|---|---|---|
| Signaler par WhatsApp | 40 | R1, C6 |
| Signaler par SMS | 30 | C3, R2 |
| Signaler par appel | 27 | C4, C6 |
| Signaler par email | 20 | R4 |
| Formulaire web | 14 | C1 |
| Telegram | 12 | R3 |
| App Android | 9 | C2 |
| USSD | 4 | C5 |
| Preuve photo / texte / vidéo / audio | 41 / 36 / 33 / 27 | R1, M2, C1, C2 |
| Document scanné | 24 | M2, R4 |
| Témoignage structuré | 27 | C1, C3, M3 |
| Horodatage non modifiable | 25 | M2, M4 |
| Géolocalisation automatique / manuelle | 27 / 13 | C1, C2, M3, S6 |
| Niveau bureau de vote | 23 | M3, S6, R5 |
| Hors-ligne critique | 30 | C1, C2, C3 |
| Connexion faible ou SMS seul | 10 | C3, R2, C5 |
| Coupures internet (menace) | 41 | C1, C3, R2, S5 |
| Intimidation / arrestation | 34 | S3, R5, A4 |
| Désinformation | 34 | M4, M5, M6, D4 |
| Surveillance | 25 | S3, A4 |
| Piratage | 22 | S1, S3 |
| Alerte incident critique / preuve / intrusion | 41 / 32 / 27 | D3, M3, S3 |
| Alerte seuil dépassé / cluster | 11 / 3 | D3, M5 |
| Alertes par WhatsApp-Telegram / SMS / push / email | 40 / 31 / 19 / 17 | D3 |
| Incidents en temps réel | 35 | D2, M1 |
| Carte publique | 24 | D1 |
| Carte interne / par circonscription | 14 / 14 | D2, D1 |
| Tableau de bord stats | 11 | A1 |
| Heatmap | 4 | A3 |
| Export des données | noté 3,64 | A2, D5 |
| Multi-organisations | noté 3,65 | S2 |
| Adaptable à d'autres contextes | noté 3,74 | M3, S4, S6 |
| Langues (FR 17, EN 10, wolof 8…) | 45 | S4, C6 |
| Coordinateurs sur smartphone | 41 | M1, D2 |
| Budget serveur < 30 €/mois | 21 | S5 |
| Pas de capacité d'hébergement | 14 | S5, S2 |
| Contrôle / auto-hébergement | 42 | S5, A2 |
| Données déjà dans KoBo | 15 | C7 |
| Manque de formation | 8 citations | S7 |

Les codes renvoient aux fiches du [catalogue](./outils/README.md).

## Besoins hors logiciel

Une part importante des réponses demande les moyens de se servir d'un outil plutôt qu'un logiciel. Ils relèvent du programme (AHEAD Africa, Digitalise Youth), pas des contributeurs du dépôt, mais aucun outil ne sera adopté s'ils restent sans réponse.

| Besoin | Ce qu'en disent les OSC | Piste pour le programme |
|---|---|---|
| Téléphones et tablettes | Nombreuses réponses à « outil idéal » citant smartphones, tablettes, ordinateurs ; téléphones basiques chez 19 OSC | Dotation ciblée ou prêt de téléphones Android pour les coordinateurs |
| Connectivité | Connectivité citée 27 fois comme problème ; « Starlink », « routeur », crédits data cités | Forfaits data et crédits SMS pendant le scrutin |
| Énergie | Accès à l'énergie et batteries externes cités (Tchad, Soudan du Sud) | Batteries externes dans le kit observateur |
| Formation | Manque de formation cité 8 fois ; 14 OSC en première observation ; demandes de formation en sécurité numérique | Sessions Tech Camp et formations en ligne appuyées sur S7 |
| Mobilité et logistique | Transport vers des bureaux éloignés, moyens financiers cités | Hors périmètre technique, à signaler aux bailleurs |
| Accessibilité | Une OSC demande des outils « inclusifs au handicap » | Exigence d'accessibilité (WCAG) sur C1 et D1 |

---
[Catalogue des outils](./outils/README.md) · [Phasage](./ROADMAP.md) · [Décisions](./decisions/README.md)
