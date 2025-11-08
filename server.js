import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = 3000;

app.get("/xau", async (req, res) => {
  try {
    const resp = await fetch("https://api.goldapi.io/api/XAU/USD", {
      headers: { "x-access-token": process.env.GOLD_API_KEY }
    });
    const data = await resp.json();
    res.json({ price: data.price });
  } catch (err) {
    res.json({ error: "Gagal ambil harga" });
  }
});

app.listen(PORT, () => console.log(`✅ Proxy XAU berjalan di port ${PORT}`));
