import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 8080;

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const TELEGRAM_URL = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

app.get('/', (req, res) => {
  res.send('Bot aktif');
});

async function sendTelegramMessage(text) {
  try {
    await fetch(TELEGRAM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text })
    });
  } catch (err) {
    console.error('Gagal kirim pesan:', err.message);
  }
}

app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
  sendTelegramMessage('✅ Bot Railway aktif otomatis');
});
