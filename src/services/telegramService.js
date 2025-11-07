const axios = require('axios');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegramMessage(text, extra={}) {
  if (!BOT_TOKEN || !CHAT_ID) return { status: 'SKIP', reason: 'No bot token/chat id' };
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  try {
    const res = await axios.post(url, {
      chat_id: CHAT_ID,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...extra
    }, { timeout: 10000 });
    return { status: 'OK', message_id: res.data?.result?.message_id };
  } catch (err) {
    return { status: 'ERROR', error: err?.response?.data || err.message };
  }
}

module.exports = { sendTelegramMessage };
