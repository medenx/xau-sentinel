const express = require("express");
const bodyParser = require("body-parser");
const { sendTelegramMessage } = require("./utils/telegram");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

// Root endpoint
app.get("/", (req, res) => {
  res.send("✅ XAU-Sentinel Aktif & Stabil");
});

// Endpoint kirim pesan manual
app.post("/send", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text kosong" });

    await sendTelegramMessage(text);
    return res.json({ status: "Pesan dikirim", text });
  } catch (error) {
    console.error("⚠ Error /send:", error);
    return res.status(500).json({ error: "Gagal kirim, tapi server tetap hidup" });
  }
});

// Global error handler (agar tidak crash)
app.use((err, req, res, next) => {
  console.error("🔥 Error tak tertangkap:", err);
  res.status(500).json({ error: "Server error, tetap hidup" });
});

// Anti-sleep Railway (ping server setiap 5 menit)
setInterval(() => {
  fetch(`https://${process.env.RAILWAY_STATIC_URL}/`)
    .then(() => console.log("💓 Keep-alive ping"))
    .catch(() => {});
}, 1000 * 60 * 5);

// Jalankan server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Server berjalan di port ${PORT}`);
});
