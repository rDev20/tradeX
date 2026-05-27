# @tradex/worker-reporter

Scheduled jobs that build channel scorecards, daily/weekly/monthly user reports, and tax-ready CSV exports.

## Outputs

- `channel_daily_stats` materialized view refreshed every 10 min
- `user_daily_stats` refreshed hourly
- PDF reports generated on 1st of each month, written to S3, email link sent
- Tax CSV (Clear / Quicko format) on user request

## Runs

Triggered by Temporal schedules — see `services/temporal/workflows/report-schedules.py`.
