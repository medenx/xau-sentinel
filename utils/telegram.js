const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const sendTelegramMessage = async (text) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return console.log("⚠️ Token/Chat ID belum di-set");
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const payload = { chat_id: chatId, text };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log("✅ Telegram Response:", data);
  } catch (err) {
    console.error("❌ Gagal kirim Telegram:", err);
  }
};

module.exports = { sendTelegramMessage };
