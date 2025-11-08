const express = require("express");
const bodyParser = require("body-parser");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require("dotenv").config();
const { sendTelegramMessage } = require("./utils/telegram");

const app = express();
app.use(bodyParser.json());

// Root endpoint
app.get("/", (req, res) => {
  res.send("✅ XAU-Sentinel Server Aktif & Stabil");
});

// Endpoint manual kirim Telegram
app.post("/send", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text tidak boleh kosong" });
    await sendTelegramMessage(text);
    res.json({ status: "Pesan dikirim", text });
  } catch (err) {
    console.error("❌ Error kirim:", err);
    res.status(500).json({ error: "Gagal kirim Telegram" });
  }
});

// Error handler global (hindari crash)
app.use((err, req, res, next) => {
  console.error("🔥 Unhandled Error:", err);
  res.status(500).send("Internal Server Error");
});

// Jalankan server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`✅ Server berjalan di port ${PORT}`));

// Keep-alive agar Railway tidak tidur
setInterval(() => {
  const url = process.env.RAILWAY_STATIC_URL;
  if (url) fetch(url).then(() => console.log("🔄 Keep-alive ping"))
    .catch(() => console.log("⚠ Gagal keep-alive"));
}, 5 * 60 * 1000); // 5 menit
