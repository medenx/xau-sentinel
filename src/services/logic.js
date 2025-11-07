function calcBias(candles) {
  if (!candles || candles.length < 2) return { bias: 'NEUTRAL', latestClose: NaN };
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const bias = last.close >= prev.close ? 'BULLISH' : 'BEARISH';
  return { bias, latestClose: last.close };
}

function decideIdea({ h1, h4, d1 }) {
  // Idea hanya BUY/SELL bila minimal 2 TF searah, selain itu WAIT
  const arr = [h1.bias, h4.bias, d1.bias];
  const bull = arr.filter(b => b === 'BULLISH').length;
  const bear = arr.filter(b => b === 'BEARISH').length;
  if (bull >= 2) return 'BUY';
  if (bear >= 2) return 'SELL';
  return 'WAIT';
}

module.exports = { calcBias, decideIdea };
