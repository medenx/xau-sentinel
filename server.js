import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = 3000;

// === 1) Yahoo Finance ===
const fetchYahoo = async () => {
  try {
    const r = await fetch("https://query1.finance.yahoo.com/v7/finance/quote?symbols=XAUUSD=X");
    const d = await r.json();
    return d.quoteResponse?.result[0]?.regularMarketPrice || null;
  } catch {
    return null;
  }
};

// === 2) GoldAPI (metals.live) ===
const fetchGoldAPI = async () => {
  try {
    const r = await fetch("https://api.metals.live/v1/spot/gold");
    const d = await r.json();
    return d[0]?.price || null;
  } catch {
    return null;
  }
};

// === 3) FMP API ===
const fetchFMP = async () => {
  try {
    const r = await fetch("https://financialmodelingprep.com/api/v3/quote/XAUUSD?apikey=demo");
    const d = await r.json();
    return d[0]?.price || null;
  } catch {
    return null;
  }
};

app.get("/xau", async (_, res) => {
  let price = await fetchYahoo();
  if (!price) price = await fetchGoldAPI();
  if (!price) price = await fetchFMP();

  if (!price) return res.json({ error: "Semua sumber gagal" });
  res.json({ price });
});

app.listen(PORT, () => console.log(`✅ Proxy XAU aktif di port ${PORT}`));
