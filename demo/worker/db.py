"""SQLite helpers — multi-tenant. All domain queries take userId."""
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "demo.db"


def iso(dt: datetime | None = None) -> str:
    dt = dt or datetime.now(timezone.utc)
    return dt.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


@contextmanager
def conn():
    c = sqlite3.connect(str(DB_PATH), isolation_level=None)
    c.execute("PRAGMA journal_mode=WAL")
    c.execute("PRAGMA foreign_keys=ON")
    c.row_factory = sqlite3.Row
    try:
        yield c
    finally:
        c.close()


# ────────── Trade slips (per-user execution timeline) ──────────

def ensure_trade_slip_tables() -> None:
    with conn() as c:
        c.execute(
            """
            CREATE TABLE IF NOT EXISTS TradeSlip (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              userId INTEGER NOT NULL,
              channelId INTEGER NOT NULL,
              messageId INTEGER NOT NULL UNIQUE,
              signalId INTEGER UNIQUE,
              tradeId INTEGER UNIQUE,
              status TEXT NOT NULL DEFAULT 'RECEIVED',
              moneyMode TEXT NOT NULL DEFAULT 'paper',
              symbol TEXT,
              side TEXT,
              instrument TEXT,
              entry REAL,
              stopLoss REAL,
              target REAL,
              receivedAt DATETIME NOT NULL,
              executedAt DATETIME,
              closedAt DATETIME,
              createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY(userId) REFERENCES User(id) ON DELETE CASCADE,
              FOREIGN KEY(channelId) REFERENCES Channel(id) ON DELETE CASCADE,
              FOREIGN KEY(messageId) REFERENCES Message(id) ON DELETE CASCADE,
              FOREIGN KEY(signalId) REFERENCES ParsedSignal(id) ON DELETE SET NULL,
              FOREIGN KEY(tradeId) REFERENCES PaperTrade(id) ON DELETE SET NULL
            )
            """
        )
        c.execute("CREATE INDEX IF NOT EXISTS TradeSlip_userId_channelId_receivedAt_idx ON TradeSlip(userId, channelId, receivedAt)")
        c.execute("CREATE INDEX IF NOT EXISTS TradeSlip_status_idx ON TradeSlip(status)")
        c.execute(
            """
            CREATE TABLE IF NOT EXISTS TradeSlipEvent (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              slipId INTEGER NOT NULL,
              stage TEXT NOT NULL,
              label TEXT NOT NULL,
              detail TEXT,
              status TEXT NOT NULL DEFAULT 'done',
              occurredAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              position INTEGER NOT NULL,
              FOREIGN KEY(slipId) REFERENCES TradeSlip(id) ON DELETE CASCADE
            )
            """
        )
        c.execute("CREATE INDEX IF NOT EXISTS TradeSlipEvent_slipId_position_idx ON TradeSlipEvent(slipId, position)")
        c.execute(
            """
            CREATE TABLE IF NOT EXISTS TradeTargetLeg (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              slipId INTEGER NOT NULL,
              label TEXT NOT NULL,
              price REAL NOT NULL,
              status TEXT NOT NULL DEFAULT 'pending',
              hitAt DATETIME,
              position INTEGER NOT NULL,
              FOREIGN KEY(slipId) REFERENCES TradeSlip(id) ON DELETE CASCADE
            )
            """
        )
        c.execute("CREATE INDEX IF NOT EXISTS TradeTargetLeg_slipId_position_idx ON TradeTargetLeg(slipId, position)")


def ensure_admin_source_tables() -> None:
    with conn() as c:
        user_columns = {row["name"] for row in c.execute("PRAGMA table_info(User)").fetchall()}
        if "role" not in user_columns:
            c.execute("ALTER TABLE User ADD COLUMN role TEXT NOT NULL DEFAULT 'user'")
        c.execute(
            "UPDATE User SET role = 'admin', fullName = 'Karaan Bansall' "
            "WHERE phone = '+919811856777'"
        )
        c.execute(
            """
            CREATE TABLE IF NOT EXISTS SourceChannel (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              tgId TEXT NOT NULL UNIQUE,
              name TEXT NOT NULL,
              username TEXT,
              selected INTEGER NOT NULL DEFAULT 0,
              addedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        c.execute("CREATE INDEX IF NOT EXISTS SourceChannel_selected_idx ON SourceChannel(selected)")
        c.execute(
            """
            CREATE TABLE IF NOT EXISTS SourceMessage (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              channelId INTEGER NOT NULL,
              tgMessageId TEXT NOT NULL,
              text TEXT NOT NULL,
              postedAt DATETIME NOT NULL,
              parsed INTEGER NOT NULL DEFAULT 0,
              createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY(channelId) REFERENCES SourceChannel(id) ON DELETE CASCADE
            )
            """
        )
        c.execute("CREATE UNIQUE INDEX IF NOT EXISTS SourceMessage_channelId_tgMessageId_key ON SourceMessage(channelId, tgMessageId)")
        c.execute("CREATE INDEX IF NOT EXISTS SourceMessage_postedAt_idx ON SourceMessage(postedAt)")
        c.execute("CREATE INDEX IF NOT EXISTS SourceMessage_channelId_postedAt_idx ON SourceMessage(channelId, postedAt)")
        c.execute(
            """
            CREATE TABLE IF NOT EXISTS SourceSignal (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              messageId INTEGER NOT NULL UNIQUE,
              channelId INTEGER NOT NULL,
              symbol TEXT NOT NULL,
              side TEXT NOT NULL,
              instrument TEXT NOT NULL,
              strike REAL,
              entry REAL NOT NULL,
              stopLoss REAL,
              target REAL,
              confidence REAL NOT NULL DEFAULT 0.5,
              raw TEXT NOT NULL,
              parser TEXT NOT NULL DEFAULT 'heuristic',
              parsedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY(messageId) REFERENCES SourceMessage(id) ON DELETE CASCADE,
              FOREIGN KEY(channelId) REFERENCES SourceChannel(id) ON DELETE CASCADE
            )
            """
        )
        c.execute("CREATE INDEX IF NOT EXISTS SourceSignal_channelId_idx ON SourceSignal(channelId)")
        c.execute("CREATE INDEX IF NOT EXISTS SourceSignal_parsedAt_idx ON SourceSignal(parsedAt)")


def _slip_id_for_message(c: sqlite3.Connection, message_id: int) -> int | None:
    row = c.execute("SELECT id FROM TradeSlip WHERE messageId = ?", (message_id,)).fetchone()
    return row["id"] if row else None


def _slip_id_for_signal(c: sqlite3.Connection, signal_id: int) -> int | None:
    row = c.execute("SELECT id FROM TradeSlip WHERE signalId = ?", (signal_id,)).fetchone()
    return row["id"] if row else None


def _add_slip_event(
    c: sqlite3.Connection,
    slip_id: int,
    stage: str,
    label: str,
    detail: str | None = None,
    status: str = "done",
    occurred_at: datetime | None = None,
) -> None:
    row = c.execute(
        "SELECT COALESCE(MAX(position), 0) + 1 AS nextPosition FROM TradeSlipEvent WHERE slipId = ?",
        (slip_id,),
    ).fetchone()
    c.execute(
        "INSERT INTO TradeSlipEvent(slipId, stage, label, detail, status, occurredAt, position) "
        "VALUES(?, ?, ?, ?, ?, ?, ?)",
        (slip_id, stage, label, detail, status, iso(occurred_at), row["nextPosition"]),
    )


def ensure_trade_slip_for_message(
    user_id: int,
    channel_id: int,
    message_id: int,
    received_at: datetime,
) -> int:
    ensure_trade_slip_tables()
    with conn() as c:
        existing = _slip_id_for_message(c, message_id)
        if existing:
            return existing
        cur = c.execute(
            "INSERT INTO TradeSlip(userId, channelId, messageId, status, moneyMode, receivedAt, createdAt, updatedAt) "
            "VALUES(?, ?, ?, 'RECEIVED', 'paper', ?, ?, ?)",
            (user_id, channel_id, message_id, iso(received_at), iso(), iso()),
        )
        slip_id = cur.lastrowid
        _add_slip_event(c, slip_id, "MESSAGE_RECEIVED", "Message received", "Telegram message entered tradeX.")
        return slip_id


def add_trade_slip_event_by_message(
    message_id: int,
    stage: str,
    label: str,
    detail: str | None = None,
    status: str = "done",
) -> None:
    ensure_trade_slip_tables()
    with conn() as c:
        slip_id = _slip_id_for_message(c, message_id)
        if not slip_id:
            return
        _add_slip_event(c, slip_id, stage, label, detail, status)


def mark_trade_slip_failed_by_message(message_id: int, detail: str) -> None:
    ensure_trade_slip_tables()
    with conn() as c:
        slip_id = _slip_id_for_message(c, message_id)
        if not slip_id:
            return
        _add_slip_event(c, slip_id, "FAILED", "No trade executed", detail, "failed")
        c.execute(
            "UPDATE TradeSlip SET status = 'FAILED', updatedAt = ? WHERE id = ?",
            (iso(), slip_id),
        )


def link_trade_slip_signal(
    message_id: int,
    signal_id: int,
    symbol: str,
    side: str,
    instrument: str,
    entry: float,
    stop_loss: float | None,
    target: float | None,
    targets: list[float],
) -> None:
    ensure_trade_slip_tables()
    with conn() as c:
        slip_id = _slip_id_for_message(c, message_id)
        if not slip_id:
            return
        c.execute(
            "UPDATE TradeSlip SET signalId = ?, status = 'READY', symbol = ?, side = ?, instrument = ?, "
            "entry = ?, stopLoss = ?, target = ?, updatedAt = ? WHERE id = ?",
            (signal_id, symbol, side, instrument, entry, stop_loss, target, iso(), slip_id),
        )
        _add_slip_event(c, slip_id, "STOCK_DETECTED", "Stock detected", f"{side} {symbol} at {entry}.")
        _add_slip_event(c, slip_id, "PAPER_READY", "Paper simulator ready", "Paper trading mode skips broker connection.")
        c.execute("DELETE FROM TradeTargetLeg WHERE slipId = ?", (slip_id,))
        for index, price in enumerate(targets or ([target] if target is not None else []), start=1):
            c.execute(
                "INSERT INTO TradeTargetLeg(slipId, label, price, status, position) VALUES(?, ?, ?, 'pending', ?)",
                (slip_id, f"T{index}", price, index),
            )


def link_trade_slip_trade(
    signal_id: int,
    trade_id: int,
    executed_at: datetime,
    closed_at: datetime | None,
    exit_reason: str | None,
) -> None:
    ensure_trade_slip_tables()
    with conn() as c:
        slip_id = _slip_id_for_signal(c, signal_id)
        if not slip_id:
            return
        if exit_reason in ("UNMAPPED", "DATA_ERROR", "NO_DATA"):
            final_status = "FAILED"
            label = "Trade blocked"
            detail = exit_reason
            event_status = "failed"
        elif closed_at:
            final_status = "CLOSED"
            label = "Trade closed"
            detail = exit_reason or "Closed"
            event_status = "done"
        else:
            final_status = "TRACKING"
            label = "Tracking targets"
            detail = "Entry executed; waiting for target or stop-loss."
            event_status = "active"
        _add_slip_event(c, slip_id, "PRECHECKS", "Pre-checks passed", "Paper rules validated.")
        _add_slip_event(c, slip_id, "EXECUTING", "Executing trade", "Paper order sent to simulator.")
        _add_slip_event(c, slip_id, "ENTRY_EXECUTED", "Entry executed", "Paper position opened.", "done", executed_at)
        _add_slip_event(c, slip_id, final_status, label, detail, event_status, closed_at)
        c.execute(
            "UPDATE TradeSlip SET tradeId = ?, status = ?, executedAt = ?, closedAt = ?, updatedAt = ? WHERE id = ?",
            (trade_id, final_status, iso(executed_at), iso(closed_at) if closed_at else None, iso(), slip_id),
        )
        if closed_at and exit_reason == "TARGET":
            c.execute(
                "UPDATE TradeTargetLeg SET status = 'hit', hitAt = ? WHERE slipId = ? AND position = 1",
                (iso(closed_at), slip_id),
            )


# ────────── User & per-user service status ──────────

def list_active_users() -> list[sqlite3.Row]:
    """Users with a connected Telegram account."""
    with conn() as c:
        return c.execute(
            "SELECT u.id AS userId, u.email, u.fullName, "
            "       t.phone, t.sessionPath, t.tgUserId "
            "FROM User u "
            "JOIN UserTelegramAccount t ON t.userId = u.id "
            "WHERE t.connectedAt IS NOT NULL AND COALESCE(u.role, 'user') <> 'admin'"
        ).fetchall()


def user_service_is_running(user_id: int) -> bool:
    with conn() as c:
        row = c.execute(
            "SELECT status FROM UserServiceStatus WHERE userId = ?", (user_id,)
        ).fetchone()
        return bool(row and row["status"] == "running")


# ────────── Channels (per-user) ──────────

def upsert_channel(user_id: int, tg_id: str, name: str, username: str | None) -> int:
    with conn() as c:
        row = c.execute(
            "SELECT id FROM Channel WHERE userId = ? AND tgId = ?", (user_id, tg_id)
        ).fetchone()
        if row:
            c.execute(
                "UPDATE Channel SET name = ?, username = ? WHERE id = ?",
                (name, username, row["id"]),
            )
            return row["id"]
        cur = c.execute(
            "INSERT INTO Channel(userId, tgId, name, username, selected, mode, addedAt) "
            "VALUES(?, ?, ?, ?, 0, 'evaluation', ?)",
            (user_id, tg_id, name, username, iso()),
        )
        return cur.lastrowid


def selected_channels(user_id: int) -> list[sqlite3.Row]:
    with conn() as c:
        return c.execute(
            "SELECT id, tgId, name FROM Channel WHERE userId = ? AND selected = 1",
            (user_id,),
        ).fetchall()


# ────────── Messages (per-user) ──────────

def insert_message_if_new(
    user_id: int, channel_id: int, tg_message_id: str, text: str, posted_at: datetime
) -> int | None:
    with conn() as c:
        row = c.execute(
            "SELECT id FROM Message WHERE channelId = ? AND tgMessageId = ?",
            (channel_id, tg_message_id),
        ).fetchone()
        if row:
            return None
        cur = c.execute(
            "INSERT INTO Message(userId, channelId, tgMessageId, text, postedAt, parsed) "
            "VALUES(?, ?, ?, ?, ?, 0)",
            (user_id, channel_id, tg_message_id, text, iso(posted_at)),
        )
        message_id = cur.lastrowid
    ensure_trade_slip_for_message(user_id, channel_id, message_id, posted_at)
    return message_id


def unparsed_messages(user_id: int, limit: int = 200) -> list[sqlite3.Row]:
    with conn() as c:
        return c.execute(
            "SELECT m.id, m.channelId, m.text, m.postedAt, c.tgId AS cTgId "
            "FROM Message m JOIN Channel c ON c.id = m.channelId "
            "WHERE m.userId = ? AND m.parsed = 0 AND c.selected = 1 "
            "ORDER BY m.postedAt ASC LIMIT ?",
            (user_id, limit),
        ).fetchall()


def mark_message_parsed(message_id: int) -> None:
    with conn() as c:
        c.execute("UPDATE Message SET parsed = 1 WHERE id = ?", (message_id,))


# ────────── Parsed signals & paper trades (per-user) ──────────

def insert_parsed_signal(
    user_id: int,
    message_id: int,
    channel_id: int,
    symbol: str,
    side: str,
    instrument: str,
    strike: float | None,
    entry: float,
    stop_loss: float | None,
    target: float | None,
    confidence: float,
    raw: str,
    parser: str,
) -> int:
    with conn() as c:
        cur = c.execute(
            "INSERT INTO ParsedSignal(userId, messageId, channelId, symbol, side, instrument, "
            "strike, entry, stopLoss, target, confidence, raw, parser, parsedAt) "
            "VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                user_id, message_id, channel_id, symbol, side, instrument,
                strike, entry, stop_loss, target, confidence, raw, parser, iso(),
            ),
        )
        return cur.lastrowid


def signals_without_trades(user_id: int, limit: int = 50) -> list[sqlite3.Row]:
    with conn() as c:
        return c.execute(
            "SELECT s.id, s.channelId, s.symbol, s.side, s.instrument, "
            "s.entry, s.stopLoss, s.target, m.postedAt "
            "FROM ParsedSignal s "
            "JOIN Message m ON m.id = s.messageId "
            "LEFT JOIN PaperTrade t ON t.signalId = s.id "
            "WHERE s.userId = ? AND t.id IS NULL "
            "ORDER BY m.postedAt ASC LIMIT ?",
            (user_id, limit),
        ).fetchall()


def insert_paper_trade(
    user_id: int,
    signal_id: int,
    channel_id: int,
    symbol: str,
    side: str,
    instrument: str,
    entry: float,
    stop_loss: float | None,
    target: float | None,
    exit_price: float | None,
    exit_reason: str | None,
    pnl: float | None,
    gross_pnl: float | None,
    costs_total: float | None,
    costs_breakdown_json: str | None,
    qty: int,
    opened_at: datetime,
    closed_at: datetime | None,
) -> int:
    with conn() as c:
        cur = c.execute(
            "INSERT INTO PaperTrade(userId, signalId, channelId, symbol, side, instrument, entry, "
            "stopLoss, target, exit, exitReason, qty, pnl, grossPnl, costs, costsBreakdown, openedAt, closedAt) "
            "VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                user_id, signal_id, channel_id, symbol, side, instrument, entry,
                stop_loss, target, exit_price, exit_reason, qty, pnl, gross_pnl, costs_total, costs_breakdown_json,
                iso(opened_at), iso(closed_at) if closed_at else None,
            ),
        )
        return cur.lastrowid


# ────────── Global tables (no userId) ──────────

def upsert_symbol(ticker: str, display_name: str, kind: str) -> None:
    with conn() as c:
        c.execute(
            "INSERT INTO Symbol(ticker, displayName, kind) VALUES(?, ?, ?) "
            "ON CONFLICT(ticker) DO UPDATE SET displayName=excluded.displayName, kind=excluded.kind",
            (ticker, display_name, kind),
        )


def insert_price_tick(ticker: str, price: float, change: float | None) -> None:
    with conn() as c:
        c.execute(
            "INSERT INTO PriceTick(ticker, price, change, at) VALUES(?, ?, ?, ?)",
            (ticker, price, change, iso()),
        )


def log_service_event(user_id: int, event: str, note: str | None = None) -> None:
    with conn() as c:
        c.execute(
            "INSERT INTO ServiceEvent(userId, event, at, note) VALUES(?, ?, ?, ?)",
            (user_id, event, iso(), note),
        )


def get_admin_telegram_account() -> sqlite3.Row | None:
    ensure_admin_source_tables()
    with conn() as c:
        return c.execute(
            "SELECT u.id AS userId, u.email, u.fullName, t.phone, t.sessionPath, t.tgUserId "
            "FROM User u "
            "JOIN UserTelegramAccount t ON t.userId = u.id "
            "WHERE u.role = 'admin' AND t.connectedAt IS NOT NULL "
            "ORDER BY u.id ASC LIMIT 1"
        ).fetchone()


def upsert_source_channel(tg_id: str, name: str, username: str | None) -> int:
    ensure_admin_source_tables()
    with conn() as c:
        row = c.execute("SELECT id FROM SourceChannel WHERE tgId = ?", (tg_id,)).fetchone()
        if row:
            c.execute(
                "UPDATE SourceChannel SET name = ?, username = ?, updatedAt = ? WHERE id = ?",
                (name, username, iso(), row["id"]),
            )
            return row["id"]
        cur = c.execute(
            "INSERT INTO SourceChannel(tgId, name, username, selected, addedAt, updatedAt) "
            "VALUES(?, ?, ?, 0, ?, ?)",
            (tg_id, name, username, iso(), iso()),
        )
        return cur.lastrowid


def selected_source_channels() -> list[sqlite3.Row]:
    ensure_admin_source_tables()
    with conn() as c:
        return c.execute(
            "SELECT id, tgId, name FROM SourceChannel WHERE selected = 1 ORDER BY name ASC"
        ).fetchall()


def insert_source_message_if_new(
    channel_id: int, tg_message_id: str, text: str, posted_at: datetime
) -> int | None:
    ensure_admin_source_tables()
    with conn() as c:
        row = c.execute(
            "SELECT id FROM SourceMessage WHERE channelId = ? AND tgMessageId = ?",
            (channel_id, tg_message_id),
        ).fetchone()
        if row:
            return None
        cur = c.execute(
            "INSERT INTO SourceMessage(channelId, tgMessageId, text, postedAt, parsed, createdAt) "
            "VALUES(?, ?, ?, ?, 0, ?)",
            (channel_id, tg_message_id, text, iso(posted_at), iso()),
        )
        return cur.lastrowid


def unparsed_source_messages(limit: int = 200) -> list[sqlite3.Row]:
    ensure_admin_source_tables()
    with conn() as c:
        return c.execute(
            "SELECT m.id, m.channelId, m.text, m.postedAt, c.tgId AS cTgId "
            "FROM SourceMessage m JOIN SourceChannel c ON c.id = m.channelId "
            "WHERE m.parsed = 0 AND c.selected = 1 "
            "ORDER BY m.postedAt ASC LIMIT ?",
            (limit,),
        ).fetchall()


def mark_source_message_parsed(message_id: int) -> None:
    with conn() as c:
        c.execute("UPDATE SourceMessage SET parsed = 1 WHERE id = ?", (message_id,))


def insert_source_signal(
    message_id: int,
    channel_id: int,
    symbol: str,
    side: str,
    instrument: str,
    strike: float | None,
    entry: float,
    stop_loss: float | None,
    target: float | None,
    confidence: float,
    raw: str,
    parser: str,
) -> int:
    ensure_admin_source_tables()
    with conn() as c:
        cur = c.execute(
            "INSERT INTO SourceSignal(messageId, channelId, symbol, side, instrument, "
            "strike, entry, stopLoss, target, confidence, raw, parser, parsedAt) "
            "VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                message_id, channel_id, symbol, side, instrument,
                strike, entry, stop_loss, target, confidence, raw, parser, iso(),
            ),
        )
        return cur.lastrowid
