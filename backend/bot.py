"""Aiogram 3.x bot — /start command and group notifications."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path

# Ensure an active event loop exists for aiogram Dispatcher in Python 3.9
try:
    asyncio.get_event_loop()
except RuntimeError:
    asyncio.set_event_loop(asyncio.new_event_loop())

from aiogram import Bot, Dispatcher, Router, types
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo

from config import BOT_TOKEN, WEBAPP_URL, CHATS_JSON

bot = Bot(token=BOT_TOKEN)
router = Router()


def get_dispatcher() -> Dispatcher:
    """Create Dispatcher inside active event loop."""
    dp = Dispatcher()
    dp.include_router(router)
    return dp


# ── Chat tracking ────────────────────────────────────────────────────

def _load_chats() -> list[int]:
    if CHATS_JSON.exists():
        try:
            return json.loads(CHATS_JSON.read_text())
        except Exception:
            return []
    return []


def _save_chats(chats: list[int]) -> None:
    CHATS_JSON.write_text(json.dumps(chats))


def _add_chat(chat_id: int) -> None:
    chats = _load_chats()
    if chat_id not in chats:
        chats.append(chat_id)
        _save_chats(chats)


# ── /start command ───────────────────────────────────────────────────

@router.message(CommandStart())
async def cmd_start(message: types.Message):
    # Track group chats
    if message.chat.type in ("group", "supergroup"):
        _add_chat(message.chat.id)

    webapp_url = WEBAPP_URL or "https://localhost:8080"
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="🎬 Відкрити Friday Film",
            web_app=WebAppInfo(url=webapp_url),
        )]
    ])
    await message.answer(
        "🎬 *Friday Film* — ваш п'ятничний кіновечір!\n\n"
        "Натисніть кнопку нижче, щоб відкрити додаток:",
        reply_markup=keyboard,
        parse_mode="Markdown",
    )


# Also track group chats from any message
@router.message()
async def track_group(message: types.Message):
    if message.chat.type in ("group", "supergroup"):
        _add_chat(message.chat.id)


# ── Notification functions ───────────────────────────────────────────

async def notify_movie_added(title: str, user_name: str) -> None:
    """Notify all tracked group chats that a movie was added."""
    chats = _load_chats()
    text = f"🎬 *{title}* додано до списку!\n👤 Запропонував(ла): {user_name}"
    for chat_id in chats:
        try:
            await bot.send_message(chat_id, text, parse_mode="Markdown")
        except Exception:
            pass


async def notify_movie_selected(title: str) -> None:
    """Notify all tracked group chats that a movie was selected by the wheel."""
    chats = _load_chats()
    text = f"🎉 Колесо обрало: *{title}*!\n\n🍿 Приємного перегляду!"
    for chat_id in chats:
        try:
            await bot.send_message(chat_id, text, parse_mode="Markdown")
        except Exception:
            pass
