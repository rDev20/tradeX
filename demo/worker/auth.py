"""
Multi-user Telegram authentication via Telethon.

Outputs JSON to stdout for easy consumption from Node subprocess.

Usage:
    python auth.py request --user-id <id> --phone <phone>
        Sends OTP. Prints {"ok": true, "phone_code_hash": "...", "needs2FA": false}.

    python auth.py submit --user-id <id> --code <code> [--password <2fa_password>] [--phone-code-hash <hash>]
        Completes login. Prints {"ok": true, "tgUserId": "...", "firstName": "...", "username": null}.
        On 2FA needed: {"ok": false, "needs2FA": true}.

    python auth.py status --user-id <id>
        Reports session existence + authorization. Prints {"authorized": bool, "tgUserId": "...?"}.

Sessions are saved at sessions/user_<userId>.session.
"""
import argparse
import asyncio
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from telethon import TelegramClient
from telethon.errors import (
    SessionPasswordNeededError,
    PhoneNumberInvalidError,
    PhoneCodeInvalidError,
    PhoneCodeExpiredError,
    PasswordHashInvalidError,
)

WORKER_DIR = Path(__file__).parent
load_dotenv(WORKER_DIR.parent / ".env")

API_ID = int(os.environ["TELEGRAM_API_ID"])
API_HASH = os.environ["TELEGRAM_API_HASH"]

SESSION_DIR = WORKER_DIR / "sessions"
SESSION_DIR.mkdir(exist_ok=True)


def session_path(user_id: int) -> str:
    return str(SESSION_DIR / f"user_{user_id}")


def emit(obj: dict) -> None:
    sys.stdout.write(json.dumps(obj))
    sys.stdout.write("\n")
    sys.stdout.flush()


async def cmd_request(user_id: int, phone: str) -> int:
    client = TelegramClient(session_path(user_id), API_ID, API_HASH)
    await client.connect()
    try:
        if await client.is_user_authorized():
            await client.log_out()
            await client.disconnect()
            sf = Path(session_path(user_id) + ".session")
            if sf.exists():
                sf.unlink()
            client = TelegramClient(session_path(user_id), API_ID, API_HASH)
            await client.connect()
        try:
            result = await client.send_code_request(phone)
        except PhoneNumberInvalidError:
            emit({"ok": False, "error": "PHONE_INVALID", "message": "Phone number invalid."})
            return 0
        emit({
            "ok": True,
            "alreadyAuthorized": False,
            "phoneCodeHash": result.phone_code_hash,
        })
        return 0
    finally:
        await client.disconnect()


async def cmd_submit(
    user_id: int,
    phone: str,
    code: str,
    phone_code_hash: str | None = None,
    password: str | None = None,
) -> int:
    client = TelegramClient(session_path(user_id), API_ID, API_HASH)
    await client.connect()
    try:
        try:
            if phone_code_hash:
                await client.sign_in(phone=phone, code=code, phone_code_hash=phone_code_hash)
            else:
                await client.sign_in(phone=phone, code=code)
        except PhoneCodeInvalidError:
            emit({"ok": False, "error": "CODE_INVALID", "message": "The code is incorrect."})
            return 0
        except PhoneCodeExpiredError:
            emit({
                "ok": False,
                "error": "CODE_EXPIRED",
                "message": "The code has expired. Please request a new one.",
            })
            return 0
        except SessionPasswordNeededError:
            if not password:
                emit({"ok": False, "needs2FA": True, "message": "2FA password required."})
                return 0
            try:
                await client.sign_in(password=password)
            except PasswordHashInvalidError:
                emit({
                    "ok": False,
                    "error": "PASSWORD_INVALID",
                    "message": "The 2FA password is incorrect.",
                })
                return 0

        me = await client.get_me()
        emit({
            "ok": True,
            "tgUserId": str(me.id),
            "firstName": me.first_name,
            "username": me.username,
            "sessionPath": session_path(user_id) + ".session",
        })
        return 0
    finally:
        await client.disconnect()


async def cmd_status(user_id: int) -> int:
    client = TelegramClient(session_path(user_id), API_ID, API_HASH)
    await client.connect()
    try:
        if not await client.is_user_authorized():
            emit({"authorized": False})
            return 0
        me = await client.get_me()
        emit({
            "authorized": True,
            "tgUserId": str(me.id),
            "firstName": me.first_name,
            "username": me.username,
        })
        return 0
    finally:
        await client.disconnect()


async def cmd_disconnect(user_id: int) -> int:
    client = TelegramClient(session_path(user_id), API_ID, API_HASH)
    await client.connect()
    try:
        if await client.is_user_authorized():
            await client.log_out()
    finally:
        await client.disconnect()
    # remove session file
    sf = Path(session_path(user_id) + ".session")
    if sf.exists():
        sf.unlink()
    emit({"ok": True})
    return 0


def main():
    parser = argparse.ArgumentParser(description="tradeX multi-user Telegram auth")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_req = sub.add_parser("request")
    p_req.add_argument("--user-id", type=int, required=True)
    p_req.add_argument("--phone", required=True)

    p_sub = sub.add_parser("submit")
    p_sub.add_argument("--user-id", type=int, required=True)
    p_sub.add_argument("--phone", required=True)
    p_sub.add_argument("--code", required=True)
    p_sub.add_argument("--phone-code-hash")
    p_sub.add_argument("--password")

    p_stat = sub.add_parser("status")
    p_stat.add_argument("--user-id", type=int, required=True)

    p_disc = sub.add_parser("disconnect")
    p_disc.add_argument("--user-id", type=int, required=True)

    args = parser.parse_args()

    try:
        if args.cmd == "request":
            sys.exit(asyncio.run(cmd_request(args.user_id, args.phone)))
        elif args.cmd == "submit":
            sys.exit(
                asyncio.run(
                    cmd_submit(
                        args.user_id,
                        args.phone,
                        args.code,
                        args.phone_code_hash,
                        args.password,
                    )
                )
            )
        elif args.cmd == "status":
            sys.exit(asyncio.run(cmd_status(args.user_id)))
        elif args.cmd == "disconnect":
            sys.exit(asyncio.run(cmd_disconnect(args.user_id)))
    except Exception as exc:
        emit({"ok": False, "error": "EXCEPTION", "message": str(exc)})
        sys.exit(1)


if __name__ == "__main__":
    main()
