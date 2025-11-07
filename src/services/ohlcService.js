const axios = require('axios');
const TWELVE_API_KEY = process.env.TWELVE_API_KEY;

const tfMap = { H1: '1h', H4: '4h', D1: '1day' };

async function getOHLC(tf='H1', size=120) {
  if (!TWELVE_API_KEY) throw new Error('Missing TWELVE_API_KEY');
  const interval = tfMap[tf];
  if (!interval) throw new Error(`Unsupported tf: ${tf}`);

  const url = 'https://api.twelvedata.com/time_series';
  const params = {
    symbol: 'XAU/USD',
    interval,
    outputsize: size,
    apikey: TWELVE_API_KEY
  };

  try {
    const { data } = await axios.get(url, { params, timeout: 15000 });
    if (data?.status === 'error') throw new Error(data?.message || 'TwelveData status error');

    const values = data?.values;
    if (!Array.isArray(values) || values.length === 0) throw new Error('Empty OHLC');

    // TwelveData urut latest -> older. Normalisasi ke array of objects, latest first.
    const candles = values.map(v => ({
      time: v.datetime,
      open: Number(v.open),
      high: Number(v.high),
      low: Number(v.low),
      close: Number(v.close)
    })).filter(c => [c.open,c.high,c.low,c.close].every(isFinite));

    if (!candles.length) throw new Error('Bad OHLC payload');
    return { status: 'OK', symbol: 'XAUUSD', tf, candles };
  } catch (err) {
    throw new Error(`TwelveData error (${tf}): ${err?.response?.data?.message || err.message}`);
  }
}

function analyzeBias(candles) {
  // gunakan 50 bar terakhir
  const sample = candles.slice(0, 50);
  const highs = sample.map(c => c.high);
  const lows  = sample.map(c => c.low);
  const hi = Math.max(...highs);
  const lo = Math.min(...lows);
  const eq = (hi + lo) / 2;
  const latest = sample[0]?.close;

  const bias = latest >= eq ? 'BULLISH' : 'BEARISH';
  return {
    bias,
    latestClose: Number(latest?.toFixed(2)),
    equilibrium: Number(eq.toFixed(2)),
    discountZone: { from: Number(lo.toFixed(2)), to: Number(eq.toFixed(2)) },
    premiumZone:  { from: Number(eq.toFixed(2)), to: Number(hi.toFixed(2)) }
  };
}

module.exports = { getOHLC, analyzeBias };
