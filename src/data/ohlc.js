const axios = require("axios");
require('dotenv').config();

const API_KEY = process.env.API_KEY || "632a4acec0bf41ba926278f67480072d";
const SYMBOL = "XAU/USD";

async function fetchOHLC(tf = "H1") {
  const intervalMap = { H1: "1h", H4: "4h", D1: "1day" };
  const interval = intervalMap[tf] || "1h";
  const url = `https://api.twelvedata.com/time_series?symbol=${SYMBOL}&interval=${interval}&outputsize=50&apikey=${API_KEY}`;
  const res = await axios.get(url);
  if (res.data.values) return res.data.values;
  throw new Error("Failed to fetch OHLC");
}

module.exports = { fetchOHLC };
