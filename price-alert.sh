#!/bin/bash
ROOT="$HOME/xau-sentinel"
LOG="$ROOT/.price.log"
PLAN="$ROOT/plans/$(date +%F).md"
source "$ROOT/.env" 2>/dev/null

log(){ echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG"; }

get_price() {
  curl -s http://localhost:3000/xau | grep -o '"price":[0-9]*\.[0-9]*' | cut -d':' -f2
}

get_key_levels() {
  grep -i "Key Level" "$PLAN" | cut -d':' -f2- | tr -d ' ' | tr '/' ' '
}

log "=== PRICE ALERT STARTED ($(date)) ==="

while true; do
  PRICE=$(get_price)
  if [ -z "$PRICE" ]; then
    log "⚠️ Gagal ambil harga dari Proxy lokal"
    sleep 60
    continue
  fi

  log "✅ Harga XAUUSD sekarang: $PRICE"

  LEVELS=$(get_key_levels)
  for LEVEL in $LEVELS; do
    if [[ -n "$PRICE" ]]; then
  DIFF=$(echo "$PRICE - $LEVEL" | bc -l)
  ABS=$(echo "${DIFF#-}")
  if [[ -z "$ABS" || "$ABS" == "." ]]; then
    echo "[$DATE] ⚠️ Data tidak valid di LEVEL $LEVEL" | tee -a "$LOG"
    continue
  fi
else
  echo "[$DATE] ❌ Harga kosong (skip)" | tee -a "$LOG"
  continue
fi
    ABS_DIFF="${DIFF#-}"

    if (( $(echo "$ABS_DIFF < 1.00" | bc -l) )); then
      MSG="⚠️ XAUUSD mendekati Key Level $LEVEL
Harga: $PRICE"

      curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
      -d chat_id="$TELEGRAM_CHAT_ID" \
      --data-urlencode text="$MSG" >/dev/null

      log "📨 ALERT TERKIRIM (Level=$LEVEL / Price=$PRICE)"
    fi
  done

  sleep 60
done
