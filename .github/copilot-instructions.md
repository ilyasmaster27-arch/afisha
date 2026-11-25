# Campus Pulse repository instructions

## Product and stack

- This is a Russian-language student event app built with Vite, vanilla JavaScript, CSS, and Supabase.
- Keep runtime code framework-free. Do not add React, Vue, a router, a state library, or a second backend.
- Preserve the Midnight Campus visual system: dark navy background, soft card borders, lavender/mint/coral/sun accents, and responsive cards.
- User-facing copy must be clear Russian. Keep controls usable from 375 px through 1440 px.

## Architecture

- `src/main.js` owns application state, rendering, and DOM event delegation.
- Put Supabase initialization only in `src/lib/supabaseClient.js`.
- Keep database operations in `src/features/`: auth, events, and memberships.
- Use helpers in `src/lib/` for escaping and date formatting. Escape every user-provided string before inserting it into HTML.
- Store shared data only in Supabase. Do not use hard-coded event arrays or `localStorage` as a database.

## Data and security

- Browser code may use only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Never add a secret or `service_role` key to frontend code, examples, GitHub variables, or commits.
- Treat `supabase/schema.sql` as the source of truth. Every exposed table must have RLS enabled and minimal grants.
- Authorization must remain enforced in SQL. UI visibility is only a convenience.
- Event authors may update/delete only their own rows. Users may read/delete only their own membership rows.
- Any UPDATE policy needs both `USING` and `WITH CHECK`, plus a SELECT policy.

## Behavior and quality

- Preserve loading, empty, error, success, and disabled request states.
- Validate events in both the form and SQL constraints: title 5–80, description 15–600, location 3–120, allowed category, future date.
- After membership changes, reload membership state from Supabase; do not assume a click succeeded.
- Keep interactive targets at least 44 px high and maintain visible keyboard focus.
- Run `npm run build` after code changes. Exercise the relevant scenarios in `TEST_SCENARIOS.md` when Supabase credentials are available.

## GitHub workflow

- Use focused `feature/*` branches and descriptive commits such as `feat: add event details` or `fix: prevent duplicate joins`.
- Keep `.env.local`, build output, and secrets untracked.
- The Pages workflow depends on repository variables named `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
