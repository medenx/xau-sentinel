#!/bin/bash
ROOT="$HOME/xau-sentinel"
PLAN_FILE="$ROOT/plans/$(date +%F).md"
LOG_FILE="$ROOT/.price.log"

# 1. Sumber Harga: Metals.live (Gratis, no API Key)
get_price() {
  PRICE=$(curl -s https://api.metals.live/v1/spot/gold | grep -o '[0-9]*\.[0-9]*' | head -1)
  echo "$PRICE"
}

# 2. Ambil Key Level dari Trading Plan
get_key_levels() {
  grep -i "Key Level" "$PLAN_FILE" | cut -d':' -f2- | tr -d ' ' | tr '/' ' ' | tr ',' ' '
}

# 3. Function Logging
log() { echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

log "=== PRICE ALERT STARTED ($(date)) ==="

while true; do
  PRICE=$(get_price)

  if [ -z "$PRICE" ]; then
    log "⚠️ Gagal ambil harga emas"
    sleep 60
    continue
  fi

  log "✅ Harga XAUUSD: $PRICE"

  LEVELS=$(get_key_levels)

  for LEVEL in $LEVELS; do
    DIFF=$(echo "$PRICE - $LEVEL" | bc)
    ABS_DIFF="${DIFF#-}"

    if (( $(echo "$ABS_DIFF < 0.50" | bc -l) )); then
      source "$ROOT/.env"
      MSG="⚠️ XAUUSD mendekati Key Level: $LEVEL
Harga sekarang: $PRICE
Perhatikan potensi sweep/rejection."
      curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -d chat_id="$TELEGRAM_CHAT_ID" \
        --data-urlencode text="$MSG" >/dev/null

      log "📨 ALERT DIKIRIM: Key $LEVEL | Price $PRICE"
    fi
  done

  sleep 60
done
