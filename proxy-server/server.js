const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Ambil harga XAU/USD dari MarketWatch (tidak pakai SSL tinggi)
 * Format parsing HTML -> ambil angka terakhir di tag <bg-quote>
 */
async function getGoldPrice() {
  try {
    const res = await axios.get('http://www.marketwatch.com/investing/future/gold', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const match = res.data.match(/"last":([0-9]+\.[0-9]+)/);
    return match ? parseFloat(match[1]) : null;
  } catch (err) {
    console.error('Gagal ambil harga:', err.message);
    return null;
  }
}

app.get('/xau', async (req, res) => {
  const price = await getGoldPrice();
  if (!price) {
    return res.status(500).json({ error: 'Gagal ambil harga' });
  }
  res.json({ symbol: 'XAUUSD', price });
});

app.listen(PORT, () => {
  console.log(`✅ Proxy server berjalan di port ${PORT}`);
});
