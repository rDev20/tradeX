# services/temporal/

Temporal workflow definitions. These are referenced by workers in `apps/workers/` but live here as a shared contract.

## Workflows

- `TradeLifecycleWorkflow(trade_id)` — full live trade lifecycle, executor worker
- `PaperTradeLifecycleWorkflow(paper_trade_id)` — paper engine
- `KiteReauthReminderWorkflow` — morning push orchestration
- `EndOfDayForceExitWorkflow(user_id)` — 15:15 IST exit
- `PaperVsLiveAccuracyWorkflow` — nightly drift check
- `ChannelScorecardRefresh(channel_id)` — 10-min analytics refresh

## Schedules

Temporal Schedules API — see `workflows/schedules.py`.

## Worker pool

Each worker process (`apps/workers/executor`, `apps/workers/paper-engine`, etc.) registers relevant workflows and activities on startup.
