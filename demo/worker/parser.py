"""Heuristic signal parser for Indian F&O Telegram channels.

Handles common formats:
  BUY NIFTY 22500 CE @ 120 SL 100 TGT 150
  SELL BANKNIFTY 48000 PE above 200 sl 180 target 240
  RELIANCE Buy CMP 2850 Stop 2820 Target 2900
  Nifty 50 Buy 22450 SL 22380 Target 22550

Returns None if the text doesn't look like a tradable signal.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field


@dataclass
class ParsedSignal:
    symbol: str  # canonical symbol (NIFTY, BANKNIFTY, RELIANCE, etc.)
    side: str  # BUY | SELL
    instrument: str  # EQ | INDEX | CE | PE | FUT
    strike: float | None
    entry: float
    stop_loss: float | None
    target: float | None
    confidence: float
    targets: list[float] = field(default_factory=list)


INDEX_ALIASES = {
    "NIFTY": "NIFTY",
    "NIFTY50": "NIFTY",
    "NIFTY 50": "NIFTY",
    "BANKNIFTY": "BANKNIFTY",
    "BANK NIFTY": "BANKNIFTY",
    "BNF": "BANKNIFTY",
    "FINNIFTY": "FINNIFTY",
    "FIN NIFTY": "FINNIFTY",
    "MIDCPNIFTY": "MIDCPNIFTY",
    "SENSEX": "SENSEX",
}

COMMON_EQUITIES = {
    "RELIANCE", "TCS", "HDFCBANK", "HDFC", "INFY", "INFOSYS", "ICICIBANK",
    "ICICI", "SBIN", "SBI", "BAJFINANCE", "BAJAJFINANCE", "TATAMOTORS", "TATA MOTORS",
    "ADANIENT", "ADANI", "MARUTI", "MARUTISUZUKI", "AXISBANK", "AXIS",
    "KOTAKBANK", "KOTAK", "LT", "LARSEN", "WIPRO", "HCLTECH", "HCL",
    "BAJAJ AUTO", "BAJAJAUTO", "HINDUNILVR", "HINDUNILEVER", "ITC",
    "ASIANPAINT", "BRITANNIA", "NESTLEIND", "NESTLE", "TITAN", "ULTRACEMCO",
    "POWERGRID", "ONGC", "NTPC", "COALINDIA", "DRREDDY", "SUNPHARMA",
    "CIPLA", "TECHM", "TATACONSUM", "TATASTEEL", "JSWSTEEL", "M&M", "MAHINDRA",
    "GRASIM", "DIVISLAB", "HEROMOTOCO", "EICHERMOT", "BAJAJFINSV",
    "IOC", "INDUSIND", "ADANIPORTS", "APOLLOHOSP", "BPCL", "HDFCLIFE",
    "UPL", "SHREECEM", "BHARTIARTL", "AIRTEL", "DABUR", "MARICO",
    "VEDL", "VEDANTA", "JINDALSTEL", "GODREJCP", "PIDILITIND", "PIDILITE",
}

_RE_SIDE = re.compile(r"\b(BUY|SELL|LONG|SHORT)\b", re.IGNORECASE)
_RE_PRICE = re.compile(r"(?:(?:above|below|@|at|near|around|cmp)\s*)?(\d{1,6}(?:\.\d{1,2})?)", re.IGNORECASE)
_RE_OPTION = re.compile(r"\b(\d{3,6})\s*(CE|PE|CALL|PUT)\b", re.IGNORECASE)
_RE_SL = re.compile(r"\b(?:SL|S\.L|STOPLOSS|STOP\s+LOSS|STOP)\s*[:\-@]?\s*(\d{1,6}(?:\.\d{1,2})?)", re.IGNORECASE)
_RE_TGT = re.compile(r"\b(?:TGT|TARGET|TARGETS?|T\d?|T1)\s*[:\-@]?\s*(\d{1,6}(?:\.\d{1,2})?)", re.IGNORECASE)
_RE_ENTRY = re.compile(r"\b(?:ENTRY|BUY|SELL|CMP|@|ABOVE|BELOW|NEAR|AROUND)\s*[:\-@]?\s*(\d{1,6}(?:\.\d{1,2})?)", re.IGNORECASE)


def _canonicalize_symbol(s: str) -> tuple[str | None, str | None]:
    """Return (symbol, kind) where kind is INDEX | EQ | None."""
    s = s.strip().upper()
    if s in INDEX_ALIASES:
        return INDEX_ALIASES[s], "INDEX"
    if s in COMMON_EQUITIES:
        return s, "EQ"
    return None, None


def _detect_symbol(text: str) -> tuple[str | None, str | None]:
    upper = text.upper()
    # check multiword index aliases first
    for k, v in sorted(INDEX_ALIASES.items(), key=lambda x: -len(x[0])):
        if re.search(rf"\b{re.escape(k)}\b", upper):
            return v, "INDEX"
    for eq in sorted(COMMON_EQUITIES, key=lambda x: -len(x)):
        if re.search(rf"\b{re.escape(eq)}\b", upper):
            return eq.replace(" ", "").replace("&", ""), "EQ"
    return None, None


def parse_signal(text: str) -> ParsedSignal | None:
    if not text or len(text.strip()) < 8:
        return None

    # Reject obvious noise
    lower = text.lower()
    if any(kw in lower for kw in ["join", "subscribe", "whatsapp", "t.me/", "https://"]):
        # still try — a message might have links AND a signal
        pass

    side_m = _RE_SIDE.search(text)
    if not side_m:
        return None
    side_raw = side_m.group(1).upper()
    side = "BUY" if side_raw in ("BUY", "LONG") else "SELL"

    symbol, kind = _detect_symbol(text)
    if not symbol:
        return None

    option_m = _RE_OPTION.search(text)
    strike: float | None = None
    instrument = kind or "EQ"
    if option_m:
        strike = float(option_m.group(1))
        opt_kind = option_m.group(2).upper()
        instrument = "CE" if opt_kind in ("CE", "CALL") else "PE"

    sl_m = _RE_SL.search(text)
    tgt_m = _RE_TGT.search(text)
    entry_m = _RE_ENTRY.search(text)

    # Parse prices — entry, SL, target
    entry: float | None = None
    if entry_m:
        try:
            entry = float(entry_m.group(1))
        except ValueError:
            pass
    if entry is None:
        # fall back: first price after the BUY/SELL keyword
        tail = text[side_m.end():]
        m = re.search(r"(\d{1,6}(?:\.\d{1,2})?)", tail)
        if m:
            try:
                entry = float(m.group(1))
            except ValueError:
                pass
    if entry is None:
        return None

    stop_loss: float | None = None
    targets: list[float] = []
    if sl_m:
        try:
            stop_loss = float(sl_m.group(1))
        except ValueError:
            pass
    for tgt in _RE_TGT.finditer(text):
        try:
            price = float(tgt.group(1))
            if price not in targets:
                targets.append(price)
        except ValueError:
            pass
    target = targets[0] if targets else None

    # Sanity: for index options, strike might appear where entry is expected.
    # If entry == strike (and we have an option) try to re-extract entry differently.
    if instrument in ("CE", "PE") and strike is not None and entry == strike:
        # look for price after @ or CMP
        m = re.search(r"(?:@|cmp|at|above|below|near)\s*(\d{1,6}(?:\.\d{1,2})?)", text, re.IGNORECASE)
        if m:
            try:
                entry = float(m.group(1))
            except ValueError:
                pass

    # Confidence: based on how many fields we extracted
    conf = 0.5
    if stop_loss is not None:
        conf += 0.15
    if target is not None:
        conf += 0.15
    if instrument in ("CE", "PE") and strike is not None:
        conf += 0.1
    conf = min(conf, 0.95)

    return ParsedSignal(
        symbol=symbol,
        side=side,
        instrument=instrument,
        strike=strike,
        entry=entry,
        stop_loss=stop_loss,
        target=target,
        targets=targets,
        confidence=conf,
    )
