# Solenergee Backend — API de suivi des AO

Backend Node.js/Express + PostgreSQL pour la gestion des appels d'offres solaires.

---

## Architecture

```
Frontend (React/JSX)  ──► API REST ──► PostgreSQL
                                  └──► Claude AI (analyse emails)
Email (newsletter)    ──► Mailgun ──► Webhook ──► Claude AI ──► PostgreSQL
```

---

## Déploiement sur Railway (recommandé — ~5 min)

### 1. Créer le projet Railway

1. Va sur [railway.app](https://railway.app) → **New Project**
2. **Deploy from GitHub repo** → connecte ton dépôt
3. Ajoute un service **PostgreSQL** : clic droit → Add Service → Database → PostgreSQL

### 2. Variables d'environnement

Dans Railway → ton service → **Variables**, ajoute :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | *(fourni automatiquement par Railway PostgreSQL)* |
| `ANTHROPIC_API_KEY` | Ta clé API Anthropic (`sk-ant-...`) |
| `API_SECRET_KEY` | Une chaîne aléatoire longue (ex: `openssl rand -hex 32`) |
| `ALLOWED_ORIGINS` | URL de ton frontend (ex: `https://solenergee.vercel.app`) |
| `MAILGUN_SIGNING_KEY` | Ta clé de signature Mailgun |
| `NODE_ENV` | `production` |

### 3. Migration + seed

Railway exécute `npm run db:migrate` automatiquement au déploiement (via Procfile).

Pour importer les données existantes :
```bash
# En local avec la DATABASE_URL de Railway copiée dans .env
npm run db:seed
```

### 4. URL de déploiement

Railway te donne une URL type `https://solenergee-backend-production.up.railway.app`

---

## Configuration email (Mailgun)

### Créer un compte Mailgun (gratuit jusqu'à 1000 emails/mois)

1. Va sur [mailgun.com](https://mailgun.com) → crée un compte gratuit
2. **Sending** → **Domains** → ajoute ton domaine (ex: `ao.solenergee.fr`)
3. **Receiving** → **Routes** → **Create Route** :
   - **Expression** : `match_recipient("ao@solenergee.fr")`
   - **Action** : `forward("https://ton-backend.railway.app/api/email/inbound")`
   - **Priority** : 10

4. Récupère ta **HTTP Webhook Signing Key** dans Account → API Security

### Utilisation

Tu transfères (ou réexpédies) tes newsletters AO à :
```
ao@solenergee.fr
```
→ Mailgun reçoit → envoie au webhook → Claude analyse → AO ajoutés en "3. À étudier"

---

## API Reference

Toutes les routes (sauf `/health` et `/api/email/inbound`) nécessitent le header :
```
x-api-key: <API_SECRET_KEY>
```

### Projets

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/projets` | Liste tous les projets |
| `GET` | `/api/projets?tab=Public&statut=1. Envoyés&dep=44` | Avec filtres |
| `GET` | `/api/projets?search=mairie&sort=montant&order=desc` | Recherche + tri |
| `GET` | `/api/projets/stats?tab=Public` | Statistiques |
| `GET` | `/api/projets/alertes` | Échéances < 14 jours |
| `POST` | `/api/projets` | Créer un projet |
| `POST` | `/api/projets/batch` | Importer plusieurs projets |
| `PUT` | `/api/projets/:id` | Modifier un projet |
| `DELETE` | `/api/projets/:id` | Supprimer un projet |

### Email

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/api/email/inbound` | Webhook Mailgun (auto) |
| `POST` | `/api/email/parse` | Analyser un email manuellement |
| `GET` | `/api/email/imports` | Historique des imports |

### Exemple POST /api/projets

```json
{
  "tab": "Public",
  "statut": "3. A étudier",
  "client": "Mairie de Lyon",
  "dep": "69",
  "date_limite": "2026-04-15",
  "montant": 95000,
  "commentaire": "120 kWc en toiture - bac acier"
}
```

---

## Développement local

```bash
git clone <repo>
cd solenergee-backend
npm install

# Copier et remplir le fichier .env
cp .env.example .env

# Créer les tables
npm run db:migrate

# Importer les données existantes
npm run db:seed

# Démarrer en mode dev (hot-reload)
npm run dev
```

---

## Connexion Frontend → Backend

Dans ton frontend React, remplace les données statiques par des appels API :

```javascript
const API_URL = "https://ton-backend.railway.app";
const API_KEY = "ta_clé_secrète"; // À stocker en variable d'env frontend

// Charger les projets
const res = await fetch(`${API_URL}/api/projets?tab=Public`, {
  headers: { "x-api-key": API_KEY }
});
const { data } = await res.json();

// Créer un projet
await fetch(`${API_URL}/api/projets`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
  body: JSON.stringify({ tab:"Public", client:"Mairie de Lyon", statut:"3. A étudier", ... })
});
```
