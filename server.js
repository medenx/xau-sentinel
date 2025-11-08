const express = require("express");
const bodyParser = require("body-parser");
const { sendTelegramMessage } = require("./utils/telegram");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

// Root - cek server
app.get("/", (req, res) => {
  res.send("✅ XAU-Sentinel Server Aktif");
});

// Webhook dari Telegram
app.post(`/webhook/${process.env.TELEGRAM_BOT_TOKEN}`, async (req, res) => {
  try {
    const message = req.body.message;
    if (!message) return res.sendStatus(200);

    const chatId = message.chat.id;
    const text = message.text;

    if (text === "/start") {
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "✅ Bot aktif dan siap kirim sinyal otomatis 🚀"
        })
      });
    }
    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook Error:", err);
    res.sendStatus(500);
  }
});

// Endpoint manual kirim pesan (tetap ada)
app.post("/send", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Text kosong" });
  await sendTelegramMessage(text);
  res.json({ status: "Pesan dikirim", text });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`✅ Server berjalan di port ${PORT}`));
