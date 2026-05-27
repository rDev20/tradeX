# @tradex/trade-core

The heart of the exit philosophy. Pure math + state transitions. Shared between paper engine and live executor so scorecard drift stays below the SLO threshold.

## Exports

- `OrderState` enum (9 states) — ported from [legacy enums.py](../../../myTradingBot/TradingBot/src/models/enums.py)
- `computePnL(trade, currentPrice)` — realized + unrealized breakdown
- `updateTrailingSL(state, tick)` — monotonic SL movement math
- `computePartialExit(trade, targetPrice, pct)` — partial exit record
- `shouldBreakEvenSL(trade, currentPrice)` — 70% progress heuristic
- `shouldForceExit(trade, now)` — EOD logic
- `ExitStrategy` types — preset strategies, user-configurable

## Ported from legacy

Literal port of:
- `Trade.update_trailing_sl` — [trade.py:213-245](../../../myTradingBot/TradingBot/src/models/trade.py#L213-L245)
- `Trade.execute_partial_exit` — [trade.py:158-194](../../../myTradingBot/TradingBot/src/models/trade.py#L158-L194)
- `TradeManager._execute_partial_exit` — [trade_manager.py:544-589](../../../myTradingBot/TradingBot/src/trading/trade_manager.py#L544-L589)

Property-based tests (fast-check) ensure the math is correct across random inputs.
