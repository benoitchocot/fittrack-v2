# FitTrack v2 — Instructions pour Claude Code

## Contexte du projet

Refonte complète de l'application FitTrack (https://github.com/benoitchocot/fittrack).
L'ancienne version utilisait SQLite + fichiers JSON, Node.js/Express en JS, et un frontend Vite + React + TypeScript + Tailwind.

L'objectif est de repartir from scratch avec une stack plus robuste, une vraie base de données relationnelle, et une architecture maintenable sur le long terme.

L'application tourne en production sur un serveur avec Traefik :
- Frontend : https://muscu.chocot.be
- API : https://apimuscu.chocot.be

---

## Stack technique cible

### Frontend
- **Vite** + **React 18** + **TypeScript** (strict)
- **Tailwind CSS** + **shadcn/ui** pour les composants
- **React Query (TanStack Query)** pour les appels API et le cache
- **React Router v6** pour la navigation
- **Zod** pour la validation des formulaires côté client

### Backend
- **Node.js** + **Express** + **TypeScript**
- **Prisma** comme ORM (migrations, typage, relations)
- **PostgreSQL** comme base de données principale
- **JWT** pour l'authentification (access token + refresh token)
- **bcrypt** pour le hash des mots de passe
- **Zod** pour la validation des body de requêtes

### Infrastructure
- **Docker Compose** pour le dev local (PostgreSQL + backend + frontend)
- **Traefik** déjà configuré en prod sur le serveur (ne pas modifier)
- Variables d'environnement dans `.env` (jamais hardcodées)

---

## Architecture du projet

Monorepo avec la structure suivante :

```
fittrack-v2/
├── CLAUDE.md
├── docker-compose.yml          # Dev local (Postgres + back + front)
├── docker-compose.prod.yml     # Production
├── .env.example
├── backend/
│   ├── src/
│   │   ├── routes/             # Routes Express (auth, exercises, sessions, meals)
│   │   ├── middleware/         # JWT auth, error handler, validation
│   │   ├── services/           # Logique métier (séparée des routes)
│   │   ├── prisma/             # Schema + migrations
│   │   └── index.ts            # Point d'entrée
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── components/         # Composants réutilisables (shadcn + custom)
    │   ├── pages/              # Pages (une par route)
    │   ├── hooks/              # Hooks custom (useAuth, useWorkout, etc.)
    │   ├── lib/                # Clients API, utils, constantes
    │   └── main.tsx
    ├── Dockerfile
    ├── package.json
    └── tsconfig.json
```

---

## Schéma de données (Prisma)

Voici les entités principales à modéliser :

```prisma
// User : compte utilisateur
model User {
  id           Int              @id @default(autoincrement())
  email        String           @unique
  passwordHash String
  name         String
  createdAt    DateTime         @default(now())
  sessions     WorkoutSession[]
  meals        Meal[]
}

// MuscleGroup : ex. "Pectoraux", "Dos", "Jambes"
model MuscleGroup {
  id        Int        @id @default(autoincrement())
  name      String     @unique
  exercises Exercise[]
}

// Exercise : bibliothèque d'exercices
model Exercise {
  id            Int          @id @default(autoincrement())
  name          String
  muscleGroupId Int
  muscleGroup   MuscleGroup  @relation(fields: [muscleGroupId], references: [id])
  equipment     String?      // "haltères", "barre", "machine", "poids du corps"
  description   String?
  isCustom      Boolean      @default(false)
  createdById   Int?         // null = exercice global, sinon = utilisateur qui l'a créé
  sets          WorkoutSet[]
}

// WorkoutSession : une séance d'entraînement
model WorkoutSession {
  id        Int          @id @default(autoincrement())
  userId    Int
  user      User         @relation(fields: [userId], references: [id])
  date      DateTime     @default(now())
  name      String?      // ex. "Push A", "Leg Day"
  notes     String?
  duration  Int?         // en minutes
  sets      WorkoutSet[]
}

// WorkoutSet : une série dans une séance (exercice + poids + reps)
model WorkoutSet {
  id         Int            @id @default(autoincrement())
  sessionId  Int
  session    WorkoutSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  exerciseId Int
  exercise   Exercise       @relation(fields: [exerciseId], references: [id])
  setNumber  Int            // numéro de la série (1, 2, 3...)
  reps       Int
  weight     Float          // en kg
  rpe        Int?           // effort perçu, optionnel (1-10)
  notes      String?
}

// Meal : repas pour le suivi alimentaire
model Meal {
  id        Int      @id @default(autoincrement())
  userId    Int
  user      User     @relation(fields: [userId], references: [id])
  date      DateTime @default(now())
  name      String   // ex. "Petit déjeuner"
  calories  Int?
  protein   Float?   // en grammes
  carbs     Float?
  fat       Float?
  notes     String?
}
```

---

## Fonctionnalités à implémenter (par ordre de priorité)

### Phase 1 — Socle technique
- [ ] Structure du projet (monorepo, Docker Compose dev)
- [ ] Schéma Prisma + migration initiale
- [ ] Authentification (register, login, refresh token, logout)
- [ ] Middleware JWT sur les routes protégées

### Phase 2 — Fonctionnalités core musculation
- [ ] CRUD exercices (bibliothèque globale + exercices custom par utilisateur)
- [ ] CRUD séances (créer, modifier, supprimer)
- [ ] Ajout de séries dans une séance (exercice + poids + reps)
- [ ] Historique des séances par utilisateur
- [ ] Progression par exercice (évolution du poids/reps dans le temps)

### Phase 3 — Interface utilisateur
- [ ] Page d'authentification (login/register)
- [ ] Dashboard (résumé semaine, dernière séance, stats rapides)
- [ ] Page de création de séance (recherche exercice, ajout séries)
- [ ] Page historique (liste des séances passées)
- [ ] Page progression (graphiques par exercice)
- [ ] Page profil utilisateur

### Phase 4 — Suivi alimentaire
- [ ] CRUD repas
- [ ] Page suivi nutrition (calories, macros par jour)

---

## Migration des données existantes

Les données de prod sont dans un volume Docker : `~/muscu-data/`
Un backup SQLite a été exporté : `fittrack_backup.sql`

Quand on aura besoin de migrer les données, il faudra :
1. Parser le dump SQLite
2. Transformer les données pour correspondre au nouveau schéma Prisma
3. Insérer via un script de seed Prisma

**Ne pas faire cette migration tant que le schéma Prisma n'est pas finalisé.**

---

## Configuration Docker de production

Le serveur de prod utilise Traefik. Voici la configuration à respecter pour le `docker-compose.prod.yml` :

```yaml
# Backend
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.muscu.rule=Host(`apimuscu.chocot.be`)"
  - "traefik.http.routers.muscu.entrypoints=http"
  - "traefik.http.services.muscu.loadbalancer.server.port=3001"

# Frontend  
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.muscu-front.rule=Host(`muscu.chocot.be`)"
  - "traefik.http.routers.muscu-front.entrypoints=http"
  - "traefik.http.services.muscu-front.loadbalancer.server.port=80"
```

PostgreSQL en prod doit utiliser un **volume nommé Docker** (pas un bind mount) pour la persistance des données.

---

## Conventions de code

### Général
- TypeScript strict partout — **pas de `any`**
- ESLint + Prettier configurés dès le départ
- Variables d'environnement dans `.env`, documentées dans `.env.example`

### Backend
- Routes dans `src/routes/` — une logique métier dans `src/services/`
- Validation des inputs avec **Zod** sur chaque route POST/PUT
- Toujours retourner des erreurs structurées : `{ error: string, details?: any }`
- HTTP status codes corrects (200, 201, 400, 401, 403, 404, 500)
- Ne jamais exposer le `passwordHash` dans les réponses API

### Frontend
- Composants en **PascalCase** : `WorkoutCard.tsx`
- Hooks custom en **camelCase** : `useWorkoutSession.ts`
- Appels API centralisés dans `src/lib/api.ts`
- Gestion des états serveur avec **React Query** (pas de useState pour les données API)
- Formulaires avec **react-hook-form** + **Zod**

### Base de données
- Toujours créer une **migration Prisma** pour chaque changement de schéma
- Ne jamais modifier la base manuellement en prod
- Les données de seed vont dans `backend/prisma/seed.ts`

---

## Ce qu'il ne faut PAS faire

- ❌ SQLite ou fichiers JSON pour stocker des données
- ❌ `any` en TypeScript
- ❌ Secrets ou clés API dans le code source
- ❌ Modifier le schéma Prisma sans créer une migration
- ❌ Logique métier directement dans les routes Express
- ❌ Appels `fetch` directs dans les composants React (passer par React Query)
- ❌ Toucher à la config Traefik sur le serveur de prod

---

## Structure du dépôt Git

Le dossier racine `fittrack-v2/` est un **monorepo Git unique**. Il ne contient que deux sous-projets :
- `backend/` — API Node.js/Express/Prisma
- `frontend/` — Application Vite/React + app Android (Capacitor)

**Toutes les opérations Git se font depuis la racine** (`git add`, `git commit`, `git push`). Il n'y a pas de sous-repo Git dans `backend/` ou `frontend/`. Un seul remote, un seul historique.

---

## Commandes utiles

```bash
# Dev local
docker compose up -d              # Lance Postgres + back + front
cd backend && npx prisma migrate dev  # Créer/appliquer une migration
cd backend && npx prisma studio   # Interface visuelle de la DB

# Build prod
docker compose -f docker-compose.prod.yml up -d --build

# Build Android (depuis frontend/)
npm run build                     # Build Vite
npx cap sync android              # Sync Capacitor
cd android && .\gradlew assembleRelease   # APK → app/build/outputs/apk/release/
cd android && .\gradlew bundleRelease     # AAB → app/build/outputs/bundle/release/
```

### Avant chaque build Android
Incrémenter dans `frontend/android/app/build.gradle` :
- `versionCode` : +1
- `versionName` : +0.1

Commiter + pusher le bump **avant** de builder.
