const axios = require('axios');
const { readJSON, writeJSON } = require('./store');
const { GOLD_API_KEY, PAIR } = process.env;

const TF_MAP = {
  H1:  { interval: '1h',  cache: 'ohlc_H1.json' },
  H4:  { interval: '4h',  cache: 'ohlc_H4.json' },
  D1:  { interval: '1day',cache: 'ohlc_D1.json' },
};

async function retry(fn, times = 3, delayMs = 600) {
  let lastErr;
  for (let i=0; i<times; i++) {
    try { return await fn(); } catch (e) { lastErr = e; await new Promise(r=>setTimeout(r, delayMs)); }
  }
  throw lastErr;
}

async function fetchPrice() {
  const url = `https://api.twelvedata.com/price?symbol=${PAIR}&apikey=${GOLD_API_KEY}`;
  const res = await retry(() => axios.get(url, { timeout: 8000 }));
  const p = res.data?.price ?? res.data?.[PAIR] ?? null;
  if (!p) throw new Error('No price');
  return Number(p);
}

function normalizeTS(rows) {
  // TwelveData: newest first; ubah ke ascending & field standar
  const arr = (rows || []).slice().reverse().map(r => ({
    time: new Date(r.datetime || r.time).toISOString(),
    open:  Number(r.open),
    high:  Number(r.high),
    low:   Number(r.low),
    close: Number(r.close),
  })).filter(c => Number.isFinite(c.open) && Number.isFinite(c.close));
  return arr;
}

async function fetchOHLC(tf='H1') {
  const m = TF_MAP[tf];
  if (!m) throw new Error('TF unsupported');

  const fromCache = readJSON(m.cache, 10 * 60 * 1000);
  try {
    const url = `https://api.twelvedata.com/time_series?symbol=${PAIR}&interval=${m.interval}&outputsize=300&apikey=${GOLD_API_KEY}`;
    const res = await retry(() => axios.get(url, { timeout: 9000 }));
    const series = res.data?.values || res.data?.[PAIR]?.values || res.data?.data || res.data?.values;
    if (!series || !Array.isArray(series)) throw new Error('Bad OHLC payload');
    const norm = normalizeTS(series);
    if (norm.length) writeJSON(m.cache, norm);
    return norm.slice(-300);
  } catch (err) {
    if (fromCache) return fromCache;
    throw err;
  }
}

module.exports = { fetchPrice, fetchOHLC };
