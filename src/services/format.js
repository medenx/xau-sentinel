function fmtNum(n) {
  return Number(n).toFixed(2);
}

function formatPlanMessage({ pair, price, blocks, note }) {
  // blocks: [{tf, bias, latestClose}]
  const lines = [];
  lines.push(`${pair} PLAN`);
  lines.push(`PRICE: ${fmtNum(price)}`);
  lines.push('');
  for (const b of blocks) {
    lines.push(`${b.tf} | BIAS: ${b.bias} | CLOSE: ${fmtNum(b.latestClose)}`);
  }
  if (note) {
    lines.push('');
    lines.push(`NOTE: ${note}`);
  }
  lines.push('');
  lines.push('WARNINGS: JANGAN ENTRY TANPA RETEST OB/FVG. HINDARI ENTRY DI EQUILIBRIUM (MID). IDENTIFIKASI SWEEP VS BREAKOUT. TUNGGU KONFIRMASI M5/M1. HINDARI EKSEKUSI DI ASIA KECUALI ADA SWEEP + KONFIRMASI.');
  return lines.join('\n');
}

module.exports = { formatPlanMessage };
