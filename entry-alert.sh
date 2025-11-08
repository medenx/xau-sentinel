#!/bin/bash
set -eo pipefail

ROOT="$HOME/xau-sentinel"
ENV="$ROOT/.env"
LOG="$ROOT/.entry.log"
STATE="$ROOT/.entry.state"
PLAN="$ROOT/plans/$(date +%F).md"
DATE="$(date '+%Y-%m-%d %H:%M:%S')"

PAIR="XAUUSD"
THRESH=1.00
COOLDOWN_MIN=15
MIN_MOVE=0.10
RISK_BALANCE=100
RISK_PERCENT=1
STOPLOSS=20
TP=40

source "$ENV" 2>/dev/null || true
touch "$STATE"

PRICE=$(curl -s http://localhost:3000/xau | grep -o '"price":[0-9]*\.[0-9]*' | cut -d: -f2)

if [ -z "$PRICE" ]; then
  echo "[$DATE] ❌ Gagal ambil harga" >> "$LOG"; exit 0
fi

readarray -t LEVELS < <(grep -i "Key Level" "$PLAN" | head -1 | sed 's/Key Level://i' | tr -d ' ' | tr ',' '\n')
[ ${#LEVELS[@]} -eq 0 ] && LEVELS=(4010 4000 3990)

echo "[$DATE] 🔍 Cek XAUUSD | $PRICE | Levels: ${LEVELS[*]}" >> "$LOG"

get_state(){ grep -m1 "^$1|" "$STATE" || true; }
set_state(){
  local level="$1" when="$2" side="$3" lastp="$4"
  grep -v "^$level|" "$STATE" > "$STATE.tmp" 2>/dev/null || true
  mv "$STATE.tmp" "$STATE"
  echo "$level|$when|$side|$lastp" >> "$STATE"
}

for LEVEL in "${LEVELS[@]}"; do
  DIFF=$(echo "$PRICE - $LEVEL" | bc -l)
  ABS=$(echo "${DIFF#-}")
  if (( $(echo "$ABS <= $THRESH" | bc -l) )); then
    if (( $(echo "$PRICE >= $LEVEL" | bc -l) )); then
      SIGNAL="SELL"
      SL=$(echo "$PRICE + $STOPLOSS" | bc)
      TP_LV=$(echo "$PRICE - $TP" | bc)
    else
      SIGNAL="BUY"
      SL=$(echo "$PRICE - $STOPLOSS" | bc)
      TP_LV=$(echo "$PRICE + $TP" | bc)
    fi

    NOW=$(date +%s)
    ST=$(get_state "$LEVEL")
    LAST_TS=0; LAST_SIDE="X"; LAST_PRICE=0
    [ -n "$ST" ] && IFS='|' read -r _L LAST_TS LAST_SIDE LAST_PRICE <<< "$ST"
    ELAPSE=$(( LAST_TS>0 ? (NOW-LAST_TS)/60 : 1000 ))

    PD=$(echo "$PRICE - ${LAST_PRICE:-0}" | bc -l)
    APD=$(echo "${PD#-}")

    if [ "$ELAPSE" -lt "$COOLDOWN_MIN" ] && [ "$LAST_SIDE" = "$SIGNAL" ] && (( $(echo "$APD < $MIN_MOVE" | bc -l) )); then
      echo "[$DATE] ⏳ Skip $LEVEL ($SIGNAL) — cooldown" >> "$LOG"
      continue
    fi

    LOSS=$(echo "$RISK_BALANCE * $RISK_PERCENT / 100" | bc)
    LOT=$(echo "$LOSS / $STOPLOSS" | bc -l)

    MSG="⚠️ *ENTRY SIGNAL*
Pair: $PAIR
Level: $LEVEL
Harga: $PRICE
Arah: *$SIGNAL*
SL: $SL | TP: $TP_LV
Risk: ${RISK_PERCENT}% ≈ \$${LOSS}
Lot: $(printf "%.2f" "$LOT")

⚠ Konfirmasi M5/M1 dulu"

    [ -n "$TELEGRAM_BOT_TOKEN" ] && curl -s -X POST \
      "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
      -d chat_id="$TELEGRAM_CHAT_ID" -d parse_mode="Markdown" \
      --data-urlencode text="$MSG" >/dev/null \
      && echo "[$DATE] 📩 Alert $LEVEL | $SIGNAL" >> "$LOG"

    set_state "$LEVEL" "$NOW" "$SIGNAL" "$PRICE"
  fi
done
