-- tradeX — initial schema
-- Applied by Prisma Migrate in production; this file is for local-dev container bootstrap.
-- Real migrations live in apps/api/prisma/migrations/

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Placeholder schema — full DDL created via Prisma after initial `pnpm db:migrate:dev`
-- See docs/SOLUTION_ARCHITECTURE.md §13 for the data model.

CREATE SCHEMA IF NOT EXISTS tradex;
