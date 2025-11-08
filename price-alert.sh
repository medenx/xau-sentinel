#!/bin/bash
ROOT="$HOME/xau-sentinel"
PLAN_FILE="$ROOT/plans/$(date +%F).md"
LOG_FILE="$ROOT/.price.log"
API_URL="https://api.goldapi.io/v1/XAU/USD"
API_KEY="goldapi-YOUR_API_KEY"  # Ganti jika punya key resmi

# Jika tidak punya API key goldapi, pakai fallback TradingView
get_price() {
  PRICE=$(curl -s "https://query1.finance.yahoo.com/v8/finance/chart/GC=F" \
    | grep -o '"regularMarketPrice":[0-9]*\.[0-9]*' | head -1 | cut -d':' -f2)
  echo "$PRICE"
}

get_key_level() {
  grep -i "Key Level" "$PLAN_FILE" | cut -d':' -f2- | tr -d ' ' | tr '/' ' ' | tr ',' ' ' 
}

log() { echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

log "=== PRICE ALERT STARTED ($(date)) ==="

while true; do
  PRICE=$(get_price)

  if [ -z "$PRICE" ]; then
    log "⚠️ Gagal ambil harga"
    sleep 60
    continue
  fi

  # Key Level Plan
  LEVELS=$(get_key_level)
  
  for LEVEL in $LEVELS; do
    DIFF=$(echo "$PRICE - $LEVEL" | bc)
    ABS_DIFF=$(echo "${DIFF#-}")

    if (( $(echo "$ABS_DIFF < 0.50" | bc -l) )); then
      MSG="⚠️ XAUUSD mendekati Key Level $LEVEL\nHarga sekarang: $PRICE\nCek kemungkinan sweep atau rejection!"
      source "$ROOT/.env"

      curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -d chat_id="$TELEGRAM_CHAT_ID" \
        --data-urlencode text="$MSG" >/dev/null

      log "📨 Alert terkirim: $MSG"
    fi
  done

  sleep 60
done
