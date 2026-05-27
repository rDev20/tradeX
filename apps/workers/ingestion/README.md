# @tradex/worker-ingestion

Per-user Telegram ingestion. Maintains one long-lived Telethon session per user, polls selected channels, emits raw messages to the `signals.raw` Redis Stream.

## Design

- **Consistent-hash sharding** of users → pods (one pod = ~200 concurrent sessions)
- Sessions hydrated from Postgres on boot (envelope-encrypted via KMS)
- Per-user async task sharing one asyncio event loop per pod
- Pre-filters: age < 60s, length ≥ 10 chars, words ≤ 30, text-only
- Rate-limit handling with Redis-backed per-user backoff counters

Ported concepts from: [legacy telegram_listener.py](../../../../myTradingBot/telegram_monitoring/listener/telegram_listener.py) — see [docs/LEARNINGS_FROM_LEGACY.md §1.6 and §1.9](../../../docs/LEARNINGS_FROM_LEGACY.md).

## Run locally

```bash
cd apps/workers/ingestion
uv pip install -e ".[dev]"
python -m tradex_ingestion.main
```
