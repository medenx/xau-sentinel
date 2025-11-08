#!/bin/bash
ROOT="$HOME/xau-sentinel"
source "$ROOT/.env" 2>/dev/null
LOG="$ROOT/.entry.log"
PAIR="XAUUSD"
LEVELS=(4010 4000 3990)
THRESH=1

DATE=$(date '+%Y-%m-%d %H:%M:%S')
PRICE=$(curl -s http://localhost:3000/xau | grep -o '"price":[0-9]*\.[0-9]*' | cut -d: -f2)

# ✅ Cek harga valid
if [[ -z "$PRICE" ]]; then
  echo "[$DATE] ❌ Harga kosong" | tee -a "$LOG"
  exit 1
fi

echo "[$DATE] 🔍 Cek XAUUSD | $PRICE | Levels: ${LEVELS[*]}" | tee -a "$LOG"

for LEVEL in "${LEVELS[@]}"; do
  DIFF=$(echo "$PRICE - $LEVEL" | bc -l)
  ABS=$(echo "${DIFF#-}")

  # ✅ Pastikan angka valid (bukan kosong atau .)
  if [[ -z "$ABS" || "$ABS" == "." ]]; then
    echo "[$DATE] ⚠️ Skip LEVEL $LEVEL (data invalid)" | tee -a "$LOG"
    continue
  fi

  if (( $(echo "$ABS <= $THRESH" | bc -l) )); then
    if (( $(echo "$PRICE >= $LEVEL" | bc -l) )); then SIGNAL="SELL"
    else SIGNAL="BUY"; fi

    echo "[$DATE] 📩 Alert $LEVEL | $SIGNAL" | tee -a "$LOG"
  fi
done
