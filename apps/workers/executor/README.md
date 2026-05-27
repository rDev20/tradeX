# @tradex/worker-executor

Live trade execution. Temporal workflow `TradeLifecycleWorkflow(trade_id)` manages the full order lifecycle through broker adapters.

## Order lifecycle

See [docs/SOLUTION_ARCHITECTURE.md Appendix A](../../../docs/SOLUTION_ARCHITECTURE.md) for the state diagram. States: `CREATED → WAITING_ENTRY → ORDER_PENDING → ENTERED → [PARTIAL_EXIT] → COMPLETED | STOPPED_OUT | CANCELLED | ERROR`.

## Broker-agnostic

All broker calls go through `@tradex/sdk-broker`'s `IBrokerAdapter`. Kite is the first impl; Upstox / Dhan / Fyers / Angel follow.

## Legacy-ported logic

- Kite order-response normalization (dict vs string) — [legacy kite_client.py:548-584](../../../../myTradingBot/TradingBot/src/trading/kite_client.py#L548-L584)
- Trailing SL math — [legacy trade.py:213-269](../../../../myTradingBot/TradingBot/src/models/trade.py#L213-L269) → `@tradex/trade-core`
- Partial exit at first target — [legacy trade_manager.py:544-589](../../../../myTradingBot/TradingBot/src/trading/trade_manager.py#L544-L589)
- EOD force exit — [legacy trade_manager.py:1147-1237](../../../../myTradingBot/TradingBot/src/trading/trade_manager.py#L1147-L1237)

See [docs/LEARNINGS_FROM_LEGACY.md §4](../../../docs/LEARNINGS_FROM_LEGACY.md) for the full port list.
