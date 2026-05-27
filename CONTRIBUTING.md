# Contributing to tradeX

This document covers the day-to-day contract for working in this repo. The **why** behind these rules lives in [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) and [docs/SOLUTION_ARCHITECTURE.md](docs/SOLUTION_ARCHITECTURE.md).

---

## Branching

- `main` is always deployable to staging. Prod deploys are manual promotions.
- Feature branches: `feat/<short-slug>` · Fixes: `fix/<short-slug>` · Docs: `docs/<short-slug>` · Chores: `chore/<short-slug>`
- Never push directly to `main`. All changes via PR.

## Commit messages

Conventional commits, lowercase type, kebab-case scope, sentence-case subject. Enforced by commitlint.

```
feat(signals): Stream parsed signals over WebSocket
fix(risk-engine): Correct daily-loss rail off-by-one
docs(spec): Clarify channel graduation criteria
```

## Pull requests

1. Fork or feature branch from `main`
2. Rebase (don't merge) before pushing
3. Fill in the [PR template](.github/PULL_REQUEST_TEMPLATE.md) completely
4. Request review from CODEOWNERS (auto-assigned)
5. Pass CI: lint, typecheck, unit tests, Python lint, build, gitleaks
6. At least one approval required; security-sensitive areas require two

## Code style

- **TypeScript** — `strict: true` always. No `any`. No type assertions without a comment.
- **Python** — ruff + mypy strict. No bare `except`. PEP 8.
- **Naming** — prefer domain terms over technical terms (`evaluateSignal`, not `processData`).
- **Functions** — pure when possible; side effects only at module boundaries.
- **Files** — one export per file for components; multiple okay for utils.

## Testing

Every PR must:
- Add or update tests for new behavior
- Not decrease coverage by >1%
- Not add flaky tests (3 consecutive green runs in CI before merge)

Unit tests live alongside source. E2E in `tests/e2e/`. Load in `tests/load/`. Contract in `tests/contract/`.

## Adding a dependency

Before `pnpm add`:
- Is there a workspace package that already does this?
- Is the dep actively maintained? (check last commit, download count)
- Is the license compatible? (MIT, Apache 2.0, BSD-3 — ok; GPL, AGPL — no without legal review)
- Does it bloat the bundle (>50KB)?
- Does it have known CVEs? (`pnpm audit`)

For Python: same checks via `uv` + PyPI metadata.

## Adding a new workspace (app or package)

1. Create folder under `apps/` or `packages/`
2. `package.json` with `"name": "@tradex/<name>"` and scoped deps
3. Add to CODEOWNERS
4. Add to README.md table
5. If public-facing change: update [docs/PRODUCT_SPEC.md §6](docs/PRODUCT_SPEC.md)
6. Open a PR with just the scaffold first; add code in follow-ups

## Secrets handling

- Never commit secrets. `.env` is gitignored.
- Use `.env.example` with placeholders.
- For staging/prod secrets, add to AWS Secrets Manager via Terraform — not in code.
- If you leak a secret by accident: **rotate immediately, don't just revert**.

## Running the bot against real brokers

- `FEATURE_LIVE_TRADING=true` in local `.env` only after a teammate has reviewed your risk rail config
- Default to `DEV_MOCK_KITE=true` unless explicitly testing live integration
- **Never** point local dev at a prod-scale Kite account

## Market-hours freeze

09:15-15:30 IST, weekdays: no deploys, no destructive DB migrations, no infra changes. SEV-1 hotfixes only, with sign-off from on-call lead.

## Questions?

- Architectural: open a discussion, then write an ADR
- Product: check PRODUCT_SPEC.md; if unanswered, open an issue with `product` label
- Legal / compliance: DM the compliance advisor; never guess
