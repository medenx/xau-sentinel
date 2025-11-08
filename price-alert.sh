#!/bin/bash
ROOT="$HOME/xau-sentinel"
PLAN_FILE="$ROOT/plans/$(date +%F).md"
LOG_FILE="$ROOT/.price.log"

# Fungsi ambil harga XAUUSD via Investing.com (HTML scrape)
get_price() {
  curl -s "https://www.investing.com/commodities/gold" \
  | grep -oP '"last"\s*:\s*\K"[0-9]+\.[0-9]+"' \
  | tr -d '"' \
  | head -1
}

# Ambil Key Level dari plan
get_key_levels() {
  grep -i "Key Level" "$PLAN_FILE" | cut -d':' -f2- | tr -d ' ' | tr '/' ' ' | tr ',' ' '
}

# Log helper
log(){ echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

log "=== PRICE ALERT STARTED ($(date)) ==="

while true; do
  PRICE=$(get_price)

  if [ -z "$PRICE" ]; then
    log "⚠️ Gagal ambil harga — koneksi atau HTML berubah"
    sleep 60
    continue
  fi

  log "✅ Harga XAUUSD sekarang: $PRICE"

  LEVELS=$(get_key_levels)

  for LEVEL in $LEVELS; do
    DIFF=$(echo "$PRICE - $LEVEL" | bc)
    ABS_DIFF="${DIFF#-}"

    if (( $(echo "$ABS_DIFF < 0.50" | bc -l) )); then
      source "$ROOT/.env"
      MSG="⚠️ XAUUSD dekat Key Level $LEVEL
Harga sekarang: $PRICE
Waspada sweep/rejection."

      curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -d chat_id="$TELEGRAM_CHAT_ID" \
        --data-urlencode text="$MSG" >/dev/null

      log "📨 ALERT DIKIRIM: Price $PRICE | Level $LEVEL"
    fi
  done

  sleep 60
done
