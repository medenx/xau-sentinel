/**
 * Build trading plan sesuai preferensi:
 * - Eksekusi hanya di discount untuk BUY & premium untuk SELL
 * - Konfirmasi M5/M1 (reminder)
 * - Hindari Asia kecuali sweep + konfirmasi
 * - Hindari eksekusi di equilibrium (mid)
 */

function buildPlanFrame(tf, analysis, candles) {
  if (!analysis || !candles?.length) {
    return { status: "ERROR", error: "No data" };
  }
  const last = candles[candles.length - 1];
  const eq = analysis.equilibrium;
  const bias = analysis.bias;

  let levels = {};
  if (eq) {
    levels = {
      low: eq.low,
      high: eq.high,
      equilibrium: eq.mid,
      discountZone: { from: eq.low, to: eq.mid },
      premiumZone:  { from: eq.mid, to: eq.high }
    };
  }

  let idea = "WAIT";
  let note = "Menunggu setup valid.";
  if (bias === "BULLISH" && eq && last.close <= eq.mid) {
    idea = "BUY-ON-DIP";
    note = "Bias bullish & berada di DISCOUNT. Cari OB/FVG + konfirmasi M5/M1.";
  } else if (bias === "BEARISH" && eq && last.close >= eq.mid) {
    idea = "SELL-ON-RALLY";
    note = "Bias bearish & berada di PREMIUM. Cari OB/FVG + konfirmasi M5/M1.";
  }

  return {
    status: "OK",
    tf,
    bias,
    lastBOS: analysis.lastBOS,
    latestClose: last.close,
    levels,
    idea,
    note
  };
}

function buildPlan(h1, h4, d1) {
  const plan = {
    H1: buildPlanFrame("H1", h1.analysis, h1.candles),
    H4: buildPlanFrame("H4", h4.analysis, h4.candles),
    D1: buildPlanFrame("D1", d1.analysis, d1.candles),
  };

  // Summary sederhana (multi-timeframe agreement)
  const biases = [plan.H1.bias, plan.H4.bias, plan.D1.bias];
  const same =
    biases.every(b => b === "BULLISH") ? "BULLISH" :
    biases.every(b => b === "BEARISH") ? "BEARISH" : "MIXED";

  const summary = {
    alignment: same,
    recommendation:
      same === "BULLISH" ? "Fokus buy on dip (discount) di H1/H4; validasi M5/M1."
      : same === "BEARISH" ? "Fokus sell on rally (premium) di H1/H4; validasi M5/M1."
      : "Campuran. Tunggu sinkronisasi bias atau trade lebih konservatif.",
  };

  // Warning block (sesuai preferensi user)
  const warnings = [
    "JANGAN ENTRY TANPA KONFIRMASI M5/M1.",
    "WASPADAI MSS TRAP TANPA RETEST OB/FVG.",
    "HINDARI ENTRY DI EQUILIBRIUM (MID); BUY DI DISCOUNT & SELL DI PREMIUM.",
    "IDENTIFIKASI SWEEP VS BREAKOUT; TUNGGU CLOSE KONFIRMASI.",
    "HINDARI EKSEKUSI DI ASIA KECUALI ADA SWEEP + KONFIRMASI."
  ];

  return { status: "OK", plan, summary, warnings };
}

module.exports = { buildPlan };
