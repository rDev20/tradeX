# tradeX

> A trading copilot for Indian retail F&O traders. We're not a tipster. We help you act faster and more disciplined on signals you already follow.

---

## What's in this repo

A **pnpm + Turborepo monorepo** containing the entire tradeX platform — web apps, API, Python workers, shared libraries, infrastructure, and documentation.

```
tradeX/
├── apps/              User app, admin console, marketing site, API, Python workers
├── packages/          Shared libraries (ui, types, risk-engine, trade-core, etc.)
├── services/          DB schemas (Postgres migrations, ClickHouse DDL, Temporal workflows)
├── infra/             Terraform + CDK + Docker + K8s (ap-south-1)
├── docs/              Product spec, solution architecture, ADRs, runbooks
├── tests/             E2E (Playwright), load (k6), contract (Pact)
├── scripts/           Dev CLIs and one-offs
└── .github/           CI/CD, CODEOWNERS, PR templates
```

## Start here

| If you're a… | Read first |
|---|---|
| New engineer | This README → [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) → [docs/SOLUTION_ARCHITECTURE.md](docs/SOLUTION_ARCHITECTURE.md) |
| Product / design | [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) |
| Platform / SRE | [docs/SOLUTION_ARCHITECTURE.md](docs/SOLUTION_ARCHITECTURE.md) → [infra/README.md](infra/README.md) |
| Tracking what's built / in flight / planned | **[docs/ROADMAP.md](docs/ROADMAP.md)** — living source of truth |
| Ported from legacy? | [docs/LEARNINGS_FROM_LEGACY.md](docs/LEARNINGS_FROM_LEGACY.md) |
| New contributor | This README → [CONTRIBUTING.md](CONTRIBUTING.md) |

## Prerequisites

- **Node 20.10+** (use `nvm install` to match [`.nvmrc`](.nvmrc))
- **pnpm 9.12+** (`corepack enable && corepack prepare pnpm@9.12.0 --activate`)
- **Python 3.12+** for workers
- **Docker Desktop** for local Postgres, Redis, ClickHouse, Temporal
- **uv** for Python deps (`pip install uv`)
- **gitleaks** for the pre-commit secret scan (`brew install gitleaks` or equivalent)

## Quickstart

```bash
# Clone + install
git clone <repo>
cd tradeX
pnpm install

# Set up env
cp .env.example .env
# fill in the missing keys

# Start local services (Postgres, Redis, ClickHouse, Temporal)
docker compose -f infra/docker/docker-compose.dev.yml up -d

# Apply DB schema
pnpm db:migrate:dev
pnpm db:seed

# Run the entire stack in dev
pnpm dev
```

Default dev ports:
- Web app: `http://localhost:3000`
- Admin: `http://localhost:3001`
- Marketing: `http://localhost:3002`
- API: `http://localhost:4000` (WS on `:4001`)
- Temporal UI: `http://localhost:8080`

## Common commands

```bash
pnpm dev                           # Run all apps in parallel (Turbo)
pnpm build                         # Build everything
pnpm lint                          # Lint TS + Python
pnpm typecheck                     # Typecheck TS
pnpm test                          # Run all tests
pnpm test:unit                     # Unit tests only
pnpm test:e2e                      # Playwright E2E
pnpm format                        # Prettier write
pnpm format:check                  # Prettier check

pnpm --filter @tradex/web dev      # Run a single app
pnpm --filter @tradex/api db:migrate:dev
```

Per-worker (Python):

```bash
cd apps/workers/parser
uv pip install -e ".[dev]"
python -m tradex_parser.main
```

## Repository rules

1. **No secrets in code.** `.env` is gitignored; use `.env.example`. `gitleaks` in pre-commit + CI.
2. **Conventional commits.** `feat(scope):`, `fix(scope):`, etc. Enforced by commitlint.
3. **PRs require CODEOWNERS review.** See [.github/CODEOWNERS](.github/CODEOWNERS).
4. **No deploys during market hours** (09:15-15:30 IST) except SEV-1 hotfixes.
5. **Every architectural decision is an ADR.** [docs/architecture/adr/](docs/architecture/adr/).
6. **Contract tests + golden-set regression** are non-negotiable CI gates.

## Tech stack

- **Frontend**: Next.js 15 · React 19 · TypeScript · Tailwind · shadcn/ui · TanStack Query · Lightweight Charts
- **API**: NestJS · Prisma · Postgres (RLS) · Redis · Temporal · Clerk
- **Workers**: Python 3.12 · FastAPI · Celery · Telethon · OpenAI
- **Infra**: AWS ECS Fargate · Cloudflare · RDS · ElastiCache · ClickHouse Cloud · Temporal Cloud · KMS
- **Observability**: Datadog · Sentry · PostHog
- **Region**: ap-south-1 (Mumbai) primary, ap-south-2 (Hyderabad) DR

See [docs/SOLUTION_ARCHITECTURE.md §5](docs/SOLUTION_ARCHITECTURE.md) for full rationale.

## Product at a glance

tradeX helps users:
1. **Connect** their Telegram + broker account
2. **Evaluate** Telegram signal channels via a paper-trading sandbox (Practice ₹)
3. **Graduate** the best channels to live trading with their own broker
4. **Execute** with hard risk rails (daily-loss cap, lot cap, panic button)
5. **Review** via honest scorecards — is that ₹5k/month subscription actually making money?

See [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) for the full spec.

## License

Proprietary. All rights reserved. See [LICENSE](LICENSE).

## Contact

legal@tradex.in · engineering@tradex.in
