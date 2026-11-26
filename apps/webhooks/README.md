# 📡 Webhooks Receiver (Node.js)

**Rôle :** Ce micro-service est l'oreille de la plateforme. Il écoute les requêtes HTTP (webhooks) envoyées par des services externes (Bots Telegram, Gateways SMS, API WhatsApp) et transforme ces messages bruts en "Signalements" formatés dans notre base de données.


## 🧰 Outils hébergés

| Code | Outil | Phase | État |
|---|---|---|---|
| [R1](../../docs/outils/reception.md#r1) | Passerelle WhatsApp | MVP | texte seul, médias ignorés, pas de vérification de signature |
| [R2](../../docs/outils/reception.md#r2) | Passerelle SMS | MVP | texte brut, aucune réponse |
| [C3](../../docs/outils/collecte.md#c3) | Parcours SMS codé (`src/parsers/sms.ts`) | MVP | à créer |
| [R3](../../docs/outils/reception.md#r3) | Bot Telegram | maintenu | texte + position |
| [D3](../../docs/outils/diffusion.md#d3) | Alertes sortantes (`src/notify/`) | V1 | à créer |
| [C7](../../docs/outils/collecte.md#c7) | Connecteur KoBo / ODK | V1 | à créer |
| [R4](../../docs/outils/reception.md#r4) | Email entrant | V2 | à créer |
| [C5](../../docs/outils/collecte.md#c5) | USSD | V2 | à créer |

Le rattachement de chaque message à un observateur enrôlé relève de [R5](../../docs/outils/reception.md#r5) ; le stockage des médias de [M2](../../docs/outils/verification.md#m2).

---

## 🏗️ Architecture & Flux

```
1. Un citoyen envoie un SMS : "Urgent, bureau fermé à Dakar."
2. La Gateway SMS (ex: Africa's Talking) envoie une requête POST → /api/sms
3. Le handler dans src/handlers/sms.ts intercepte la requête
4. Il parse le message et insère une ligne "pending" via l'API NocoDB
5. Un modérateur voit le signalement dans le Dashboard pour le valider
```

---

## 🚀 Démarrage rapide

```bash
# Depuis la racine du monorepo
pnpm dev:webhooks
```

Tester avec curl :
```bash
curl -X POST http://localhost:3000/api/incoming \
  -H "Content-Type: application/json" \
  -d '{"source": "web", "message": "Test de signalement"}'
```

---

## 🏗️ Structure attendue

```
src/
├── index.ts             → Serveur Express + déclaration des routes
└── handlers/            → Un fichier par canal
    ├── telegram.ts      → Parser les messages Telegram Bot
    ├── sms.ts           → Parser les SMS Africa's Talking
    └── whatsapp.ts      → Parser les messages WhatsApp Business API
```

---

## 🎯 Premières issues

- `[R1]` Téléchargement des médias, vérification de `X-Hub-Signature-256`, accusé de réception avec numéro de suivi
- `[C3]` Grammaire du SMS codé (avec des observateurs), parseur + tests, réponse d'erreur explicite
- `[R2]` Brancher le parseur C3, abstraction « fournisseur SMS » par pays
- `[R3]` Aligner sur le format commun de R1 (sans plus d'investissement)

Pour ajouter un canal : un fichier `src/handlers/<canal>.ts`, la route dans `src/index.ts`, les paramètres documentés ici — et une fiche d'outil (voir [AJOUTER_UN_OUTIL.md](../../docs/AJOUTER_UN_OUTIL.md)).
