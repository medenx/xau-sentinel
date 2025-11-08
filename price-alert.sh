#!/bin/bash
ROOT="$HOME/xau-sentinel"
PLAN_FILE="$ROOT/plans/$(date +%F).md"
LOG_FILE="$ROOT/.price.log"

# Load token Telegram & API Key FCS
source "$ROOT/.env"

# Fungsi ambil harga XAUUSD real-time via FCS API
get_price() {
  curl -s "https://fcsapi.com/api-v3/forex/latest?symbol=XAU/USD&access_key=$FCS_API_KEY" \
  | grep -o '"price":[0-9]*\.[0-9]*' | head -1 | cut -d':' -f2
}

# Ambil Key Level dari plan harian
get_key_levels() {
  grep -i "Key Level" "$PLAN_FILE" | cut -d':' -f2- | tr -d ' ' | tr '/' ' '
}

log(){ echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

log "=== PRICE ALERT STARTED ($(date)) ==="

while true; do
  PRICE=$(get_price)

  if [ -z "$PRICE" ]; then
    log "⚠️ Gagal ambil harga dari FCSAPI"
    sleep 60
    continue
  fi

  log "✅ Harga XAUUSD: $PRICE"

  LEVELS=$(get_key_levels)
  for LEVEL in $LEVELS; do
    DIFF=$(echo "$PRICE - $LEVEL" | bc)
    ABS_DIFF="${DIFF#-}"

    # Jika harga mendekati Key Level (jarak < 0.50)
    if (( $(echo "$ABS_DIFF < 0.50" | bc -l) )); then
      MSG="⚠️ XAUUSD mendekati Key Level $LEVEL
Harga sekarang: $PRICE
Perhatikan potensi sweep/rejection."
      curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -d chat_id="$TELEGRAM_CHAT_ID" \
        --data-urlencode text="$MSG" >/dev/null

      log "📨 ALERT DIKIRIM: Level $LEVEL | Price $PRICE"
    fi
  done

  sleep 60
done
