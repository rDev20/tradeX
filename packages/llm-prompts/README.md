# @tradex/llm-prompts

Versioned LLM system prompts + a regression golden set.

## Layout

```
v1/
  parse-signal.txt      — the canonical signal-parsing prompt (port from legacy)
  changelog.md          — what changed in this version and why

v2/                     — (future) next version goes here; v1 stays untouched

test-fixtures/
  golden-set.jsonl      — 200+ (signal input → expected output) pairs
```

## Regression test

Every change to a prompt version reruns the full golden set. Pass threshold: **98% exact match** on the structured fields. Below that → PR blocked.

## Source material

`v1/parse-signal.txt` is a verbatim port from [legacy system_prompt.txt](../../../myTradingBot/telegram_monitoring/processor/system_prompt.txt) with two conscious changes:
1. Resolve the BTST contradiction (line 114 rejects vs Example 10 accepts) — settle on **reject BTST by default** with a per-user opt-in
2. Unify symbol format: always compact (e.g. `NIFTY25750CE`), remove the spaced form ambiguity

`test-fixtures/golden-set.jsonl` bootstrapped from [legacy parsed_signals.jsonl](../../../myTradingBot/telegram_monitoring/logs/parsed_signals.jsonl) — 159 real production signals, hand-reviewed.
