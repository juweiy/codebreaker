# CodeBreaker

CodeBreaker is a digital game master for physical escape rooms, scavenger hunts,
and puzzle games. Clues and props remain in the real world while the app handles
answers, shared progress, puzzle unlocks, timers, and multiplayer rooms.

## MVP features

### Game masters

- Create, edit, archive, restore, and delete games.
- Choose sequential or open-order puzzle progression.
- Create and reorder text or number-answer puzzles.
- Set separate player messages for completing the game and running out of time.
- Launch rooms with an optional password and time limit.
- Share a six-character room code or direct join link.
- Start, pause, resume, end, and delete rooms.
- Track players, puzzle solves, and progress from the room dashboard.

### Players

- Join through a link or with a room code and optional password.
- Use a nickname; no account is required.
- Return as the same player when reopening a room on the same browser.
- See room status, player count, progress, and time remaining.
- Submit answers without puzzle answers ever reaching the browser.
- Receive shared solves and puzzle unlocks through automatic polling.
- In open-order games, choose any available puzzle.

## Technology

- Next.js 16 App Router, React 19, and TypeScript
- Tailwind CSS and Radix/shadcn-style components
- Neon Auth and Neon serverless Postgres
- Drizzle ORM and Drizzle Kit
- Secure Next.js route handlers for all reads and writes
- Node's built-in test runner for domain rules

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. In the [Neon Console](https://console.neon.tech), create a project and enable
   Neon Auth for its main branch. Copy the pooled database connection string and
   the Neon Auth base URL.

3. Copy `.env.example` to `.env.local` and set all three values:

   ```dotenv
   DATABASE_URL=postgresql://user:password@host/database?sslmode=require
   NEON_AUTH_BASE_URL=https://ep-example.neonauth.region.aws.neon.tech/neondb/auth
   NEON_AUTH_COOKIE_SECRET=a-random-secret-at-least-32-characters-long
   ```

   Generate the cookie secret with `openssl rand -base64 32`, or use any secure
   password generator. Keep this secret stable between deployments.

4. Create the application tables from the Drizzle schema:

   ```bash
   npm run db:push
   ```

   Equivalent SQL files are available in [`db/migrations`](db/migrations) if
   you prefer Neon's SQL Editor. Apply them in numbered order.

5. Start the app:

   ```bash
   npm run dev
   ```

   Next.js uses `http://localhost:3000` by default. Use
   `npm run dev -- --port 3100` if port 3000 is occupied.

## Deployment

For Vercel, import the repository, connect the project to Neon, and add the same
three environment variables for Production and Preview. Run `npm run db:push`
against the production connection string once before the first public test.
Vercel then builds the app with `npm run build`.

## Quality checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

Run the complete suite with `npm run check`.

## Data and security model

- Game ownership is derived from the verified Neon Auth server session.
- The Neon connection string remains server-only; clients can access data only
  through validated route handlers.
- Room passwords are hashed with Node's `scrypt`; raw passwords are never stored.
- Puzzle answers are read only inside the server-side answer-checking function.
  Player responses contain correctness and current room state, never the answer.
- Anonymous players receive a random session token when joining. It is stored in
  local storage and required for room state and answer submissions.
- Player and room-control clients poll every two seconds, keeping shared state in
  sync without requiring a second realtime provider.
- Puzzle solves belong to the room, so one correct answer advances the team.

## Core entities

- **Game:** title, description, success and time-up messages, active/archived
  status, and sequential/open-order mode.
- **Puzzle:** ordered clue, optional description, answer type, and normalized
  answer.
- **Game room:** a live game instance with a join code, password, timer, and
  lifecycle status.
- **Room player:** nickname and device session for one room.
- **Room solve:** the first correct solution of a puzzle in a room.

This remains a personal learning project with a foundation that can grow into a
larger hosted product.
