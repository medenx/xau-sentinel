#!/bin/bash

ROOT="$HOME/xau-sentinel"
ENV="$ROOT/.env"
LOG="$ROOT/.entry.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Load Token + Chat ID
source "$ENV"

# === SETTINGS USER ===
PAIR="XAUUSD"
LEVELS=(4010 4000 3990)     # Bisa diambil dari Trading Plan otomatis
THRESH=1.00                  # Selisih trigger
RISK_BALANCE=100             # Modal ($)
RISK_PERCENT=1               # Risiko 1%
STOPLOSS=20                  # SL default (pip)
TP=40                        # TP default (pip)

# === Ambil Harga dari Proxy ===
PRICE=$(curl -s http://localhost:3000/xau | grep -o '"price":[0-9]*\.[0-9]*' | cut -d':' -f2)

if [ -z "$PRICE" ]; then
  echo "[$DATE] ❌ Gagal ambil harga dari Proxy" | tee -a "$LOG"
  exit 1
fi

echo "[$DATE] 🔍 Cek harga $PAIR | $PRICE" | tee -a "$LOG"

for LEVEL in "${LEVELS[@]}"; do
  # Hitung selisih harga
  DIFF=$(echo "scale=2; $PRICE-$LEVEL" | bc -l)
  ABS_DIFF=$(echo "${DIFF#-}")

  if (( $(echo "$ABS_DIFF <= $THRESH" | bc -l) )); then
    # Tentukan arah entry → harga dekat resistance (SELL) / support (BUY)
    if (( $(echo "$PRICE >= $LEVEL" | bc -l) )); then
      SIGNAL="SELL"
      SL_LEVEL=$(echo "$PRICE + $STOPLOSS" | bc)
      TP_LEVEL=$(echo "$PRICE - $TP" | bc)
    else
      SIGNAL="BUY"
      SL_LEVEL=$(echo "$PRICE - $STOPLOSS" | bc)
      TP_LEVEL=$(echo "$PRICE + $TP" | bc)
    fi

    # Hitung lot berdasarkan risk management
    LOSS_PER_TRADE=$(echo "$RISK_BALANCE * $RISK_PERCENT / 100" | bc)
    LOT_SIZE=$(echo "scale=2; $LOSS_PER_TRADE / $STOPLOSS" | bc)

    MSG="⚠️ *ENTRY SIGNAL TERDETEKSI*
Pair: $PAIR
Key Level: $LEVEL
Harga Sekarang: $PRICE
Arah: *$SIGNAL*

SL: $SL_LEVEL
TP: $TP_LEVEL
Risk: ${RISK_PERCENT}% (≈ \$${LOSS_PER_TRADE})
Lot Size: ${LOT_SIZE} lot

⚠ Konfirmasi dulu di M5/M1:
- BOS?
- FVG/OB retest?
- Sweep liquidity valid?"

    # Kirim ke Telegram
    curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -d chat_id="$TELEGRAM_CHAT_ID" \
    -d parse_mode="Markdown" \
    --data-urlencode text="$MSG" >/dev/null

    echo "[$DATE] 📩 Alert Entry terkirim ($LEVEL | $SIGNAL)" | tee -a "$LOG"
  fi
done
