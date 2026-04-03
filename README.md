# FitTrack v2

Application de suivi d'entraînement musculaire.

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

## Build Android & Publication Play Store

L'application embarque le frontend dans un AAB/APK natif Android via [Capacitor](https://capacitorjs.com/).

### Prérequis

- JDK installé (vérifier : `java -version`)
- SDK Android configuré (`ANDROID_HOME` ou `ANDROID_SDK_ROOT`)

---

### 1. Créer le keystore (une seule fois)

Le keystore est le fichier qui prouve que l'APK vient bien de toi. **À garder précieusement — si tu le perds, tu ne pourras plus mettre à jour l'appli sur le Play Store.**

```bash
cd frontend/android
keytool -genkey -v -keystore fittrack-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias fittrack
```

Renseigner les infos demandées (nom, organisation…) et choisir un mot de passe.

---

### 2. Créer `frontend/android/keystore.properties`

Ce fichier n'est pas commité dans git (sensible).

```properties
storePassword=LE_MOT_DE_PASSE_KEYSTORE
keyPassword=LE_MOT_DE_PASSE_CLE
keyAlias=fittrack
storeFile=../fittrack-release-key.jks
```

---

### 3. Builder le frontend et synchroniser

```bash
cd frontend

# L'URL de l'API de prod est définie dans .env.production — pas besoin de variable
npm run build

# Copier les assets dans le projet Android
npx cap sync android
```

---

### 4. Builder l'AAB (format Play Store)

```bash
cd frontend/android
./gradlew bundleRelease
```

L'AAB signé sera dans `frontend/android/app/build/outputs/bundle/release/app-release.aab`.

> Pour un APK à installer directement sur un téléphone (sans Play Store) :
> ```bash
> ./gradlew assembleRelease
> # → frontend/android/app/build/outputs/apk/release/app-release.apk
> ```

---

### 5. Publier sur le Play Store

1. Aller sur la [Google Play Console](https://play.google.com/console)
2. Créer une nouvelle application
3. Remplir la fiche : description, captures d'écran, politique de confidentialité (obligatoire)
4. Dans **Production → Créer une version**, uploader le fichier `app-release.aab`
5. Soumettre pour validation (quelques jours la première fois)

> Pour les mises à jour suivantes, incrémenter `versionCode` et `versionName` dans `frontend/android/app/build.gradle` avant chaque build.

---

## Build iOS

La configuration iOS n'est pas encore en place (`@capacitor/ios` non installé).  
Requiert macOS + Xcode.

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
