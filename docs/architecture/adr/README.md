# Architecture Decision Records (ADRs)

Decisions that materially shape the system live here as one-pagers.

## Format

Every ADR file is named `NNNN-short-title.md` where `NNNN` is zero-padded sequential.

```markdown
# NNNN — <decision title>

**Status:** Proposed | Accepted | Deprecated | Superseded by [NNNN](./NNNN-...)
**Date:** YYYY-MM-DD
**Deciders:** @person1, @person2

## Context
<why does this decision need to be made right now?>

## Options considered
1. ...
2. ...
3. ...

## Decision
<what did we pick and why?>

## Consequences
### Positive
- ...
### Negative
- ...
### Neutral
- ...
```

## Initial ADRs

The 12 ADRs from the solution architecture doc will be written up here as dedicated files during sprint 1:

| ID | Title |
|---|---|
| 0001 | Monorepo with Turborepo + pnpm |
| 0002 | NestJS + FastAPI hybrid backend |
| 0003 | Temporal for durable workflows |
| 0004 | Postgres RLS for multi-tenancy |
| 0005 | ClickHouse for analytics |
| 0006 | Clerk for auth (v1) |
| 0007 | Lightweight Charts over TradingView widget |
| 0008 | Cloudflare + AWS ap-south-1 |
| 0009 | Redis Streams over Kafka for v1 |
| 0010 | Broker adapter pattern from day one |
| 0011 | Paper-vs-live shared contract |
| 0012 | Deploy freeze during market hours |
