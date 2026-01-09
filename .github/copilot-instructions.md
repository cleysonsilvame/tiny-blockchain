# Copilot Instructions (Tiny Blockchain)

## Stack & Conventions
- Angular 18+ with standalone components; DI via `inject()` (see `src/app/app.ts`).
- Reactive state with Angular `signal`/`computed`; keep derived values computed, mutate via `signal.set/update`.
- Styling uses Tailwind utilities in component templates and `src/styles.css`.
- Conventional commits, lowercase (see `.github/commit-instructions.md`).

## Core Architecture
- `src/app/app.ts` wires layout: mempool sidebar, mining block, blockchain display, wallet explorer, stats dashboard. Resizing handled via signals; maintain min/max guards when changing.
- Services
	- `services/blockchain.ts`: authoritative state for chain, mempool, difficulty, rewards. Uses `crypto-js` SHA256 in `calculateHash`. Mutations go through service helpers (add block, add tx, toggle fee prioritization) to keep signals consistent.
	- `services/mining.service.ts`: competitive mining simulation; racers share `miningProgress` map, `startMiningRace` resolves first hash with required prefix. Adjust batch sizes/hashRate carefully—affects UI pacing.
- Models in `src/app/models/*` back the services; use them for typings in new code.

## UI Patterns
- Components are under `src/app/components/**`; each has `.ts`, `.html`, `.css`. Favor Tailwind classes over inline styles; keep DOM minimal, typography in templates.
- Wallet Explorer shows full `counterparty` strings (no truncation); keep consistency in new views.
- Mining Block container uses `min-h-full` to avoid collapse; preserve when tweaking layout.

## Workflows
- Dev server: `npm start` (Angular CLI). Tests: `npm test` (Vitest via `ng test`). Build: `npm run build`.
- Use focused staging (`git add -p`) to keep commits scoped. If skipping tests, mention why in PR/notes.

## Integrations & Assets
- Favicon lives in `public/favicon.svg`; `src/index.html` points to it. Keep ICO removed unless reintroduced intentionally.
- Hashing via `crypto-js` only; do not add Node-only crypto APIs to browser code.

## When Adding Features
- Prefer signals/computed for view state; avoid global mutable vars. Derive layout sizes as percentages/pixels similar to existing patterns (`miningBlockHeight`, `mempoolWidth`).
- Route new blockchain mutations through `Blockchain` service to keep `mempool`, `blockchain`, `currentBlockNumber`, `previousHash`, and `invalidBlocks` coherent.

## Tests & Validation
- Align UI text with specs/tests (see `src/app/app.spec.ts`). Update tests alongside UI text changes.
