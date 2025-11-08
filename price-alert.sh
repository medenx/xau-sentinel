#!/bin/bash
ROOT="$HOME/xau-sentinel"
PLAN="$ROOT/plans/$(date +%F).md"
LOG="$ROOT/.price.log"

log(){ echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG"; }

# ✅ Sumber harga: Metals.live (tidak perlu API key / IP whitelist)
get_price() {
  curl -s https://api.metals.live/v1/spot/gold \
  | grep -o '[0-9]*\.[0-9]*' \
  | head -1
}

# Ambil Key Level dari Plan
get_key_levels() {
  grep -i "Key Level" "$PLAN" | cut -d':' -f2- | tr -d ' ' | tr '/' ' ' | tr ',' ' '
}

log "=== PRICE ALERT STARTED ($(date)) ==="

while true; do
  PRICE=$(get_price)

  if [ -z "$PRICE" ]; then
    log "⚠️ Gagal ambil harga dari Metals.live"
    sleep 60
    continue
  fi

  log "✅ Harga XAUUSD sekarang: $PRICE"

  LEVELS=$(get_key_levels)

  for LEVEL in $LEVELS; do
    DIFF=$(echo "$PRICE - $LEVEL" | bc)
    ABS_DIFF="${DIFF#-}"

    if (( $(echo "$ABS_DIFF < 0.5" | bc -l) )); then
      source "$ROOT/.env"
      MSG="⚠️ XAUUSD mendekati Key Level $LEVEL
Harga: $PRICE
Perhatikan sweep/rejection."

      curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -d chat_id="$TELEGRAM_CHAT_ID" \
        --data-urlencode text="$MSG" >/dev/null

      log "📨 ALERT DIKIRIM (Level=$LEVEL | Price=$PRICE)"
    fi
  done

  sleep 60
done
