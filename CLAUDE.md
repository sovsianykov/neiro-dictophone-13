# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
# Development (must use --webpack for PWA support)
npm run dev

# Build
npm run build --webpack

# Database
npm run db:migrate    # run Prisma migrations
npm run db:push       # push schema directly (no migration)
npm run db:generate   # regenerate Prisma client after schema changes
```

## Architecture

**Dictophone** is an offline-first Russian/Ukrainian speech-to-text PWA built on Next.js App Router.

**Core data flow:**
1. Speech → `useSpeechRecognition` hook (Web Speech API, ru-RU/uk-UA)
2. Save locally → IndexedDB via `lib/transcriptions-idb.ts` (marked `synced: false`)
3. Sync to server → `lib/sync-transcriptions.ts` POSTs to `/api/transcriptions`, marks records synced
4. Online event listener triggers sync automatically

**Auth:** NextAuth v5 beta with Credentials provider (email/password + bcrypt). Split config: `auth.config.ts` is Edge-compatible (used in `middleware.ts`), `auth.ts` has full Node.js providers.

**Database:** PostgreSQL via Neon, Prisma v5. Schema: `User` → `Transcription` (one-to-many, cascade delete).

**PWA:** `next-pwa` with Service Worker — disabled in dev, active in production. Use `npm run dev` (not `next dev`) to ensure webpack mode.

**Key files:**
- `components/dictophone-app.tsx` — main client component, all recording/sync UI logic
- `hooks/useSpeechRecognition.ts` — Web Speech API wrapper with debounced interim text
- `lib/transcriptions-idb.ts` — all IndexedDB CRUD
- `middleware.ts` — Edge route protection (redirects unauthenticated users to `/login`)
- `db/schema.prisma` — data models

## Environment Variables

```
DATABASE_URL      # PostgreSQL connection (Neon)
AUTH_SECRET       # JWT signing secret (generate: openssl rand -base64 32)
NEXTAUTH_URL      # Canonical URL for NextAuth callbacks
NEXT_PUBLIC_SITE_URL  # Optional; derived from NEXTAUTH_URL if omitted
```
