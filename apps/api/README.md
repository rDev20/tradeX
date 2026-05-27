# @tradex/api

The tradeX main API. NestJS, TypeScript. Handles auth, user data, CRUD, orders, WebSocket fanout, webhooks.

## Modules

- `auth` — JWT + Clerk integration
- `users` — profiles, risk profiles, preferences
- `connections` — broker + Telegram lifecycle
- `signals` — inbound parsed signals, retrieval, manual execute
- `channels` — user's Telegram channels + scorecards
- `trades` — trade CRUD, order status, manual exit
- `portfolio` — positions, P&L
- `billing` — Razorpay integration
- `admin` — internal endpoints (RBAC-gated)
- `stream` — WebSocket gateway
- `webhooks` — inbound webhooks (Razorpay)

## Contracts

OpenAPI spec generated at `/v1/openapi.json` from NestJS decorators. Consumed by `@tradex/sdk-client`.

## Run

```bash
pnpm --filter @tradex/api dev
```

API on `:4000`, WebSocket on `:4001`.
