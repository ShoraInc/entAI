require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const OpenAI = require("openai");

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const userHistory = {};
const MAX_HISTORY = 20;

const SYSTEM_PROMPT = `Сен — ЕНТ-ке дайындалуға арналған ақылды ИИ-көмекшісісің / Ты — умный ИИ-ассистент для подготовки к ЕНТ по Информатике в Казахстане.

Қағидалар / Правила:
1. Пайдаланушы қандай тілде жазса, сол тілде жауап бер — қазақша немесе орысша.
2. Кез келген сұраққа жауап бер: тақырыпты түсіндір, есеп шеш, тест жаса.
3. Қадамдап түсіндір, мысалдар кел.
4. Достық және қолдаушы бол, эмодзиді орынды қолдан.
5. Тек ЕНТ / Информатика тақырыбында жұмыс іст. Басқа тақырыптарды оқуға бағыттап жібер.`;

async function askAI(userId, userMessage) {
  if (!userHistory[userId]) userHistory[userId] = [];

  userHistory[userId].push({ role: "user", content: userMessage });

  if (userHistory[userId].length > MAX_HISTORY) {
    userHistory[userId] = userHistory[userId].slice(-MAX_HISTORY);
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...userHistory[userId]
      ],
      max_tokens: 1500
    });

    const assistantMessage = response.choices[0].message.content;
    userHistory[userId].push({ role: "assistant", content: assistantMessage });
    return assistantMessage;

  } catch (error) {
    console.error("OpenAI error:", error.message);
    if (error.status === 429) return "⚠️ Слишком много запросов. Подожди немного.";
    return "❌ Қате шықты / Произошла ошибка. Попробуй ещё раз.";
  }
}

// /start
bot.onText(/\/start/, (msg) => {
  userHistory[msg.from.id] = [];
  const name = msg.from.first_name || "Оқушы";

  bot.sendMessage(msg.chat.id,
    `👋 Сәлем, ${name}!\n\n` +
    `🎓 Мен — ЕНТ бойынша Информатика пәнінен көмектесетін ИИ-ассистентпін.\n` +
    `Я — ИИ-ассистент по Информатике для подготовки к ЕНТ.\n\n` +
    `💬 Жай ғана сұрағыңды жаз! / Просто напиши свой вопрос!\n\n` +
    `Мысалдар / Примеры:\n` +
    `• Двоичную 10110 переведи в десятичную\n` +
    `• Pascal-да массив қалай жұмыс істейді?\n` +
    `• Логикалық операцияларды түсіндір\n` +
    `• Дай тест по системам счисления`
  );
});

// /clear
bot.onText(/\/clear/, (msg) => {
  userHistory[msg.from.id] = [];
  bot.sendMessage(msg.chat.id, "🗑️ История очищена / Тарих тазаланды!");
});

// /help
bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `ℹ️ *Как пользоваться:*\n\n` +
    `Просто пиши вопрос — отвечу на русском или казахском!\n\n` +
    `*/start* — начать заново\n` +
    `*/clear* — очистить историю чата\n` +
    `*/help* — помощь`,
    { parse_mode: "Markdown" }
  );
});

// Все сообщения → AI
bot.on("message", async (msg) => {
  if (!msg.text || msg.text.startsWith("/")) return;

  const chatId = msg.chat.id;
  const userId = msg.from.id;

  await bot.sendChatAction(chatId, "typing");
  const response = await askAI(userId, msg.text.trim());
  bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
});

bot.on("polling_error", (err) => console.error("Polling error:", err.message));

console.log("🚀 Бот іске қосылды / Бот запущен!");