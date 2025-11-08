#!/bin/bash
ROOT="$HOME/xau-sentinel"
PLAN="$ROOT/plans/$(date +%F).md"
LOG="$ROOT/.price.log"

source "$ROOT/.env" 2>/dev/null

log(){ echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG"; }

# ✅ Ambil harga XAU/USD dari AlphaVantage
get_price() {
  curl -s "https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=XAU&to_currency=USD&apikey=$ALPHA_API_KEY" \
  | grep -o '"5\. Exchange Rate": "[0-9]*\.[0-9]*' | cut -d '"' -f4
}

# ✅ Ambil Key Level dari Trading Plan
get_key_levels() {
  grep -i "Key Level" "$PLAN" | cut -d':' -f2- | tr -d ' ' | tr '/' ' '
}

log "=== PRICE ALERT STARTED ($(date)) ==="

while true; do
  PRICE=$(get_price)

  if [ -z "$PRICE" ]; then
    log "⚠️ Gagal ambil harga dari AlphaVantage (limit/habis atau internet)"
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
      MSG="⚠️ XAUUSD mendekati Key Level $LEVEL
Harga: $PRICE
Perhatikan sweep atau rejection."
      curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -d chat_id="$TELEGRAM_CHAT_ID" \
        --data-urlencode text="$MSG" >/dev/null

      log "📨 ALERT TERKIRIM (Level=$LEVEL | Price=$PRICE)"
    fi
  done

  sleep 60
done
