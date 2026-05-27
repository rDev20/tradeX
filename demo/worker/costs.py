"""Indian F&O / equity transaction cost calculator.

Based on Zerodha-equivalent rates (Apr 2026).
All percentages are stored as fractions (0.001 = 0.1%).
"""
from __future__ import annotations

from dataclasses import dataclass

# Brokerage: ₹20 flat per executed order. Round-trip = ₹40.
BROKERAGE_PER_ORDER = 20.0

# STT (Securities Transaction Tax) — applied on SELL side only
STT_OPTIONS_PREMIUM = 0.000625  # 0.0625% on premium
STT_FUTURES = 0.0001            # 0.01%
STT_EQUITY_INTRADAY = 0.00025   # 0.025%
STT_EQUITY_DELIVERY = 0.001     # 0.1%

# Exchange transaction charges
EXCH_OPTIONS_PREMIUM = 0.00053  # 0.053% on premium
EXCH_FUTURES = 0.0000183        # 0.00183%
EXCH_EQUITY = 0.0000345         # 0.00345%

# SEBI charges — ₹10 per crore = 0.0001%
SEBI_RATE = 0.000001

# Stamp duty (BUY side only)
STAMP_FNO = 0.00002    # 0.002% on F&O notional buy
STAMP_EQUITY_DELIVERY = 0.00015  # 0.015% on equity delivery buy
STAMP_EQUITY_INTRADAY = 0.00003  # 0.003% on intraday

# GST: 18% on (brokerage + exchange + SEBI)
GST_RATE = 0.18


@dataclass
class CostBreakdown:
    brokerage: float
    stt: float
    exchange: float
    sebi: float
    stamp: float
    gst: float

    def total(self) -> float:
        return self.brokerage + self.stt + self.exchange + self.sebi + self.stamp + self.gst

    def to_dict(self) -> dict:
        return {
            "brokerage": round(self.brokerage, 2),
            "stt": round(self.stt, 2),
            "exchange": round(self.exchange, 2),
            "sebi": round(self.sebi, 2),
            "stamp": round(self.stamp, 2),
            "gst": round(self.gst, 2),
            "total": round(self.total(), 2),
        }


def compute_costs(
    *,
    instrument: str,  # EQ | INDEX | CE | PE | FUT
    side: str,        # BUY | SELL (the signal direction)
    entry_price: float,
    exit_price: float,
    qty: int,
) -> CostBreakdown:
    """Compute realistic Indian transaction costs for a round-trip paper trade.

    For options (CE/PE), entry/exit are PREMIUM prices (per unit), qty is the lot size.
    For equity/index spot, entry/exit are share prices.
    """
    # Round-trip = entry + exit, each treated as one order
    buy_value = entry_price * qty if side == "BUY" else exit_price * qty
    sell_value = exit_price * qty if side == "BUY" else entry_price * qty
    total_turnover = buy_value + sell_value

    brokerage = 2 * BROKERAGE_PER_ORDER  # entry + exit
    stt = 0.0
    exchange = 0.0
    stamp = 0.0

    inst = instrument.upper()
    if inst in ("CE", "PE"):
        # Options: STT on sell-side premium, exchange on premium turnover, stamp on buy notional
        stt = sell_value * STT_OPTIONS_PREMIUM
        exchange = total_turnover * EXCH_OPTIONS_PREMIUM
        stamp = buy_value * STAMP_FNO
    elif inst == "FUT":
        stt = sell_value * STT_FUTURES
        exchange = total_turnover * EXCH_FUTURES
        stamp = buy_value * STAMP_FNO
    elif inst == "INDEX":
        # Treat index spot as equity intraday (no real instrument; for demo)
        stt = sell_value * STT_EQUITY_INTRADAY
        exchange = total_turnover * EXCH_EQUITY
        stamp = buy_value * STAMP_EQUITY_INTRADAY
    else:  # EQ
        # Default to intraday rates (most retail equity F&O followers are intraday)
        stt = sell_value * STT_EQUITY_INTRADAY
        exchange = total_turnover * EXCH_EQUITY
        stamp = buy_value * STAMP_EQUITY_INTRADAY

    sebi = total_turnover * SEBI_RATE
    gst = (brokerage + exchange + sebi) * GST_RATE

    return CostBreakdown(
        brokerage=brokerage,
        stt=stt,
        exchange=exchange,
        sebi=sebi,
        stamp=stamp,
        gst=gst,
    )
