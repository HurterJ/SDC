# SiteSuivi

Application web de gestion des réserves et observations de chantier. Permet aux conducteurs de travaux de créer et suivre des observations sur des plans, et aux installateurs d'y répondre via un lien d'accès sans compte.

## Stack technique

- **Framework** : Next.js 14 (App Router)
- **UI** : Tailwind CSS
- **Base de données / Auth / Storage** : Supabase (PostgreSQL + RLS)
- **Langage** : TypeScript

## Fonctionnalités

### Côté ingénieur / conducteur de travaux
- Gestion de projets et de membres (rôles : conducteur, installateur, lecteur)
- Ajout de plans (PDF ou image) avec visionneuse interactive (zoom, pan)
- Création d'observations directement sur le plan (double-clic) ou en liste
- Suivi des statuts : Ouverte → En cours → Résolue → Contestée → Validée
- Priorités, catégories, dates d'échéance
- Photos compressées automatiquement (WebP, max 1920×1080)
- Commentaires en temps réel (Supabase Realtime)
- Filtres par statut, priorité, catégorie et tri
- Export PDF (avec photos en base64) et Excel
- Dashboard par projet avec compteurs

### Côté installateur (accès sans compte)
- Accès via lien tokenisé unique
- Vue liste des réserves + vue plan avec pins
- Marquer une observation comme résolue ou la contester
- Commentaires avec photo optionnelle (preuve de résolution)
- Photos de l'observation visibles avec lightbox

## Installation

```bash
npm install
```

Copier le fichier d'environnement :

```bash
cp .env.local.example .env.local
```

Remplir les variables dans `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Lancer le serveur de développement :

```bash
npm run dev
```

## Configuration Supabase

### Schéma de base de données

Exécuter `supabase/schema.sql` dans le SQL Editor de Supabase.

### Migration

Exécuter `supabase/migrations/001_installer_support.sql` pour :
- Rendre `uploaded_by` nullable sur `observation_photos` (support installateur)
- Ajouter la colonne `photo_url` sur `observation_comments`
- Ajouter les policies de lecture anonyme pour la page installateur

### Buckets Storage

Créer deux buckets dans Supabase Storage :
- `plans` — pour les PDF et images de plans (privé)
- `photos` — pour les photos des observations (privé)

## Structure du projet

```
src/
├── app/
│   ├── (app)/              # Pages authentifiées (dashboard, projets, plans)
│   ├── (auth)/             # Pages login
│   ├── api/
│   │   ├── export/         # Export PDF et Excel
│   │   └── installer/      # Routes server-side pour installateurs (bypass RLS)
│   │       ├── comment/
│   │       ├── photo/
│   │       └── status/
│   └── installer/[token]/  # Page publique installateur
├── components/
│   ├── export/             # Modal d'export personnalisable
│   ├── installer/          # Vue installateur
│   ├── observations/       # Panel, liste, upload photos, création
│   └── plans/              # Visionneuse de plan, page plan
├── lib/
│   └── supabase/
│       ├── admin.ts        # Client service role (server-side uniquement)
│       ├── client.ts       # Client navigateur
│       └── server.ts       # Client SSR
└── types/                  # Types TypeScript partagés
```

## Notes importantes

- Les écritures de l'installateur (commentaires, photos, statut) passent par des routes API server-side (`/api/installer/*`) avec la clé service role pour contourner le RLS Supabase — l'installateur n'a pas de session auth.
- Les photos sont stockées dans un bucket privé. Les URLs sont générées sous forme de signed URLs (validité 1h) côté serveur pour l'affichage, et téléchargées en base64 pour l'export PDF.
- Le temps réel (commentaires et photos) est géré via les subscriptions Supabase Realtime.
