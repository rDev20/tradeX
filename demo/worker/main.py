"""tradeX worker — multi-user ingestion, parsing, paper-trading, market data.

Per user with a connected Telegram and service_status=running:
  - sync their channels every 60s
  - ingest messages from their selected channels
  - parse signals (heuristic) for their unparsed messages
  - simulate paper trades for their unsettled signals

Globally: yfinance polling every 15s for the demo symbol list.
"""
from __future__ import annotations

import asyncio
import logging
import os
import sys
import traceback
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from pathlib import Path

from dotenv import load_dotenv
from telethon import TelegramClient, events
from telethon.tl.types import Channel as TgChannel, Chat as TgChat

WORKER_DIR = Path(__file__).parent
load_dotenv(WORKER_DIR.parent / ".env")

sys.path.insert(0, str(WORKER_DIR))

from db import (  # noqa: E402
    add_trade_slip_event_by_message,
    conn,
    ensure_trade_slip_tables,
    insert_message_if_new,
    insert_paper_trade,
    insert_parsed_signal,
    insert_price_tick,
    insert_source_message_if_new,
    insert_source_parse_attempt,
    insert_source_signal,
    link_trade_slip_signal,
    link_trade_slip_trade,
    list_active_users,
    log_service_event,
    mark_message_parsed,
    mark_source_message_needs_review,
    mark_source_message_parsed,
    mark_trade_slip_failed_by_message,
    selected_channels,
    selected_source_channels,
    signals_without_trades,
    source_message_context,
    unparsed_messages,
    unparsed_source_messages,
    upsert_channel,
    upsert_source_channel,
    upsert_symbol,
    user_service_is_running,
    ensure_admin_source_tables,
    get_admin_telegram_account,
)
from llm_parser import OLLAMA_MODEL, llm_enabled, parse_with_llm  # noqa: E402
from parser import parse_signal  # noqa: E402
from costs import compute_costs  # noqa: E402
import json as _json  # noqa: E402

log = logging.getLogger("tradex-worker")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
    datefmt="%H:%M:%S",
)

API_ID = int(os.environ["TELEGRAM_API_ID"])
API_HASH = os.environ["TELEGRAM_API_HASH"]


# --- demo symbols: keep in sync with web/lib/symbols.ts ---
DEMO_SYMBOLS = [
    ("^NSEI", "NIFTY 50", "INDEX"),
    ("^NSEBANK", "BANK NIFTY", "INDEX"),
    ("^BSESN", "SENSEX", "INDEX"),
    ("USDINR=X", "USD/INR", "CURRENCY"),
    ("HDFCBANK.NS", "HDFC Bank", "EQUITY"),
    ("ICICIBANK.NS", "ICICI Bank", "EQUITY"),
    ("SBIN.NS", "State Bank of India", "EQUITY"),
    ("AXISBANK.NS", "Axis Bank", "EQUITY"),
    ("KOTAKBANK.NS", "Kotak Mahindra Bank", "EQUITY"),
    ("TCS.NS", "TCS", "EQUITY"),
    ("INFY.NS", "Infosys", "EQUITY"),
    ("WIPRO.NS", "Wipro", "EQUITY"),
    ("HCLTECH.NS", "HCL Tech", "EQUITY"),
    ("MARUTI.NS", "Maruti Suzuki", "EQUITY"),
    ("M&M.NS", "Mahindra & Mahindra", "EQUITY"),
    ("EICHERMOT.NS", "Eicher Motors", "EQUITY"),
    ("DRREDDY.NS", "Dr. Reddy's Labs", "EQUITY"),
    ("SUNPHARMA.NS", "Sun Pharma", "EQUITY"),
    ("HINDUNILVR.NS", "Hindustan Unilever", "EQUITY"),
    ("ITC.NS", "ITC", "EQUITY"),
    ("RELIANCE.NS", "Reliance Industries", "EQUITY"),
    ("ONGC.NS", "ONGC", "EQUITY"),
    ("BPCL.NS", "BPCL", "EQUITY"),
    ("TATASTEEL.NS", "Tata Steel", "EQUITY"),
    ("JSWSTEEL.NS", "JSW Steel", "EQUITY"),
    ("BAJFINANCE.NS", "Bajaj Finance", "EQUITY"),
    ("LT.NS", "Larsen & Toubro", "EQUITY"),
    ("ADANIENT.NS", "Adani Enterprises", "EQUITY"),
]

SYMBOL_TO_TICKER = {
    "NIFTY": "^NSEI",
    "BANKNIFTY": "^NSEBANK",
    "FINNIFTY": "NIFTY_FIN_SERVICE.NS",
    "MIDCPNIFTY": "^NSEMDCP50",
    "SENSEX": "^BSESN",
    "RELIANCE": "RELIANCE.NS",
    "TCS": "TCS.NS",
    "HDFCBANK": "HDFCBANK.NS",
    "HDFC": "HDFCBANK.NS",
    "INFY": "INFY.NS",
    "INFOSYS": "INFY.NS",
    "ICICIBANK": "ICICIBANK.NS",
    "ICICI": "ICICIBANK.NS",
    "SBIN": "SBIN.NS",
    "SBI": "SBIN.NS",
    "BAJFINANCE": "BAJFINANCE.NS",
    "BAJAJFINANCE": "BAJFINANCE.NS",
    "ADANIENT": "ADANIENT.NS",
    "ADANI": "ADANIENT.NS",
    "MARUTI": "MARUTI.NS",
    "AXISBANK": "AXISBANK.NS",
    "AXIS": "AXISBANK.NS",
    "KOTAKBANK": "KOTAKBANK.NS",
    "KOTAK": "KOTAKBANK.NS",
    "LT": "LT.NS",
    "LARSEN": "LT.NS",
    "WIPRO": "WIPRO.NS",
    "HCLTECH": "HCLTECH.NS",
    "HCL": "HCLTECH.NS",
    "HINDUNILVR": "HINDUNILVR.NS",
    "HINDUNILEVER": "HINDUNILVR.NS",
    "ITC": "ITC.NS",
    "ONGC": "ONGC.NS",
    "BPCL": "BPCL.NS",
    "TATASTEEL": "TATASTEEL.NS",
    "JSWSTEEL": "JSWSTEEL.NS",
    "MAHINDRA": "M&M.NS",
    "DRREDDY": "DRREDDY.NS",
    "SUNPHARMA": "SUNPHARMA.NS",
    "EICHERMOT": "EICHERMOT.NS",
    "HEROMOTOCO": "HEROMOTOCO.NS",
}

OPTION_DELTA = 0.3
LOT_SIZES = {
    "NIFTY": 25,
    "BANKNIFTY": 15,
    "FINNIFTY": 25,
    "MIDCPNIFTY": 50,
    "SENSEX": 10,
}

EXECUTOR = ThreadPoolExecutor(max_workers=4)


# ──────────────── Per-user Telethon clients ────────────────

class UserClients:
    """Holds per-user Telethon clients. Created lazily, dropped on disconnect."""
    def __init__(self) -> None:
        self.clients: dict[int, TelegramClient] = {}

    async def get(self, user_id: int, session_path: str) -> TelegramClient | None:
        if user_id in self.clients:
            return self.clients[user_id]
        # session_path stored in DB is e.g. "sessions/user_42.session"
        # We strip .session because Telethon adds it
        path = (WORKER_DIR / session_path).resolve()
        path_str = str(path).removesuffix(".session")
        client = TelegramClient(path_str, API_ID, API_HASH)
        try:
            await client.connect()
            if not await client.is_user_authorized():
                log.warning("user %d Telethon session not authorized; skipping", user_id)
                await client.disconnect()
                return None
        except Exception as exc:
            log.error("user %d Telethon connect failed: %s", user_id, exc)
            return None
        self.clients[user_id] = client
        return client

    async def disconnect_all(self) -> None:
        for uid, c in list(self.clients.items()):
            try:
                await c.disconnect()
            except Exception:
                pass
        self.clients.clear()


# ──────────────── Per-user Telegram sync ────────────────

async def sync_channels_for_user(client: TelegramClient, user_id: int) -> int:
    count = 0
    async for dialog in client.iter_dialogs():
        entity = dialog.entity
        if not isinstance(entity, (TgChannel, TgChat)):
            continue
        tg_id = str(entity.id)
        name = getattr(entity, "title", None) or getattr(entity, "first_name", "unknown")
        username = getattr(entity, "username", None)
        upsert_channel(user_id, tg_id=tg_id, name=name, username=username)
        count += 1
    return count


async def sync_messages_for_user(client: TelegramClient, user_id: int, limit: int = 100) -> int:
    total = 0
    for row in selected_channels(user_id):
        try:
            entity = await client.get_entity(int(row["tgId"]))
            async for msg in client.iter_messages(entity, limit=limit):
                if not msg.message:
                    continue
                posted_at = msg.date or datetime.now(timezone.utc)
                new_id = insert_message_if_new(
                    user_id=user_id,
                    channel_id=row["id"],
                    tg_message_id=str(msg.id),
                    text=msg.message,
                    posted_at=posted_at,
                )
                if new_id:
                    total += 1
        except Exception as exc:
            log.warning("user %d sync_messages failed for %s: %s", user_id, row["name"], exc)
    return total


# ─────────────── Admin-owned Telegram source ingestion ───────────────

class AdminSourceIngestor:
    """Maintains the admin Telegram connection and stores source messages globally."""

    def __init__(self) -> None:
        self.client: TelegramClient | None = None
        self.session_path: str | None = None
        self.handler_registered = False

    async def ensure_connected(self) -> TelegramClient | None:
        account = get_admin_telegram_account()
        if not account:
            return None

        path = (WORKER_DIR / account["sessionPath"]).resolve()
        path_str = str(path).removesuffix(".session")
        if self.client and self.session_path == path_str:
            return self.client

        if self.client:
            await self.disconnect()

        client = TelegramClient(path_str, API_ID, API_HASH)
        try:
            await client.connect()
            if not await client.is_user_authorized():
                log.warning("admin Telethon session not authorized; source ingest paused")
                await client.disconnect()
                return None
        except Exception as exc:
            log.error("admin Telethon connect failed: %s", exc)
            return None

        self.client = client
        self.session_path = path_str
        self.handler_registered = False
        self._register_handler(client)
        log.info("admin source ingest connected")
        return client

    def _register_handler(self, client: TelegramClient) -> None:
        if self.handler_registered:
            return

        @client.on(events.NewMessage(incoming=True))
        async def handle_new_message(event):  # type: ignore[no-untyped-def]
            if not event.message or not event.message.message:
                return
            try:
                chat = await event.get_chat()
                tg_id = str(getattr(chat, "id", event.chat_id))
                selected = {str(row["tgId"]): row for row in selected_source_channels()}
                row = selected.get(tg_id)
                if not row:
                    return
                posted_at = event.message.date or datetime.now(timezone.utc)
                new_id = insert_source_message_if_new(
                    channel_id=row["id"],
                    tg_message_id=str(event.message.id),
                    text=event.message.message,
                    posted_at=posted_at,
                )
                if new_id:
                    log.info("admin source message stored channel=%s msg=%s", row["name"], event.message.id)
            except Exception as exc:
                log.warning("admin source realtime handler failed: %s", exc)

        self.handler_registered = True

    async def disconnect(self) -> None:
        if self.client:
            try:
                await self.client.disconnect()
            except Exception:
                pass
        self.client = None
        self.session_path = None
        self.handler_registered = False


async def sync_source_channels(client: TelegramClient) -> int:
    count = 0
    async for dialog in client.iter_dialogs():
        entity = dialog.entity
        if not isinstance(entity, (TgChannel, TgChat)):
            continue
        tg_id = str(entity.id)
        name = getattr(entity, "title", None) or getattr(entity, "first_name", "unknown")
        username = getattr(entity, "username", None)
        upsert_source_channel(tg_id=tg_id, name=name, username=username)
        count += 1
    return count


async def sync_source_messages(client: TelegramClient, limit: int = 50) -> int:
    total = 0
    for row in selected_source_channels():
        try:
            entity = await client.get_entity(int(row["tgId"]))
            async for msg in client.iter_messages(entity, limit=limit):
                if not msg.message:
                    continue
                posted_at = msg.date or datetime.now(timezone.utc)
                new_id = insert_source_message_if_new(
                    channel_id=row["id"],
                    tg_message_id=str(msg.id),
                    text=msg.message,
                    posted_at=posted_at,
                )
                if new_id:
                    total += 1
        except Exception as exc:
            log.warning("admin source history sync failed for %s: %s", row["name"], exc)
    return total


def run_source_parser() -> int:
    parsed = 0
    for msg in unparsed_source_messages(limit=200):
        message = dict(msg)
        try:
            result = parse_signal(msg["text"])
        except Exception as exc:
            log.warning("source parser error msg=%s: %s", msg["id"], exc)
            insert_source_parse_attempt(
                message_id=msg["id"],
                channel_id=msg["channelId"],
                parser="heuristic",
                model=None,
                status="parser_error",
                error=str(exc),
            )
            mark_source_message_needs_review(msg["id"])
            continue
        if result:
            insert_source_signal(
                message_id=msg["id"],
                channel_id=msg["channelId"],
                symbol=result.symbol,
                side=result.side,
                instrument=result.instrument,
                strike=result.strike,
                entry=result.entry,
                stop_loss=result.stop_loss,
                target=result.target,
                confidence=result.confidence,
                raw=msg["text"],
                parser="heuristic",
            )
            insert_source_parse_attempt(
                message_id=msg["id"],
                channel_id=msg["channelId"],
                parser="heuristic",
                model=None,
                status="parsed",
                confidence=result.confidence,
            )
            mark_source_message_parsed(msg["id"], "parsed")
            parsed += 1
            continue

        if llm_enabled():
            context = [dict(row) for row in source_message_context(msg["channelId"], msg["postedAt"])]
            outcome = parse_with_llm(message, context)
            insert_source_parse_attempt(
                message_id=msg["id"],
                channel_id=msg["channelId"],
                parser="ollama",
                model=OLLAMA_MODEL,
                status=outcome.status,
                confidence=outcome.confidence,
                prompt_hash=outcome.prompt_hash,
                response_json=outcome.response_json,
                error=outcome.error,
            )
            if outcome.signal:
                insert_source_signal(
                    message_id=msg["id"],
                    channel_id=msg["channelId"],
                    symbol=outcome.signal.symbol,
                    side=outcome.signal.side,
                    instrument=outcome.signal.instrument,
                    strike=outcome.signal.strike,
                    entry=outcome.signal.entry,
                    stop_loss=outcome.signal.stop_loss,
                    target=outcome.signal.target,
                    confidence=outcome.signal.confidence,
                    raw=msg["text"],
                    parser=f"ollama:{OLLAMA_MODEL}",
                )
                mark_source_message_parsed(msg["id"], "parsed")
                parsed += 1
            elif outcome.status in {"needs_review", "llm_error", "llm_unavailable"}:
                mark_source_message_needs_review(msg["id"])
            else:
                mark_source_message_parsed(msg["id"], "no_trade")
            continue

        insert_source_parse_attempt(
            message_id=msg["id"],
            channel_id=msg["channelId"],
            parser="heuristic",
            model=None,
            status="no_trade",
        )
        mark_source_message_parsed(msg["id"], "no_trade")
    return parsed


# ──────────────── Per-user parser ────────────────

def run_parser_for_user(user_id: int) -> int:
    parsed = 0
    for msg in unparsed_messages(user_id, limit=200):
        add_trade_slip_event_by_message(
            msg["id"],
            "PARSING",
            "Parsing signal",
            "Heuristic parser is reading the message.",
        )
        try:
            result = parse_signal(msg["text"])
        except Exception as exc:
            log.warning("user %d parser error msg=%s: %s", user_id, msg["id"], exc)
            mark_trade_slip_failed_by_message(msg["id"], "Parser error.")
            mark_message_parsed(msg["id"])
            continue
        if result:
            signal_id = insert_parsed_signal(
                user_id=user_id,
                message_id=msg["id"],
                channel_id=msg["channelId"],
                symbol=result.symbol,
                side=result.side,
                instrument=result.instrument,
                strike=result.strike,
                entry=result.entry,
                stop_loss=result.stop_loss,
                target=result.target,
                confidence=result.confidence,
                raw=msg["text"],
                parser="heuristic",
            )
            link_trade_slip_signal(
                message_id=msg["id"],
                signal_id=signal_id,
                symbol=result.symbol,
                side=result.side,
                instrument=result.instrument,
                entry=result.entry,
                stop_loss=result.stop_loss,
                target=result.target,
                targets=result.targets,
            )
            parsed += 1
        else:
            mark_trade_slip_failed_by_message(msg["id"], "Message did not contain a tradable signal.")
        mark_message_parsed(msg["id"])
    return parsed


# ──────────────── Per-user paper-trade simulation ────────────────

def _parse_iso(s: str) -> datetime:
    s = s.replace("Z", "+00:00")
    return datetime.fromisoformat(s)


def _resolve_ticker(symbol: str) -> str | None:
    return SYMBOL_TO_TICKER.get(symbol.upper())


def _lot_size(symbol: str, instrument: str) -> int:
    if instrument in ("CE", "PE"):
        return LOT_SIZES.get(symbol, 25)
    return 1


def simulate_one_trade(
    user_id: int,
    signal_id: int,
    channel_id: int,
    symbol: str,
    side: str,
    instrument: str,
    entry: float,
    stop_loss: float | None,
    target: float | None,
    posted_at: datetime,
) -> None:
    import yfinance as yf

    ticker = _resolve_ticker(symbol)
    if not ticker:
        trade_id = insert_paper_trade(
            user_id=user_id, signal_id=signal_id, channel_id=channel_id,
            symbol=symbol, side=side, instrument=instrument, entry=entry,
            stop_loss=stop_loss, target=target,
            exit_price=None, exit_reason="UNMAPPED",
            pnl=None, gross_pnl=None, costs_total=None, costs_breakdown_json=None,
            qty=1, opened_at=posted_at, closed_at=None,
        )
        link_trade_slip_trade(signal_id, trade_id, posted_at, None, "UNMAPPED")
        return

    now = datetime.now(timezone.utc)
    start = posted_at - timedelta(minutes=30)
    if (now - start).days > 55:
        start = now - timedelta(days=55)

    try:
        t = yf.Ticker(ticker)
        interval = "15m" if (now - start).days <= 55 else "1h"
        hist = t.history(
            start=start, end=now + timedelta(minutes=1), interval=interval, auto_adjust=False
        )
    except Exception as exc:
        log.warning("user %d yf history failed for %s: %s", user_id, ticker, exc)
        trade_id = insert_paper_trade(
            user_id=user_id, signal_id=signal_id, channel_id=channel_id,
            symbol=symbol, side=side, instrument=instrument, entry=entry,
            stop_loss=stop_loss, target=target,
            exit_price=None, exit_reason="DATA_ERROR",
            pnl=None, gross_pnl=None, costs_total=None, costs_breakdown_json=None,
            qty=1, opened_at=posted_at, closed_at=None,
        )
        link_trade_slip_trade(signal_id, trade_id, posted_at, None, "DATA_ERROR")
        return

    if hist is None or hist.empty:
        trade_id = insert_paper_trade(
            user_id=user_id, signal_id=signal_id, channel_id=channel_id,
            symbol=symbol, side=side, instrument=instrument, entry=entry,
            stop_loss=stop_loss, target=target,
            exit_price=None, exit_reason="NO_DATA",
            pnl=None, gross_pnl=None, costs_total=None, costs_breakdown_json=None,
            qty=1, opened_at=posted_at, closed_at=None,
        )
        link_trade_slip_trade(signal_id, trade_id, posted_at, None, "NO_DATA")
        return

    entry_spot = float(hist.iloc[0]["Open"])

    if instrument in ("CE", "PE") and target is not None and stop_loss is not None:
        target_move = (target - entry) / OPTION_DELTA
        sl_move = (stop_loss - entry) / OPTION_DELTA
        effective_side = "BUY" if (instrument == "CE" and side == "BUY") or (instrument == "PE" and side == "SELL") else "SELL"
        if effective_side == "BUY":
            target_spot = entry_spot + abs(target_move)
            sl_spot = entry_spot - abs(sl_move)
        else:
            target_spot = entry_spot - abs(target_move)
            sl_spot = entry_spot + abs(sl_move)
        sim_side = effective_side
    elif instrument in ("CE", "PE"):
        sim_side = side if instrument == "CE" else ("SELL" if side == "BUY" else "BUY")
        target_spot = sl_spot = None
    else:
        sim_side = side
        target_spot = target
        sl_spot = stop_loss

    exit_price: float | None = None
    exit_reason: str | None = None
    closed_at: datetime | None = None

    if target_spot is not None and sl_spot is not None:
        for idx, bar in hist.iloc[1:].iterrows():
            hi = float(bar["High"])
            lo = float(bar["Low"])
            if sim_side == "BUY":
                if hi >= target_spot:
                    exit_price = target_spot; exit_reason = "TARGET"
                elif lo <= sl_spot:
                    exit_price = sl_spot; exit_reason = "SL"
            else:
                if lo <= target_spot:
                    exit_price = target_spot; exit_reason = "TARGET"
                elif hi >= sl_spot:
                    exit_price = sl_spot; exit_reason = "SL"
            if exit_price is not None:
                ts = idx.to_pydatetime()
                if ts.tzinfo is None:
                    ts = ts.replace(tzinfo=timezone.utc)
                closed_at = ts
                break

    if exit_price is None:
        last_close = float(hist.iloc[-1]["Close"])
        elapsed = now - posted_at
        if elapsed > timedelta(hours=6) or target_spot is None:
            exit_price = last_close
            exit_reason = "EOD"
            ts = hist.index[-1].to_pydatetime()
            closed_at = ts.replace(tzinfo=timezone.utc) if ts.tzinfo is None else ts

    gross_pnl: float | None = None
    net_pnl: float | None = None
    costs_total: float | None = None
    costs_json: str | None = None
    stored_entry = entry
    stored_exit: float | None = None
    qty = _lot_size(symbol, instrument)

    if exit_price is not None:
        spot_move = exit_price - entry_spot
        if sim_side == "SELL":
            spot_move = -spot_move

        if instrument in ("CE", "PE"):
            gross_pnl = round(spot_move * OPTION_DELTA * qty, 2)
            if exit_reason == "TARGET" and target is not None:
                stored_exit = target
            elif exit_reason == "SL" and stop_loss is not None:
                stored_exit = stop_loss
            else:
                premium_change = spot_move * OPTION_DELTA
                stored_exit = round(entry + premium_change, 2) if side == "BUY" else round(entry - premium_change, 2)
        else:
            stored_entry = round(entry_spot, 2)
            stored_exit = round(exit_price, 2)
            gross_pnl = round(spot_move, 2)

        # Compute realistic Indian transaction costs and apply to net P&L
        try:
            cb = compute_costs(
                instrument=instrument,
                side=side,
                entry_price=stored_entry,
                exit_price=stored_exit if stored_exit is not None else stored_entry,
                qty=qty,
            )
            costs_total = round(cb.total(), 2)
            costs_json = _json.dumps(cb.to_dict())
            net_pnl = round((gross_pnl or 0.0) - costs_total, 2)
        except Exception as exc:
            log.warning("user %d cost calc failed sig=%s: %s", user_id, signal_id, exc)
            net_pnl = gross_pnl

    trade_id = insert_paper_trade(
        user_id=user_id, signal_id=signal_id, channel_id=channel_id,
        symbol=symbol, side=side, instrument=instrument, entry=stored_entry,
        stop_loss=stop_loss, target=target,
        exit_price=stored_exit, exit_reason=exit_reason,
        pnl=net_pnl, gross_pnl=gross_pnl, costs_total=costs_total, costs_breakdown_json=costs_json,
        qty=qty, opened_at=posted_at, closed_at=closed_at,
    )
    link_trade_slip_trade(signal_id, trade_id, posted_at, closed_at, exit_reason)


def run_paper_for_user(user_id: int) -> int:
    sigs = signals_without_trades(user_id, limit=50)
    count = 0
    for s in sigs:
        try:
            simulate_one_trade(
                user_id=user_id,
                signal_id=s["id"],
                channel_id=s["channelId"],
                symbol=s["symbol"],
                side=s["side"],
                instrument=s["instrument"],
                entry=s["entry"],
                stop_loss=s["stopLoss"],
                target=s["target"],
                posted_at=_parse_iso(s["postedAt"]),
            )
            count += 1
        except Exception as exc:
            log.warning("user %d paper sim failed for sig %s: %s", user_id, s["id"], exc)
            traceback.print_exc()
    return count


# ──────────────── Global yfinance polling ────────────────

def run_yfinance_tick() -> int:
    import yfinance as yf
    tickers = [t[0] for t in DEMO_SYMBOLS]
    for ticker, name, kind in DEMO_SYMBOLS:
        upsert_symbol(ticker, name, kind)
    try:
        data = yf.download(
            tickers=" ".join(tickers), period="2d", interval="1m",
            progress=False, group_by="ticker", threads=True, auto_adjust=False,
        )
    except Exception as exc:
        log.warning("yfinance download failed: %s", exc)
        return 0

    count = 0
    for ticker in tickers:
        try:
            df = data[ticker] if len(tickers) > 1 else data
            if df is None or df.empty:
                continue
            last_close = float(df["Close"].dropna().iloc[-1])
            first_close = float(df["Close"].dropna().iloc[0])
            change_pct = ((last_close - first_close) / first_close) * 100 if first_close else None
            insert_price_tick(ticker, last_close, change_pct)
            count += 1
        except Exception as exc:
            log.warning("price tick for %s failed: %s", ticker, exc)
    return count


# ──────────────── Main loop ────────────────

async def main():
    log.info("booting multi-user worker · db=%s", WORKER_DIR.parent / "demo.db")
    ensure_trade_slip_tables()
    ensure_admin_source_tables()
    clients = UserClients()
    admin_source = AdminSourceIngestor()
    loop = asyncio.get_event_loop()

    last_yf = 0.0
    last_source_channels = 0.0
    last_source_history = 0.0
    last_source_parse = 0.0
    user_last_tg: dict[int, float] = {}
    user_last_parse: dict[int, float] = {}
    user_last_paper: dict[int, float] = {}
    user_status: dict[int, str] = {}

    try:
        while True:
            now_t = loop.time()

            # Admin-owned Telegram source. A Telethon NewMessage handler stores
            # real-time messages while these ticks discover and backfill channels.
            source_client = await admin_source.ensure_connected()
            if source_client:
                try:
                    if now_t - last_source_channels > 60:
                        ch = await sync_source_channels(source_client)
                        log.info("admin synced %d source channels", ch)
                        last_source_channels = now_t

                    if now_t - last_source_history > 60:
                        m = await sync_source_messages(source_client, limit=50)
                        if m:
                            log.info("admin source backfilled %d messages", m)
                        last_source_history = now_t

                    if now_t - last_source_parse > 10:
                        p = await loop.run_in_executor(EXECUTOR, run_source_parser)
                        if p:
                            log.info("admin source parsed %d signals", p)
                        last_source_parse = now_t
                except Exception as exc:
                    log.error("admin source tick error: %s", exc)
                    traceback.print_exc()

            # Discover users + their service status
            users = list_active_users()

            # Per-user work
            for u in users:
                user_id = u["userId"]
                running = user_service_is_running(user_id)
                prev = user_status.get(user_id)
                cur = "running" if running else "stopped"
                if prev != cur:
                    log.info("user %d service: %s", user_id, cur)
                    user_status[user_id] = cur

                if not running:
                    continue

                client = await clients.get(user_id, u["sessionPath"])
                if not client:
                    continue

                try:
                    if now_t - user_last_tg.get(user_id, 0) > 60:
                        ch = await sync_channels_for_user(client, user_id)
                        log.info("user %d synced %d channels", user_id, ch)
                        m = await sync_messages_for_user(client, user_id, limit_per_channel=100) if False else await sync_messages_for_user(client, user_id, limit=100)
                        if m:
                            log.info("user %d ingested %d new messages", user_id, m)
                        user_last_tg[user_id] = now_t

                    if now_t - user_last_parse.get(user_id, 0) > 15:
                        p = await loop.run_in_executor(EXECUTOR, run_parser_for_user, user_id)
                        if p:
                            log.info("user %d parsed %d signals", user_id, p)
                        user_last_parse[user_id] = now_t

                    if now_t - user_last_paper.get(user_id, 0) > 30:
                        t = await loop.run_in_executor(EXECUTOR, run_paper_for_user, user_id)
                        if t:
                            log.info("user %d simulated %d paper trades", user_id, t)
                        user_last_paper[user_id] = now_t
                except Exception as exc:
                    log.error("user %d tick error: %s", user_id, exc)
                    traceback.print_exc()

            # Global yfinance tick (any active user with running status triggers it)
            any_running = any(user_service_is_running(u["userId"]) for u in users)
            if any_running and now_t - last_yf > 15:
                y = await loop.run_in_executor(EXECUTOR, run_yfinance_tick)
                if y:
                    log.info("price ticks updated: %d symbols", y)
                last_yf = now_t

            await asyncio.sleep(2)
    finally:
        await admin_source.disconnect()
        await clients.disconnect_all()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        log.info("shutting down")
