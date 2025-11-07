const axios = require("axios");
require('dotenv').config();

const API_KEY = process.env.API_KEY || "632a4acec0bf41ba926278f67480072d";
const SYMBOL = "XAU/USD";

async function getPrice() {
  const url = `https://api.twelvedata.com/price?symbol=${SYMBOL}&apikey=${API_KEY}`;
  const res = await axios.get(url);
  if (res.data.price) {
    return { status: "OK", pair: "XAUUSD", price: parseFloat(res.data.price) };
  }
  throw new Error(res.data.message || "Failed to fetch price");
}

module.exports = { getPrice };
