# @tradex/risk-engine

Pure-function pre-trade risk rails. No IO. Fully deterministic. Unit-testable in isolation.

## Rails (v1)

1. `dailyLossRail` — blocks if today's realized+unrealized loss ≥ profile.max_daily_loss
2. `weeklyLossRail`
3. `maxConcurrentRail` — count of open trades
4. `maxCapitalPerSignalRail` — % of linked capital
5. `maxLotsRail` — per-signal lots cap
6. `indexWhitelistRail` — only allowed indices
7. `tradingWindowRail` — IST time window
8. `btstRail` — reject if overnight-implying
9. `minMarginRail` — require buffer above position cost
10. `maxSLDistanceRail` — per-index points cap
11. `consecutiveLossRail` — pause after N consecutive losses
12. `volatilityHaltRail` — NIFTY IV threshold
13. `gapDayHaltRail` — opening gap threshold
14. `circuitBreakerRail` — market-wide circuit

## Contract

```typescript
type RailResult =
  | { allow: true; warnings: Warning[] }
  | { allow: false; blockedBy: RailName; reason: string; details: unknown };

export function evaluate(
  signal: Signal,
  profile: RiskProfile,
  context: RailContext,
): RailResult;
```

## Ported from legacy

- SL distance check — [trade_manager.py:119-153](../../../myTradingBot/TradingBot/src/trading/trade_manager.py#L119-L153)
- Price ordering check — [trade_manager.py:155-183](../../../myTradingBot/TradingBot/src/trading/trade_manager.py#L155-L183)
- Single-trade-per-index — [trade_manager.py:221-263](../../../myTradingBot/TradingBot/src/trading/trade_manager.py#L221-L263)
- Trade creation cutoff — [trade_manager.py:185-219](../../../myTradingBot/TradingBot/src/trading/trade_manager.py#L185-L219)
