// bot/telegramBot.js

import TelegramBot from "node-telegram-bot-api";
import User from "../models/User.js";

const TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = "https://abush-bingo.netlify.app"; // later we replace

export function startTelegramBot() {
  const bot = new TelegramBot(TOKEN, { polling: true });

  console.log("🤖 Telegram bot started");

  // /start
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const tgId = msg.from.id.toString();
    const name = msg.from.first_name || "Player";

    let user = await User.findOne({ telegramId: tgId });

    // First time bonus
    if (!user) {
      user = await User.create({
        telegramId: tgId,
        name,
        balance: 10 // 🎁 10 birr bonus
      });

      await bot.sendMessage(chatId,
        `🎉 Welcome ${name}!\n\nYou received *10 Birr bonus* 🎁\n\nUse /play to start playing.`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    await bot.sendMessage(chatId,
      `👋 Welcome back ${name}\n\n💰 Balance: ${user.balance} Birr\n\nUse /play to join next round.`,
      { parse_mode: "Markdown" }
    );
  });

  // /balance
  bot.onText(/\/balance/, async (msg) => {
    const chatId = msg.chat.id;
    const tgId = msg.from.id.toString();

    const user = await User.findOne({ telegramId: tgId });
    if (!user) {
      return bot.sendMessage(chatId, "Please use /start first.");
    }

    bot.sendMessage(chatId, `💰 Your balance: ${user.balance} Birr`);
  });

  // /deposit
  bot.onText(/\/deposit/, async (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(chatId,
      "💳 Choose deposit method:",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Telebirr", callback_data: "deposit_telebirr" }],
            [{ text: "CBE Birr", callback_data: "deposit_cbebirr" }]
          ]
        }
      }
    );
  });

  // Handle deposit choice
  bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const tgId = query.from.id.toString();

    if (query.data === "deposit_telebirr") {
      bot.sendMessage(chatId,
        `📲 TELEBIRR DEPOSIT\n\nSend money to:\n\n📞 0940508961 GENANAW\n\nAfter payment, copy and paste the FULL SMS here.\n\n⚠️ Example:\nDear ... You have transferred ETB ...`
      );
    }

    if (query.data === "deposit_cbebirr") {
      bot.sendMessage(chatId,
        `🏦 CBE BIRR DEPOSIT\n\nSend money to:\n\n📞 0940508961 GENANAW\n\nAfter payment, copy and paste the FULL SMS here.\n\n⚠️ Example:\nDear ... you have sent ... Txn ID ...`
      );
    }
  });

  // Receive SMS text for auto verification
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const tgId = msg.from.id.toString();
    const text = msg.text;

    // ignore commands
    if (text.startsWith("/")) return;

    try {
      const res = await fetch("https://priority-backend-c5sb.onrender.com/api/deposit/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramId: tgId,
          smsText: text
        })
      });

      const data = await res.json();

      if (data.success) {
        bot.sendMessage(chatId,
          `✅ Deposit successful!\n\n💰 Amount: ${data.amount} Birr\n💳 New Balance: ${data.balance} Birr`
        );
      } else {
        bot.sendMessage(chatId,
          `❌ Could not verify this SMS.\n\nPlease make sure:\n• Full SMS copied\n• Not already used\n• Correct format`
        );
      }

    } catch (err) {
      bot.sendMessage(chatId, "⚠️ Server error, try again later.");
    }
  });

  // /play → Open WebApp
  bot.onText(/\/play/, async (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(chatId,
      "🎮 Join Bingo Game",
      {
        reply_markup: {
          inline_keyboard: [
            [{
              text: "▶️ Play Bingo",
              web_app: { url: WEBAPP_URL }
            }]
          ]
        }
      }
    );
  });
}
