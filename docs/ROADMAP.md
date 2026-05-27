# tradeX — Feature Roadmap & Status

> **Living document.** Single source of truth for what's built, what's in progress, what's planned, what's cut.
> Updated as features ship, get partial work, change stages, or get deferred.
> Companion to [PRODUCT_SPEC.md](PRODUCT_SPEC.md) (the WHAT) and [SOLUTION_ARCHITECTURE.md](SOLUTION_ARCHITECTURE.md) (the HOW).

---

## How to update this doc

1. **Feature ships** → change `❌` (or `🟡`) to `✅` for that row.
2. **Feature gets partial work** → change `❌` to `🟡`.
3. **Feature moves stages** → update the `Stage` column.
4. **Feature gets cut** → move the row to "Deferred / Not building" at the bottom.
5. **Always** add a dated one-line entry in the [Update log](#update-log) describing what changed.

Keep status snapshots honest. A 🟡 with a note ("missing rate-limit handling") is more useful than a wishful ✅.

---

## Status legend

| Symbol | Meaning |
|---|---|
| ✅ | Built and working |
| 🟡 | Partial — exists but incomplete or rough |
| ❌ | Not built |
| — | Not applicable |

## Stage definitions

| Stage | Theme | Target |
|---|---|---|
| **S0 (current focus)** | **MVP — signup, connect Telegram, pick channels, see scorecards. Runs 7 days unattended.** | **~1.5 weeks** |
| **S1** | Production v1 — paid tier ready (LLM parser, onboarding wizard, billing, notifications, ops) | ~6 weeks |
| **S2** | Market Intelligence Engine (news, earnings, macro, regime) | ~2–3 weeks |
| **S3** | Guardrails Framework — Trust Layer + Decision Mesh + Outcome Loop (the IP) | ~2–3 weeks |
| **S4** | Live Broker Execution + Risk Rails + Conversational | ~5–6 weeks |
| **later** | P1/P2 features deferred until customer demand or post-S4 | — |
| **gap** | P0 spec feature not yet placed in any stage (decision pending) | — |

---

## Stage 0 — MVP (current focus)

> **One-sentence definition**: A new user signs up, connects their Telegram, picks 1–3 channels with a Practice ₹ budget, and sees honest scorecards. Runs for 7 days without operator intervention.
>
> **Success bar**: 3–5 hand-picked beta users complete signup → connect their own Telegram → evaluate at least one channel → system runs unattended for 7+ days producing scorecard data.

### What MVP delivers (the 7 things)

| # | Deliverable | Effort | Status | Notes |
|---|---|---|---|---|
| M0.1 | Email + password signup / login (bcrypt + JWT, full register form: name/email/phone/PAN/address, 10-user cap, JSON `/api/auth/*` endpoints) | 1.5d | ✅ | Done. **QA: 37/38 passing**, only the SESSION_SECRET tripwire remains (intentional, fires until M0.6) |
| M0.2 | Onboarding wizard: 4 capability cards · per-user Telegram OTP at signup | 2d | ✅ | Done. Quiz layer removed for public testing; flow now starts at capabilities. Multi-user `auth.py` CLI, JSON OTP API, state-machine gate |
| M0.3 | Multi-tenancy: `userId` on Channel / Message / ParsedSignal / PaperTrade / Favorite / ServiceEvent · cascade-delete · per-user `UserServiceStatus` · empty-state CTA on dashboard | 1d | ✅ | Done. **QA: 23/23 passing.** All 10 server-component / API / action paths scoped by `requireUserId()` |
| M0.4 | Worker iterates per user (per-user Telethon clients via `UserClients` pool, per-user channel sync + ingest + parse + paper-trade) | 1d | ✅ | Done as part of M0.3. Sequential for ≤10 users; yfinance polling stays global |
| M0.5 | Realistic Indian transaction costs (STT, brokerage ₹20/order, GST 18%, SEBI, stamp, exchange) · Portfolio page (Zerodha-style, Paper/Live tab separation, live LTP, cost breakdown tooltip, sidebar nav added) | 1.5d | ✅ | Done. **QA: 16/16 passing.** Net P&L = gross − costs computed in worker; both stored. |
| M0.6 | Deploy to VM `https://103-240-24-3.nip.io` (Caddy auto-HTTPS via Let's Encrypt + nip.io magic DNS) · systemd web + worker · ufw + fail2ban · daily SQLite backup cron · rotated SESSION_SECRET + PII_ENCRYPTION_KEY | 1d | ✅ | Done. **QA: 12/12 passing.** Live at https://103-240-24-3.nip.io |
| M0.7 | 7-day self-test before sharing with first 3 beta users | 1d | ❌ | Run end-to-end with a fake user, fix anything broken |
| M0.8 | Trade Slips channel execution view (Trading Floor CTA → per-channel slip room, message rail, persisted execution timeline, paper target tracking) | 1.5d | 🟡 | MVP add-on in progress; QA phase `trade-slips` covers schema/API/UI links |
| M0.9 | Guided cockpit dashboard (mission status strip, next-best-action card, simplified dashboard surfaces, Market/Holdings moved out of left nav) | 0.5d | ✅ | Done; dashboard now guides connect → select channels → start service → watch Trading Floor |
| | **Total new work** | **~9.5d** | | **~2 calendar weeks** |

### Already in place — counts toward MVP, no further work

- ✅ **M0.1 done**: Email/password signup + login (bcrypt + JWT), JSON `/api/auth/*` endpoints, register form (name/email/phone/PAN/address), 10-user cap, AES-256-GCM PAN encryption
- ✅ **M0.2 done**: 4 capability cards, multi-user Telegram OTP wizard, multi-user `auth.py` CLI, JSON `/api/onboarding/telegram/*` endpoints, state-machine gate in `(app)` layout. The earlier 3-question quiz was removed before public testing because it did not affect the product yet.
- ✅ Telegram connection (Telethon) — multi-user from M0.2
- ✅ Channels page + Practice ₹ budget per channel
- ✅ Heuristic signal parser (good enough for MVP)
- ✅ Paper-trade simulator (gets cost realism in M0.5)
- ✅ Scorecard pages (today / lifetime, star rating, equity curve)
- ✅ Dashboard guided cockpit (mission strip, next-best-action card, daily summary, workspace links, channel health, activity feed)
- ✅ Market page (sector chips, top movers, featured 1D–1Y chart)
- ✅ Paper Mode banner / Practice ₹ convention everywhere
- ✅ **QA module** at `demo/qa/` — phase-by-phase verification harness (see [§17.5 QA Module](#175-qa-module))

### What MVP does NOT include — explicitly deferred

Every item below is preserved in the per-category tables further down. Nothing is forgotten.

| Deferred | Where it lives |
|---|---|
| LLM parser, multi-message collation, dedup | S1 |
| Onboarding wizard, risk quiz, legal acceptance | S1 |
| Marketing pages, pricing, billing (Razorpay) | S1 (manual invoices for first 10 users) |
| Daily email digest, push notifications | S1 |
| News / earnings / macro / regime intelligence | S2 |
| Trust Layer / Decision Mesh / Outcome Loop | S3 |
| Live broker, risk rails, panic, Ask tradeX | S4 |
| All P1/P2 features | later |

### MVP exit criteria — done when ALL six are true

1. New user can sign up via email + password without operator help
2. New user completes Telegram OTP from inside the app and sees their channel list
3. New user picks ≥1 channel with a budget; Trading Service produces data
4. System runs 7 consecutive days without crashes or data loss
5. Scorecards render meaningful numbers for at least one beta user
6. ≥3 beta users have run the full flow end-to-end

When all 6 are true, MVP ships. Then we re-evaluate with real customer feedback before scoping S1.

---

## Table of Contents

0. [Stage 0 — MVP (current focus)](#stage-0--mvp-current-focus) ← **start here**
1. [Public & Auth](#1-public--auth) (8.1)
2. [Onboarding Wizard](#2-onboarding-wizard) (8.2)
3. [Market Workspace](#3-market-workspace) (8.3)
4. [Telegram Integration](#4-telegram-integration) (8.4)
5. [Signal Ingestion & Parsing](#5-signal-ingestion--parsing) (8.5)
6. [Channel Evaluation / Paper Trading](#6-channel-evaluation--paper-trading) (8.6)
7. [Live Trading](#7-live-trading) (8.7)
8. [Portfolio](#8-portfolio) (8.8)
9. [Analytics & Reports](#9-analytics--reports) (8.9)
10. [Notifications](#10-notifications) (8.10)
11. [Settings](#11-settings) (8.11)
12. [Billing](#12-billing) (8.12)
13. [Admin Backend](#13-admin-backend) (8.13)
14. [Cross-cutting](#14-cross-cutting) (8.14)
15. [Intelligence Layer (our additions)](#15-intelligence-layer-our-additions)
16. [Frameworks / IP](#16-frameworks--ip)
17. [Summary](#17-summary)
18. [Open Decisions](#18-open-decisions)
19. [Deferred / Not Building](#19-deferred--not-building)
20. [Update log](#20-update-log)

---

## 1. Public & Auth

| ID | Feature | Spec-P | Status | Stage | Notes |
|---|---|---|---|---|---|
| A01 | Landing page w/ live anonymized channel leaderboard | P0 | ❌ | gap | Defer leaderboard to S2 (needs data) |
| A02 | Pricing page w/ tier comparison | P0 | ❌ | S1 | Static page |
| A03 | How-it-works animated walkthrough | P0 | ❌ | S1 | Static page |
| A04 | Legal pages (ToS / Privacy / Risk / Refund) | P0 | ❌ | S1 | Lawyer review needed |
| A05 | Public blog / changelog | P1 | ❌ | later | |
| A06 | Phone OTP signup (MSG91) | P0 | ❌ | S1 | |
| A07 | Email + password fallback | P0 | 🟡 | S1 | Currently hardcoded `tradeX-user1` |
| A08 | Google / Apple SSO | P1 | ❌ | later | |
| A09 | 2FA (TOTP + backup codes) | P0 | ❌ | gap | Decision: include S1 or push S4? |
| A10 | Biometric / WebAuthn | P1 | ❌ | later | |
| A11 | Session management (view / logout-all) | P0 | ❌ | S1 | Comes free with Clerk |
| A12 | Account recovery (dual verify, cooldown) | P0 | ❌ | S1 | |
| A13 | DPDP granular consent | P0 | ❌ | S1 | Legal must |
| A14 | Role-based access (user / admin / support) | P0 | ❌ | S1 | |

## 2. Onboarding Wizard

| ID | Feature | Spec-P | Status | Stage | Notes |
|---|---|---|---|---|---|
| O01 | Welcome splash + 20s tour | P0 | ❌ | S1 | |
| O02 | 8-question risk profile quiz | P0 | ❌ | S1 | Spec §4.4 |
| O03 | Legal acceptance, scroll-enforced | P0 | ❌ | S1 | |
| O04 | Subscription tier selection | P0 | ❌ | S1 | Free default if billing not ready |
| O05 | Broker connection (Kite OAuth) | P0 | ❌ | S4 | |
| O06 | Telegram phone+OTP+2FA | P0 | 🟡 | S1 | Telethon works, not in wizard yet |
| O07 | Telegram channel selection | P0 | ✅ | — | Channels page complete |
| O08 | Practice ₹ allocation | P0 | ✅ | — | Per-channel budget complete |
| O09 | Notification preferences | P0 | ❌ | S1 | |
| O10 | Onboarding complete + "what's next" | P0 | ❌ | S1 | |
| O11 | Save-and-resume at every step | P0 | ❌ | S1 | DB-backed step tracker |
| O12 | Progress indicator | P0 | ❌ | S1 | |

## 3. Market Workspace

| ID | Feature | Spec-P | Status | Stage | Notes |
|---|---|---|---|---|---|
| M01 | Three-pane layout (left rail, center, right rail) | P0 | 🟡 | gap | Right rail not built |
| M02 | Favorites grid (4/row desktop) | P0 | ✅ | — | |
| M03 | Favorite card (LTP, Δ, sparkline) | P0 | ✅ | — | |
| M04 | Click → expand to chart overlay | P0 | ✅ | — | Featured Symbol card |
| M05 | Timeframes 1D/5D/1M/3M/1Y/YTD/All | P0 | 🟡 | minor | Have 1D/1W/1M/6M/1Y; missing 5D, 3M, YTD, All |
| M06 | Candle/line toggle + volume bars | P0 | ❌ | gap | Lightweight Charts supports — small effort |
| M07 | Key metrics in expanded card | P0 | ✅ | — | High/Low/PrevClose |
| M08 | Drag-to-reorder favorites | P0 | ❌ | gap | dnd-kit |
| M09 | Watchlists (named groups) | P0 | ❌ | gap | |
| M10 | Global search NSE+BSE fuzzy | P0 | ❌ | gap | |
| M11 | ⌘K keyboard search | P1 | ❌ | later | |
| M12 | Indices quick view | P0 | 🟡 | minor | In symbol grid; want dedicated section |
| M13 | Market movers (gainers/losers/active) | P0 | ✅ | — | Top movers row |
| M14 | FII/DII flows | P1 | ❌ | S2 | |
| M15 | Sector heatmap | P1 | 🟡 | S2 | Have chips, want heatmap viz |
| M16 | Option chain view | P1 | ❌ | S2 | NSE public API |
| M17 | Price alerts | P1 | ❌ | later | |
| M18 | Technical indicators (RSI/MACD/SMA/EMA) | P2 | ❌ | later | |
| M19 | Compare mode (overlay 2-4) | P2 | ❌ | later | |
| M20 | News + corporate actions inline | P2 | ❌ | S2 | |

## 4. Telegram Integration

| ID | Feature | Spec-P | Status | Stage | Notes |
|---|---|---|---|---|---|
| T01 | Phone+OTP via Telethon server-side | P0 | ✅ | S1 | Single-user; multi-user in S1 (1.5) |
| T02 | 2FA password handling | P0 | 🟡 | S1 | In auth script, not user-facing wizard |
| T03 | Channel/group list + checkboxes | P0 | ✅ | — | |
| T04 | Filter (channels/groups/recent) | P0 | ❌ | gap | UI filter |
| T05 | Per-channel tag (Eval/Live/Paused) | P0 | 🟡 | S4 | Eval done; Live/Paused need broker |
| T06 | Manual resync button | P0 | ❌ | S1 | |
| T07 | Encrypted session storage (KMS) | P0 | ❌ | S1 | Currently plain file |
| T08 | Rate-limit handling | P0 | 🟡 | S1 | Default Telethon backoff |
| T09 | Disconnect + revocation | P0 | ❌ | S1 | |
| T10 | Session expiry detection + push | P0 | ❌ | S1 | |
| T11 | Latest 3 messages preview | P1 | ✅ | — | Channel detail page |
| T12 | Per-channel parse-rate badge | P1 | ❌ | S1 | Stage 1 item 1.3 |

## 5. Signal Ingestion & Parsing

| ID | Feature | Spec-P | Status | Stage | Notes |
|---|---|---|---|---|---|
| S01 | Multi-channel concurrent listener per user | P0 | 🟡 | S1 | Single-user only today |
| S02 | LLM parsing gpt-4o-mini | P0 | ❌ | S1 | Stage 1 item 1.1; heuristic fallback |
| S03 | Multi-message collation (5-min window) | P0 | ❌ | S1 | |
| S04 | Structure + range validation | P0 | 🟡 | S1 | Basic in heuristic |
| S05 | 5-min dedup hash | P0 | ❌ | S1 | |
| S06 | Confidence score | P1 | 🟡 | S1 | Computed, not surfaced |
| S07 | Manual override before execute | P1 | ❌ | S4 | Pre-execution only |
| S08 | Parse failure surfacing | P1 | ❌ | S1 | |
| S09 | Self-hosted LLM fallback | P2 | ❌ | later | |
| S10 | Signal timeline UI | P0 | ✅ | — | Channel detail page |

## 6. Channel Evaluation / Paper Trading

| ID | Feature | Spec-P | Status | Stage | Notes |
|---|---|---|---|---|---|
| E01 | Per-channel Practice ₹ wallet | P0 | ✅ | — | |
| E02 | Tick-accurate fill at next LTP + slippage | P0 | 🟡 | S1 | Bar open, no slippage model |
| E03 | Realistic costs (STT/GST/brokerage/SEBI/stamp) | P0 | ❌ | S1 | Stage 1 item 1.2 |
| E04 | Simulated partial fills | P1 | ❌ | later | |
| E05 | Full exit logic (target/SL/trailing/EOD) | P0 | 🟡 | S1 | No trailing yet |
| E06 | Simulated rejections (lots/margin/cutoff) | P0 | ❌ | S1 | |
| E07 | Channel scorecard 14+ metrics | P0 | 🟡 | S1 | ~10 metrics today |
| E08 | Channel detail + equity curve | P0 | ✅ | — | |
| E09 | Trade list with filters | P0 | 🟡 | S1 | Need filter UI |
| E10 | Side-by-side compare (up to 4 channels) | P0 | ❌ | S1 | |
| E11 | Graduate-to-Live + consent modal | P0 | ❌ | S4 | |
| E12 | Graduation criteria (win%, sharpe, sample) | P0 | ❌ | S4 | |
| E13 | Force-add override w/ warning | P0 | ❌ | S4 | |
| E14 | Auto-demote on breach | P1 | ❌ | S4 | |
| E15 | Public anonymized leaderboard opt-in | P1 | ❌ | later | Powers A01 |
| E16 | Trade replay timeline viz | P1 | 🟡 | later | Trade Slips MVP covers per-signal execution timeline; full replay remains later |
| E17 | Historical backtest | P2 | ❌ | later | |

## 7. Live Trading

> Entire section requires broker integration. All Stage 4.

| ID | Feature | Spec-P | Status | Stage | Notes |
|---|---|---|---|---|---|
| L01 | Pre-trade risk engine, 14 rails | P0 | ❌ | S4 | |
| L02 | Daily budget + per-channel split | P0 | 🟡 | S4 | Per-channel ok, no daily reset |
| L03 | Modes: observe/manual/semi-auto/full-auto | P0 | ❌ | S4 | |
| L04 | Progression gating | P0 | ❌ | S4 | |
| L05 | Broker adapter pattern | P0 | ❌ | S4 | Kite first |
| L06 | Kite daily reauth flow | P0 | ❌ | S4 | |
| L07 | Order state machine 9 states | P0 | ❌ | S4 | |
| L08 | WebSocket price feed for live | P0 | ❌ | S4 | |
| L09 | Order reconciliation on startup | P0 | ❌ | S4 | |
| L10 | Trailing SL configurable | P0 | ❌ | S4 | |
| L11 | 50% partial exit at first target | P0 | ❌ | S4 | |
| L12 | Break-even SL at 70% progress | P0 | ❌ | S4 | |
| L13 | EOD auto-exit at configurable time | P0 | ❌ | S4 | |
| L14 | One-tap manual exit | P0 | ❌ | S4 | |
| L15 | Panic button (global, persistent) | P0 | ❌ | S4 | UI placeholder exists |
| L16 | Per-channel capital cap | P0 | ❌ | S4 | |
| L17 | Consecutive-loss circuit breaker | P0 | ❌ | S4 | |
| L18 | IV/gap/circuit-breaker auto-pause | P1 | ❌ | S4 | |
| L19 | Order modification (adjust SL) | P1 | ❌ | S4 | |
| L20 | Multi-broker simultaneous | P2 | ❌ | later | |
| L21 | Custom strategy DSL | P2 | ❌ | later | Rohan persona |
| L22 | Basket / multi-leg orders | P2 | ❌ | later | |

## 8. Portfolio

| ID | Feature | Spec-P | Status | Stage | Notes |
|---|---|---|---|---|---|
| P01 | Live open positions | P0 | 🟡 | S4 | Paper-only today |
| P02 | Today realized + unrealized P&L | P0 | 🟡 | — | Paper-only today |
| P03 | Closed-trades history filter/search/export | P0 | 🟡 | S1 | List exists, need filter/search/export |
| P04 | Per-channel P&L attribution | P0 | ✅ | — | Scorecard pages |
| P05 | Per-index P&L | P0 | ❌ | S1 | Trivial — group by symbol kind |
| P06 | Per-time-of-day attribution | P1 | ❌ | S2 | |
| P07 | Win/loss calendar heatmap | P1 | ❌ | later | |
| P08 | Paper-vs-live comparison | P1 | ❌ | S4 | |

## 9. Analytics & Reports

| ID | Feature | Spec-P | Status | Stage | Notes |
|---|---|---|---|---|---|
| R01 | Daily email summary 15:45 IST | P0 | ❌ | S1 | Stage 1 item 1.7 |
| R02 | Weekly deep-dive email | P1 | ❌ | S2 | |
| R03 | Monthly PDF report | P0 | ❌ | S2 | Puppeteer / HTML→PDF |
| R04 | Tax-ready CSV (Clear/Quicko) | P1 | ❌ | S4 | |
| R05 | Discipline metrics (rail overrides, panics) | P1 | ❌ | S4 | |
| R06 | Annual ITR helper (F&O business income) | P2 | ❌ | later | |
| R07 | Drawdown viz peak-to-trough | P1 | 🟡 | later | Number only today |

## 10. Notifications

| ID | Feature | Spec-P | Status | Stage | Notes |
|---|---|---|---|---|---|
| N01 | Web push (service worker) | P0 | ❌ | S1 | |
| N02 | In-app notification center | P0 | ❌ | S1 | |
| N03 | Email per category | P0 | ❌ | S1 | |
| N04 | SMS fallback for critical | P1 | ❌ | later | |
| N05 | WhatsApp (premium) | P2 | ❌ | later | |
| N06 | Per-channel notification toggle | P0 | ❌ | S1 | |
| N07 | Quiet hours | P1 | ❌ | later | |
| N08 | Priority levels (critical/trade/info) | P0 | ❌ | S1 | |

## 11. Settings

| ID | Feature | Spec-P | Status | Stage | Notes |
|---|---|---|---|---|---|
| SE01 | Profile (name/phone/email/KYC) | P0 | ❌ | S1 | |
| SE02 | Linked brokers | P0 | ❌ | S4 | |
| SE03 | Linked Telegram | P0 | 🟡 | S1 | Read-only on Connections today |
| SE04 | Risk rails editor (password re-auth) | P0 | ❌ | S4 | |
| SE05 | Notification preferences | P0 | ❌ | S1 | |
| SE06 | Theme light/dark/auto | P0 | 🟡 | gap | Dark only today |
| SE07 | Language English/Hindi | P1 | ❌ | later | |
| SE08 | 2FA setup + backup codes | P0 | ❌ | gap | Tied to A09 decision |
| SE09 | Active sessions + logout-all | P0 | ❌ | S1 | |
| SE10 | Data export (DPDP) | P0 | ❌ | S1 | Legal must |
| SE11 | Account deletion 30-day cooldown | P0 | ❌ | S1 | Legal must |
| SE12 | Referral dashboard | P1 | ❌ | later | |

## 12. Billing

| ID | Feature | Spec-P | Status | Stage | Notes |
|---|---|---|---|---|---|
| B01 | Razorpay subscription integration | P0 | ❌ | S1 | Could defer to S2 with manual invoices for first 10 |
| B02 | UPI autopay mandate | P0 | ❌ | S1 | |
| B03 | Cards + netbanking | P0 | ❌ | S1 | |
| B04 | Prorated upgrades | P0 | ❌ | S1 | |
| B05 | 14-day Trader trial | P0 | ❌ | S1 | |
| B06 | Coupons + referral credits | P1 | ❌ | later | |
| B07 | GST-compliant invoices | P0 | ❌ | S1 | |
| B08 | Annual plans (2 months free) | P0 | ❌ | S1 | |
| B09 | Failed-payment dunning + grace | P0 | ❌ | S1 | |
| B10 | Offline invoice PDFs | P0 | ❌ | S1 | |

## 13. Admin Backend

| ID | Feature | Spec-P | Status | Stage | Notes |
|---|---|---|---|---|---|
| AD01 | User search + activity timeline | P0 | ❌ | S1 | |
| AD02 | Real-time ops dashboard (signals/orders/queue) | P0 | ❌ | S1 | |
| AD03 | Broker integration health | P0 | ❌ | S4 | |
| AD04 | Telegram ingestion health per user | P0 | ❌ | S1 | |
| AD05 | Billing dashboard (MRR/churn/LTV) | P0 | ❌ | S1 | |
| AD06 | Support ticket inbox | P0 | ❌ | S2 | |
| AD07 | Compliance audit log browser | P0 | ❌ | S3 | Reads from Trust Layer audit |
| AD08 | Platform-wide kill switch | P0 | ❌ | S1 | |
| AD09 | Feature flags per user/cohort | P1 | ❌ | later | |
| AD10 | Cohort A/B testing | P2 | ❌ | later | |
| AD11 | Anomaly detection alerts | P1 | ❌ | later | |

## 14. Cross-cutting

| ID | Feature | Spec-P | Status | Stage | Notes |
|---|---|---|---|---|---|
| X01 | Dark + light parity | P0 | 🟡 | gap | Dark only today |
| X02 | Keyboard navigation | P0 | ❌ | gap | |
| X03 | WCAG 2.1 AA | P0 | ❌ | gap | A11y audit |
| X04 | Responsive desktop/tablet/mobile | P0 | 🟡 | S1 | Desktop ok, mobile rough |
| X05 | PWA installable | P0 | ❌ | S4 | |
| X06 | Offline banner + last-synced | P1 | ❌ | later | |
| X07 | Status page (status.tradex.com) | P0 | ❌ | S1 | |
| X08 | Sentry + session replay | P0 | ❌ | S1 | |
| X09 | Feature flags | P1 | ❌ | later | |
| X10 | Structured logging + tracing | P0 | ❌ | S1 | |

---

## 15. Intelligence Layer (our additions)

> Not in the original spec. The "context engine" that lifts tradeX from signal aggregator to decision-support.

| ID | Feature | Status | Stage | Notes |
|---|---|---|---|---|
| IL01 | Earnings calendar (NSE corp announcements RSS) | ❌ | S2 | Foundation event source |
| IL02 | News ingestion + LLM tagging (NewsAPI + Moneycontrol) | ❌ | S2 | |
| IL03 | Macro feeds (FRED / RBI / oil / INR / FII-DII) | ❌ | S2 | |
| IL04 | Stock-detail Intelligence tab | ❌ | S2 | Inside Featured Symbol card |
| IL05 | Daily Morning Brief (08:30 IST email + in-app) | ❌ | S2 | |
| IL06 | Channel × Regime × Outcome breakdown | ❌ | S2 | The novel piece |
| IL07 | Pre-Trade Context card (Decision Mesh output) | ❌ | S3 | |
| IL08 | Correlation matrix surface | ❌ | S3 | |
| IL09 | Ask tradeX conversational sidebar | ❌ | S4 | LLM with tool use |

## 16. Frameworks / IP

> The three named, versioned frameworks that become defensible IP.

| ID | Framework | Sub-component | Status | Stage |
|---|---|---|---|---|
| F01 | **Trust Layer** | Typed LLM wrapper (schema-constrained, citation-required, confidence floor) | ❌ | S3 |
| F01 | Trust Layer | Recommendation linter (regex + LLM critic) | ❌ | S3 |
| F01 | Trust Layer | `decision_id` audit trail | ❌ | S3 |
| F01 | Trust Layer | Two-pass verification on high-stakes outputs | ❌ | S3 |
| F02 | **Decision Mesh** | Policy interface + registry + composer | ❌ | S3 |
| F02 | Decision Mesh | 12 initial policies (earnings/news/sector/macro/technical/options/liquidity/regime/freshness/source/correlation/event-blackout) | ❌ | S3 |
| F02 | Decision Mesh | Verdict object (PROCEED/SKIP/REDUCE_SIZE + reasons) | ❌ | S3 |
| F03 | **Outcome Loop** | `LearningEntry` schema + write path | ❌ | S3 |
| F03 | Outcome Loop | Daily batch hit-rate computation | ❌ | S3 |
| F03 | Outcome Loop | Auto weight updates (logistic regression / contextual bandit) | ❌ | S3 |
| F03 | Outcome Loop | Per-channel × regime priors with recency decay | ❌ | S3 |

---

## 16.5. QA Module

> Standalone verification harness at [`demo/qa/`](demo/qa/). One phase file per MVP block. Runs static (file/schema/env) + functional (HTTP) + DB-integrity + security checks against a live server. Outputs Markdown to `demo/qa/reports/<phase>.md`.

| Phase | File | Coverage | Latest run |
|---|---|---|---|
| **m0.1** — auth + register | [phases/m0_1.ts](demo/qa/phases/m0_1.ts) | 38 checks: schema, env, HTTP routing, validation, happy path, DB integrity, security | **37/38 ✅** (SESSION_SECRET tripwire intentional) |
| **m0.2** — onboarding wizard | [phases/m0_2.ts](demo/qa/phases/m0_2.ts) | 24 checks: schema, services, OTP routes, step transitions, gate, DB | **24/24 ✅** |
| **m0.3** — multi-tenancy | [phases/m0_3.ts](demo/qa/phases/m0_3.ts) | 23 checks: schema cascade · all-routes scoped · two-user isolation · per-user service status · empty-state CTA · cascade delete | **23/23 ✅** |
| **m0.5** — costs + Portfolio | [phases/m0_5.ts](demo/qa/phases/m0_5.ts) | 16 checks: schema fields · cost calculator · simulator wired · portfolio API w/ LTP · Paper/Live tabs · isolation · DB integrity | **16/16 ✅** |
| **m0.6** — VM deployment | [phases/m0_6.ts](demo/qa/phases/m0_6.ts) | 12 checks: HTTPS + cert · HTTP→HTTPS redirect · auth APIs · session-gated APIs · end-to-end signup against prod | **12/12 ✅** |
| m0.7 | not yet written | — | — |

### How to run

```bash
cd demo/qa
npm install                # one-time
npm run qa:m0.1            # or qa:m0.2, qa:m0.3, etc.
```

The web app must be running on `localhost:3000` (or set `QA_BASE_URL`). Reports are committed for history; latest is always the source of truth.

### Conventions

- **One phase file per MVP block.** When M0.3 ships, write `phases/m0_3.ts` alongside it.
- **Each check should be independent** — fixture/cleanup baked into the phase, no shared state across runs.
- **Test users tagged** with `qa<timestamp>` in their email so cleanup deletes only this run's data.
- **Tripwires allowed**: e.g. SESSION_SECRET still demo-... is an intentional fail until rotated in M0.6.

---

## 17. Summary

| Metric | Count |
|---|---|
| Total spec features (8.1–8.14) | 173 |
| ✅ Built today | 13 |
| 🟡 Partial today | 19 |
| Effectively done (✅+🟡) | 32 (~18%) |
| ❌ Missing | 141 |
| Spec features placed in S1–S4 | ~85 |
| Spec features marked "later" | ~30 |
| **P0 spec items still flagged `gap`** | **~13** |
| Our IP additions (Intelligence + Frameworks) | 21 sub-items |

### Stage size estimates (with all gaps absorbed)

| Stage | Days | Calendar |
|---|---|---|
| S1 (production-ready paid v1) | ~30 | ~6 weeks |
| S2 (Intelligence) | ~14 | ~3 weeks |
| S3 (Frameworks / IP) | ~13 | ~3 weeks |
| S4 (Live broker + Conversational) | ~28 | ~5–6 weeks |
| **Total** | ~85 | ~4–5 months solo |

---

## 18. Open Decisions

> **All decisions below are deferred to S1 planning.** They do not affect MVP. Re-evaluate after Stage 0 ships and we have real beta-user feedback.

| # | Decision | Default recommendation | Decide before |
|---|---|---|---|
| 1 | S1 effort: 6 weeks with all gaps, or 4 weeks with some P0 gaps deferred to S1.5? | 6 weeks, private beta first → fix gaps → public launch | S1 kickoff |
| 2 | Marketing pages A01-A04: build now or only when going public? | Build A02-A04 in S1 (static), defer A01 leaderboard to S2 | S1 kickoff |
| 3 | Billing (B01-B10): full Razorpay in S1 or manual invoices for first 10 + Razorpay in S2? | Manual for first 10, Razorpay in S2 — saves ~4 days | S1 kickoff |
| 4 | Trust Layer F01: move basics (citation + audit) to S1 since every LLM call needs them? | Yes, move basics to S1 — full version stays S3 | S1 kickoff |
| 5 | 2FA (A09 / SE08): S1 or S4? | S1 alongside auth, prevents future migration | S1 kickoff |

---

## 19. Deferred / Not Building

Features explicitly cut or deferred indefinitely. Move rows here from the tables above when cut.

*(empty — no cuts yet)*

---

## 20. Update log

| Date | Change | Who |
|---|---|---|
| 2026-04-25 | Initial roadmap document created from spec §8 + agreed stages | tradeX team |
| 2026-04-25 | Added **Stage 0 = MVP** as the current focus (~1.5 weeks, 7 deliverables M0.1-M0.7). All Open Decisions deferred to S1 planning. | tradeX team |
| 2026-04-26 | **M0.1 ✅ done** — email/password auth + register form (full name, email, phone, PAN, address) + 10-user beta cap + JSON `/api/auth/*` endpoints. QA: 37/38 (SESSION_SECRET tripwire fires until M0.6). | tradeX team |
| 2026-04-26 | **QA module** added at `demo/qa/` — phase-by-phase verification harness (static + HTTP + DB + security). M0.1 phase: 37/38 passing. Documented in §16.5. | tradeX team |
| 2026-04-26 | **M0.2 ✅ done** — onboarding wizard (capabilities, Telegram OTP) · multi-user `auth.py` CLI · JSON `/api/onboarding/telegram/*` endpoints · state-machine gate in (app) layout. Quiz layer later removed before public testing because it did not yet drive budgets or rails. | tradeX team |
| 2026-04-26 | MVP effort revised: 7.5d → 9d (added Portfolio page + cost model into M0.5). Calendar still ~2 weeks. | tradeX team |
| 2026-04-26 | **M0.3 + M0.4 ✅ done together** — full multi-tenancy. Schema migrated (userId on 7 models, cascade), all queries scoped (10 files), per-user `UserServiceStatus`, per-user Telethon clients in worker, empty-state "Connect your channels" CTA on dashboard. **QA: 23/23 passing.** Two real users now isolated end-to-end. | tradeX team |
| 2026-04-26 | **M0.5 ✅ done** — realistic Indian transaction costs (Zerodha-equivalent: brokerage ₹20/order, STT, exchange, SEBI, stamp, GST 18%) computed in worker; Portfolio page (Zerodha-style, Paper/Live tabs, live LTP, cost breakdown). **QA: 16/16 passing.** | tradeX team |
| 2026-04-26 | **M0.6 ✅ done** — deployed to VM at **https://103-240-24-3.nip.io** (Let's Encrypt cert via nip.io magic DNS, Caddy reverse proxy, systemd web + worker, ufw + fail2ban, daily SQLite backup cron, rotated SESSION_SECRET + PII_ENCRYPTION_KEY for prod). **QA: 12/12 passing.** Closed-beta beta now live for external users. | tradeX team |
| 2026-05-04 | **M0.9 ✅ done** — dashboard reshaped into a guided cockpit with mission status, next-best-action CTA, daily practice summary, slim workspace links, channel health, and Trading Floor-oriented activity links. | tradeX team |
