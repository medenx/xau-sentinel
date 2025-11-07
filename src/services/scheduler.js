const cron = require('node-cron');
const stringify = require('fast-json-stable-stringify');
const { fetchPrice, fetchOHLC } = require('../data/fetch');
const { sendTelegramMessage } = require('./telegram');
const { formatPlanMessage } = require('./format');
const { writeText, readText } = require('../data/store');

function isTradingSessionNowUTC() {
  // Hanya London (08-17 UTC) & New York (13-22 UTC)
  const h = new Date().getUTCHours();
  return (h >= 8 && h < 17) || (h >= 13 && h < 22);
}

async function buildPlan() {
  const [price, h1, h4, d1] = await Promise.all([
    fetchPrice(),
    fetchOHLC('H1'),
    fetchOHLC('H4'),
    fetchOHLC('D1'),
  ]);

  const lastH1 = h1[h1.length - 1];
  const lastH4 = h4[h4.length - 1];
  const lastD1 = d1[d1.length - 1];

  const { calcBias, decideIdea } = require('./logic');
  const b1 = calcBias(h1);
  const b4 = calcBias(h4);
  const bD = calcBias(d1);
  const idea = decideIdea({ h1: b1, h4: b4, d1: bD });

  const plan = {
    pair: process.env.PAIR || 'XAUUSD',
    price,
    blocks: [
      { tf: 'H1', bias: b1.bias, latestClose: b1.latestClose },
      { tf: 'H4', bias: b4.bias, latestClose: b4.latestClose },
      { tf: 'D1', bias: bD.bias, latestClose: bD.latestClose },
    ],
    idea,
    note: (idea === 'WAIT')
      ? 'Menunggu setup valid. Waspadai Asia, tunggu konfirmasi M5/M1.'
      : (idea === 'BUY')
        ? 'Fokus buy on dip (discount) pada H1/H4; validasi M5/M1.'
        : 'Fokus sell on rally (premium) pada H1/H4; validasi M5/M1.',
  };

  return plan;
}

async function maybeAlert() {
  // Hanya kirim saat jam sesi; jika bukan sesi tetap update /plan API tapi skip Telegram
  if (!isTradingSessionNowUTC()) return;

  const plan = await buildPlan();

  // Hanya alert jika idea ≠ WAIT
  if (plan.idea === 'WAIT') return;

  // Anti duplikasi: hash konten penting
  const sigObj = { idea: plan.idea, blocks: plan.blocks.map(b=>[b.tf,b.bias,Number(b.latestClose).toFixed(2)]) };
  const sig = stringify(sigObj);
  const last = readText('last_sig.txt');
  if (last === sig) return; // tidak ada perubahan signifikan

  const msg = formatPlanMessage(plan);
  await sendTelegramMessage(msg);
  writeText('last_sig.txt', sig);
}

function startScheduler() {
  // jalan tiap 5 menit
  cron.schedule('*/5 * * * *', async () => {
    try { await maybeAlert(); } catch (e) { /* diamkan agar jadwal tetap hidup */ }
  });
}

module.exports = { startScheduler, buildPlan };
