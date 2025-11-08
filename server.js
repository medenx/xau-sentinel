const express = require("express");
const bodyParser = require("body-parser");
const { sendTelegramMessage } = require("./utils/telegram");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("✅ XAU-Sentinel Server Aktif");
});

# Endpoint untuk webhook Telegram
app.post(`/webhook/${process.env.TELEGRAM_BOT_TOKEN}`, async (req, res) => {
  const message = req.body.message;
  if (message && message.text === "/start") {
    await sendTelegramMessage("✅ Bot aktif! Siap kirim sinyal otomatis.");
  }
  res.sendStatus(200);
});

# Endpoint manual kirim pesan
app.post("/send", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Text kosong" });
  await sendTelegramMessage(text);
  res.json({ status: "Pesan dikirim", text });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`✅ Server di port ${PORT}`));
