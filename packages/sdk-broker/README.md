# @tradex/sdk-broker

Broker-agnostic adapter interface. One implementation per broker.

## Interface

```typescript
export interface IBrokerAdapter {
  readonly brokerName: BrokerName;
  authenticate(user: User): Promise<AuthResult>;
  refresh(token: Token): Promise<Token>;
  placeOrder(order: OrderRequest, idempotencyKey: string): Promise<OrderResponse>;
  modifyOrder(id: string, changes: OrderModification): Promise<OrderResponse>;
  cancelOrder(id: string): Promise<CancelResponse>;
  getPositions(): Promise<Position[]>;
  getMargin(): Promise<Margin>;
  subscribeTicks(symbols: string[], cb: TickCallback): Subscription;
  getInstruments(): Promise<Instrument[]>;
  healthCheck(): Promise<HealthStatus>;
}
```

## Implementations (roadmap)

- `kite/` — Zerodha Kite Connect v3 (P0 — first broker)
- `upstox/` — Upstox API v2 (P1)
- `dhan/` — Dhan API v2 (P1)
- `fyers/` — Fyers API v3 (P2)
- `angel/` — Angel One SmartAPI (P2)
- `paper/` — Paper-trading simulator (P0 — runs alongside Kite for scorecards)

## Legacy-ported knowledge

- Kite's response quirk (string vs dict) — see [legacy kite_client.py:548-584](../../../myTradingBot/TradingBot/src/trading/kite_client.py#L548-L584)
- Week-preference expiry matching — see [legacy kite_client.py:229-261](../../../myTradingBot/TradingBot/src/trading/kite_client.py#L229-L261)
