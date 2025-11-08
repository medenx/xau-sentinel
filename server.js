const express = require("express");
const axios = require("axios");
const app = express();
const PORT = 3000;

// 1) Coba API Metals.live
async function getGoldFromMetals() {
  try {
    const { data } = await axios.get("https://api.metals.live/v1/spot");
    if (Array.isArray(data) && data[0]?.gold) {
      return parseFloat(data[0].gold);
    }
  } catch (e) {}
  return null;
}

// 2) Coba AlphaVantage (opsional jika punya API)
async function getGoldFromAlpha() {
  try {
    const apiKey = process.env.ALPHA_API_KEY || "";
    if (!apiKey) return null;
    const url = `https://www.alphavantage.co/query?function=COMMODITY_EXCHANGE_RATE&from_symbol=XAU&to_symbol=USD&apikey=${apiKey}`;
    const { data } = await axios.get(url);
    return parseFloat(data?.RealtimeCommodityExchangeRate?.ExchangeRate);
  } catch (e) {}
  return null;
}

app.get("/xau", async (req, res) => {
  let price = await getGoldFromMetals();
  if (!price) price = await getGoldFromAlpha();

  if (!price) {
    return res.json({ error: "Gagal ambil harga emas" });
  }
  res.json({ symbol: "XAUUSD", price });
});

app.get("/", (req, res) => {
  res.send("✅ XAU Proxy berjalan. Gunakan /xau untuk ambil harga.");
});

app.listen(PORT, () => console.log(`✅ Proxy aktif di port ${PORT}`));
