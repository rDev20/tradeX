# @tradex/types

Canonical data shapes — Zod schemas that are the **single source of truth** for TS and (via codegen) Python.

## Contents

- `signal.ts` — parsed signal schema
- `trade.ts` — trade, trade_events
- `channel.ts` — channel + scorecard
- `user.ts` — user, risk profile, consent
- `broker.ts` — broker adapter interface types
- `api.ts` — REST request/response envelopes
- `events.ts` — event bus envelope + event types

## Code generation

Python pydantic equivalents generated via `pydantic-to-zod` bridge (reversed — we write Zod, generate pydantic).

## Contract testing

Any change here breaks CI for every consumer until they update. Intentional.
