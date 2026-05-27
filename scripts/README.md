# scripts/

Developer utilities and one-off CLIs. Everything in here should be runnable with a single command and safe to execute locally.

## Existing

_None yet — populate as needed._

## Planned

- `seed-local.ts` — create 5 dev users with realistic data
- `import-legacy-signals.ts` — ingest `myTradingBot/telegram_monitoring/logs/parsed_signals.jsonl` into the local dev DB as fixtures
- `rotate-keys.ts` — rotate KMS data keys for all tenants (operator-triggered)
- `export-scorecards.ts` — dump all channel scorecards as CSV for analysis
- `smoke-test-prod.ts` — quick production smoke check after deploy
