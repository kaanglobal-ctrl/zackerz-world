# ZACKERZ — Project Backup

Generated: July 11, 2026

## What this is
Full source code for the ZACKERZ website (https://www.zackerz.com).
A React + Express fullstack web app with a Three.js member-universe hero,
Supabase auth/database, world map of members, messaging, and the Order/Apply pages.

## Stack
- **Frontend:** React + Vite + Tailwind CSS + shadcn/ui + wouter (hash routing)
- **Backend:** Express (bundled to `api/index.js` serverless function)
- **Database/Auth:** Supabase (Postgres + Auth + Storage)
- **3D:** three.js (member-universe globe hero), GSAP (motion)
- **Hosting:** Vercel (`zackerz` project, team `ZACKERZ`)

## Restore / Deploy
```bash
cd grim-club
npm install
npm run dev          # local dev server
npm run build        # production build -> dist/ + api/index.js
```

### Vercel deploy
- Project: `zackerz` (projectId `prj_XMZF8RtXX27DmfGIcEK9mBnpHoH9`)
- Build command: `npm run build`
- Output dir: `dist/public`
- Env vars (set in Vercel dashboard): `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- DNS: www.zackerz.com -> CNAME cname.vercel-dns.com, zackerz.com -> A 76.76.21.21 (GoDaddy)

## Key credentials / accounts (keep private)
- **Supabase project:** vxxpefrkpzkytvzopwle (https://vxxpefrkpzkytvzopwle.supabase.co)
  - Storage bucket: `chat-attachments`
- **Admin login:** warden@vanguard.order / honor1789
- **User login (KAAN, OG member):** kaanglobal@gmail.com / honor1789
- **Test members:** 10 accounts @zackerz.com / password `member123` (ids 7-16; OG = emre_demir id 7, pierre_l id 9)

## Database state
- Users table: admin (id 1), KAAN (id 6, OG through July 2027)
- 5 Chapters: Istanbul, Vienna, Paris, London, Belgrade
- Messages table includes attachment columns (attachment_path, attachment_name, attachment_mime)

## Key files
- `client/src/pages/home.tsx` — homepage with member-universe gate (logged in + 5 visits)
- `client/src/components/member-universe-hero.tsx` — Three.js universe hero (globe + orbiting sections)
- `client/src/lib/member-universe.ts` — 11 club sections data
- `client/src/lib/values.ts` — 15 Order standards
- `client/src/components/globe-hero.tsx` — public homepage globe
- `client/src/lib/geocode.ts` — member geocoding (80+ cities)
- `client/src/data/world-110m.json` — world map topology
- `client/src/data/globe-points.json` — precomputed globe land dots (1,903 points)
- `server/routes.ts` — API routes (auth, members, messages, attachments)
- `shared/schema.ts` — Drizzle ORM schema
- `vercel.json` — rewrites `/api/(.*)` -> `/api/index`

## Notes
- Auth header is `x-session-token` (not Authorization: Bearer)
- Dark mode is the default
- `__PORT_5000__` sentinel in queryClient.ts stays as-is on Vercel (relative `/api/...`)
- `api/package.json` with `{"type":"commonjs"}` is critical for the serverless build
