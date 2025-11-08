import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = 3000;

app.get('/xau', async (req, res) => {
  try {
    const resp = await fetch('https://api.metals.live/v1/spot/gold');
    const data = await resp.json();
    const price = data?.[0]?.price;

    if (!price) return res.json({ error: 'Harga emas tidak tersedia' });
    res.json({ symbol: 'XAUUSD', price });
  } catch (e) {
    res.json({ error: 'Gagal ambil harga emas' });
  }
});

app.listen(PORT, () => console.log(`✅ Proxy XAU aktif di port ${PORT}`));
