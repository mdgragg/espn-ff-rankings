# ESPN Fantasy Power Rankings — starter

A minimal Next.js (App Router + TypeScript) starter that pulls your
ESPN fantasy football league data server-side, the same shape as your
existing Sleeper-based power rankings app.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the env template and fill in your real values:
   ```bash
   cp .env.local.example .env.local
   ```
   Then edit `.env.local`:
   - `ESPN_LEAGUE_ID` — from your league URL
   - `ESPN_SEASON` — e.g. 2026
   - `ESPN_SWID` — from Chrome DevTools > Application > Cookies > espn.com (keep the curly braces)
   - `ESPN_S2` — same place, the long cookie value

   `.env.local` is already in `.gitignore` — never commit real cookie
   values to git or share them in a public place.

3. Run the dev server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000 — if your cookies are valid, you'll see
   your league name, team records, and owners. If something's wrong,
   the page will show the error message from ESPN's API.

## What's here

- `lib/espn.ts` — server-only helper that calls ESPN's API with your
  cookies and normalizes the response into a simpler shape.
- `app/api/league/route.ts` — a GET API route that exposes that data
  as JSON (`/api/league`), if you want to fetch it client-side later.
- `app/page.tsx` — a server component that fetches directly and
  renders a simple table, just to prove the connection works end to
  end.

## Next steps

- Wire in Supabase the same way your Sleeper app does, keyed by ESPN
  team ID (or owner ID) instead of Sleeper's roster ID, to store
  blurbs per team.
- Add more ESPN API views as needed — e.g. `view=mMatchup` for
  weekly matchup data, `view=mBoxscore` for player-level scoring.
- ESPN's `espn_s2` / `SWID` cookies can expire or need refreshing
  periodically — there's no official refresh flow, so budget for
  manually regenerating them occasionally.
