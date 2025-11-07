const axios = require('axios');
const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;

async function sendTelegramMessage(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  await axios.post(url, { chat_id: TELEGRAM_CHAT_ID, text });
}

module.exports = { sendTelegramMessage };
