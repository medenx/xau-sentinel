#!/bin/bash
ROOT="$HOME/xau-sentinel"
ENV="$ROOT/.env"
LOG="$ROOT/.entry.log"
STATE="$ROOT/.entry.state"         # simpan status per level
PLAN="$ROOT/plans/$(date +%F).md"  # ambil Key Level dari plan harian
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# ========= USER SETTINGS =========
PAIR="XAUUSD"
THRESH=1.00           # ambang trigger (USD)
COOLDOWN_MIN=15       # cooldown per level (menit)
RISK_BALANCE=100      # modal ($)
RISK_PERCENT=1        # % risiko
STOPLOSS=20           # SL (USD poin)
TP=40                 # TP (USD poin)
# =================================

source "$ENV" 2>/dev/null

touch "$STATE"

# Ambil harga dari proxy
PRICE=$(curl -s http://localhost:3000/xau | grep -o '"price":[0-9]*\.[0-9]*' | cut -d':' -f2)
if [ -z "$PRICE" ]; then
  echo "[$DATE] ❌ Gagal ambil harga dari Proxy" | tee -a "$LOG"
  exit 1
fi

# Ambil Key Level dari plan; fallback ke default jika belum ada
readarray -t LEVELS < <(grep -i "Key Level" "$PLAN" 2>/dev/null \
  | head -1 | cut -d':' -f2- | tr -d ' ' | tr ',' ' ')

if [ ${#LEVELS[@]} -eq 0 ]; then
  LEVELS=(4010 4000 3990)
fi

echo "[$DATE] 🔍 Cek $PAIR | $PRICE | Levels: ${LEVELS[*]}" | tee -a "$LOG"

# Helper: get/set state
get_state(){ grep -m1 "^$1|" "$STATE" | head -1; }
set_state(){
  local level="$1" when="$2" side="$3" lastp="$4"
  # hapus lama
  sed -i "\|^$level| |d" "$STATE"
  # tulis baru
  echo "$level|$when|$side|$lastp" >> "$STATE"
}

for LEVEL in "${LEVELS[@]}"; do
  # hitung selisih
  DIFF=$(echo "scale=4; $PRICE - $LEVEL" | bc -l)
  ABS=$(echo "${DIFF#-}")

  # hanya proses jika dalam ambang
  if (( $(echo "$ABS <= $THRESH" | bc -l) )); then
    # arah sinyal
    if (( $(echo "$PRICE >= $LEVEL" | bc -l) )); then
      SIGNAL="SELL"
      SL_LEVEL=$(echo "$PRICE + $STOPLOSS" | bc -l)
      TP_LEVEL=$(echo "$PRICE - $TP" | bc -l)
    else
      SIGNAL="BUY"
      SL_LEVEL=$(echo "$PRICE - $STOPLOSS" | bc -l)
      TP_LEVEL=$(echo "$PRICE + $TP" | bc -l)
    fi

    # cek cooldown & duplikasi
    NOWS=$(date +%s)
    ST=$(get_state "$LEVEL")
    LAST_TS=0; LAST_SIDE=""; LAST_PRICE=""
    if [ -n "$ST" ]; then
      IFS='|' read -r _LEVEL LAST_TS LAST_SIDE LAST_PRICE <<< "$ST"
    fi

    # skip jika masih cooldown
    if [ "$LAST_TS" -gt 0 ]; then
      ELAPSE_MIN=$(( (NOWS - LAST_TS) / 60 ))
    else
      ELAPSE_MIN=$(( COOLDOWN_MIN + 1 ))
    fi

    # skip jika arah & harga praktis sama (<= 0.05) dan masih dalam cooldown
    SAME_SIDE=$([ "$LAST_SIDE" = "$SIGNAL" ] && echo 1 || echo 0)
    PRICE_DIFF_OK=1
    if [ -n "$LAST_PRICE" ]; then
      PD=$(echo "scale=4; ($PRICE - $LAST_PRICE)"; echo) | bc -l
      APD=$(echo "${PD#-}")
      # jika perubahan < 0.05, anggap sama
      if (( $(echo "$APD < 0.05" | bc -l) )); then PRICE_DIFF_OK=0; fi
    fi

    if [ "$ELAPSE_MIN" -lt "$COOLDOWN_MIN" ] && [ "$SAME_SIDE" -eq 1 ] && [ "$PRICE_DIFF_OK" -eq 0 ]; then
      echo "[$DATE] ⏳ Skip $LEVEL ($SIGNAL) — cooldown ${ELAPSE_MIN}/${COOLDOWN_MIN}m & harga belum berubah" >> "$LOG"
      continue
    fi

    # hitung risiko & lot
    LOSS_PER_TRADE=$(echo "scale=2; $RISK_BALANCE * $RISK_PERCENT / 100" | bc -l)
    LOT_SIZE=$(echo "scale=2; $LOSS_PER_TRADE / $STOPLOSS" | bc -l)

    MSG="⚠️ *ENTRY SIGNAL*
Pair: $PAIR
Key Level: $LEVEL
Harga: $PRICE
Arah: *$SIGNAL*
Selisih: $ABS (≤ $THRESH)

SL: $SL_LEVEL
TP: $TP_LEVEL
Risk: ${RISK_PERCENT}% (≈ \$${LOSS_PER_TRADE})
Lot: ${LOT_SIZE}

*CATATAN KONFIRMASI M5/M1*
- BOS valid?
- Retest FVG/OB ada?
- Sweep vs breakout (close candle)?
- Hindari entry Asia tanpa sweep + konfirmasi."

    # kirim telegram
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
      curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -d chat_id="$TELEGRAM_CHAT_ID" \
        -d parse_mode="Markdown" \
        --data-urlencode text="$MSG" >/dev/null \
        && echo "[$DATE] 📩 Entry $LEVEL | $SIGNAL (ELAPSE ${ELAPSE_MIN}m)" | tee -a "$LOG"
    else
      echo "[$DATE] ⚠️ Token/Chat ID kosong — kirim dibatalkan" | tee -a "$LOG"
    fi

    # simpan state
    set_state "$LEVEL" "$NOWS" "$SIGNAL" "$PRICE"
  fi
done
