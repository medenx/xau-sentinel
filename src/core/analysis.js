/**
 * Analisis sederhana berbasis struktur swing + SMA
 * Output: bias (BULLISH/BEARISH/NEUTRAL), key swings, BOS
 */

function sma(series, len = 50) {
  if (!series || series.length < len) return null;
  const slice = series.slice(-len);
  const s = slice.reduce((a, b) => a + b.close, 0);
  return s / len;
}

function findSwings(candles, lookback = 5) {
  const swings = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    const prev = candles.slice(i - lookback, i);
    const next = candles.slice(i + 1, i + 1 + lookback);
    const high = candles[i].high;
    const low  = candles[i].low;

    const isHH = prev.every(p => high >= p.high) && next.every(n => high > n.high);
    const isLL = prev.every(p => low  <= p.low ) && next.every(n => low  < n.low );

    if (isHH) swings.push({ type: "HH", idx: i, price: high, time: candles[i].time });
    if (isLL) swings.push({ type: "LL", idx: i, price: low,  time: candles[i].time });
  }
  return swings.slice(-20);
}

function detectBias(candles) {
  if (!candles || candles.length < 60) return { bias: "NEUTRAL", reason: "Insufficient data" };
  const last = candles[candles.length - 1];
  const ma50 = sma(candles, 50);
  if (!ma50) return { bias: "NEUTRAL", reason: "No MA50" };

  if (last.close > ma50) return { bias: "BULLISH", reason: "Close > SMA50" };
  if (last.close < ma50) return { bias: "BEARISH", reason: "Close < SMA50" };
  return { bias: "NEUTRAL", reason: "Close ≈ SMA50" };
}

function equilibrium(swings) {
  if (!swings || swings.length < 2) return null;
  const lastHH = [...swings].reverse().find(s => s.type === "HH");
  const lastLL = [...swings].reverse().find(s => s.type === "LL");
  if (!lastHH || !lastLL) return null;
  const low  = Math.min(lastLL.price, lastHH.price);
  const high = Math.max(lastLL.price, lastHH.price);
  const mid  = low + (high - low) * 0.5;
  return { low, high, mid, premiumAbove: high, discountBelow: low };
}

function analyse(candles) {
  const swings = findSwings(candles);
  const { bias, reason } = detectBias(candles);
  const eq = equilibrium(swings);

  // Simple BOS detection: last swing type change with break
  let lastBOS = null;
  if (swings.length >= 3) {
    const a = swings[swings.length - 3];
    const b = swings[swings.length - 2];
    const c = swings[swings.length - 1];
    if (a.type === "HH" && b.type === "LL" && c.type === "HH") lastBOS = "BOS_UP";
    if (a.type === "LL" && b.type === "HH" && c.type === "LL") lastBOS = "BOS_DOWN";
  }

  return {
    bias,
    reason,
    lastBOS,
    swings,
    equilibrium: eq
  };
}

module.exports = { analyse };
