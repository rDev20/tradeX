# Load Tests (k6)

Targets signal pipeline, order hot path, and API throughput.

## Scenarios

- `signal-fanout.js` — simulates 10k concurrent users receiving signals
- `order-burst.js` — 100 concurrent orders against Kite mock
- `paper-sim.js` — paper engine throughput at 1000 signals/min
- `api-crud.js` — steady-state user-facing API load

## Targets

Aligns with [SOLUTION_ARCHITECTURE §18 SLOs](../../docs/SOLUTION_ARCHITECTURE.md).

Run:
```bash
k6 run tests/load/signal-fanout.js
```
