# tradeX — Product Specification

> Version 0.1 · Living document · Owner: Founding team
> **Build status & stage allocation for every feature below: see [ROADMAP.md](ROADMAP.md).**

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Brand & Identity](#2-brand--identity)
3. [Product Vision & Positioning](#3-product-vision--positioning)
4. [Target Users & Personas](#4-target-users--personas)
5. [Competitive Landscape](#5-competitive-landscape)
6. [Information Architecture](#6-information-architecture)
7. [Core User Journeys](#7-core-user-journeys)
8. [Feature Catalog](#8-feature-catalog)
9. [Design System](#9-design-system)
10. [Content & Copy Guidelines](#10-content--copy-guidelines)
11. [Technical Architecture](#11-technical-architecture)
12. [Monorepo Structure](#12-monorepo-structure)
13. [Data Model](#13-data-model)
14. [API Surface](#14-api-surface)
15. [Integrations Matrix](#15-integrations-matrix)
16. [Infrastructure & DevOps](#16-infrastructure--devops)
17. [Security & Compliance](#17-security--compliance)
18. [Observability & SLOs](#18-observability--slos)
19. [Performance Budgets](#19-performance-budgets)
20. [Testing Strategy](#20-testing-strategy)
21. [Accessibility](#21-accessibility)
22. [Internationalization](#22-internationalization)
23. [Error, Empty & Edge States](#23-error-empty--edge-states)
24. [Notification & Email Strategy](#24-notification--email-strategy)
25. [Customer Support Model](#25-customer-support-model)
26. [Analytics & KPIs](#26-analytics--kpis)
27. [Growth Loops & Referrals](#27-growth-loops--referrals)
28. [Beta Program Design](#28-beta-program-design)
29. [Launch Checklist](#29-launch-checklist)
30. [Roadmap & Milestones](#30-roadmap--milestones)
31. [Risk Register](#31-risk-register)
32. [Legal & Compliance Checklist](#32-legal--compliance-checklist)
33. [Glossary](#33-glossary)
34. [Open Decisions](#34-open-decisions)

---

## 1. Executive Summary

**tradeX** is a web-based SaaS platform that helps Indian retail F&O traders follow Telegram-based trading signal channels with discipline. Users link their Telegram account, select channels, and the platform ingests every alert, parses it with AI, evaluates it through a paper-trading sandbox, and (once a channel is proven) executes real trades through the user's own broker account with built-in risk controls.

**Core thesis.** We are a *trading copilot*, not a tipster or advisor. Every signal traces to its origin. Every auto-execution is user-consented per channel with hard risk rails. Users stay in control; the platform removes friction and introduces discipline.

**Primary market.** Indian retail F&O traders aged 25-40 who subscribe to 2-5 paid Telegram channels, have ₹2-10L trading capital, and trade on mobile/desktop between their primary activities.

**Revenue model.** Subscription SaaS — Free, Trader (₹499/mo), Algo (₹1499/mo), annual plans with 2 months free, plus broker-referral commissions.

**Differentiator.** Honest, transparent channel scorecards that tell users which paid subscriptions are actually making them money — an analytics layer nobody in India provides today.

---

## 2. Brand & Identity

### 2.1 Name

**tradeX** — lowercase "trade" + uppercase **X** as the logomark. The X is solid orange. Read as "trade-ex."

### 2.2 Brand attributes

| Attribute | Expression |
|---|---|
| Confident | Direct, short sentences. No hedging. |
| Transparent | Every metric traceable. No black-box claims. |
| Disciplined | UI nudges toward safety, away from impulse. |
| Modern | Clean typography, generous whitespace, subtle motion. |
| Indian-native | Rupee symbol everywhere. Hindi-ready. Understands T+1 settlement, STT, GST, daily Kite token expiry. |

### 2.3 Color system

Primary orange is the only accent. Everything else is neutral. High contrast, WCAG AA minimum.

```
Brand
  --tradex-orange-50:   #FFF4EC
  --tradex-orange-100:  #FFE3CC
  --tradex-orange-300:  #FFB27A
  --tradex-orange-500:  #FF6B2C   ← primary, the "X"
  --tradex-orange-600:  #EA580C
  --tradex-orange-700:  #C2410C
  --tradex-orange-900:  #7C2D12

Neutrals (dark mode primary)
  --neutral-0:   #FFFFFF
  --neutral-50:  #FAFAFA
  --neutral-100: #F4F4F5
  --neutral-200: #E4E4E7
  --neutral-400: #A1A1AA
  --neutral-500: #71717A
  --neutral-700: #3F3F46
  --neutral-800: #27272A
  --neutral-900: #18181B
  --neutral-950: #09090B

Semantic
  --success:  #10B981   (profit, target-hit)
  --danger:   #EF4444   (loss, SL-hit, panic)
  --warning:  #F59E0B   (rails warning)
  --info:     #3B82F6   (informational)
```

**Orange usage rule.** Orange only for primary actions, the X logomark, and the brand bar. Never for chrome, never for body text. Keeps the brand loud without being loud.

### 2.4 Typography

| Use | Family | Fallback |
|---|---|---|
| UI | **Inter** (variable) | system-ui, -apple-system, sans-serif |
| Display / hero | **Geist** or **General Sans** | Inter |
| Monospace (prices, IDs) | **JetBrains Mono** | ui-monospace, Menlo |
| Hindi | **Hind** (Google Fonts) | Noto Sans Devanagari |

Type scale (rem):
```
xs    0.75   / 12px
sm    0.875  / 14px
base  1      / 16px
lg    1.125  / 18px
xl    1.25   / 20px
2xl   1.5    / 24px
3xl   1.875  / 30px
4xl   2.25   / 36px
5xl   3      / 48px
```

### 2.5 Logo

The word "trade" in neutral-950 (dark) or neutral-0 (light) + the "X" in orange-500. No icon mark separately — the **X** is the mark.

Safe area: 1×-height of the glyph on all sides. Min width: 80px horizontal. Never rotate, never gradient, never drop shadow.

### 2.6 Voice & tone

- **Use:** "Place trade", "Review signal", "You skipped 3 signals this week"
- **Don't use:** "Guaranteed returns", "Sure-shot", "Easy money", "Trust me", "Pro trader" (regulatory + brand)
- **Button labels:** Verb-first. "Place order", not "Order".
- **Error messages:** Plain. "Order rejected — your margin is ₹12,000 short." Not "Insufficient funds error."

---

## 3. Product Vision & Positioning

### 3.1 Vision

By 2028, tradeX is the default layer between Indian retail traders and their Telegram signal sources — the way Grammarly sits between users and writing.

### 3.2 Mission

Help retail traders in India preserve capital and grow wealth by giving them tools that turn noisy tipster chatter into measurable, disciplined execution.

### 3.3 Positioning statement

> For Indian retail F&O traders who subscribe to paid Telegram signal channels, tradeX is the web-based copilot that evaluates which channels actually make money for you, and executes the profitable ones through your own broker account with built-in risk rails — unlike copy-trading services or tipster subscriptions, we never give advice and never hold your funds.

### 3.4 Non-goals (what tradeX is not)

- Not a tipster. We do not originate trading ideas.
- Not a robo-advisor. We do not recommend instruments, timings, or strategies.
- Not a broker. We do not hold, clear, or settle trades.
- Not a copy-trading service. We do not mirror one master account to others.
- Not a social platform. We are not building tipster influence or follower counts.

---

## 4. Target Users & Personas

### 4.1 Primary persona: "Aspiring Aman"

- **Age** 28, IT services engineer in Bangalore
- **Capital** ₹3L, of which ₹1.5L is active for F&O
- **Time** 30 min/day actively, phone glances throughout
- **Tools today** Kite mobile, 3 paid Telegram channels (₹4k-8k/mo each)
- **Pain** Misses entries when in meetings. Places trades emotionally after a loss. Can't tell if his ₹18k/mo in channel subscriptions is net-positive.
- **JTBD** "Help me follow these signals without losing my day job or my savings."

### 4.2 Secondary persona: "Careful Careers" (Priya)

- **Age** 35, self-employed CA in Pune
- **Capital** ₹15L, of which ₹5L is F&O
- **Time** 2 hours focused + market-watch on desktop
- **Tools today** Kite web, Sensibull, two Telegram groups (free + one paid)
- **Pain** Wants data on which channel works, has tried Excel tracking and given up
- **JTBD** "Prove to me which channel is worth subscribing to, with real numbers."

### 4.3 Tertiary persona: "Algo Curious" (Rohan)

- **Age** 32, startup product manager
- **Capital** ₹8L, ₹3L F&O
- **Time** Evenings and weekends for tooling
- **Tools today** Tradetron, self-coded Python scripts, Streak
- **Pain** Wants programmable rules layered on signals, not just manual execution
- **JTBD** "Give me rules-based automation over signals I already follow."

v1 optimizes for Aman. v1.5 adds Priya (via deeper analytics). v2 adds Rohan (via custom rules).

---

## 5. Competitive Landscape

| Competitor | Category | Overlap with tradeX | Our differentiation |
|---|---|---|---|
| **Streak** (by Zerodha) | No-code strategy builder | Indirect | We source signals from humans (Telegram), they're purely algorithmic |
| **Sensibull** | Options analytics + trading | Adjacent | They help plan; we help execute existing signals |
| **Tradetron** | Strategy marketplace | Partial | They sell strategies; we evaluate existing channel subscriptions |
| **Smallcase** | Curated portfolios | None | Different asset class (equity baskets), different user |
| **Algotest / Trademonster** | Backtesting + strategy execution | Partial | Same — backtesting-first, we are execution-first |
| **Fyers One** | Broker + signals | Partial | Broker-locked; we're broker-agnostic |
| **Grey-market "copy-trading"** services | Illegal | Direct but illegal | Legally-defensible positioning, transparent rails |

**Moat sources, in order:**
1. Channel scorecards dataset (6+ months compounding → uncatchable)
2. Onboarding UX polish
3. Multi-broker execution infrastructure
4. Brand trust in a regulatory-sensitive space

---

## 6. Information Architecture

### 6.1 Sitemap

```
(public)
 ├─ /                          Landing
 ├─ /pricing
 ├─ /how-it-works
 ├─ /leaderboard               Anonymized channel leaderboard (teaser)
 ├─ /blog
 ├─ /legal/tos
 ├─ /legal/privacy
 ├─ /legal/risk-disclaimer
 ├─ /legal/refund
 ├─ /login
 ├─ /signup

(authenticated app, all under /app)
 ├─ /app                       Home = Market Workspace
 │  └─ [Three-pane workspace]
 ├─ /app/signals               Unified signal feed
 │  ├─ /evaluation             Paper-trading filter
 │  └─ /live                   Live-trading filter
 ├─ /app/channels              Channel management
 │  ├─ /[channelId]            Channel detail + scorecard
 │  └─ /[channelId]/trades     Trade history per channel
 ├─ /app/portfolio             Positions + P&L
 │  ├─ /open
 │  ├─ /closed
 │  └─ /history
 ├─ /app/analytics
 │  ├─ /performance
 │  ├─ /discipline
 │  └─ /tax
 ├─ /app/connections
 │  ├─ /broker                 Kite, Upstox, Dhan…
 │  └─ /telegram
 ├─ /app/settings
 │  ├─ /profile
 │  ├─ /risk-rails
 │  ├─ /notifications
 │  ├─ /security
 │  ├─ /billing
 │  └─ /data-privacy
 ├─ /app/help
 └─ /app/admin                 (role-gated)
```

### 6.2 Primary navigation

Left rail, collapsible:
- **Market** (home)
- **Signals** (with sub-tabs Evaluation / Live)
- **Channels**
- **Portfolio**
- **Analytics**
- **Connections**
- **Settings**

Top bar (sticky):
- Left: tradeX mark
- Center: global search (`⌘K`)
- Right: notifications, connection-health indicator, profile menu, **Panic button** (always visible, red, circular, pulse-on-active-trades)

### 6.3 Navigation priority in mobile web (PWA)

Bottom tab bar: Market · Signals · Portfolio · More (drawer with everything else). Top-right: Panic + profile.

---

## 7. Core User Journeys

### 7.1 First-time signup to first paper trade (target: 12 min)

```
Landing → Signup (phone OTP, 1 min)
       → Welcome + product tour skippable (30 s)
       → Risk profile quiz 8Q (2 min)
       → Accept ToS + risk disclaimer (1 min, must scroll)
       → Subscription selection (free default, 30 s)
       → Connect broker (Kite OAuth, 2 min)
       → Connect Telegram (phone OTP, 2 min)
       → Select channels to monitor (1-3 channels, 1 min)
       → Allocate Practice ₹ balance (default ₹5L) (20 s)
       → Land on Market Workspace with 30-s tooltip tour (1 min)

Trigger event: first signal arrives → "Tap to paper-trade" push
```

### 7.2 Daily-active user loop

```
Morning (pre-market)
  09:00 IST  Push: "Good morning — tap to authorize today's trading"
             ↓ biometric / password
             Kite daily token refreshed
  09:10 IST  Review overnight signals (if any) — skip or queue

Market hours (09:15-15:30)
  On each signal  Push notification with parsed signal card
                  Tap → review → one-tap execute OR skip
                  Semi-auto channels: auto-execute if rails pass, notify
                  Full-auto channels: execute, notify

Post-market (15:30+)
  15:30 IST  Auto-exit any open positions per rules
  15:45 IST  Daily summary push + email
             "Today: +₹4,200 (2 wins, 1 loss). Best channel: X."

Evening
  Browse channel scorecards
  Maybe upgrade or drop a channel
```

### 7.3 Channel graduation journey

```
Day 1    User adds channel → Evaluation mode, auto
Day 1-14 Paper trades accumulate on channel-isolated Practice ₹ wallet
Day 7    Progress card: "Win rate 62%, needs 30+ signals to graduate"
Day 14   Threshold met → banner "Channel X qualifies for Live"
         User reviews scorecard, taps "Graduate to Live"
         Explicit consent modal with capital cap + execution mode
         Channel moves to Live list
         First live trade is manual-only, auto disabled
After 10 manual successes  Semi-auto unlocks
After 25 semi-auto successes  Full-auto unlocks (with bio auth per day)
```

### 7.4 Panic scenario

```
User sees market-wide crash / wrong auto-trade / unknown activity
  → Tap Panic (always in top bar)
  → Confirm (biometric on mobile)
  → All auto-execution paused across all channels
  → Option: "Also exit all open positions at market price" (separate confirm)
  → Audit log event written with timestamp + reason (optional user note)
  → Notification to registered email + phone
  → Resume requires going to Settings → Risk Rails → Resume
```

### 7.5 Daily Kite re-authorization

```
08:45 IST  Push: "Tap to authorize trading for today"
           Deep link → app → biometric prompt → Kite OAuth redirect
           20-second flow
           On success: rails unlock for the day

If skipped by 09:15  Banner across app: "Trading disabled — authorize to enable"
                     No auto-execution until authorized
                     Manual execution still allowed (will prompt auth per order)
```

### 7.6 Lost-phone / account recovery

```
User flags lost phone via email link
  Email verification + KYC doc upload (PAN + selfie)
  48-hour cooldown (legal + anti-fraud)
  All sessions revoked immediately on flag
  Auto-execution paused immediately
  After cooldown + verification: user regains access on new device
  All trades during lockout are manual-only for 7 days as safety
```

---

## 8. Feature Catalog

Priority: **P0** = MVP (months 1-3) · **P1** = v1.5 (4-6) · **P2** = v2 (7-12) · **P3** = later.

### 8.1 Public & Auth

| ID | Feature | Priority |
|---|---|---|
| A01 | Landing with live anonymized channel leaderboard widget | P0 |
| A02 | Pricing page with tier comparison | P0 |
| A03 | How-it-works with animated walkthrough | P0 |
| A04 | Legal pages (ToS, privacy, risk, refund) | P0 |
| A05 | Public blog / changelog | P1 |
| A06 | Phone OTP signup (MSG91) | P0 |
| A07 | Email + password fallback | P0 |
| A08 | Google / Apple SSO | P1 |
| A09 | 2FA (TOTP + backup codes) | P0 |
| A10 | Biometric auth for mobile web (WebAuthn) | P1 |
| A11 | Session management (view / logout-all) | P0 |
| A12 | Account recovery (dual-verification, cooldown) | P0 |
| A13 | DPDP granular consent | P0 |
| A14 | Role-based access (user, admin, support) | P0 |

### 8.2 Onboarding Wizard

| ID | Step | Priority |
|---|---|---|
| O01 | Welcome splash + 20-s tour | P0 |
| O02 | Risk profile quiz (8 calibrated questions) | P0 |
| O03 | Legal acceptance with scroll-enforced checkboxes | P0 |
| O04 | Subscription tier selection | P0 |
| O05 | Broker connection (Kite OAuth) | P0 |
| O06 | Telegram connection (phone + OTP + optional 2FA) | P0 |
| O07 | Telegram channel selection | P0 |
| O08 | Practice ₹ balance allocation | P0 |
| O09 | Notification preferences | P0 |
| O10 | Onboarding completion with "what's next" card | P0 |
| O11 | Save-and-resume at every step | P0 |
| O12 | Progress indicator | P0 |

### 8.3 Market Workspace

| ID | Feature | Priority |
|---|---|---|
| M01 | Three-pane layout (left rail, center, right rail) | P0 |
| M02 | Favorites grid (4 cards/row desktop) | P0 |
| M03 | Favorite card: symbol, LTP, ₹Δ, %Δ, sparkline | P0 |
| M04 | Click card → expand to full chart overlay | P0 |
| M05 | Timeframes 1D/5D/1M/3M/1Y/YTD/All | P0 |
| M06 | Candle / line toggle + volume bars | P0 |
| M07 | Key metrics panel in expanded card | P0 |
| M08 | Drag-to-reorder favorites | P0 |
| M09 | Watchlists (named groups of favorites) | P0 |
| M10 | Global search with fuzzy match across NSE+BSE | P0 |
| M11 | `⌘K` keyboard-first search | P1 |
| M12 | Indices quick view (NIFTY, BANKNIFTY, FINNIFTY, etc.) | P0 |
| M13 | Market movers (top gainers/losers, most active) | P0 |
| M14 | FII/DII flows of the day | P1 |
| M15 | Sector heatmap | P1 |
| M16 | Option chain view for index options | P1 |
| M17 | Price alerts | P1 |
| M18 | Technical indicators (RSI, MACD, SMA/EMA) | P2 |
| M19 | Compare mode (overlay 2-4 symbols) | P2 |
| M20 | News + corporate actions inline | P2 |

### 8.4 Telegram Integration

| ID | Feature | Priority |
|---|---|---|
| T01 | Phone + OTP login via Telethon server-side | P0 |
| T02 | 2FA password handling | P0 |
| T03 | Channel/group list with checkboxes | P0 |
| T04 | Filter (channels only, groups only, recent activity) | P0 |
| T05 | Per-channel tag (Evaluation, Live, Paused) | P0 |
| T06 | Resync button | P0 |
| T07 | Encrypted session storage (AES-256, KMS) | P0 |
| T08 | Rate-limit handling per session | P0 |
| T09 | Disconnect flow + session revocation | P0 |
| T10 | Session expiry detection + push to re-auth | P0 |
| T11 | Channel message preview (latest 3 messages, read-only) | P1 |
| T12 | Per-channel parse-rate badge | P1 |

### 8.5 Signal Ingestion & Parsing

| ID | Feature | Priority |
|---|---|---|
| S01 | Multi-channel concurrent listener per user | P0 |
| S02 | LLM parsing via gpt-4o-mini | P0 |
| S03 | Multi-message collation (5-min window) | P0 |
| S04 | Structure + range validation | P0 |
| S05 | 5-min dedup hash window | P0 |
| S06 | Signal confidence score | P1 |
| S07 | Manual override of parsed data before execute | P1 |
| S08 | Parse failure surfacing ("we couldn't parse this") | P1 |
| S09 | Self-hosted LLM fallback | P2 |
| S10 | Signal timeline (card UI with original text) | P0 |

### 8.6 Channel Evaluation (Paper Trading)

| ID | Feature | Priority |
|---|---|---|
| E01 | Per-channel isolated Practice ₹ wallet | P0 |
| E02 | Tick-accurate simulated fill at next LTP + slippage | P0 |
| E03 | Realistic cost simulation (brokerage + STT + GST + SEBI + stamp) | P0 |
| E04 | Simulated partial fills on illiquid strikes | P1 |
| E05 | Full exit logic (target, SL, trailing, EOD) | P0 |
| E06 | Simulated rejections (lots cap, margin, cutoff) | P0 |
| E07 | Channel scorecard (14+ metrics) | P0 |
| E08 | Channel detail page with equity curve | P0 |
| E09 | Trade-by-trade list with filters | P0 |
| E10 | Side-by-side compare (up to 4 channels) | P0 |
| E11 | Graduate-to-Live button + consent modal | P0 |
| E12 | Graduation criteria (win%, sharpe, sample size) | P0 |
| E13 | Force-add override with warning | P0 |
| E14 | Auto-demote on criteria breach | P1 |
| E15 | Public anonymized leaderboard opt-in | P1 |
| E16 | Trade replay timeline viz | P1 |
| E17 | Historical backtest on accumulated data | P2 |

### 8.7 Live Trading

| ID | Feature | Priority |
|---|---|---|
| L01 | Pre-trade risk engine (14 rails, configurable) | P0 |
| L02 | Daily budget allocation + per-channel split | P0 |
| L03 | Execution modes (observe / manual / semi-auto / full-auto) | P0 |
| L04 | Progression gating (manual → semi → full) | P0 |
| L05 | Broker adapter pattern (Kite first) | P0 |
| L06 | Kite daily re-auth flow | P0 |
| L07 | Order state machine (9 states) | P0 |
| L08 | WebSocket price feed for live trades | P0 |
| L09 | Order reconciliation on startup | P0 |
| L10 | Trailing SL (configurable points) | P0 |
| L11 | 50% partial exit at first target | P0 |
| L12 | Break-even SL at 70% progress | P0 |
| L13 | EOD auto-exit at configurable time | P0 |
| L14 | One-tap manual exit | P0 |
| L15 | Panic button (global, persistent) | P0 |
| L16 | Per-channel capital cap | P0 |
| L17 | Consecutive-loss circuit breaker | P0 |
| L18 | IV / gap / circuit-breaker auto-pauses | P1 |
| L19 | Order modification (adjust SL) | P1 |
| L20 | Multi-broker simultaneous execution | P2 |
| L21 | Custom strategy rules (DSL) | P2 |
| L22 | Basket / multi-leg orders | P2 |

### 8.8 Portfolio

| ID | Feature | Priority |
|---|---|---|
| P01 | Live open-positions view | P0 |
| P02 | Today's realized + unrealized P&L | P0 |
| P03 | Closed-trades history (filter, search, export) | P0 |
| P04 | Per-channel P&L attribution | P0 |
| P05 | Per-index P&L | P0 |
| P06 | Per-time-of-day attribution | P1 |
| P07 | Win/loss calendar heatmap | P1 |
| P08 | Paper-vs-live comparison | P1 |

### 8.9 Analytics & Reports

| ID | Feature | Priority |
|---|---|---|
| R01 | Daily email summary 15:45 IST | P0 |
| R02 | Weekly deep-dive email | P1 |
| R03 | Monthly PDF report | P0 |
| R04 | Tax-ready CSV export (Clear/Quicko compatible) | P1 |
| R05 | Discipline metrics (rail overrides, panic uses) | P1 |
| R06 | Annual ITR helper (F&O business income) | P2 |
| R07 | Drawdown tracker with peak-to-trough viz | P1 |

### 8.10 Notifications

| ID | Feature | Priority |
|---|---|---|
| N01 | Web push (service worker) | P0 |
| N02 | In-app notification center with filters | P0 |
| N03 | Email notifications (toggle per category) | P0 |
| N04 | SMS fallback for critical | P1 |
| N05 | WhatsApp (optional, premium) | P2 |
| N06 | Per-channel notification toggle | P0 |
| N07 | Quiet hours | P1 |
| N08 | Priority levels (critical / trade / info) | P0 |

### 8.11 Settings

| ID | Feature | Priority |
|---|---|---|
| SE01 | Profile (name, phone, email, optional KYC) | P0 |
| SE02 | Linked brokers management | P0 |
| SE03 | Linked Telegram management | P0 |
| SE04 | Risk rails editor (with password re-auth) | P0 |
| SE05 | Notification preferences | P0 |
| SE06 | Theme (light/dark/auto) | P0 |
| SE07 | Language (English / Hindi) | P1 |
| SE08 | 2FA setup + backup codes | P0 |
| SE09 | Active sessions + logout-all | P0 |
| SE10 | Data export (DPDP) | P0 |
| SE11 | Account deletion (30-day cooldown) | P0 |
| SE12 | Referral dashboard | P1 |

### 8.12 Billing

| ID | Feature | Priority |
|---|---|---|
| B01 | Razorpay subscription integration | P0 |
| B02 | UPI autopay mandate | P0 |
| B03 | Cards + netbanking | P0 |
| B04 | Prorated upgrades | P0 |
| B05 | 14-day free trial of Trader tier | P0 |
| B06 | Coupons + referral credits | P1 |
| B07 | GST-compliant invoices | P0 |
| B08 | Annual plans (2 months free) | P0 |
| B09 | Failed-payment dunning + grace | P0 |
| B10 | Offline invoice PDFs | P0 |

### 8.13 Admin Backend

| ID | Feature | Priority |
|---|---|---|
| AD01 | User search + activity timeline | P0 |
| AD02 | Real-time ops dashboard (signals/min, orders/min, queue depths) | P0 |
| AD03 | Broker integration health per provider | P0 |
| AD04 | Telegram ingestion health per user | P0 |
| AD05 | Billing dashboard (MRR, churn, LTV) | P0 |
| AD06 | Support ticket inbox | P0 |
| AD07 | Compliance audit log browser | P0 |
| AD08 | Platform-wide kill switch | P0 |
| AD09 | Feature flags per user / cohort | P1 |
| AD10 | Cohort A/B testing | P2 |
| AD11 | Anomaly detection alerts | P1 |

### 8.14 Cross-cutting

| ID | Feature | Priority |
|---|---|---|
| X01 | Dark mode first, light mode parity | P0 |
| X02 | Keyboard navigation everywhere | P0 |
| X03 | WCAG 2.1 AA compliance | P0 |
| X04 | Responsive (desktop, tablet, mobile web) | P0 |
| X05 | PWA (installable on mobile home screen) | P0 |
| X06 | Offline banner + last-synced timestamp | P1 |
| X07 | System status page (status.tradex.com) | P0 |
| X08 | Error tracking (Sentry) + user session replay | P0 |
| X09 | Feature flags | P1 |
| X10 | Structured logging + distributed tracing | P0 |

---

## 9. Design System

### 9.1 Foundation

Built on **shadcn/ui** + **Radix primitives** + **Tailwind CSS**. Themed with tradeX tokens. Custom components extend the base.

### 9.2 Spacing scale (4px grid)

```
0   = 0
0.5 = 2px
1   = 4px
2   = 8px
3   = 12px
4   = 16px
5   = 20px
6   = 24px
8   = 32px
10  = 40px
12  = 48px
16  = 64px
20  = 80px
24  = 96px
```

### 9.3 Radius

```
none:  0
sm:    4px   (chips, small controls)
md:    8px   (inputs, buttons)
lg:    12px  (cards)
xl:    16px  (major panels)
full:  9999px (pills, avatars)
```

### 9.4 Elevation

```
0:  none                                                  flat surfaces
1:  0 1px 2px rgba(0,0,0,0.05)                            cards
2:  0 4px 6px -1px rgba(0,0,0,0.1)                        hover
3:  0 10px 15px -3px rgba(0,0,0,0.1)                      dropdowns, modals
4:  0 20px 25px -5px rgba(0,0,0,0.15)                     overlays
```

### 9.5 Motion

```
instant:     0ms       critical affordances
fast:        120ms     hover, focus
base:        200ms     most transitions
slow:        320ms     panels, drawers
slower:      480ms     page transitions

easing:
  standard:    cubic-bezier(0.4, 0, 0.2, 1)
  decelerate:  cubic-bezier(0, 0, 0.2, 1)
  accelerate:  cubic-bezier(0.4, 0, 1, 1)
```

Reduce motion honored via `prefers-reduced-motion`.

### 9.6 Core components (shadcn-based + custom)

Buttons · Input · Textarea · Select · Combobox · Dialog · Drawer · Popover · Tooltip · Tabs · Accordion · Toast · Badge · Card · Avatar · Skeleton · Chart (wraps Lightweight Charts) · DataTable · DatePicker · RangeSlider · Stepper · RadioGroup · CheckboxGroup · Switch · Breadcrumb · Pagination · EmptyState · ErrorState · LoadingState.

Custom:
- **SignalCard** — parsed signal with original message drawer
- **ChannelScorecard** — metrics grid + sparkline equity curve
- **RiskRailBadge** — shows which rail blocked
- **OrderTimeline** — vertical state machine viz
- **FavoriteCard** — expandable to chart overlay
- **PanicButton** — global, always-visible
- **ConnectionHealthDot** — broker/Telegram status
- **KpiTile** — metric with trend arrow
- **CurrencyInput** — ₹-prefixed with lakh/crore shortcuts

---

## 10. Content & Copy Guidelines

### 10.1 Tone rules

- Verb-first CTAs
- Second person ("you", not "the user")
- Numbers over adjectives ("+₹4,200" beats "great session")
- Respect user intelligence — no hand-holding fluff
- Assume stress at critical moments (exit flows, SL hits) — keep copy calm, short, specific

### 10.2 Mandatory phrases to use

- Risk disclaimer on every trade CTA: *"Trades involve risk. Your decision."*
- Before auto-execution consent: *"You are authorizing tradeX to place trades from this channel on your behalf up to your configured limits. You can revoke anytime."*
- Every channel detail page: *"Source: [channel name]. Signals originate from this Telegram channel. tradeX does not originate advice."*

### 10.3 Forbidden phrases

Regulatory and brand — never use:
- "Guaranteed", "risk-free", "sure-shot", "assured returns"
- "Best trade of the day", "must-buy"
- "Pro", "expert", "master" (implies advisory)
- "Copy this trade" (triggers copy-trading regulations)
- "Profit every day" or similar implied outcomes

### 10.4 Microcopy examples

| Context | Do | Don't |
|---|---|---|
| Empty portfolio | "No open positions. Signals will appear here when you trade." | "Oops! Nothing here yet 😊" |
| SL hit notification | "SL hit on NIFTY 25750 CE. Closed at ₹128. Loss: ₹3,400." | "Your position was stopped out." |
| Risk rail block | "Blocked: daily loss limit of ₹5,000 reached." | "Couldn't place your order." |
| Kite reauth prompt | "Authorize today's trading (20 seconds)" | "Please login again" |

---

## 11. Technical Architecture

### 11.1 High-level

```
 ┌──────────────────────────────────────────────────┐
 │  Browser (Next.js 15 App Router, React 19, TS)   │
 │  Tailwind + shadcn/ui + TanStack Query           │
 │  PWA, service worker, web push                   │
 └─────────────────────┬────────────────────────────┘
                       │ HTTPS (TLS 1.3)
 ┌─────────────────────▼────────────────────────────┐
 │  Cloudflare Edge (WAF, DDoS, CDN, Turnstile)     │
 └─────────────────────┬────────────────────────────┘
                       │
 ┌─────────────────────▼────────────────────────────┐
 │  API Gateway (Next.js Route Handlers + NestJS BFF)│
 └───┬─────────────┬──────────────┬─────────────────┘
     │             │              │
 ┌───▼───┐    ┌────▼─────┐   ┌────▼────────┐
 │ Auth  │    │  Users & │   │  Channels   │
 │ Service│   │  Billing │   │  Service    │
 └───┬───┘    └────┬─────┘   └────┬────────┘
     │             │              │
     └─────────────┴──────────────┴────────────┐
                                               │
 ┌───────────────────────────────────────────┐ │
 │  Python Workers (FastAPI + Celery + LLM)  │ │
 │  - Signal Ingestion (per-user Telethon)   │◄┘
 │  - Signal Parser (gpt-4o-mini)            │
 │  - Paper Trading Engine                   │
 │  - Broker Executors (Kite, Upstox, ...)   │
 │  - Risk Engine                            │
 │  - Report Generator                       │
 │  - Kite Token Refresh Scheduler           │
 └───┬──────────────┬───────────────┬────────┘
     │              │               │
 ┌───▼────┐   ┌─────▼─────┐   ┌─────▼──────────┐
 │Postgres│   │  Redis    │   │  ClickHouse    │
 │  +RLS  │   │  Streams  │   │  (signals,     │
 │        │   │  +Cache   │   │   trades,      │
 │        │   │           │   │   analytics)   │
 └────────┘   └───────────┘   └────────────────┘

 ┌───────────────────────────────────────────────┐
 │  Temporal.io                                  │
 │  - Order lifecycle workflows                  │
 │  - Paper-trade workflows                      │
 │  - Daily reauth orchestration                 │
 └───────────────────────────────────────────────┘

 ┌────────────────────────┐   ┌─────────────────┐
 │  Secrets: AWS KMS      │   │  S3 / R2        │
 │  (per-user session     │   │  (reports,      │
 │  keys, broker tokens)  │   │  exports)       │
 └────────────────────────┘   └─────────────────┘
```

### 11.2 Stack rationale

| Layer | Choice | Why |
|---|---|---|
| Frontend framework | **Next.js 15 (App Router)** + React 19 | SSR where it matters (landing, SEO), React Server Components reduce bundle, industry default |
| Language | **TypeScript strict mode** | Enterprise non-negotiable |
| Styling | **Tailwind + shadcn/ui** | Modern, copy-in-components, maximum ownership |
| State (server) | **TanStack Query v5** | Cache, revalidation, optimistic updates |
| State (client) | **Zustand** | Tiny, unopinionated, typed |
| Forms | **React Hook Form + Zod** | Performance + schema parity with backend |
| Charts | **Lightweight Charts** (TradingView OSS) | Financial-grade, free, battle-tested |
| API framework | **NestJS** (Node, TS) + **FastAPI** (Python) | NestJS for business logic (typed, modular, DI, enterprise patterns); FastAPI for ML/LLM/trading workers |
| ORM | **Prisma** (Node side) + **SQLAlchemy** (Python side) | Both point at same Postgres with strict schema ownership |
| Database | **PostgreSQL 16** with RLS | Multi-tenant isolation at the DB layer |
| Analytics DB | **ClickHouse** | Cheap columnar for signal events, trade history |
| Cache / queue | **Redis 7** (Upstash or self-hosted) | De-facto |
| Workflows | **Temporal.io** | Durable long-running operations (order lifecycles survive restart) |
| Auth | **Clerk** (managed) or custom NestJS JWT | Clerk for speed-to-market; migrate to custom if needed |
| Payments | **Razorpay** | India default |
| LLM | **OpenAI gpt-4o-mini** (v1), **self-hosted Llama** (v2) | Cost vs quality |
| Monorepo | **pnpm workspaces** + **Turborepo** | Industry standard |
| IaC | **Terraform** + **AWS CDK** (hybrid) | Terraform for AWS; CDK for app-specific constructs |
| Orchestration | **AWS ECS Fargate** (v1) → **EKS** (v2) | Simpler ops early |
| Region | **ap-south-1 (Mumbai)** | Data residency + NSE latency |
| CDN / edge | **Cloudflare** | WAF, bot protection, edge caching |
| Observability | **Datadog** (APM + logs + metrics) + **Sentry** (errors) | Enterprise standard |
| Product analytics | **PostHog** (self-host option) | Feature flags + analytics + session replay combined |
| CI/CD | **GitHub Actions** + **Turbo cache** | Fast, familiar |
| Container registry | **AWS ECR** | Native |
| Feature flags | **PostHog** or **Statsig** | Safe progressive rollout |

### 11.3 Multi-tenancy

Per-user isolation enforced at three layers:

1. **Application layer** — every query scoped by `user_id`, enforced via NestJS guards + Python dependency injections
2. **Database layer** — Postgres Row-Level Security (RLS) policies on every table
3. **Queue layer** — per-user queue partitioning for signal ingestion

No shared global mutable state. Every resource (Telethon session, Kite token, trade record) is tenant-scoped.

---

## 12. Monorepo Structure

Single repo: `tradex-platform/`. Managed with **pnpm workspaces** + **Turborepo**.

```
tradex-platform/
├── apps/
│   ├── web/                         Next.js 15 (user app)
│   ├── web-admin/                   Admin console (Next.js)
│   ├── marketing/                   Landing site (Next.js, static)
│   ├── api/                         NestJS main API
│   └── workers/                     Python FastAPI + Celery workers
│       ├── ingestion/               Telegram listeners per user
│       ├── parser/                  LLM signal parsing
│       ├── paper-engine/            Paper trading simulator
│       ├── executor/                Broker execution workers
│       ├── reporter/                Reports + tax exports
│       └── scheduler/               Kite token refresh, EOD jobs
│
├── packages/
│   ├── ui/                          Shared React components (shadcn-based)
│   ├── design-tokens/               Colors, spacing, typography as JSON → CSS vars
│   ├── types/                       Zod schemas shared FE/BE
│   ├── sdk-client/                  Typed API client generated from OpenAPI
│   ├── sdk-broker/                  Broker adapter abstraction (Kite, Upstox, Dhan, Angel, Fyers)
│   ├── sdk-telegram/                Telegram wrapper (Telethon bindings via HTTP)
│   ├── risk-engine/                 Shared risk-rails logic (runs in paper + live)
│   ├── trade-core/                  Order state machine, trailing SL math
│   ├── llm-prompts/                 System prompts + prompt tests
│   ├── eslint-config/               Shared ESLint config
│   ├── tsconfig/                    Shared tsconfig bases
│   └── test-utils/                  Shared test helpers
│
├── services/
│   ├── postgres/                    Migrations (via Prisma + Alembic)
│   ├── clickhouse/                  DDL + materialized views
│   └── temporal/                    Workflow definitions
│
├── infra/
│   ├── terraform/                   AWS resources
│   ├── cdk/                         App-specific constructs
│   ├── k8s/                         Helm charts (v2)
│   └── docker/                      Dockerfiles per service
│
├── docs/
│   ├── architecture/                ADRs, diagrams
│   ├── runbooks/                    Incident playbooks
│   ├── api/                         OpenAPI specs
│   └── design/                      Figma exports, design system docs
│
├── tests/
│   ├── e2e/                         Playwright
│   ├── load/                        k6
│   └── contract/                    Pact contracts
│
├── scripts/                         CLI utilities (seed, backfill, migrate)
│
├── .github/
│   ├── workflows/                   CI/CD pipelines
│   ├── CODEOWNERS
│   └── PULL_REQUEST_TEMPLATE.md
│
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── .editorconfig
├── .nvmrc
├── CHANGELOG.md
└── README.md
```

### 12.1 Module ownership convention

Every directory has an `OWNERS` file listing responsible engineers. CI enforces that PRs touching a module request review from at least one owner.

### 12.2 Code style enforcement

- **ESLint** + **Prettier** on TS/JS
- **Ruff** + **Black** + **mypy** on Python
- **Husky** pre-commit hooks
- **Commitlint** for conventional commits
- **changesets** for semantic versioning of shared packages

---

## 13. Data Model

Major Postgres tables (abbreviated — not full DDL).

### 13.1 Users & Auth

```sql
users (
  id              uuid pk,
  phone           text unique,
  email           text unique,
  kyc_status      enum(pending,verified,rejected),
  created_at      timestamptz,
  deleted_at      timestamptz null
)

sessions (
  id              uuid pk,
  user_id         uuid fk,
  device          jsonb,
  ip              inet,
  last_seen_at    timestamptz,
  revoked_at      timestamptz null
)

risk_profiles (
  user_id                uuid pk fk,
  max_daily_loss_inr     int,
  max_weekly_loss_inr    int,
  max_concurrent_trades  int,
  max_lots_per_trade     int,
  allowed_indices        text[],
  trading_window         tstzrange,
  btst_allowed           bool,
  updated_at             timestamptz
)
```

### 13.2 Connections

```sql
broker_connections (
  id                uuid pk,
  user_id           uuid fk,
  broker            enum(kite,upstox,dhan,fyers,angel),
  encrypted_creds   bytea,                      -- KMS-wrapped
  access_token_exp  timestamptz,
  status            enum(active,expired,revoked),
  created_at        timestamptz
)

telegram_connections (
  id                uuid pk,
  user_id           uuid fk,
  phone_e164        text,
  encrypted_session bytea,                      -- KMS-wrapped
  last_authed_at    timestamptz,
  status            enum(active,expired,revoked)
)

telegram_channels (
  id                uuid pk,
  user_id           uuid fk,
  chat_id           bigint,
  title             text,
  username          text null,
  mode              enum(observe,evaluation,live,paused),
  added_at          timestamptz,
  unique(user_id, chat_id)
)
```

### 13.3 Signals & Trades

```sql
signals (
  id                uuid pk,
  user_id           uuid fk,
  channel_id        uuid fk,
  source_message_id bigint,
  raw_text          text,
  parsed            jsonb,            -- symbol, side, entry_*, targets, sl, lots
  parsed_ok         bool,
  confidence        numeric,
  received_at       timestamptz,
  parsed_at         timestamptz,
  dedup_hash        text,
  unique(user_id, dedup_hash) where received_at > now() - interval '5 min'
)

trades (
  id                uuid pk,
  user_id           uuid fk,
  channel_id        uuid fk,
  signal_id         uuid fk,
  mode              enum(paper,live),
  broker            text null,
  broker_order_id   text null,
  status            enum(created,waiting_entry,order_pending,entered,partial_exit,completed,stopped_out,cancelled,error),
  symbol            text,
  side              enum(buy,sell),
  lots              int,
  entry_trigger     numeric,
  entry_fill        numeric,
  stop_loss         numeric,
  targets           numeric[],
  trailing_sl       numeric null,
  created_at        timestamptz,
  entered_at        timestamptz null,
  exited_at         timestamptz null,
  realized_pnl      numeric,
  unrealized_pnl    numeric
)

trade_events (
  id                bigserial pk,
  trade_id          uuid fk,
  event_type        text,           -- order_sent, order_accepted, fill, partial_exit, trailing_update, exit, rejection
  payload           jsonb,
  occurred_at       timestamptz
)
```

### 13.4 Paper Trading

```sql
paper_wallets (
  id                uuid pk,
  user_id           uuid fk,
  channel_id        uuid fk,
  starting_balance  numeric,
  current_balance   numeric,
  created_at        timestamptz,
  unique(user_id, channel_id)
)
```

### 13.5 Analytics

ClickHouse tables, partitioned by date, ordered by (user_id, timestamp):

```
signal_events        -- every parse, every route decision
trade_ticks          -- MTM snapshots during trade life
channel_daily_stats  -- materialized view, refresh every 10 min
user_daily_stats     -- MV
```

### 13.6 Billing

```sql
subscriptions (
  id                uuid pk,
  user_id           uuid fk unique,
  tier              enum(free,trader,algo),
  billing_period    enum(monthly,annual),
  razorpay_sub_id   text,
  status            enum(trialing,active,past_due,cancelled),
  trial_ends_at     timestamptz,
  current_period_end timestamptz
)

invoices (...)
payment_events (...)
```

### 13.7 Audit

```sql
audit_logs (
  id                bigserial pk,
  user_id           uuid,
  actor             text,             -- 'user', 'system', 'admin'
  action            text,             -- e.g. 'trade.auto_executed'
  resource_type     text,
  resource_id       text,
  metadata          jsonb,
  ip                inet,
  user_agent        text,
  occurred_at       timestamptz,
  -- append-only, retained 7 years
  immutable         bool default true
)
```

---

## 14. API Surface

### 14.1 Principles

- REST, JSON, resource-oriented
- `/api/v1/*` — versioned from day 1
- OpenAPI 3.1 spec generated at `/api/v1/openapi.json` — used to generate typed client in `packages/sdk-client`
- All IDs are UUIDv7 (time-ordered) for cursor pagination
- Cursor pagination everywhere (no offsets)
- Idempotency keys on all POST/PUT (`Idempotency-Key` header)
- Rate limits per-user and per-IP (Redis counters)
- Webhooks signed with HMAC-SHA256

### 14.2 Key endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | /auth/signup | Phone OTP start |
| POST | /auth/verify | Complete OTP |
| POST | /auth/refresh | Refresh access token |
| GET | /me | Current user |
| PATCH | /me/risk-profile | Update rails (pw re-auth) |
| POST | /telegram/login/start | Trigger Telethon login |
| POST | /telegram/login/verify | Submit OTP |
| GET | /telegram/channels | List of user's chats |
| PATCH | /telegram/channels/:id | Change mode (eval/live/paused) |
| POST | /broker/kite/oauth/start | Redirect URL |
| POST | /broker/kite/oauth/callback | Complete OAuth |
| POST | /broker/kite/reauth | Daily re-auth |
| GET | /signals | Paginated signal feed |
| GET | /signals/:id | Signal detail |
| POST | /signals/:id/execute | Manual execute now |
| POST | /signals/:id/skip | Record a skip |
| GET | /channels | User's channels with scorecards |
| GET | /channels/:id/scorecard | Full metrics |
| POST | /channels/:id/graduate | Move to live |
| GET | /trades | Paginated trades (filter by mode, status, channel) |
| GET | /trades/:id | Trade detail + event timeline |
| POST | /trades/:id/exit | Manual exit |
| GET | /portfolio/positions | Live positions |
| GET | /portfolio/pnl | P&L summary |
| POST | /panic | Global kill switch |
| GET | /analytics/daily | Daily stats |
| GET | /analytics/tax-export | CSV/PDF |
| GET | /billing/subscription | Current plan |
| POST | /billing/subscription/upgrade | Change tier |
| GET | /admin/users | (admin only) user list |

### 14.3 Real-time (WebSocket)

`wss://api.tradex.com/v1/stream` with JWT auth. Channels user subscribes to on connect:
- `prices.*` (market data for favorites)
- `signals.incoming` (new parsed signals)
- `trades.updates` (order state changes, MTM updates)
- `system.health` (connection status)

Server sends heartbeats every 15s. Client auto-reconnects with exponential backoff.

---

## 15. Integrations Matrix

| Integration | Use | Version / API | Critical |
|---|---|---|---|
| **Zerodha Kite Connect** | Trade execution, market data | v3 | P0 |
| **Upstox API** | Alternative broker | v2 | P1 |
| **Dhan API** | Alternative broker | v2 | P1 |
| **Fyers API** | Alternative broker | v3 | P2 |
| **Angel One SmartAPI** | Alternative broker | v1 | P2 |
| **Telegram MTProto** (via Telethon) | Signal ingestion | Telethon 1.34+ | P0 |
| **OpenAI** | Signal parsing | gpt-4o-mini (Chat Completions) | P0 |
| **Razorpay** | Subscription billing | Subscriptions API | P0 |
| **MSG91** | SMS/OTP | API v5 | P0 |
| **Resend** or **SES** | Transactional email | — | P0 |
| **Firebase Cloud Messaging** | Web push fallback | — | P1 |
| **Datadog** | Observability | — | P0 |
| **Sentry** | Error tracking | — | P0 |
| **PostHog** | Product analytics + flags | — | P0 |
| **Cloudflare** | CDN, WAF, Turnstile captcha | — | P0 |
| **AWS KMS** | Secret envelope encryption | — | P0 |
| **AWS S3 / Cloudflare R2** | File storage | — | P0 |
| **Clickhouse Cloud** (managed) | Analytics DB | — | P0 |
| **Temporal Cloud** (managed) | Durable workflows | — | P0 |
| **NSE** (indirect via Kite) | Instrument master | Daily refresh | P0 |

Broker abstraction sits behind `packages/sdk-broker` — all brokers implement `IBrokerAdapter` with methods `placeOrder`, `modifyOrder`, `cancelOrder`, `listPositions`, `getLtp`, `subscribeTicks`, `handleAuthFlow`.

---

## 16. Infrastructure & DevOps

### 16.1 Environments

| Env | Purpose | Data |
|---|---|---|
| `dev-local` | Developer laptops via Docker Compose | Seeded fixtures |
| `ci` | GitHub Actions ephemeral | Per-job sandboxed |
| `preview` | Per-PR preview deploys (Cloudflare Pages for web, ephemeral ECS tasks for API) | Shared staging data |
| `staging` | Internal QA, integration partners | Synthetic users, real OpenAI/Razorpay test mode |
| `production` | Live users | Real |

### 16.2 CI/CD pipeline

1. **PR opened** → ESLint, Prettier, TypeScript, Ruff, mypy, unit tests, build, Turbo cache hit
2. **PR approved** → Playwright e2e on preview env, contract tests
3. **Merge to `main`** → auto-deploy to `staging`, run smoke tests, canary for 30 min
4. **Manual promote to `production`** → blue/green via ECS, health checks, auto-rollback on SLO breach
5. **Post-deploy** → Datadog deploy marker, Sentry release associated

### 16.3 Release cadence

- Hotfixes: anytime, trunk-based
- Regular releases: twice weekly (Tuesday, Thursday) at 11 PM IST (post-market)
- Never deploy during market hours (09:15-15:30 IST) unless hotfix

### 16.4 Backups

- Postgres — WAL streaming + daily snapshots, 30-day retention, cross-AZ
- ClickHouse — daily snapshots to S3 Glacier, 365-day retention
- Redis — RDB snapshots every 15 min, AOF for critical queues
- KMS — multi-region replication
- Disaster drill quarterly — restore to an isolated env, verify P&L numbers match

### 16.5 Disaster recovery

| Scenario | RPO | RTO | Response |
|---|---|---|---|
| Single service crash | 0 | <60s | Auto-restart via ECS |
| Single AZ failure | 0 | <5m | Load shifts to other AZs |
| Region failure | <5m | <2h | Failover to ap-south-2 (Hyderabad) — read-only until DNS propagates |
| Postgres corruption | <5m | <30m | Restore from latest snapshot |
| Kite API outage | N/A | external | Degrade to manual-only, banner, retry queue |
| OpenAI outage | N/A | external | Fallback parser (regex v2) + manual review queue |
| Cloudflare outage | <1m | <15m | Direct origin via backup DNS |

---

## 17. Security & Compliance

### 17.1 Threat model (STRIDE summary)

Principal threats:
- **Credential theft** (Telegram sessions, Kite tokens) — mitigated by KMS envelope encryption at rest
- **Auto-execution abuse** — mitigated by standing-consent audit trail + biometric for mode upgrades
- **Insider threat** — mitigated by encrypted creds (keys rotate) and audit logs (append-only, off-prod)
- **Front-running via signal interception** — mitigated by TLS, per-user signal isolation
- **Account takeover** — mitigated by 2FA requirement for live trading, device fingerprinting

### 17.2 Data classification

| Class | Examples | Controls |
|---|---|---|
| **Secret** | Kite secret, Telegram session, password hash | KMS envelope-encrypted, never logged, never in analytics |
| **Sensitive** | PAN, phone, email | Hashed for analytics, tokenized in logs |
| **Internal** | Trade history, signal parse results | RLS-scoped, encrypted at rest via AWS RDS |
| **Public** | Anonymized leaderboard data | CDN-cacheable |

### 17.3 Secrets management

All secrets in AWS Secrets Manager, rotated on schedule:
- DB passwords: 90 days auto
- Internal service tokens: 30 days
- Kite/broker API keys: on demand (user-supplied)
- KMS master key: 365 days
- TLS certs: Let's Encrypt, 60-day auto

No secret ever in code, env files in git, or logs. Pre-commit hook (gitleaks) blocks.

### 17.4 OWASP top 10 posture

- **Injection** — Prisma/SQLAlchemy parameterized; Zod validates inputs
- **Broken auth** — Clerk or JWT with short-lived access (15min) + refresh rotation
- **Data exposure** — TLS 1.3, encrypted at rest, minimization
- **XXE** — No XML parsing
- **Access control** — RLS + NestJS guards + explicit permission checks
- **Misconfig** — IaC audited, CIS benchmarks on images
- **XSS** — CSP strict, React escapes by default
- **Deserialization** — Zod everywhere
- **Vulnerable deps** — Dependabot + Snyk, weekly auto-PR
- **Logging failure** — Datadog with audit retention

### 17.5 Indian regulatory

- **SEBI** — positioned as tooling, not advisory; ToS + UX reinforces
- **RBI** — we do not handle funds; no payment aggregator license needed (Razorpay handles)
- **DPDP Act 2023** — consent ledger, data export API, deletion workflow, DPO contact
- **IT Act + Intermediary Guidelines** — content takedown SLA, grievance officer listed
- **GST** — all invoices GST-compliant, 18% on SaaS subs

### 17.6 Certifications (roadmap)

| Cert | Target | Why |
|---|---|---|
| SOC 2 Type I | Month 9 | Enterprise trust signal |
| SOC 2 Type II | Month 18 | Continuous evidence |
| ISO 27001 | Month 24 | If going B2B |

---

## 18. Observability & SLOs

### 18.1 SLOs (v1)

| SLI | Target | Window | Error budget |
|---|---|---|---|
| Web availability | 99.9% | 30 d | 43m/month |
| API p95 latency | <300ms | 30 d | — |
| Signal ingest → push notif | <2s p95 | 30 d | 5% breach allowed |
| Tap-to-order → Kite ack | <1.5s p95 | 30 d | 5% breach allowed |
| Kite token refresh success | 99.5% | daily | Budget = 0.5% users per day |
| LLM parse success | >92% | 7 d | — |
| Paper engine accuracy vs live | <5% P&L drift | monthly | Drives investigation |

### 18.2 Golden signals dashboards

- **User-facing** — RED (Rate, Errors, Duration) per endpoint
- **Signal pipeline** — ingestion lag, parse latency, parse error rate, dedup hit rate
- **Execution pipeline** — order latency, rejection rate, broker health per provider
- **Business** — signups/day, activation rate, MRR, churn, DAU/MAU

### 18.3 Alerting (PagerDuty)

Severity levels:
- **SEV-1** — trading blocked for >5% of active users; wake someone
- **SEV-2** — partial feature degradation; next business-hour
- **SEV-3** — degraded non-critical; handle in standup

Alert routing: market-hours on-call rotation 09:00-16:00 IST, after-hours for infra-only.

### 18.4 Logging

Structured JSON logs, trace-id propagated via W3C `traceparent`. PII auto-redacted by middleware. Log levels: ERROR/WARN to Datadog, INFO sampled at 10%, DEBUG only in `dev`.

### 18.5 Audit logs

Separate append-only ledger (Postgres table + S3 archive). Written for:
- Every auth event
- Every trade lifecycle event
- Every settings change
- Every admin action
- Every panic / rail override

Retained 7 years, queryable by admin, exportable to user.

---

## 19. Performance Budgets

| Metric | Target | Measured |
|---|---|---|
| LCP (home) | <2.0s | Lighthouse CI on every PR |
| INP | <200ms | Datadog RUM |
| CLS | <0.1 | — |
| TTFB | <600ms | — |
| JS bundle (initial) | <180 KB gz | bundle-buddy in CI |
| CSS | <30 KB gz | — |
| API p95 | <300ms | Datadog APM |
| Websocket message fanout | <100ms | — |
| Time to first meaningful data on workspace | <1.5s | — |

Budget breach in CI → PR blocked; manual override requires architect sign-off.

---

## 20. Testing Strategy

### 20.1 Test pyramid

| Layer | Tool | Coverage target |
|---|---|---|
| Unit | Vitest (TS), pytest (Py) | 70% |
| Component | Vitest + Testing Library | Critical components |
| Contract | Pact | All inter-service boundaries |
| Integration | Testcontainers (Postgres, Redis) | Key workflows |
| E2E | Playwright | Top 20 user journeys |
| Load | k6 | Signal pipeline, order hot path |
| Chaos | Gremlin or in-house | Quarterly game days |

### 20.2 Critical test scenarios

- Onboarding end-to-end from signup to first paper trade
- Signal arrives → parsed → paper-executed → scorecard updates
- Manual live order places correctly, position shows up, EOD auto-exit fires
- Panic button pauses auto-execution across all channels
- Kite token expiry mid-trade handled gracefully
- Risk rail blocks a would-be over-size trade
- Daily reauth flow completes in <30s
- Session expiry triggers re-auth without losing user's pending actions
- DPDP data export produces complete user-scoped archive
- Refund triggers Razorpay refund + subscription state change

### 20.3 Parser regression suite

Every LLM prompt change reruns **200+ golden signal examples**. Pass threshold: 98% exact match on structured fields.

### 20.4 Paper-vs-live accuracy

Nightly job compares paper-simulated fills on live signals against actual live-trade fills for the same signals. Drift >5% triggers investigation.

---

## 21. Accessibility

- **WCAG 2.1 AA** as minimum target, aiming for AAA on text contrast
- Keyboard navigation for every interactive element; visible focus rings
- ARIA labels on icon-only buttons (panic button, favorites, etc.)
- Screen reader tested against NVDA and VoiceOver
- `prefers-reduced-motion` honored
- Color is never the sole signal (P&L uses arrow + sign, not just color)
- Form errors announced via `aria-live`
- Skip-to-content link
- Touch targets minimum 44×44 px on mobile
- Auto-play of anything: never
- Language attribute set correctly for Hindi segments

Accessibility CI: axe-core runs on every PR, blocks on critical violations.

---

## 22. Internationalization

v1 ships English. Architecture ready for Hindi at v1.5.

- **next-intl** for React
- Translation keys organized by feature (`t('signals.empty.title')`)
- Currency uses `Intl.NumberFormat('en-IN')` with `₹` prefix
- Numbers formatted in lakh/crore for amounts >1L
- Dates in `DD MMM YYYY` format, times in IST (never UTC to user)
- Professional translation via a vendor for Hindi — not auto-translate

---

## 23. Error, Empty & Edge States

### 23.1 Error states

| Condition | UX |
|---|---|
| Network offline | Persistent banner + cached data + queued actions |
| API 500 | Toast "Something went wrong — we're notified" + retry button |
| Broker API down | Banner + disable order placement + allow viewing |
| Kite token expired mid-session | Modal "Re-authorize to continue trading" + defer action |
| OpenAI API down | Signals stay in "parsing..." state, banner, manual review queue |
| Telegram session invalid | Banner + "Re-connect Telegram" CTA |
| Payment failed | Email + in-app banner + 7-day grace then read-only |
| Rate-limited by broker | Toast + retry with backoff |

### 23.2 Empty states

| Screen | Empty copy |
|---|---|
| Signals feed (new user) | "No signals yet. Connect Telegram to start." with CTA |
| Channels list | "Select Telegram channels to monitor." |
| Portfolio (no trades) | "When you place trades, they'll appear here." |
| Analytics (<7 days data) | "Come back in a few days — we need more data to show insights." |
| Search (no results) | "No matches for 'X'. Try a ticker or index." |

### 23.3 Edge cases

- User changes phone number while session active → force re-auth
- User subscribes to a channel that sends 500 signals/day → rate-limit warning, suggest filter
- Two signals for same symbol within 30s → dedup, surface "duplicate detected"
- User's broker has a position tradeX didn't place → reconciliation flagged, shown but not managed
- Kite returns order_id as string OR as dict → adapter normalizes (we've already seen this in legacy code)
- Market-wide circuit breaker → auto-pause, banner, resume requires manual
- Weekend / holiday → markets closed, live trading disabled, paper engine tracks but doesn't simulate
- Leap-second / timezone edge → always store UTC, render IST
- Signal for expired contract → reject with explicit error
- User sets daily loss = 0 → block all auto-exec, require manual override per trade

---

## 24. Notification & Email Strategy

### 24.1 Channels

- **Web push** (primary for signals, real-time)
- **In-app notification center** (always)
- **Email** (summary, receipts, weekly recap, account events)
- **SMS** (critical only: daily reauth if push not received, password reset)
- **WhatsApp** (optional, premium — daily recap + signals)

### 24.2 Email templates (transactional)

| Type | Trigger | Priority |
|---|---|---|
| Welcome | Signup | P0 |
| OTP | Signup/login | P0 |
| Reauth reminder | 08:45 IST daily for active users | P0 |
| Trade executed | Auto-trade placed | P0 |
| SL hit | Loss trade closed | P0 |
| Daily recap | 15:45 IST | P0 |
| Weekly recap | Saturday morning | P1 |
| Monthly P&L report | 1st of month | P0 |
| Invoice / payment receipt | Every billing cycle | P0 |
| Failed payment | Retry cycle | P0 |
| Account security | New device, password change, 2FA change | P0 |
| Channel graduated | Auto-promotion | P0 |
| Risk rail breached | Daily-loss stop triggered | P0 |
| Panic engaged | Any panic event | P0 |
| Session expired | Telegram/Kite disconnected | P0 |

Templates built in React Email, branded, mobile-first.

### 24.3 Preferences

User controls every category. Critical account security never opt-out. All others opt-in / opt-out granular. Unsubscribe via one-click link (CAN-SPAM / DPDP).

---

## 25. Customer Support Model

### 25.1 Tiers

| Tier | Free | Trader | Algo |
|---|---|---|---|
| Self-service help center | ✅ | ✅ | ✅ |
| In-app chat | — | 24h response | 4h response |
| Email | 48h response | 24h response | 4h response |
| Priority queue | — | — | ✅ |
| Onboarding call | — | — | ✅ 30-min |

### 25.2 Stack

- **Help center** — Mintlify or Notion-public
- **In-app chat** — Intercom or Crisp
- **Ticketing** — Intercom + Linear for eng escalations
- **Status page** — statuspage.io or self-hosted
- **Video tutorials** — YouTube unlisted embeds

### 25.3 SLAs

Market-hours priority matrix:
- P1 (trading blocked) — 15min ack, 1h resolution target
- P2 (feature degraded) — 2h ack, next-day resolution
- P3 (question / how-to) — 4h ack, 48h resolution

### 25.4 Common flows automation

Self-serve via in-app for:
- Reset 2FA
- Revoke broker connection
- Re-link Telegram
- View / export data
- Cancel subscription
- Request refund (within refund window)

---

## 26. Analytics & KPIs

### 26.1 North-star metric

**Weekly active paper-or-live trades** — users who execute at least one trade (paper or live) in a week. Combines activation and retention.

### 26.2 Funnel

| Stage | Metric |
|---|---|
| Acquisition | Unique visitors → Signup rate |
| Activation | Signup → connected broker + Telegram + 1 channel selected |
| First-value | Connected → first paper trade within 48h |
| Retention | Week-4 returning users |
| Conversion | Free → paid within 30 days |
| Expansion | Trader → Algo upgrade rate |
| Referral | Referrals per paying user |

### 26.3 Per-user health score

Composite (0-100) surfaced to admin, used for engagement campaigns:
- Days active last 30
- Signals reviewed per week
- Trades executed per week
- Channels evaluated
- Discipline (rail overrides inverse)
- Payment status

Low-health users get a nudge campaign; very-low get a churn-save call (Algo tier).

### 26.4 Event taxonomy

Naming: `noun.verb_past` — e.g. `signal.parsed`, `trade.executed`, `rail.blocked`, `channel.graduated`.

Properties always include `user_id`, `tier`, `source`, `ts_ist`.

---

## 27. Growth Loops & Referrals

### 27.1 Core loop

```
New user signs up
  → Connects Telegram + broker
    → Gets value (scorecards show which subs work)
      → Shares anonymized scorecard on Twitter / WhatsApp
        → New users see social proof → sign up
```

### 27.2 Referral program

- Referrer: 1 month free Trader (or equivalent credit on Algo) per successful paid referral
- Referee: 14-day extended free trial
- Fraud controls: payment method must differ, device fingerprint check, 30-day holdback
- Dashboard: referral link, pending/paid credits, leaderboard within own network

### 27.3 Content marketing

- SEO: "Which Telegram signal group is best in India?" long-tail
- YouTube: monthly "channel scorecard reveal" videos (anonymized or opt-in consent)
- Twitter/X: screenshot-able scorecards with permission

### 27.4 Partnerships

- Zerodha 60-day-challenge integration (referral source)
- Affiliate links with finance YouTubers (disclosed)

---

## 28. Beta Program Design

### 28.1 Alpha (50 users, invite-only, month 3)

- Hand-picked from your network, Twitter/X finance community
- Free access for life (first 50)
- Weekly Zoom feedback call
- Slack channel for real-time bug reports
- Goal: validate UX, catch severe bugs

### 28.2 Closed beta (500 users, ₹99/mo founder tier, month 5)

- Application form on landing page
- Accepted in waves of 50/week
- Founder tier locks ₹99/mo for 12 months
- Discord community
- Weekly patch notes
- Goal: stress test infra, paper-vs-live accuracy

### 28.3 Public launch (month 6-7)

- Remove waitlist
- Product Hunt launch
- Twitter thread with real user results (opt-in)
- Reddit r/IndianStreetBets + r/IndianInvestments launches
- YouTube finance creator outreach (paid, disclosed)

---

## 29. Launch Checklist

### Pre-launch (T-30 days)

- [ ] Legal opinion from Indian fintech-focused law firm, filed
- [ ] ToS, Privacy, Refund, Risk pages live, reviewed
- [ ] DPIIT startup recognition applied
- [ ] GST registration complete, HSN/SAC for SaaS subs (998314)
- [ ] Company India Pvt Ltd incorporation
- [ ] Bank account, Razorpay merchant account active
- [ ] Test-mode Razorpay transactions verified
- [ ] status.tradex.com live
- [ ] help.tradex.com populated with 20+ articles
- [ ] Brand assets finalized (logo, favicon, OG images)
- [ ] On-call schedule published

### Launch day (T=0)

- [ ] DNS cutover
- [ ] SSL certs active
- [ ] Cloudflare WAF on "high"
- [ ] Rate limits set
- [ ] Monitoring dashboards open on 2 screens
- [ ] Support team briefed
- [ ] Social posts scheduled
- [ ] Launch email to waitlist
- [ ] Product Hunt listing
- [ ] Twitter thread posted
- [ ] Incident response team on call

### Post-launch (T+7)

- [ ] User feedback triaged
- [ ] SLO review — budgets healthy?
- [ ] First post-mortem (always have one)
- [ ] Iterate on onboarding friction points

---

## 30. Roadmap & Milestones

| Month | Milestone | Definition of done |
|---|---|---|
| 1 | Foundation | Company registered, legal opinion, monorepo scaffolded, CI green, design system v0 |
| 2 | Auth + Onboarding | User can sign up, accept ToS, complete risk quiz, connect Kite, connect Telegram, select channels |
| 3 | Signals + Paper | Signals ingest, parse, paper-trade, scorecards show live-updating metrics |
| 4 | Market Workspace | Favorites, search, charts, live prices via Kite, watchlists |
| 5 | Live Trading (manual) | Tap-to-trade live via Kite, risk rails enforce, order state machine, panic button |
| 6 | Live Trading (semi-auto) | Per-channel auto-execute, trailing SL, partial exit, EOD auto-exit, daily reauth |
| 7 | Alpha launch | 50-user invite-only, free tier |
| 8 | Analytics + Tax | Daily reports, monthly PDF, tax CSV, discipline metrics |
| 9 | Billing | Razorpay subs, 3 tiers, free trial, referrals |
| 10 | Closed beta | 500 users, ₹99 founder tier, stability hardening |
| 11 | Multi-broker | Upstox + Dhan adapters, multi-broker execution flags |
| 12 | Public launch | Product Hunt, Reddit, YouTube, PR |
| 13-18 | v1.5 | Hindi, advanced channel analytics, public leaderboard, mobile apps (native), Fyers + Angel adapters |
| 19-24 | v2 | Custom rules DSL, algo tier features, tipster marketplace (regulated), API access |

---

## 31. Risk Register

| ID | Risk | Probability | Impact | Mitigation |
|---|---|---|---|---|
| R01 | SEBI changes rules on algo trading for retail | M | H | Positioning as tool + user-consent-first model; legal opinion on file; pivot plan to "research/analytics only" ready |
| R02 | Zerodha changes Kite Connect ToS | M | H | Multi-broker from v1.5; abstraction layer; Kite alternatives (Upstox, Dhan) validated |
| R03 | Telegram bans Telethon auth pattern | L | H | Forwarding-group fallback design ready |
| R04 | OpenAI outage during market hours | M | M | Regex fallback parser; manual review queue |
| R05 | User blows account, sues | M | H | Legal ToS + risk quiz + rails + audit trail |
| R06 | Bad-actor tipster channel pumps dumps | M | M | Channel moderation flags; symbol blocklist for SME/penny; max position cap |
| R07 | Credential leak | L | Critical | KMS envelope + audit + quarterly pen-test |
| R08 | Competitor copies (Streak adds signal-from-Telegram) | M | M | Moat = scorecards dataset + UX polish + multi-broker |
| R09 | Low activation (users connect but don't paper-trade) | M | M | Aggressive first-48h nudges + onboarding guidance |
| R10 | LLM parse quality decays on new signal formats | M | L | Golden-set regression + on-call tuning + manual override path |
| R11 | Low conversion Free→Paid | M | H | Feature-gating calibration; locked analytics as the hook |
| R12 | Regulatory flag on the product brand | L | Critical | Brand consult with compliance; scrub forbidden phrases |
| R13 | AWS Mumbai outage during market hours | L | H | Multi-AZ default, cross-region warm standby |
| R14 | Founder bus factor | M | H | Document everything, pair-program, hire #2 engineer early |

---

## 32. Legal & Compliance Checklist

### 32.1 Corporate

- [ ] Pvt Ltd incorporation in India
- [ ] DPIIT startup recognition (tax benefits)
- [ ] GST registration (18% on SaaS)
- [ ] Import-Export Code (if global billing later)
- [ ] Commercial bank account + current account
- [ ] Razorpay merchant account
- [ ] Startup India registration
- [ ] MSME registration

### 32.2 Regulatory

- [ ] SEBI-aware legal opinion on product positioning (Finsec / IndusLaw / Nishith Desai)
- [ ] Review of Kite Connect ToS compliance
- [ ] Review of Telegram API terms compliance
- [ ] DPDP Act 2023 compliance (consent, DPO, breach notification)
- [ ] IT Act Section 79 intermediary compliance (grievance officer, takedown SLA)

### 32.3 Product-facing

- [ ] ToS with risk disclaimers, arbitration clause, jurisdiction (Bangalore)
- [ ] Privacy policy (DPDP-compliant)
- [ ] Refund policy (14-day trial aligns)
- [ ] Risk disclosure document
- [ ] Standing consent records for auto-execution

### 32.4 Employment

- [ ] ESOP plan (trust or direct, lawyer-reviewed)
- [ ] Standard employment agreements
- [ ] IP assignment (on hiring)
- [ ] PF / ESI setup

### 32.5 Insurance

- [ ] Cyber liability (₹5Cr cover at launch)
- [ ] Directors & officers
- [ ] Professional indemnity (if positioning drifts)

---

## 33. Glossary

| Term | Meaning |
|---|---|
| Signal | A trading alert (symbol + side + entry + targets + SL) originating from a Telegram channel |
| Channel | A Telegram group or channel the user monitors |
| Evaluation | Paper-trading mode using Practice ₹ to score a channel |
| Live | Real-money execution via user's broker |
| Graduation | Promotion of a channel from Evaluation to Live |
| Practice ₹ | Virtual currency used in paper trading |
| Rail | A pre-trade safety check (daily loss limit, lot cap, etc.) |
| Panic | Global kill switch that pauses all auto-execution |
| Re-auth | Kite's daily 6 AM token re-authorization |
| Scorecard | Metrics snapshot for a channel's performance |
| Execution mode | Observe / Manual / Semi-auto / Full-auto |
| Standing consent | A recorded authorization for ongoing auto-execution with caps |
| Broker adapter | Abstraction over individual broker APIs |
| BFF | Backend-for-Frontend; thin API layer optimized for the web app |
| RLS | Row-Level Security (Postgres) for tenant isolation |
| LTP | Last Traded Price |
| OI | Open Interest |
| IV | Implied Volatility |
| MTM | Mark-to-Market (unrealized P&L) |
| EOD | End of Day auto-close, typically 15:15 IST |
| BTST | Buy Today Sell Tomorrow — overnight position |
| MIS | Margin Intraday Square-off (Kite product type) |
| CNC | Cash and Carry (delivery) |
| NRML | Normal (carry-forward F&O) |
| STT | Securities Transaction Tax |
| F&O | Futures & Options |
| DPDP | Digital Personal Data Protection Act 2023 (India) |
| NSE / BSE | Stock exchanges of India |
| SEBI | Securities and Exchange Board of India (regulator) |
| RA / IA | Research Analyst / Investment Adviser (SEBI registration categories) |

---

## 34. Open Decisions

Things that still need explicit founder decisions before sprint 1:

1. **Brand palette final sign-off** — is `#FF6B2C` the correct "solid orange"? Propose 3-5 alternates alongside.
2. **Domain** — `tradex.in`, `tradex.co`, `trade-x.app`? Availability check needed.
3. **Auth provider** — Clerk (faster) vs custom NestJS JWT (more control)? Decision affects month 1 cost.
4. **Backend primary language** — NestJS + FastAPI hybrid (recommended), or all-Python, or all-Node? Affects hiring.
5. **Observability** — Datadog ($$, full-featured) vs self-hosted Grafana stack (cheaper, more ops)?
6. **Temporal.io Cloud vs self-hosted** — ops vs cost tradeoff.
7. **Paper engine precision** — tick-accurate (expensive feed) vs minute-bar (cheap, less realistic)?
8. **Charts library** — Lightweight Charts (OSS, financial) or TradingView widget (richer, restrictive license)?
9. **Referral payout currency** — credits only, or cash payout via Razorpay Route?
10. **Office setup** — remote-first or Bangalore HQ?
11. **First hire after you** — compliance-savvy COO, senior full-stack, or designer?
12. **ESOP pool size** — 10%, 12.5%, 15%?
13. **Pre-seed fundraising timing** — bootstrap to beta then raise, or raise now?
14. **Hindi v1.5 priority** — does v1 need it for target persona, or push to v2?
15. **Native mobile apps timing** — month 12 (post-launch) or month 15?
16. **Leaderboard launch** — ship at public launch for viral effect, or hold until 1k+ users for quality?

---

## Appendix A — Onboarding quiz (risk profile)

8 questions, each calibrates a rail:

1. **How much capital is dedicated to F&O today?** (5 bands) → sets starting capital reference
2. **Of that, how much can you afford to lose in a week without financial stress?** (% bands) → weekly loss rail
3. **Of that, how much in a single day?** (% bands, must be ≤ weekly) → daily loss rail
4. **How many trades have you placed in the last 30 days?** (5 bands) → experience score; new users get tighter rails
5. **Have you ever blown a trading account?** (Yes/No/Close) → adds a "recovery mode" flag if yes
6. **Which indices are you comfortable with?** (multi-select) → index whitelist
7. **Max lots you're comfortable trading in one shot?** (1, 2, 3, 5, 10) → max lots per trade rail
8. **Are you OK with overnight (BTST) positions?** (Yes/No) → BTST toggle

Results persist in `risk_profiles` table. Editable anytime with password re-auth + 24h cooldown before new limits apply (prevents impulsive loosening after a loss).

---

## Appendix B — Channel scorecard metric definitions

| Metric | Formula |
|---|---|
| Win rate | trades_hit_first_target / total_closed_trades |
| Avg P&L / signal | sum(trade_pnl) / count(signals_acted) |
| Max drawdown | max((peak_equity - equity_at_t) / peak_equity) over window |
| Sharpe-like | mean(daily_returns) / stdev(daily_returns) * sqrt(252) |
| Profit factor | sum(profits) / abs(sum(losses)) |
| Avg holding time | mean(exited_at - entered_at) |
| Consistency | 1 - stdev(7d rolling win rate) |
| Parse rate | parsed_ok / total_messages |
| Signal quality | fraction with all of (symbol, entry, targets, sl) parseable |
| Noise ratio | messages_classified_non_signal / total_messages |

---

## Appendix C — Data retention schedule

| Data | Retention | Basis |
|---|---|---|
| Audit logs | 7 years | SEBI record-keeping |
| Trades | 7 years | Tax + audit |
| Signals (parsed) | 2 years hot, 5 years cold | Analytics vs cost |
| User PII | Until deletion + 30d soft-delete | DPDP |
| Session tokens | 30 days | Security |
| Telegram session blobs | Lifetime of connection + 30 days | Reconnect grace |
| Broker tokens | Lifetime of connection + 7 days | — |
| Billing / invoices | 7 years | Tax |
| Logs (INFO) | 30 days | Cost |
| Logs (ERROR) | 90 days | Debugging |
| Backups | Daily 30d, weekly 1y, monthly 7y | DR + audit |
| Deleted user archive | 180 days encrypted, then purge | Dispute window |

---

## Appendix D — Example signal card (UI contract)

```json
{
  "id": "sig_01HNC...",
  "channel": { "id": "ch_...", "title": "XYZ Signals", "mode": "evaluation" },
  "received_at_ist": "2026-04-25T09:42:11+05:30",
  "raw_text": "NIFTY 25750 CE\nABOVE 150\nTarget 166/185\nSL 132",
  "parsed_ok": true,
  "confidence": 0.96,
  "parsed": {
    "symbol": "NIFTY25750CE",
    "side": "BUY",
    "entry_type": "ABOVE",
    "entry_min": 150.0,
    "targets": [166.0, 185.0],
    "stop_loss": 132.0,
    "lots": 1
  },
  "actions": [
    { "type": "execute", "mode": "paper", "enabled": true },
    { "type": "execute", "mode": "live", "enabled": false, "blocked_reason": "channel_not_graduated" },
    { "type": "skip", "enabled": true },
    { "type": "edit", "enabled": true }
  ],
  "rails_check": { "all_passed": true, "checks": [...] }
}
```

---

## Appendix E — Panic button flow (detailed)

```
Tap Panic (top bar)
  → Full-screen modal:
      "PAUSE AUTO-TRADING?"
      ○ Pause only (keeps positions)
      ○ Pause + Exit all positions at market (separate confirm)
  → Biometric / password confirm
  → Apply:
      • Mark user.auto_exec_paused = true (all channels)
      • If "exit all": enqueue market orders for every open position
      • Notify email + phone
      • Audit log event
  → Success screen:
      "Auto-trading paused. Resume from Settings → Risk Rails."
      "X positions exited at market." (if chosen)
  → Post-event:
      Send follow-up email 30 min later with summary
```

---

*End of document. Maintained in `tradeX/PRODUCT_SPEC.md`. Propose changes via PR with the `product-spec` label.*
