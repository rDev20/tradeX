# Contract Tests (Pact)

Consumer-driven contract tests between services.

## Contracts

- `web ↔ api` — every REST endpoint the web app calls
- `api ↔ parser-worker` — events on `signals.raw` / `signals.parsed`
- `api ↔ executor-worker` — Temporal activity signatures
- `api ↔ paper-engine` — event shapes
- `api ↔ razorpay-webhook` — webhook payload shape

Broken contract → PR fails.
