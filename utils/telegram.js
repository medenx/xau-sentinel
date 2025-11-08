const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

const sendTelegramMessage = async (text) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.log("❌ TELEGRAM_BOT_TOKEN atau CHAT_ID belum di-set.");
    return;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    const data = await res.json();
    console.log("✅ Telegram Response:", data);
  } catch (error) {
    console.error("❌ Gagal kirim pesan Telegram:", error);
  }
};

module.exports = { sendTelegramMessage };
