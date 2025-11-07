require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cron = require('node-cron');

const app = express();
app.use(cors());

const {
  PORT = 3000,
  PAIR = 'XAUUSD',
  TWELVE_BASE,
  TWELVE_KEY,
  GOLDAPI_BASE,
  GOLDAPI_TOKEN,
  TG_TOKEN,
  TG_CHAT
} = process.env;

const symbolTD = 'XAU/USD';
const tfMap = { H1: '1h', H4: '4h', D1: '1day' };

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const nowIso = () => new Date().toISOString().replace(/\.\d+Z$/, 'Z');

const cache = { price: null, ohlc: { H1:null, H4:null, D1:null } };
const ttl = { price: 30 * 1000, ohlc: 4 * 60 * 1000 }; // cache TTLs
const stamp = { price: 0, H1:0, H4:0, D1:0 };

async function fetchTwelve(tf) {
  const interval = tfMap[tf];
  const url = `${TWELVE_BASE}/time_series?symbol=${encodeURIComponent(symbolTD)}&interval=${interval}&outputsize=200&apikey=${TWELVE_KEY}`;
  const { data } = await axios.get(url, { timeout: 9000 });
  if (!data || data.status === 'error' || !Array.isArray(data.values)) {
    throw new Error(data?.message || 'TD invalid');
  }
  // values: newest first
  const candles = data.values.map(v => ({
    time: v.datetime,
    open: +v.open,
    high: +v.high,
    low:  +v.low,
    close:+v.close
  }));
  return candles;
}

async function fetchGoldPrice() {
  const url = `${GOLDAPI_BASE}/XAU/USD`;
  const { data } = await axios.get(url, {
    timeout: 7000,
    headers: {
      'x-access-token': GOLDAPI_TOKEN,
      'Content-Type': 'application/json'
    }
  });
  if (!data || typeof data.price !== 'number') throw new Error('GoldAPI invalid');
  return { price: data.price, source: 'GoldAPI' };
}

async function getPrice() {
  const t = Date.now();
  if (cache.price && (t - stamp.price) < ttl.price) return cache.price;
  // Prefer TD latest close from H1
  try {
    const h1 = await fetchTwelve('H1');
    const price = h1[0]?.close ?? null;
    if (!price) throw new Error('No TD price');
    cache.price = { status:'OK', pair: PAIR, price, source:'TwelveData' };
    stamp.price = t;
    return cache.price;
  } catch {
    const alt = await fetchGoldPrice();
    cache.price = { status:'OK', pair: PAIR, price: alt.price, source: alt.source };
    stamp.price = t;
    return cache.price;
  }
}

async function getOHLC(tf) {
  const t = Date.now();
  if (cache.ohlc[tf] && (t - stamp[tf]) < ttl.ohlc) return cache.ohlc[tf];
  const candles = await fetchTwelve(tf);
  // take last 200, ensure numeric
  const clean = candles
    .filter(c => [c.open,c.high,c.low,c.close].every(v => Number.isFinite(v)))
    .slice(0, 200);
  cache.ohlc[tf] = { status:'OK', symbol: PAIR, tf, data: clean };
  stamp[tf] = t;
  return cache.ohlc[tf];
}

// Bias via simple structure: last close vs SMA20 + last swing direction
function simpleBias(candles) {
  const arr = candles.slice(0, 50);
  const closes = arr.map(c => c.close);
  const sma = closes.slice(0,20).reduce((a,b)=>a+b,0)/20;
  const close = closes[0];
  const prev = closes[1] ?? close;
  const dir = close >= sma && close >= prev ? 'BULLISH'
            : close <  sma && close <= prev ? 'BEARISH'
            : (close >= sma ? 'BULLISH' : 'BEARISH');
  return { bias: dir, latestClose: close };
}

// Premium/Discount zones from recent range
function zones(candles) {
  const arr = candles.slice(0, 100);
  const hi = Math.max(...arr.map(c => c.high));
  const lo = Math.min(...arr.map(c => c.low));
  const mid = (hi + lo) / 2;
  return {
    low: lo, high: hi, equilibrium: +mid.toFixed(2),
    discountZone: { from: lo, to: +mid.toFixed(2) },
    premiumZone:  { from: +mid.toFixed(2), to: hi }
  };
}

async function analyzeTF(tf) {
  try {
    const o = await getOHLC(tf);
    const z = zones(o.data);
    const b = simpleBias(o.data);
    return { status:'OK', tf, bias: b.bias, latestClose: b.latestClose, levels: z };
  } catch (err) {
    return { status:'ERROR', tf, error: err.message || 'analyze failed' };
  }
}

async function buildPlan() {
  const [priceObj, h1, h4, d1] = await Promise.all([
    getPrice().catch(()=>null),
    analyzeTF('H1'),
    analyzeTF('H4'),
    analyzeTF('D1'),
  ]);

  if (!priceObj) return { status:'ERROR', error:'No price' };

  // Method guidance & rules (persisten sesuai preferensi)
  const rules = [
    'Hindari entry di equilibrium (mid); beli di discount & jual di premium.',
    'Waspadai MSS trap tanpa retest OB/FVG.',
    'Identifikasi sweep vs breakout.',
    'Hindari eksekusi di Asia kecuali ada sweep + konfirmasi M5/M1.'
  ];

  const summary = {
    alignment:
      (h1.bias === 'BULLISH' && h4.bias === 'BULLISH') ? 'BULLISH' :
      (h1.bias === 'BEARISH' && h4.bias === 'BEARISH') ? 'BEARISH' : 'MIXED',
    recommendation:
      (h1.bias === 'BULLISH' && h4.bias === 'BULLISH') ?
        'Fokus buy on dip (discount) di H1/H4; validasi M5/M1.' :
      (h1.bias === 'BEARISH' && h4.bias === 'BEARISH') ?
        'Fokus sell on rally (premium) di H1/H4; validasi M5/M1.' :
        'Tunggu konfirmasi jelas antar TF; hindari impulsif.'
  };

  return {
    status: 'OK',
    pair: PAIR,
    price: +priceObj.price.toFixed(2),
    plan: { H1: h1, H4: h4, D1: d1 },
    rules,
    summary
  };
}

/* ---------- Telegram ---------- */
async function sendTelegram(text) {
  const url = `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`;
  await axios.post(url, {
    chat_id: TG_CHAT,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  }, { timeout: 8000 });
}

function fmtPlan(p) {
  const ico = '📊';
  const clock = '🕒';
  const warn = '⚠️';
  const lines = [
    `${ico} <b>XAUUSD Plan</b>`,
    `<b>Price:</b> ${p.price.toFixed(2)}`,
    '',
    `${clock} <b>H1</b> | Bias: <b>${p.plan.H1.bias}</b> | Close: ${p.plan.H1.latestClose.toFixed(2)}`,
    `${clock} <b>H4</b> | Bias: <b>${p.plan.H4.bias}</b> | Close: ${p.plan.H4.latestClose.toFixed(2)}`,
    `${clock} <b>D1</b> | Bias: <b>${p.plan.D1.bias}</b> | Close: ${p.plan.D1.latestClose.toFixed(2)}`,
    '',
    `${warn} <b>Rules:</b>`,
    ...p.rules.map(r => `- ${r}`)
  ];
  return lines.join('\n');
}

/* ---------- HTTP Endpoints ---------- */
app.get('/', (_req,res)=>res.json({
  status:'XAU Sentinel Online',
  pair: 'XAUUSD',
  endpoints:['/price','/ohlc?tf=H1|H4|D1','/analysis?tf=H1|H4|D1','/plan','/health']
}));

app.get('/health', (_req,res)=>res.json({status:'OK', time: nowIso()}));

app.get('/price', async (_req,res)=>{
  try { res.json(await getPrice()); }
  catch (e) { res.status(500).json({status:'ERROR', error:e.message}); }
});

app.get('/ohlc', async (req,res)=>{
  const tf = (req.query.tf || 'H1').toUpperCase();
  if (!tfMap[tf]) return res.status(400).json({status:'ERROR', error:'Bad tf'});
  try { res.json(await getOHLC(tf)); }
  catch (e) { res.status(500).json({status:'ERROR', error:'Bad OHLC payload'}); }
});

app.get('/analysis', async (req,res)=>{
  const tf = (req.query.tf || 'H1').toUpperCase();
  if (!tfMap[tf]) return res.status(400).json({status:'ERROR', error:'Bad tf'});
  res.json(await analyzeTF(tf));
});

app.get('/plan', async (_req,res)=>{
  try { res.json(await buildPlan()); }
  catch (e) { res.status(500).json({status:'ERROR', error:e.message || 'build failed'}); }
});

/* ---------- Scheduler: kirim tiap jam ---------- */
async function tick() {
  try {
    const p = await buildPlan();
    if (p.status !== 'OK') {
      await sendTelegram('❌ <b>Plan Error:</b> ' + (p.error || 'unknown'));
      return;
    }
    await sendTelegram(fmtPlan(p));
  } catch (err) {
    await sendTelegram('❌ <b>Plan Error:</b> ' + (err.message || 'unknown'));
  }
}

function startScheduler() {
  // Eksekusi awal + setiap menit ke-0 (tiap jam)
  tick().catch(()=>{});
  cron.schedule('0 * * * *', () => tick().catch(()=>{}));
}

app.listen(PORT, () => {
  console.log(`XAU Sentinel running on port ${PORT}`);
  startScheduler();
});

// === Tambah ulang fungsi formatLevels dengan proteksi aman ===
function formatLevels(levels) {
  if (!levels) return "-";
  const low = levels.low?.toFixed ? levels.low.toFixed(2) : "-";
  const high = levels.high?.toFixed ? levels.high.toFixed(2) : "-";
  const eq = levels.equilibrium?.toFixed ? levels.equilibrium.toFixed(2) : "-";
  const disc = levels.discountZone ? levels.discountZone.from + "→" + levels.discountZone.to : "-";
  const prem = levels.premiumZone ? levels.premiumZone.from + "→" + levels.premiumZone.to : "-";
  return `Low: ${low} | High: ${high} | EQ: ${eq} | Disc: ${disc} | Prem: ${prem}`;
}
