const { safeFixed } = require("./utils/format");

function generatePlan(levels, price, biasH1, biasH4, biasD1) {
  const currentPrice = safeFixed(price);
  const eq = safeFixed(levels?.equilibrium);
  const high = safeFixed(levels?.high);
  const low = safeFixed(levels?.low);

  return `
📊 XAUUSD Plan
Price: ${currentPrice}

🕒 H1 | Bias: ${biasH1.toUpperCase()} | Close: ${currentPrice}
🕒 H4 | Bias: ${biasH4.toUpperCase()} | Close: ${currentPrice}
🕒 D1 | Bias: ${biasD1.toUpperCase()} | Close: ${currentPrice}

📍 Levels:
- Equilibrium: ${eq}
- High: ${high}
- Low: ${low}

⚠️ Rules:
- Hindari entry di equilibrium (mid); beli di discount & jual di premium.
- Waspadai MSS trap tanpa retest OB/FVG.
- Identifikasi sweep vs breakout.
- Hindari eksekusi di Asia kecuali ada sweep + konfirmasi M5/M1.
`;
}

module.exports = { generatePlan };
