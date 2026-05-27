# @tradex/worker-parser

Consumes raw Telegram messages from the `signals.raw` stream, calls OpenAI with the versioned system prompt, validates the response, deduplicates, optionally collates multi-part signals, and emits validated signals to `signals.parsed`.

## Contracts

- **Input**: `signals.raw` stream events `{ user_id, channel_id, raw_text, received_at }`
- **Output**: `signals.parsed` stream events with full parsed signal schema from `@tradex/types`
- **System prompt**: versioned in `packages/llm-prompts/v1/parse-signal.txt` (ported verbatim from legacy — see [LEARNINGS §1.1](../../../docs/LEARNINGS_FROM_LEGACY.md))

## BTST + dedup + collation

- BTST rejection — reject messages containing "BTST" before calling OpenAI (legacy §1 / system prompt Example 10 — intentional)
- Dedup — 5-min Redis window keyed on (user_id, channel_id, normalized_hash)
- Collation — symbol-present-but-incomplete signals stored in Redis for 5 min; continuation messages merged

## Run locally

```bash
cd apps/workers/parser
uv pip install -e ".[dev]"
python -m tradex_parser.main
```
