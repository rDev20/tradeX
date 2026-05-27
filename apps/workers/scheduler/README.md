# @tradex/worker-scheduler

Orchestrates time-triggered workflows.

## Schedules

| Workflow | Time (IST) | Purpose |
|---|---|---|
| `KiteReauthReminderWorkflow` | 08:45 daily | Notify users to authorize today's trading |
| `TradeCreationCutoffWorkflow` | 15:00 daily | Pause new trade creation |
| `EndOfDayForceExitWorkflow` | 15:15 daily | Force-exit all open positions per user |
| `DailyReportWorkflow` | 15:45 daily | Generate and email daily P&L summary |
| `WeeklyReportWorkflow` | Sat 09:00 | Generate weekly deep-dive |
| `MonthlyReportWorkflow` | 1st of month | Generate tax-ready PDF |
| `PaperVsLiveAccuracyWorkflow` | 02:00 daily | Verify paper/live consistency |
| `ChannelScorecardRefresh` | every 10 min | Refresh ClickHouse MVs |

All schedules expressed via Temporal Schedules API.
