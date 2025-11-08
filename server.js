const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;
const app = express();
app.use(bodyParser.json());

// Fungsi kirim pesan Telegram
async function sendTelegram(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
    });
  } catch (err) {
    console.error("Gagal kirim Telegram:", err);
  }
}

// Root endpoint
app.get("/", (req, res) => res.send("XAU-Sentinel Server Aktif ✅"));

// Endpoint POST /send (manual kirim)
app.post("/send", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Text tidak boleh kosong" });
  await sendTelegram(text);
  res.json({ status: "Pesan dikirim", text });
});

// Polling ke Telegram API → agar balas /start otomatis
async function polling() {
  let lastId = 0;
  setInterval(async () => {
    try {
      const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${lastId + 1}`);
      const data = await res.json();
      if (data.result.length > 0) {
        lastId = data.result[data.result.length - 1].update_id;
        data.result.forEach(update => {
          const msg = update.message;
          if (msg && msg.text === "/start") {
            sendTelegram("Bot aktif ✅ Server online & siap menerima perintah.");
          }
        });
      }
    } catch (err) {
      console.error("Polling error:", err);
    }
  }, 2000);
}

// Jalankan server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Server berjalan di port ${PORT}`);
  polling();
});
