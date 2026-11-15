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
from aiogram.types import (
    FSInputFile,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    MenuButtonWebApp,
    WebAppInfo,
)

from config import BOT_TOKEN, WEBAPP_URL, CHATS_JSON, WELCOME_ANIMATION

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


# ── Bot Menu Setup ───────────────────────────────────────────────────

async def setup_bot_menu() -> None:
    """Automatically configure persistent Menu Button in Telegram."""
    webapp_url = WEBAPP_URL or "https://friday-film.onrender.com"
    try:
        await bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(
                text="🎬 Friday Film",
                web_app=WebAppInfo(url=webapp_url),
            )
        )
    except Exception as e:
        print(f"⚠️ Failed to set chat menu button: {e}")


# ── /start command ───────────────────────────────────────────────────

@router.message(CommandStart())
async def cmd_start(message: types.Message):
    # Track group chats
    if message.chat.type in ("group", "supergroup"):
        _add_chat(message.chat.id)

    webapp_url = WEBAPP_URL or "https://friday-film.onrender.com"
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="🎬 Відкрити Friday Film",
            web_app=WebAppInfo(url=webapp_url),
        )]
    ])

    caption = (
        "🎬 *Friday Film* — наш затишний п'ятничний кіновечір!\n\n"
        "✨ Крутіть космічне колесо фортуни\n"
        "🍿 Пропонуйте улюблені фільми на вечір\n"
        "📸 Зберігайте спільні фото та спогади\n\n"
        "Натисніть кнопку нижче, щоб відкрити додаток:"
    )

    if WELCOME_ANIMATION.exists():
        try:
            await message.answer_animation(
                animation=FSInputFile(str(WELCOME_ANIMATION)),
                caption=caption,
                reply_markup=keyboard,
                parse_mode="Markdown",
            )
            return
        except Exception as e:
            print(f"⚠️ Failed to send welcome animation: {e}")
            try:
                await message.answer_video(
                    video=FSInputFile(str(WELCOME_ANIMATION)),
                    caption=caption,
                    reply_markup=keyboard,
                    parse_mode="Markdown",
                )
                return
            except Exception as e2:
                print(f"⚠️ Failed to send welcome video: {e2}")

    await message.answer(
        caption,
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
