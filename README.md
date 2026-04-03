# FitTrack v2

Application de suivi d'entraînement musculaire et de nutrition.

**Production :**
- Frontend : https://muscuv2.chocot.be
- API : https://apimuscuv2.chocot.be

---

## Stack technique

| Couche | Technologies |
|--------|-------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, React Router v6, Zod |
| Backend | Node.js, Express, TypeScript, Prisma ORM |
| Base de données | PostgreSQL 16 |
| Auth | JWT (access token + refresh token), bcrypt |
| Mobile | Capacitor (Android APK) |
| Infra | Docker Compose, Traefik (prod) |

---

## Fonctionnalités

- **Authentification** — inscription, connexion, refresh token automatique
- **Dashboard** — résumé de la semaine, dernière séance, stats rapides
- **Templates** — créer des programmes avec exercices, commentaires et nombre de séries
- **Séances** — lancer une séance depuis un template, valider chaque série (poids + reps)
- **Historique** — liste de toutes les séances passées avec détail des séries
- **Exercices** — bibliothèque globale + exercices personnalisés par utilisateur
- **Progression** — évolution du volume et des charges par exercice dans le temps
- **Profil** — informations et déconnexion

---

## Démarrage en local

### Prérequis

- [Docker](https://www.docker.com/) et Docker Compose
- Node.js 20+ (pour le développement hors Docker)

### 1. Variables d'environnement

```bash
cp .env.example .env
# Modifier les valeurs si besoin (les valeurs par défaut fonctionnent en dev)
```

### 2. Lancer les services

```bash
docker compose up -d
```

Cela démarre :
- PostgreSQL sur le port `5432`
- API backend sur le port `3001`
- Frontend Vite sur le port `5173`

L'application est accessible sur **http://localhost:5173**

### 3. Migrations de base de données

Les migrations Prisma sont appliquées automatiquement au démarrage du backend.  
Pour créer une nouvelle migration après modification du schéma :

```bash
cd backend && npx prisma migrate dev --name nom_de_la_migration
```

### Commandes utiles

```bash
# Voir les logs
docker compose logs -f backend
docker compose logs -f frontend

# Interface visuelle de la base de données
cd backend && npx prisma studio

# Appliquer les migrations manuellement
cd backend && npx prisma migrate dev
```

---

## Build Android (APK)

L'application embarque le frontend dans un APK natif Android via [Capacitor](https://capacitorjs.com/).

### Prérequis

- [Android Studio](https://developer.android.com/studio) installé
- SDK Android configuré (`ANDROID_HOME` ou `ANDROID_SDK_ROOT`)

### Étapes

```bash
cd frontend

# 1. Builder le frontend en ciblant l'API de production
VITE_API_URL=https://apimuscuv2.chocot.be npm run build

# 2. Synchroniser les assets dans le projet Android
npx cap sync android

# 3. Ouvrir dans Android Studio pour builder l'APK
npx cap open android
```

Dans Android Studio : **Build → Build Bundle(s) / APK(s) → Build APK(s)**

L'APK signé sera dans `frontend/android/app/build/outputs/apk/`.

> **Note :** L'APK communique avec l'API de production (`https://apimuscuv2.chocot.be`). Il n'y a pas de mode offline.

---

## Build iOS

La configuration iOS n'est pas encore en place (`@capacitor/ios` non installé).  
Pour l'ajouter :

```bash
cd frontend
npm install @capacitor/ios
npx cap add ios
# Requiert macOS + Xcode
```

---

## Déploiement en production

Le serveur de prod utilise Traefik comme reverse proxy. Le déploiement se fait via Docker Compose.

```bash
# Sur le serveur de prod
docker compose -f docker-compose.prod.yml up -d --build
```

Les variables d'environnement suivantes doivent être définies sur le serveur :

```
POSTGRES_USER=...
POSTGRES_PASSWORD=...
POSTGRES_DB=...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
```

> Ne pas modifier la configuration Traefik sur le serveur — elle est gérée séparément.

---

## Variables d'environnement

Voir `.env.example` pour la liste complète.

| Variable | Description | Exemple |
|----------|-------------|---------|
| `POSTGRES_USER` | Utilisateur PostgreSQL | `fittrack` |
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL | `fittrack` |
| `POSTGRES_DB` | Nom de la base | `fittrack` |
| `JWT_SECRET` | Secret pour les access tokens | *(chaîne aléatoire longue)* |
| `JWT_REFRESH_SECRET` | Secret pour les refresh tokens | *(chaîne aléatoire longue)* |
| `VITE_API_URL` | URL de l'API (frontend) | `http://localhost:3001` |

---

## Structure du projet

```
fittrack-v2/
├── backend/
│   ├── src/
│   │   ├── routes/        # Endpoints Express (auth, exercises, sessions, templates)
│   │   ├── middleware/    # JWT auth, validation Zod, gestion d'erreurs
│   │   ├── services/      # Logique métier
│   │   └── index.ts
│   └── prisma/
│       ├── schema.prisma
│       └── migrations/
└── frontend/
    ├── src/
    │   ├── pages/         # Une page par route
    │   ├── components/    # Composants réutilisables
    │   ├── hooks/         # Hooks custom (useAuth, etc.)
    │   └── lib/           # Client API, types, utils
    ├── android/           # Projet Android généré par Capacitor
    └── capacitor.config.ts
```
