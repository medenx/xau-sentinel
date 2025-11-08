const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));
const { sendTelegramMessage } = require("./utils/telegram");
const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
let last_update_id = 0;

app.get("/", (req, res) => res.send("✅ Server & Polling Aktif"));

app.post("/send", async (req, res) => {
  await sendTelegramMessage(req.body.text);
  res.json({ status: "Pesan dikirim", text: req.body.text });
});

async function pollTelegram() {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/getUpdates?offset=${last_update_id + 1}`);
    const data = await res.json();
    if (!data.ok || !data.result) return;
    for (const update of data.result) {
      last_update_id = update.update_id;
      const msg = update.message;
      if (!msg || !msg.text) continue;
      const chatId = msg.chat.id;
      const text = msg.text.trim();
      if (text === "/start") {
        await sendTelegramMessage("✅ Bot aktif, siap membantu!", chatId);
      } else {
        await sendTelegramMessage(`Pesan diterima: ${text}`, chatId);
      }
    }
  } catch (err) {
    console.log("Polling error:", err.message);
  }
}
setInterval(pollTelegram, 2000);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Server jalan di port ${PORT}`);
  sendTelegramMessage("🚀 Server online & polling dimulai ✅");
});
