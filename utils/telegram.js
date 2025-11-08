const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const sendTelegramMessage = async (text) => {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.log("❌ TELEGRAM_BOT_TOKEN / CHAT_ID belum di-set");
    return;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const payload = { chat_id: chatId, text };

  try {
    const res  = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    console.log("✅ Telegram Response:", data);
  } catch (err) {
    console.error("⚠ Gagal kirim Telegram (server tetap jalan):", err);
  }
};

module.exports = { sendTelegramMessage };
