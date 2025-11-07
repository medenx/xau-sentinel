const axios = require('axios');

const TELEGRAM_TOKEN = "8335791102:AAF2hMKghXmVb1f45R5euwjRplWtCCCFUu4";
const CHAT_ID = "6915620440";
let failCount = 0;
const MAX_FAIL = 3;

async function sendTelegram(msg) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await axios.post(url, { chat_id: CHAT_ID, text: msg });
}

async function checkHealth() {
  try {
    const res = await axios.get("http://localhost:3000/health");
    if (res.data.status === "OK") {
      console.log("✅ Health OK");
      failCount = 0;
      return;
    }
  } catch (err) {
    console.log("⚠️ Health check gagal");
  }
  failCount++;
  if (failCount >= MAX_FAIL) {
    await sendTelegram("❌ XAU-Sentinel Error! Server tidak merespon. PM2 akan restart otomatis.");
    require('child_process').exec("pm2 restart xau-sentinel");
    failCount = 0;
  }
}

setInterval(checkHealth, 300000); // cek tiap 5 menit
console.log("✅ Monitor aktif: memantau XAU-Sentinel setiap 5 menit...");
