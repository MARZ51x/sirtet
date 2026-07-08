# Cascade

A fast, satisfying falling-block puzzle game with online leaderboards, custom
themes, and synthesized sound — built with Next.js + Supabase, deployed on
Vercel.

## Features

- **Three modes**, each with its own leaderboard: **Marathon** (endless,
  levels speed up), **Sprint** (clear 40 lines, fastest time wins), **Ultra**
  (2-minute score attack).
- **Guest play** — anyone can play instantly; an account (username + email +
  password) is only needed to post scores. Sign in with email **or** username;
  full forgot-password flow.
- **Modern mechanics**: SRS rotation with wall kicks, 7-bag randomizer, hold,
  ghost piece, next-5 queue, T-spins, back-to-back, combos, perfect clears,
  lock delay with move resets, configurable DAS/ARR.
- **Themes**: 8 presets + a fully customizable color editor (every UI and
  piece color) + user-uploaded background image with dim/blur controls.
- **Sound & effects**: every sound is synthesized live with the Web Audio API
  (no assets); a master volume slider and a 0–100 visual-flare slider that
  scales particles, flashes, and screen shake down to a pure-minimal mode.
  `prefers-reduced-motion` is respected by default.
- **Fair leaderboards**: scores are written only by the server after
  signed-session-token verification, plausibility checks, rate limiting, and
  RLS denies all client writes. The deterministic engine records replays
  client-side as the hook for future server-side re-simulation.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind v4 ·
Supabase (Postgres, Auth, Storage) · Vitest · Vercel.

## Development

```bash
npm install
npx supabase start        # local stack (requires Docker Desktop)
cp .env.example .env.local # then paste the keys `supabase start` printed
npm run dev
```

Local email (confirmations, password resets) lands in Mailpit at
http://127.0.0.1:54324.

### Database workflow (declarative)

The schema source of truth is `supabase/schemas/*.sql` — never edit files in
`supabase/migrations/` by hand (two documented exceptions live there for the
`auth.users` trigger and the Storage bucket, which the diff tool cannot see).

```bash
# 1. edit supabase/schemas/*.sql
npx supabase db diff -f my_change   # 2. generate the migration; READ it
npx supabase migration up           # 3. apply locally
npm run gen:types                   # 4. regenerate src/lib/database.types.ts
```

On Windows, run `npm run gen:types` (it redirects through cmd) — a raw
PowerShell `>` writes UTF-16 and corrupts the file.

### Tests

```bash
npm test              # engine unit tests (SRS, scoring, T-spins, replays…)
npm run test:coverage # with the 80% coverage gate used in CI
```

## Deployment

- **Vercel**: import the repo, set the five env vars from `.env.example`
  (Production + Preview), `vercel --prod`.
- **Supabase (hosted)**: `npx supabase link --project-ref <ref>` then
  `npx supabase db push`. One-time dashboard config:
  - Auth → URL Configuration: Site URL = your production URL; add
    `http://localhost:3000/**` and the Vercel preview wildcard to redirects.
  - Auth → Email Templates: switch *Confirm signup* and *Reset password* to
    the token-hash pattern (copies live in `supabase/templates/`).
  - Email confirmations **on**; enable leaked-password protection.
  - The built-in SMTP sends only a few emails/hour — configure custom SMTP
    (e.g. Resend) before real traffic.
- **Free-tier note**: hosted Supabase projects pause after ~1 week of
  inactivity; a scheduled ping (Vercel cron) or a paid tier prevents that.

## Anti-cheat notes

Submissions require a server-minted HMAC session token (single-use, wall-clock
checked) and pass plausibility bounds (speed floor, score floor/ceiling, level
consistency, per-mode rules). Soft bounds currently run in **shadow mode**
(logged, not rejected) while constants are tuned against real play — flip them
to hard rejects in `src/lib/anti-cheat.ts` after launch week. A determined
attacker can still synthesize a plausible score; the upgrade path is replay
re-simulation using the recorded input logs (`src/game/core/replay.ts`).
