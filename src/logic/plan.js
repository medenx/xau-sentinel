function buildPlan(candles, tf) {
  const latest = candles[0];
  const close = parseFloat(latest.close);

  return {
    status: "OK",
    tf,
    bias: close > 2000 ? "BULLISH" : "BEARISH",
    latestClose: close,
    idea: "WAIT",
    note: "Menunggu setup valid. Waspadai Asia, tunggu M5/M1 konfirmasi."
  };
}

module.exports = { buildPlan };
