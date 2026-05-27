# Learnings from the Legacy Codebase

> A salvage analysis of `myTradingBot/` for the tradeX rewrite.
> Every claim here cites a file and line from the legacy code so engineers can port with confidence.

---

## 0. TL;DR

The legacy work contains about **30% gold, 40% reusable-with-modification, and 30% discard**. Two separate codebases sit in `myTradingBot/`:

| Folder | Nature | Salvage % |
|---|---|---|
| `myTradingBot/telegram_monitoring/` | Modern LLM-based signal extraction (abandoned mid-refactor) | ~55% reusable |
| `myTradingBot/TradingBot/` | Full single-user trading bot (last active Oct-Dec 2025 on AWS EC2) | ~35% reusable |

**Three things to port first**:
1. The LLM system prompt ([processor/system_prompt.txt](../../myTradingBot/telegram_monitoring/processor/system_prompt.txt)) — 756 lines of battle-tested parsing rules
2. The trade lifecycle logic — trailing SL, partial exits, EOD force-exit, state machine
3. Hard-won operational knowledge (Kite response quirks, Telegram rate limits, IST timezone handling)

**Three things to throw away and redesign**:
1. Single-tenant architecture (everything assumes one user)
2. In-memory state (positions lost on crash)
3. The half-finished ZMQ integration between the two projects

---

## 1. What the legacy codebases got right

### 1.1 The LLM system prompt is production-grade

[telegram_monitoring/processor/system_prompt.txt](../../myTradingBot/telegram_monitoring/processor/system_prompt.txt) (756 lines) encodes hard-won rules that took real signal data to develop:

- Symbol extraction patterns for index + stock options, with anti-hallucination rules (reject MORNING, THANKS, GOODDAY)
- Multi-part signal handling (incomplete → continuation) formalized with concrete examples
- Anti-injection protections (unicode lookalikes, duplicate fields, JSON injection)
- Range validation (strike prices 1-100k, prices 0.01-1M, max 4 targets, lots 1-1000)
- Side is ALWAYS "BUY" for both CE and PE — non-obvious but correct (lines 184-189)
- BTST handling flipped mid-code from "ignore label" to "reject trade" (line 114 vs Example 10) — indicates ongoing product refinement
- JSON-mode enforcement via `response_format={"type": "json_object"}`

**Port action**: Copy this file to `packages/llm-prompts/v1/parse-signal.txt` verbatim. Resolve the BTST inconsistency as a conscious decision. Add a prompt-version header. Regression-test against 200+ golden examples from `logs/parsed_signals.jsonl`.

### 1.2 Multi-message signal collation

[telegram_monitoring/processor/signal_collator.py](../../myTradingBot/telegram_monitoring/processor/signal_collator.py) solves a real problem elegantly: tipsters often split a signal across two messages ("DIVISLAB 6500 CE, above 226" then "Target 230/234/238 SL 214").

The algorithm at [signal_collator.py:70-175](../../myTradingBot/telegram_monitoring/processor/signal_collator.py#L70-L175):
1. Complete signal → pass through
2. Has symbol + entry but missing targets/SL → store in pending with 5-min TTL
3. No symbol but has targets/SL → merge with most-recent pending (by timestamp) for same user
4. Regex override at [line 54-68](../../myTradingBot/telegram_monitoring/processor/signal_collator.py#L54-L68) defends against LLM hallucinating a symbol in continuation messages

**Port action**: Rewrite as a Temporal workflow so state survives restarts. Preserve the regex-defends-against-hallucination pattern — it's a clever safety net.

### 1.3 Trade state machine

[TradingBot/src/models/enums.py:21-31](../../myTradingBot/TradingBot/src/models/enums.py#L21-L31) defines 9 states that map to real broker-order lifecycle concerns:

```
CREATED → WAITING_ENTRY → ORDER_PENDING → ENTERED
                                          ├─ PARTIAL_EXIT → COMPLETED
                                          ├─ STOPPED_OUT
                                          └─ CANCELLED / ERROR
```

The `ORDER_PENDING` state prevents duplicate orders during fill delays ([trade_manager.py:684-694](../../myTradingBot/TradingBot/src/trading/trade_manager.py#L684-L694)) — a race condition that would cost real money. This is a meaningful design choice.

**Port action**: Port states verbatim into `packages/trade-core/src/states.ts`. Add `PAPER_*` parallel states for the paper engine with identical semantics. Formalize as a state machine in Temporal.

### 1.4 The trailing SL / partial exit math

[TradingBot/src/models/trade.py:213-245](../../myTradingBot/TradingBot/src/models/trade.py#L213-L245) has the trailing SL update logic, and [trade_manager.py:591-618](../../myTradingBot/TradingBot/src/trading/trade_manager.py#L591-L618) + [trade_manager.py:544-589](../../myTradingBot/TradingBot/src/trading/trade_manager.py#L544-L589) have the partial exit flow:

The business rules encoded:
- Track `highest_price_since_partial` separately from `current_price`
- Trailing SL only moves favorably (upward for BUY)
- At first target: exit 50%, set midpoint SL `(entry + target) / 2`
- At 70% progress to first target (before partial exit): set break-even SL at entry
- Never a hard second target — trailing runs until hit or EOD

This is a **coherent trade management philosophy**, not a hodgepodge. It's worth preserving as-is while making the constants user-configurable per risk profile.

**Port action**: Port to `packages/trade-core/src/exit-strategies.ts`. Add property-based tests (Hypothesis / fast-check) to catch regressions. Document the philosophy so new engineers don't "simplify" it back to naive SL-target.

### 1.5 Index-specific configuration pattern

[TradingBot/src/config/settings.py:114-166](../../myTradingBot/TradingBot/src/config/settings.py#L114-L166) loads per-index config from env vars:

```
NIFTY_ENABLED=true
NIFTY_LOT_SIZE=75
NIFTY_MAX_SL_POINTS=25.0
```

This is the right pattern — broker-driven constants (lot size, SL limit) centralized and per-index. It makes adding a new index a config change, not a code change.

**Port action**: Keep the pattern but move the config to the database (`index_config` table), editable by admin. Ship default values via a seed migration.

### 1.6 Rate limit handling with Telethon

[telegram_monitoring/listener/telegram_listener.py:177-224](../../myTradingBot/telegram_monitoring/listener/telegram_listener.py#L177-L224) handles Telegram `429` / flood-wait errors intelligently:

- Regex-extract wait time from error message
- Exponential interval increase after 5+ rate limits (capped at 60s)
- Actually sleep the required duration
- Emit telemetry

This shows someone learned from production pain — the early version probably didn't sleep and got banned.

**Port action**: Port the pattern, but push rate-limit state into Redis so per-user counters persist across pod restarts.

### 1.7 Kite API response normalization

[TradingBot/src/trading/kite_client.py:548-584](../../myTradingBot/TradingBot/src/trading/kite_client.py#L548-L584) handles the fact that Kite's `place_order` returns either a string (order_id directly) or a dict (`{"order_id": "..."}`) — undocumented behavior that only surfaces in production. Four defensive branches:

```python
if isinstance(order_response, dict) and 'order_id' in order_response:
    ...
elif isinstance(order_response, str) and order_response.strip():
    ...
else:
    # REJECTED
```

**Port action**: Port as-is into the Kite broker adapter. This is institutional knowledge — don't refactor it away.

### 1.8 Kite OAuth flow

[TradingBot/src/trading/auth_handler.py](../../myTradingBot/TradingBot/src/trading/auth_handler.py) has the full daily-token regeneration flow: local HTTP server on `:8080`, open browser to Kite, catch callback, exchange `request_token` for `access_token`, write back to `.env`.

**Port action**: Reuse the token-exchange logic (lines 184-216). **Rebuild** the local-HTTP-server pattern — it's single-user desktop; replace with a proper web OAuth flow against our hosted callback URL. Extract the "daily at 6 AM IST expiry" logic as first-class operational knowledge in `packages/sdk-broker/src/kite/token-lifecycle.ts`.

### 1.9 Message pre-filters

[telegram_monitoring/listener/telegram_listener.py:252-291](../../myTradingBot/telegram_monitoring/listener/telegram_listener.py#L252-L291) defines:
- Skip messages older than 60 seconds (avoid catching up on old noise)
- Skip messages shorter than 10 chars (not a signal)
- Skip messages longer than 30 words (conversation, not a signal)
- Text-only (skip media/files)

These constants are empirically tuned. Port them verbatim into `apps/workers/ingestion/src/filters.ts` with named constants and unit tests.

### 1.10 IST timezone hygiene

Every log, every timestamp, every scheduled job in legacy code uses IST (UTC+5:30):
- [telegram_monitoring/utils/logger.py:17-38](../../myTradingBot/telegram_monitoring/utils/logger.py#L17-L38) — `ISTFormatter`
- [TradingBot/src/trading/trade_manager.py:1147-1186](../../myTradingBot/TradingBot/src/trading/trade_manager.py#L1147-L1186) — market-close time check using `pytz.timezone('Asia/Calcutta')`

Financial apps in India **must** display IST to users consistently. This is product, not just i18n.

**Port action**: Standard: store everything in UTC, render in IST at the edge. Use a shared `formatIST()` helper in `packages/ui/src/format.ts`. Logs in Datadog will display in the viewer's timezone — that's fine; we adjust displays, not storage.

### 1.11 EOD auto-exit

[TradingBot/src/trading/trade_manager.py:1188-1237](../../myTradingBot/TradingBot/src/trading/trade_manager.py#L1188-L1237) force-exits all open positions at 15:15 IST. This is a load-bearing safety feature — without it, intraday positions risk overnight exposure when intended to be MIS.

**Port action**: Keep the behavior. Make it a Temporal workflow `EndOfDayForceExit` that runs daily at 15:15 IST per user, reads their open positions, queues market-exit activities. Keep the 15:00 IST "no-new-trades" cutoff ([trade_manager.py:185-219](../../myTradingBot/TradingBot/src/trading/trade_manager.py#L185-L219)) as another workflow.

### 1.12 Signal validation regex patterns

[telegram_monitoring/processor/signal_validator.py:257-328](../../myTradingBot/telegram_monitoring/processor/signal_validator.py#L257-L328) supports five symbol formats:
- Spaced index option: `NIFTY 25750 CE`
- Compact index option: `NIFTY25750CE`
- Spaced stock option: `RELIANCE 2400 CE`
- Compact stock option: `RELIANCE2400CE`
- Stock only: `RELIANCE`

The regex set is well-tested against real tipster messages.

**Port action**: Port to `packages/risk-engine/src/symbol-patterns.ts`. **Unify** the format (pick one — either always compact or always spaced) so downstream doesn't branch on whitespace. The current "accept both" is a silent source of `get_instrument_token` mismatches.

---

## 2. What the legacy codebases got wrong

### 2.1 Single-tenant by design

Every entry point assumes one user:
- One `.env` file
- One Telethon session file
- One Kite credential set
- One `active_trades` in-memory dict
- Hardcoded `monitor first 15 chats` as a fallback

**Lesson for tradeX**: Multi-tenancy must be a day-one architectural commitment. RLS in Postgres + per-tenant queues + per-tenant session storage in KMS-encrypted blobs.

### 2.2 In-memory state

[TradingBot/src/trading/trade_manager.py:36-37](../../myTradingBot/TradingBot/src/trading/trade_manager.py#L36-L37):

```python
self.active_trades: Dict[str, Trade] = {}
self.completed_trades: List[Trade] = []
```

If the process dies at 10:30 AM with a BUY position open:
- No record of what's open on Zerodha from our side
- Exit monitor won't rehydrate
- Trailing SL state is gone
- EOD force-exit won't fire

**Lesson for tradeX**: Every trade state transition must be written to Postgres + `trade_events`. Temporal workflows for lifecycle so we auto-resume on worker crashes. Reconcile with `kite.positions()` on startup to detect drift.

### 2.3 The broken ZMQ integration

Both legacy projects reach for ZMQ to bridge parser → executor, but:
- [telegram_monitoring/main.py:100-101](../../myTradingBot/telegram_monitoring/main.py#L100-L101) creates a `zmq.SUB` socket and tries to `send_string()` on it — SUB sockets cannot send
- [telegram_monitoring/requirements.txt](../../myTradingBot/telegram_monitoring/requirements.txt) does not list `pyzmq` despite `main.py` importing it
- The send path is gated by `parsed_signal["verified"]` which nothing ever sets
- [TradingBot/src/executor/adapter.py](../../myTradingBot/TradingBot/src/executor/adapter.py) is the half-finished subscriber, never imported
- Adapter has `last_periodic_run` used before definition ([line 374](../../myTradingBot/TradingBot/src/executor/adapter.py#L374))

**Lesson for tradeX**: Don't invent inter-service protocols ad-hoc. Use Redis Streams with consumer groups (documented pattern, idempotent, replayable, standard).

### 2.4 Schema drift between code, prompt, docs, tests

The same "action / side" field has three representations across the legacy:
- LLM system prompt says `side: "BUY"` ([system_prompt.txt:10](../../myTradingBot/telegram_monitoring/processor/system_prompt.txt#L10))
- INTEGRATION_GUIDE.md documents `action: "BUY"` ([INTEGRATION_GUIDE.md:141](../../myTradingBot/telegram_monitoring/INTEGRATION_GUIDE.md#L141))
- `signal_validator.py:85` reads `action` with default `"BUY"`
- Tests mock with `action` field, actual runtime data has `side`

**Lesson for tradeX**: Single source of truth for the signal schema — `packages/types/src/signal.ts` with Zod. Generate the OpenAPI spec from it, generate TS client from OpenAPI, mirror to Python via pydantic-to-zod. Break the build on drift.

### 2.5 Telemetry stubs that callers still invoke

[telegram_monitoring/utils/telemetry.py:186-216](../../myTradingBot/telegram_monitoring/utils/telemetry.py#L186-L216) has 7 span-creation methods that return `{}`. The processor and listener still call them and `queue_span({})` the empty dicts — harmless but misleading.

**Lesson for tradeX**: Either implement, or delete, never leave stubs. Enforce via lint rule: no function body that only returns a literal empty dict.

### 2.6 Stale tests

[telegram_monitoring/tests/test_signal_collator.py](../../myTradingBot/telegram_monitoring/tests/test_signal_collator.py) instantiates `SignalCollator(processor=mock_processor, ...)` — the current class doesn't accept a `processor` arg. Test errors on first run. All three tests mock signals with `action` + `entry_price` fields that the LLM doesn't actually produce.

**Lesson for tradeX**: Tests are code. If they don't run in CI, they rot. Every test must run on every PR; any flake >1 in 20 runs gets fixed or deleted.

### 2.7 Live credentials in tracked files

[TradingBot/.env](../../myTradingBot/TradingBot/.env), [TradingBot/.env.template](../../myTradingBot/TradingBot/.env.template) — real Kite API key/secret, real Telegram API ID/hash, real phone numbers. The "template" literally has live credentials.

**Lesson for tradeX**: `.env.example` only with placeholders. `.env` in .gitignore from day one. `gitleaks` pre-commit hook. Staging/prod secrets in AWS Secrets Manager, never in files.

### 2.8 Honeycomb as a hard dependency

[telegram_monitoring/utils/config.py:29](../../myTradingBot/telegram_monitoring/utils/config.py#L29) types `honeycomb_api_key: str` not `Optional[str]`. App crashes at startup without it. [HONEYCOMB_DEPLOYMENT.md](../../myTradingBot/telegram_monitoring/docs/HONEYCOMB_DEPLOYMENT.md) even documents this as "known pain."

**Lesson for tradeX**: Observability should degrade gracefully when the backend is unreachable. Wrap in a null-safe telemetry interface that no-ops when unconfigured. Log to stdout always as a fallback.

### 2.9 AWS EC2 single-instance manual operations

[TradingBot/AWS_DEPLOYMENT_GUIDE.md](../../myTradingBot/TradingBot/AWS_DEPLOYMENT_GUIDE.md) describes a daily ritual: SSH in, paste Kite token, run in `screen`, detach, exit. One human, one account, one machine. Doesn't scale, doesn't survive the SSH session dying, zero automation.

**Lesson for tradeX**: ECS Fargate + Temporal + GitHub Actions → no human in the deploy loop. Daily Kite reauth is a user-facing product feature (morning push), not an ops ritual.

### 2.10 Half-finished refactors left in the repo

- [tests/test_signal_collator.py](../../myTradingBot/telegram_monitoring/tests/test_signal_collator.py) — stale API
- [src/executor/adapter.py](../../myTradingBot/TradingBot/src/executor/adapter.py) — dead code with NameError
- [utils/openai_assistant.py](../../myTradingBot/telegram_monitoring/utils/openai_assistant.py) — references a file path that doesn't exist
- System prompt's "BTST" handling contradicts itself (line 114 says reject, Example 10 says accept)

**Lesson for tradeX**: Dead code is a code smell. PR template asks "Is anything deleted that should be?" `ts-unused-exports` / `vulture` in CI. Every "TODO" gets a JIRA ticket or gets deleted.

---

## 3. Module-by-module salvage analysis

### 3.1 `myTradingBot/telegram_monitoring/` (newer, LLM-based)

| File | Salvage? | Target in tradeX | Notes |
|---|---|---|---|
| `main.py` (292 LOC) | Partial | `apps/api/src/modules/signals/signal-pipeline.ts` | Port the orchestration flow; drop ZMQ + single-user assumptions |
| `listener/telegram_listener.py` (422 LOC) | Port + refactor | `apps/workers/ingestion/src/telegram-listener.py` | Port pattern, rebuild per-user sharding |
| `processor/signal_processor.py` (478 LOC) | High | `apps/workers/parser/src/parser.py` | Port BTST check, OpenAI call, JSON validation, cost tracking |
| `processor/signal_collator.py` (273 LOC) | High | `apps/workers/parser/src/collator.py` | Port algorithm; fix `merged_text` NameError at line 164 |
| `processor/signal_validator.py` (336 LOC) | High | `packages/risk-engine/src/validator.ts` | Port to TS + shared with Python via contract |
| `processor/system_prompt.txt` (756 lines) | **Verbatim** | `packages/llm-prompts/v1/parse-signal.txt` | Version it from day one |
| `utils/config.py` | Discard | Replaced by NestJS ConfigModule + per-tenant DB config | — |
| `utils/logger.py` | Partial | `packages/ui/src/format.ts` (IST formatter) | Port IST logic; use Datadog for actual logging |
| `utils/telemetry.py` | Discard | Replaced by Datadog SDK | — |
| `utils/openai_assistant.py` | Discard | One-off helper, broken path | — |
| `tests/*.py` | Discard | Replace with fresh tests | Stale API |
| `logs/parsed_signals.jsonl` | **Treasure** | `packages/llm-prompts/v1/golden-set.jsonl` | 159 real production signals — use as regression set |
| `.env.example` | Reference | Pattern for new `.env.example` | Drop real `.env` |
| `Dockerfile` | Reference | Informs `infra/docker/worker.Dockerfile` | Simpler and cleaner |
| `docker-compose.yml` | Reference | Inspiration for local dev setup | — |

### 3.2 `myTradingBot/TradingBot/` (older, full bot)

| File | Salvage? | Target in tradeX | Notes |
|---|---|---|---|
| `run.py` | Discard | — | Single-user CLI entry |
| `src/main.py` | Partial | Inspiration for `apps/workers/executor/` orchestration | Port component init pattern |
| `src/config/settings.py` | Partial | `packages/types/src/index-config.ts` + DB seed | Port the per-index pattern |
| `src/models/enums.py` | **Verbatim** | `packages/trade-core/src/enums.ts` | 9-state trade status + order types |
| `src/models/signal.py` | Replace | `packages/types/src/signal.ts` (Zod) | Port fields, new validation model |
| `src/models/trade.py` (303 LOC) | High | `packages/trade-core/src/trade.ts` + tests | Port PnL math, trailing SL, partial-exit tracking |
| `src/telegram/client.py` | Discard | Replaced by per-user Telethon worker | Keep the `_periodic_catch_up` pattern |
| `src/telegram/signal_parser.py` | Discard | Replaced by LLM parser | Keep regex as emergency fallback in `packages/risk-engine/src/legacy-regex.ts` |
| `src/telegram/unified_message_handler.py` | Partial | — | Keep duplicate-hash logic, dedup window |
| `src/trading/kite_client.py` (709 LOC) | High | `packages/sdk-broker/src/kite/` | Port: response normalization, rate limiting, retry, instrument resolution, mock mode |
| `src/trading/auth_handler.py` | Partial | `packages/sdk-broker/src/kite/oauth.ts` | Reuse token-exchange logic; replace local HTTP server with hosted callback |
| `src/trading/market_data.py` | Port | `apps/workers/market-feed/src/kite-ticker.ts` | KiteTicker wrapper |
| `src/trading/trade_manager.py` (1268 LOC) | High | Split across `packages/trade-core/` + `apps/workers/executor/` | The crown jewel of legacy code — extract the business logic |
| `src/trading/exit_monitor.py` (447 LOC) | High | `apps/workers/executor/src/exit-monitor.py` | Port exit-condition polling; handle per-user monitoring |
| `src/executor/adapter.py` | Discard | — | Half-finished, broken |
| `src/utils/logger.py` | Discard | Datadog | — |
| `src/utils/log_archiver.py` | Discard | S3 lifecycle policy | — |
| `src/utils/profile_manager.py` | Discard | Admin UI for tenant management | — |
| `.env.template` | Discard + rotate | — | Contains live credentials |
| `AWS_DEPLOYMENT_GUIDE.md` | Discard | Replaced by Terraform + CI/CD | — |
| `README.md` | Discard | — | Stale status claims |

---

## 4. Specific code to port (prioritized)

### Tier A — Port verbatim or near-verbatim

1. **System prompt** — [system_prompt.txt](../../myTradingBot/telegram_monitoring/processor/system_prompt.txt) entire file → `packages/llm-prompts/v1/parse-signal.txt`
2. **Trade state enums** — [enums.py](../../myTradingBot/TradingBot/src/models/enums.py) → `packages/trade-core/src/enums.ts` (translate to TS)
3. **Kite response normalization** — [kite_client.py:548-584](../../myTradingBot/TradingBot/src/trading/kite_client.py#L548-L584) → `packages/sdk-broker/src/kite/place-order.ts`
4. **Instrument resolution with expiry matching** — [kite_client.py:189-262](../../myTradingBot/TradingBot/src/trading/kite_client.py#L189-L262) — week-preference heuristic
5. **IST timezone formatter** — [logger.py:17-38](../../myTradingBot/telegram_monitoring/utils/logger.py#L17-L38) → `packages/ui/src/format-ist.ts`
6. **Golden-set regression data** — [parsed_signals.jsonl](../../myTradingBot/telegram_monitoring/logs/parsed_signals.jsonl) → `packages/llm-prompts/test-fixtures/golden-set.jsonl`

### Tier B — Port with refactor

1. **Multi-message collation** — [signal_collator.py:70-229](../../myTradingBot/telegram_monitoring/processor/signal_collator.py#L70-L229) → rewrite as Temporal workflow, port the algorithm and regex-override
2. **Signal pre-filters** (age, length, word count) — [telegram_listener.py:250-291](../../myTradingBot/telegram_monitoring/listener/telegram_listener.py#L250-L291) → constants in `apps/workers/ingestion/src/filters.ts`
3. **Trailing SL math** — [trade.py:213-269](../../myTradingBot/TradingBot/src/models/trade.py#L213-L269) → `packages/trade-core/src/trailing-sl.ts`, add property tests
4. **Partial exit logic** — [trade_manager.py:544-589](../../myTradingBot/TradingBot/src/trading/trade_manager.py#L544-L589) → `packages/trade-core/src/partial-exit.ts`
5. **EOD force exit** — [trade_manager.py:1147-1237](../../myTradingBot/TradingBot/src/trading/trade_manager.py#L1147-L1237) → Temporal workflow `EndOfDayForceExit`
6. **Trade creation cutoff time** — [trade_manager.py:185-219](../../myTradingBot/TradingBot/src/trading/trade_manager.py#L185-L219) → risk rail
7. **Single-trade-per-index rule** — [trade_manager.py:221-263](../../myTradingBot/TradingBot/src/trading/trade_manager.py#L221-L263) → risk rail, configurable per user
8. **SL distance validation** — [trade_manager.py:119-153](../../myTradingBot/TradingBot/src/trading/trade_manager.py#L119-L153) → risk rail
9. **Price ordering validation** — [trade_manager.py:155-183](../../myTradingBot/TradingBot/src/trading/trade_manager.py#L155-L183) → risk rail
10. **Progress-to-target calculation** (for 70% break-even SL) — [trade_manager.py:265-329](../../myTradingBot/TradingBot/src/trading/trade_manager.py#L265-L329) → `packages/trade-core/src/progress.ts`
11. **Telegram rate-limit handling** — [telegram_listener.py:177-224](../../myTradingBot/telegram_monitoring/listener/telegram_listener.py#L177-L224) → `apps/workers/ingestion/` with Redis-backed state
12. **Symbol normalization (BANKNIFTY before NIFTY)** — [signal_parser.py:192-259](../../myTradingBot/TradingBot/src/telegram/signal_parser.py#L192-L259) → symbol-patterns utility
13. **Duplicate message hashing** — [unified_message_handler.py:279-304](../../myTradingBot/TradingBot/src/telegram/unified_message_handler.py#L279-L304) → ingestion worker dedup

### Tier C — Reference only (learn from, don't port)

1. **Mock mode safety pattern** — [kite_client.py:427-447](../../myTradingBot/TradingBot/src/trading/kite_client.py#L427-L447) — replaced by paper-vs-live split
2. **Signal keyword matching** — [unified_message_handler.py:65-70](../../myTradingBot/TradingBot/src/telegram/unified_message_handler.py#L65-L70) — LLM does this now
3. **Rejected signals log** — [signal_parser.py:43-79](../../myTradingBot/TradingBot/src/telegram/signal_parser.py#L43-L79) — replaced by ClickHouse audit

---

## 5. Specific code to discard

1. [myTradingBot/telegram_monitoring/main.py:99-124](../../myTradingBot/telegram_monitoring/main.py#L99-L124) — broken ZMQ
2. [myTradingBot/TradingBot/src/executor/adapter.py](../../myTradingBot/TradingBot/src/executor/adapter.py) — half-finished, has NameError
3. [myTradingBot/telegram_monitoring/utils/openai_assistant.py](../../myTradingBot/telegram_monitoring/utils/openai_assistant.py) — broken path, unused
4. All stale tests under `myTradingBot/telegram_monitoring/tests/`
5. [myTradingBot/TradingBot/src/utils/log_archiver.py](../../myTradingBot/TradingBot/src/utils/log_archiver.py) — replaced by S3 lifecycle
6. [myTradingBot/TradingBot/setup.sh](../../myTradingBot/TradingBot/setup.sh), [setup.bat](../../myTradingBot/TradingBot/setup.bat), [activate.sh](../../myTradingBot/TradingBot/activate.sh), [activate.bat](../../myTradingBot/TradingBot/activate.bat) — replaced by `pnpm install` + `turbo dev`
7. All `.DS_Store` files — mac cruft
8. `.env.template` in legacy (contains live credentials)

---

## 6. Architecture lessons

### 6.1 The parser is a pure function; the executor is a state machine

The legacy code mixes these concerns. `trade_manager.py` is 1268 lines doing validation, state tracking, exit logic, P&L calculation, Kite order placement, logging, statistics all at once.

**For tradeX**: Separate concerns rigorously.
- `packages/trade-core` → pure functions (PnL math, trailing SL, rail checks)
- `apps/workers/executor` → state machine (Temporal workflow)
- `packages/sdk-broker` → IO (Kite calls)
- `packages/risk-engine` → pure rails

No circular deps. Each testable in isolation.

### 6.2 Async Python works for orchestration; it doesn't make it multi-tenant

The legacy listener uses `asyncio` within one process to handle concurrent chats for one user. Scaling to many users means scaling the processes, not the event loop.

**For tradeX**: Per-user ingestion tasks in a shared pool, with consistent hashing mapping users to pods. One pod = ~200 users. A pod can run hundreds of async Telethon clients but doesn't pretend that gives isolation — crash isolation is at the pod, not the task.

### 6.3 Signal parsing is the cheapest part; execution is the expensive part

LLM cost: ~₹0.008 per signal. Trade cost: ₹20-80 per round-trip plus the cost of being wrong. Invest engineering time accordingly.

**For tradeX**: Parser gets good test coverage (golden set + property tests + tone-of-prompt regression). Executor gets WHITE-GLOVE treatment — Temporal for durability, Kite reconciliation on startup, audit for every state transition, DR drills quarterly.

### 6.4 Telegram sessions are a cost center

Each user = one Telethon session = one bundle of Telegram rate limits, one session file, one potential 2FA reset. There's no "multiplex 1000 users through one session" shortcut.

**For tradeX**: Price the Telegram infrastructure into the cost model (done — see SOLUTION_ARCHITECTURE §18). Architect ingestion pods as user-pinned from day one.

### 6.5 Kite tokens expire daily

Not a bug, a regulatory design. Don't fight it — build a product experience around it.

**For tradeX**: Morning push notification "Tap to authorize today's trading, 20 seconds." Build it to feel like a ritual, not a chore. Never hide this from the user; it's actually a security feature they'll appreciate if framed right.

### 6.6 Paper and live must share code

Legacy has no paper mode; what's there is `MOCK_MODE=true` which short-circuits Kite calls. That's not a simulator, that's a stub. Any drift between the "what would have happened" and "what did happen" breaks the channel scorecard's credibility.

**For tradeX**: Paper engine and live executor share the `trade-core` package. Only the broker adapter differs (PaperBrokerAdapter vs KiteBrokerAdapter). Rail checks, trailing SL, exit logic — identical code paths. Nightly diff job alerts on drift.

---

## 7. Operational lessons

1. **Never deploy during market hours.** The legacy EC2 ops guide doesn't say this, but it's implied by the "run in `screen` and detach" pattern.
2. **Token refresh must be observable.** Legacy has `authenticate_kite()` with zero metrics. We won't know reauth is failing until users complain.
3. **Logs need per-user correlation.** Legacy logs don't have user_id because there's only one. In multi-tenant, trace_id + user_id is non-optional.
4. **Brokerage fees matter to the scorecards.** Legacy paper mode doesn't simulate STT, GST, SEBI turnover, stamp duty. Scorecards without those are deceptively rosy.
5. **Kite WebSocket reconnects are not instant.** KiteTicker auto-reconnects ([market_data.py:34-37](../../myTradingBot/TradingBot/src/trading/market_data.py#L34-L37)) but the gap is 1-5s during which ticks are lost. During that gap, trailing SL doesn't update; risk is real.
6. **Periodic health checks surface drift.** Legacy logs every 60s with position count, WebSocket status, API connectivity. Useful pattern — port as dashboards, not log lines.

---

## 8. Risk patterns to preserve

These design decisions in legacy code exist for good reasons. If a new engineer asks "why," they should find the answer in tradeX too.

1. **MOCK_MODE default `True`** — safety over convenience. Port as: all new users default to paper-only, explicit consent to enable live.
2. **TTL on WAITING_ENTRY trades** ([trade.py:144-154](../../myTradingBot/TradingBot/src/models/trade.py#L144-L154)) — stale pending entries auto-cancel after 10 min. Prevents entries at wrong price days later.
3. **Single trade per index** ([trade_manager.py:67-68](../../myTradingBot/TradingBot/src/trading/trade_manager.py#L67-L68)) — prevents accidental doubling down. Port as configurable rail.
4. **15:00 IST trade-creation cutoff** — prevents late-entry trades that can't exit before EOD. Port as default rail.
5. **BTST rejection** (albeit inconsistently) — overnight exposure isn't compatible with "intraday-only" product positioning. Port as default-off toggle.

---

## 9. What the UX tells us (product lessons, not just code)

The legacy bot's logs reveal the UX implicitly:

- Users want per-signal notifications ("🆕 MOCK TRADE CREATED" style logs)
- Users care about which signal hit which target (`FIRST_TARGET_PARTIAL_166.0` event)
- Users track discipline metrics (trade status log every 60s)
- Users want P&L attribution per-trade with partial-exit breakdown

The legacy is effectively an audit log with text. tradeX turns that log into UI.

**Port action**: Every log line in the legacy that an operator would scroll through is a UI component candidate — SignalCard, TradeTimeline, DailyRecapEmail. Talk to users who ran the legacy bot to understand which logs they actually cared about.

---

## 10. The handover truth

After deep reading, the honest narrative to tell:

> "The previous team built a functional single-user trading bot with a mature trade-management engine, and then started a rewrite to add LLM-based parsing. The rewrite wasn't completed; the two projects don't talk to each other. The client's '2-3 hours to fix' statement is probably true to get the legacy bot running again on EC2 with fresh tokens — but 'fix' does not equal 'production-ready SaaS.' For tradeX, we reuse the LLM parser, the trade state machine, and hard-won operational knowledge, and redesign everything else multi-tenant from the ground up."

This is the right message for client, investors, and new hires alike.

---

*End of document. Port decisions in this file drive the `apps/` and `packages/` implementations. Revisit quarterly as production experience surfaces new lessons.*
