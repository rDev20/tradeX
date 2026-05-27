# tradeX — Demo PoC

**Everything for the customer demo lives inside `demo/`.** No Docker, no Turbo, no monorepo complexity — just Next.js + SQLite + a Python worker that reads/writes the same DB.

---

## One-time setup (already done once, don't repeat)

1. Telethon authenticated — session saved at `worker/sessions/tradex_demo.session` (permanent; no more OTP).
2. SQLite database created at `demo.db` via Prisma schema push.
3. Python venv at `worker/.venv/` with Telethon, yfinance, python-dotenv.
4. Node deps installed under `web/node_modules/`.

If you ever need to redo any of the above, see "Rebuilding from scratch" at the bottom.

---

## Run the demo (2 terminals)

```bash
# Terminal 1 — Python worker (ingestion, parsing, paper-trading, yfinance)
cd demo/worker
.venv/Scripts/python main.py

# Terminal 2 — Next.js web app
cd demo/web
npm run dev
```

Then open **http://localhost:3000**.

Login: **`tradeX-user1`** / **`tradeX2026`**

---

## What the customer sees

### Stage 1 — Login + Telegram
- Clean login screen (hardcoded credentials for the demo).
- On success: dashboard loaded with the **Paper Mode banner** at the very top (impossible to miss), the **Trading Service** card (off by default), and an empty Market watchlist.
- **Connections** page shows the Telegram account already authenticated (Rishabh Dev · +917838390551). All channels have been pre-synced.

### Stage 2 — Stocks + favorites
- **Market** page shows 12 NSE symbols (NIFTY 50, BANK NIFTY, 10 large-cap stocks).
- Start the service → prices refresh every 15 seconds from yfinance.
- Click the **★** on any card → it moves to the **Favorites** section at the top.
- Every price and every P&L label is prefixed **Practice ₹** to reinforce that nothing is real.

### Stage 3 — Paper-trading evaluation
- **Channels** page shows the user's real Telegram channels.
- Click **Evaluate** on 2-3 signal channels.
- With the service ON: messages flow in → parser extracts BUY/SELL signals → paper-trade simulator uses yfinance historical bars to compute target/SL hits → scorecard populates.
- **Scorecard** page ranks channels by paper P&L with win rate, trade history, and an equity curve.

---

## The Trading Service toggle

One button controls everything. It flips the `service_status` setting in SQLite:

- When **RUNNING**: the Python worker ingests Telegram messages, parses signals, simulates paper trades, and polls live prices.
- When **STOPPED**: the worker idles. No data changes. Prices freeze.

The Python worker polls this flag every 2 seconds, so clicking the button is effectively instant. The top bar shows a live status indicator. Every start/stop is recorded in the `ServiceEvent` table.

---

## Demo script (5 minutes)

1. **(30s) Login screen** — "This is Aman, the persona. Hardcoded for the demo."
2. **(45s) Paper Mode banner + empty dashboard** — "Everything below this orange stripe is Practice ₹. No real money. No broker connected. This is our legal posture."
3. **(30s) Connections page** — "Telegram is already linked. The session lives server-side encrypted. No re-auth per login."
4. **(60s) Channels page** — "These are Aman's actual Telegram channels. He picks which ones to evaluate." Click Evaluate on 1-2 channels.
5. **(30s) Start Trading Service** — hit the big button. Point to the LIVE pulse indicator. "This is the mental model: market opens, he hits start. Market closes, he hits stop."
6. **(60s) Market page** — "Live NSE prices. NIFTY at X, his favorites pinned at the top. Click star to pin."
7. **(90s, THE MONEY SHOT) Scorecard page** — "This channel that Aman pays ₹5k/month for? Here's the paper P&L of every call it made in the last 30 days. Win rate, equity curve, trade-by-trade. Nobody else in India shows this number."
8. **(30s) Close** — "Next phase: broker adapter connects Kite/Upstox and live orders fire with hard risk rails. Phase 2, happy to walk through the architecture."

---

## Troubleshooting

**Channels page empty after Start.**
The worker syncs channels every 60s. Give it a minute, then refresh. If still empty, check the worker terminal for errors. Verify the Telethon session file exists at `worker/sessions/tradex_demo.session`.

**Scorecard empty even after signals are parsed.**
Paper-trade simulation runs every 30s. If a signal references a symbol we can't map to yfinance (rare small-cap stock), the trade is inserted with `exitReason='UNMAPPED'` and no P&L. Those are skipped in scorecard totals.

**yfinance warnings in the worker log.**
Yahoo occasionally rejects a ticker. Non-fatal — other symbols continue to update.

**Login loop.**
The JWT cookie expires after 7 days. If you see a redirect loop, clear cookies for localhost:3000 and try again.

---

## Where state lives

- `demo.db` — the single source of truth. Wipe and re-push the Prisma schema to reset.
- `worker/sessions/tradex_demo.session` — Telethon session. **Do not delete before the demo** or you'll need to re-authenticate via OTP.
- `.env` (one under `demo/` for worker, one under `demo/web/` for Next.js) — secrets and config.

---

## Rebuilding from scratch (only if something goes wrong)

```bash
# Re-authenticate Telegram (new OTP on your phone)
cd demo/worker
.venv/Scripts/python auth.py request
.venv/Scripts/python auth.py submit <5-digit-code>

# Reset the database
cd demo
rm demo.db
cd web && npx prisma db push

# Reinstall Python deps
cd demo/worker
.venv/Scripts/python -m pip install -r requirements.txt

# Reinstall Node deps
cd demo/web
npm install
```

---

## Files worth knowing

| Path | Purpose |
|---|---|
| `demo/.env` | Telegram api_id / api_hash / phone, demo credentials |
| `demo/web/.env` | Prisma DATABASE_URL, session secret |
| `demo/web/prisma/schema.prisma` | Full DB schema |
| `demo/web/app/(app)/` | Authenticated pages (Market, Channels, Scorecard, Connections) |
| `demo/web/app/login/` | Login screen |
| `demo/web/components/` | Paper banner, sidebar, topbar, Trading Service card, market grid |
| `demo/worker/main.py` | Worker loop (Telegram, parser, paper-trade, yfinance) |
| `demo/worker/parser.py` | Heuristic signal parser (Indian F&O formats) |
| `demo/worker/db.py` | SQLite helpers |
| `demo/worker/auth.py` | Two-step Telegram auth (request + submit) |

---

## What's intentionally NOT built (and what to say if asked)

- **Real broker execution** — "Phase 2. The broker-adapter contract is already designed."
- **Risk rails / Panic button** — present in UI as read-only; wiring is phase 2.
- **Real-time WebSocket push** — 15-second polling is invisible to the user.
- **Onboarding wizard, legal acceptance, billing, admin console** — skipped entirely for the demo.
- **Docker / Temporal / ClickHouse / NestJS** — the production architecture. Not needed for local PoC.
