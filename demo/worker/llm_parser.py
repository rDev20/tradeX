"""Local LLM parser for Telegram source messages.

The heuristic parser remains the first pass. This module is a gated fallback
for messages that need channel context or contain shorthand.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any

from parser import ParsedSignal


OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:3b-instruct")
LLM_CONFIDENCE_MIN = float(os.environ.get("LLM_CONFIDENCE_MIN", "0.78"))
LLM_TIMEOUT_SECONDS = int(os.environ.get("LLM_TIMEOUT_SECONDS", "45"))

VALID_SYMBOLS = {
    "NIFTY",
    "BANKNIFTY",
    "FINNIFTY",
    "MIDCPNIFTY",
    "SENSEX",
    "RELIANCE",
    "TCS",
    "HDFCBANK",
    "HDFC",
    "INFY",
    "ICICIBANK",
    "ICICI",
    "SBIN",
    "SBI",
    "BAJFINANCE",
    "ADANIENT",
    "MARUTI",
    "AXISBANK",
    "KOTAKBANK",
    "LT",
    "WIPRO",
    "HCLTECH",
    "ITC",
    "ONGC",
    "BPCL",
    "TATASTEEL",
    "JSWSTEEL",
}

SYSTEM_PROMPT = """You extract Indian trading intent from Telegram channel messages.
Return only valid JSON. Never invent prices or symbols.
Use the current message as primary evidence. Use previous messages only to resolve shorthand or split calls.
If the message is market commentary, greeting, profit booking, target hit, stop-loss update, or a continuation that cannot form a complete new trade, set is_trade=false or needs_review=true.
If a trade call is complete, extract one new trade only.
Valid message_type values: new_trade, update, no_trade, needs_review.
Valid side values: BUY, SELL.
Valid instrument values: EQ, INDEX, CE, PE, FUT.
For options, symbol should be the index or equity root, strike should be numeric when present, and instrument should be CE or PE.
Targets must be an array of numeric target prices. Do not put stop loss into targets.
Confidence must be between 0 and 1.
"""


@dataclass
class LlmParseOutcome:
    status: str
    response_json: str | None = None
    prompt_hash: str | None = None
    confidence: float | None = None
    signal: ParsedSignal | None = None
    error: str | None = None


def llm_enabled() -> bool:
    return os.environ.get("LLM_PARSE_ENABLED", "").strip().lower() in {"1", "true", "yes", "on"}


def parse_with_llm(message: dict[str, Any], context: list[dict[str, Any]]) -> LlmParseOutcome:
    prompt = _build_prompt(message, context)
    prompt_hash = hashlib.sha256(prompt.encode("utf-8")).hexdigest()[:16]

    try:
        payload = {
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "system": SYSTEM_PROMPT,
            "format": "json",
            "stream": False,
            "options": {"temperature": 0, "num_ctx": 4096},
        }
        raw = _post_json(f"{OLLAMA_URL.rstrip('/')}/api/generate", payload, LLM_TIMEOUT_SECONDS)
        response_text = str(raw.get("response") or "").strip()
        parsed = json.loads(response_text)
    except (urllib.error.URLError, TimeoutError) as exc:
        return LlmParseOutcome(status="llm_unavailable", prompt_hash=prompt_hash, error=str(exc))
    except Exception as exc:
        return LlmParseOutcome(status="llm_error", prompt_hash=prompt_hash, error=str(exc))

    compact_json = json.dumps(parsed, separators=(",", ":"), ensure_ascii=True)
    status, signal, confidence = _validate_response(parsed)
    return LlmParseOutcome(
        status=status,
        response_json=compact_json,
        prompt_hash=prompt_hash,
        confidence=confidence,
        signal=signal,
    )


def _build_prompt(message: dict[str, Any], context: list[dict[str, Any]]) -> str:
    context_rows = []
    for row in context:
        marker = "CURRENT" if int(row["id"]) == int(message["id"]) else "PREVIOUS"
        context_rows.append(
            {
                "role": marker,
                "message_id": row["id"],
                "telegram_message_id": row.get("tgMessageId"),
                "posted_at": row.get("postedAt"),
                "parse_status": row.get("parseStatus"),
                "text": row.get("text"),
            }
        )

    contract = {
        "is_trade": "boolean",
        "message_type": "new_trade|update|no_trade|needs_review",
        "symbol": "string|null",
        "side": "BUY|SELL|null",
        "instrument": "EQ|INDEX|CE|PE|FUT|null",
        "strike": "number|null",
        "entry": "number|null",
        "stop_loss": "number|null",
        "targets": ["number"],
        "confidence": "number",
        "depends_on_message_ids": ["number"],
        "reason": "short string",
    }
    return json.dumps(
        {
            "task": "Extract a complete new trade call from CURRENT if present.",
            "channel": message.get("channelName"),
            "current_message_id": message["id"],
            "schema": contract,
            "messages": context_rows,
        },
        ensure_ascii=True,
    )


def _post_json(url: str, payload: dict[str, Any], timeout: int) -> dict[str, Any]:
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _validate_response(data: dict[str, Any]) -> tuple[str, ParsedSignal | None, float | None]:
    confidence = _num(data.get("confidence"))
    message_type = str(data.get("message_type") or "").lower()
    is_trade = bool(data.get("is_trade"))
    if not is_trade or message_type != "new_trade":
        return ("needs_review" if message_type == "needs_review" else "no_trade", None, confidence)
    if confidence is None or confidence < LLM_CONFIDENCE_MIN:
        return "needs_review", None, confidence

    symbol = _clean_symbol(data.get("symbol"))
    side = str(data.get("side") or "").upper()
    instrument = str(data.get("instrument") or "").upper()
    strike = _num(data.get("strike"))
    entry = _num(data.get("entry"))
    stop_loss = _num(data.get("stop_loss"))
    targets = [_num(x) for x in data.get("targets") or []]
    targets = [x for x in targets if x is not None]

    if symbol not in VALID_SYMBOLS or side not in {"BUY", "SELL"}:
        return "needs_review", None, confidence
    if instrument not in {"EQ", "INDEX", "CE", "PE", "FUT"} or entry is None:
        return "needs_review", None, confidence
    if instrument in {"CE", "PE"} and strike is None:
        # Some channels omit strike in follow-up messages. Do not auto-accept.
        return "needs_review", None, confidence
    if entry <= 0 or entry > 1_000_000:
        return "needs_review", None, confidence
    if stop_loss is not None and (stop_loss <= 0 or stop_loss > 1_000_000):
        return "needs_review", None, confidence
    if any(target <= 0 or target > 1_000_000 for target in targets):
        return "needs_review", None, confidence

    return (
        "parsed",
        ParsedSignal(
            symbol=symbol,
            side=side,
            instrument=instrument,
            strike=strike,
            entry=entry,
            stop_loss=stop_loss,
            target=targets[0] if targets else None,
            targets=targets,
            confidence=confidence,
        ),
        confidence,
    )


def _num(value: Any) -> float | None:
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return float(value)
    match = re.search(r"\d{1,7}(?:\.\d{1,2})?", str(value).replace(",", ""))
    return float(match.group(0)) if match else None


def _clean_symbol(value: Any) -> str | None:
    if not value:
        return None
    symbol = re.sub(r"[^A-Z0-9&]", "", str(value).upper())
    aliases = {"BANKNIFTY": "BANKNIFTY", "BANKNIFTY50": "BANKNIFTY", "NIFTY50": "NIFTY"}
    return aliases.get(symbol, symbol)
