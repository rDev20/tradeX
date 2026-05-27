# @tradex/worker-paper-engine

Simulates trade fills, exits, and PnL per channel using Practice ₹ wallets.

## Design

Temporal workflow `PaperTradeLifecycle(paper_trade_id)` mirrors the live `TradeLifecycleWorkflow` with only the broker adapter differing (PaperBrokerAdapter vs KiteBrokerAdapter).

- Per-channel isolated `paper_wallets` rows
- Tick-accurate fill simulation with bid-ask spread slippage
- Realistic cost simulation (brokerage + STT + GST + SEBI + stamp)
- Same exit ladder as live (SL / 70% break-even / 50% partial at T1 / trailing / EOD)

Shared code with live via `@tradex/trade-core` and `@tradex/risk-engine`.

## Nightly accuracy check

A scheduled job compares paper-simulated outcomes against actual live outcomes for the same signals. Drift >5% triggers an alert.
