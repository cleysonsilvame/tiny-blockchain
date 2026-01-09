---
applyTo: '**'
---
# Commit Instructions for GitHub Copilot

These rules apply when proposing or creating commits in this repository.

## Format
- Use conventional commits in lowercase: `feat: ...`, `fix: ...`, `chore: ...`, `docs: ...`, `refactor: ...`, `test: ...`, `style: ...`, `build: ...`, `ci: ...`.
- Keep subjects concise (<= 72 chars) and use present tense.
- Avoid scopes unless clearly helpful; if needed, use short scopes like `ui`, `block`, `wallet`, `mempool`.

## Grouping
- One logical change per commit; do not mix unrelated files.
- Prefer staging with intent (e.g., `git add -p`) to keep commits focused.

## Content
- Mention user-facing changes in `feat`/`fix`; internal cleanups use `chore` or `refactor`.
- Include test updates in the same commit when behavior changes.
- Do not bump versions here.

## Before committing
- Ensure working tree is clean of unrelated changes.
- If tests are fast, run relevant ones (e.g., `npm test` or targeted). Note in message if skipped for time.

## After committing
- Keep branch ahead clean; push only after all intended commits are ready.
