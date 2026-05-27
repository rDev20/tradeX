# @tradex/web

The authenticated user-facing application — Market Workspace, signal feed, portfolio, channel scorecards, settings.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind · shadcn/ui · TanStack Query · Zustand · Lightweight Charts · Clerk.

## Run locally

```bash
pnpm --filter @tradex/web dev
```

Served on `http://localhost:3000`.

## Structure

```
src/
├── app/              Next.js routes (all under /app)
├── components/       React components (page-specific)
├── features/         Feature-scoped code (signals, portfolio, analytics)
├── lib/              Cross-cutting utilities
├── hooks/            Shared hooks
└── styles/           Tailwind + CSS vars
```

See [PRODUCT_SPEC §6](../../docs/PRODUCT_SPEC.md#6-information-architecture) for the full sitemap.
