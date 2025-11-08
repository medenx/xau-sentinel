import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = 3000;

const GOLDAPI_KEY = process.env.GOLDAPI_KEY;
const ALPHA = process.env.ALPHA_KEY;

// Yahoo Finance
const yahoo = async () => {
  try {
    const r = await fetch("https://query1.finance.yahoo.com/v7/finance/quote?symbols=XAUUSD=X");
    const d = await r.json();
    return d.quoteResponse?.result[0]?.regularMarketPrice || null;
  } catch { return null; }
};

// AlphaVantage
const alpha = async () => {
  try {
    const r = await fetch(
      `https://www.alphavantage.co/query?function=COMMODITY_EXCHANGE_RATE&from_symbol=XAU&to_symbol=USD&apikey=${ALPHA}`
    );
    const d = await r.json();
    return parseFloat(d["5. Exchange Rate"]) || null;
  } catch { return null; }
};

// GoldAPI ✓ fallback paling akurat
const goldapi = async () => {
  try {
    const r = await fetch("https://www.goldapi.io/api/XAU/USD", {
      headers: { "x-access-token": GOLDAPI_KEY, "Content-Type": "application/json" }
    });
    const d = await r.json();
    return d?.price || null;
  } catch { return null; }
};

app.get("/xau", async (_, res) => {
  let price = await yahoo();
  if (!price) price = await alpha();
  if (!price) price = await goldapi();
  if (!price) return res.json({ error: "Semua sumber gagal" });
  res.json({ price });
});

app.listen(PORT, () => console.log(`✅ Proxy XAU aktif di port ${PORT}`));
