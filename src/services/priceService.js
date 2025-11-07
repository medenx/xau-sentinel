const axios = require('axios');
const GOLDAPI_TOKEN = process.env.GOLDAPI_TOKEN;

async function getSpotPrice() {
  if (!GOLDAPI_TOKEN) throw new Error('Missing GOLDAPI_TOKEN');
  const url = 'https://www.goldapi.io/api/XAU/USD';
  try {
    const { data } = await axios.get(url, {
      headers: { 'x-access-token': GOLDAPI_TOKEN, 'Content-Type': 'application/json' },
      timeout: 12000
    });
    // Ambil harga terbaik yang tersedia
    const price = Number(data?.price ?? ((data?.ask + data?.bid) / 2));
    if (!isFinite(price)) throw new Error('Invalid price payload');
    return { status: 'OK', pair: 'XAUUSD', price };
  } catch (err) {
    throw new Error(`GoldAPI error: ${err?.response?.data?.error || err.message}`);
  }
}

module.exports = { getSpotPrice };
