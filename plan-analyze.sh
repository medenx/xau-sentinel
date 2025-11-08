#!/bin/bash
set -e

ROOT="$HOME/xau-sentinel"
PLAN_DIR="$ROOT/plans"
ANL_DIR="$ROOT/analyses"
LOG="$ROOT/.sync.log"
ENV="$ROOT/.env"
SEND="$ROOT/tg-send.sh"

mkdir -p "$PLAN_DIR" "$ANL_DIR"

DATE=$(date +%F)
PLAN="$PLAN_DIR/$DATE.md"
ANL="$ANL_DIR/$DATE.md"

# 1) Siapkan PLAN jika belum ada
if [ ! -f "$PLAN" ]; then
  sed "s/YYYY-MM-DD/$DATE/" "$ROOT/plan-template.md" > "$PLAN"
  echo "[INFO] Plan $PLAN dibuat dari template." | tee -a "$LOG"
fi

# 2) Ambil field dari PLAN (case-insensitive)
low() { tr '[:upper:]' '[:lower:]'; }

get_field () {
  # Cari baris "Key: value" tanpa peduli kapitalisasi
  awk -v KEY="$1" '
    BEGIN{IGNORECASE=1}
    $0 ~ "^"KEY"[[:space:]]*:" {
      sub("^[^:]*:[[:space:]]*", "", $0);
      print $0; exit
    }
  ' "$PLAN"
}

BIAS=$(get_field "Bias")
HTF=$(get_field "HTF")
KEYLVL=$(get_field "Key Level")
LIQ=$(get_field "Liquidity")
ENTRY=$(get_field "Entry Model")
SESS=$(get_field "Session Fokus")
INVAL=$(get_field "Invalidation")

# Defaults aman
[ -z "$BIAS" ]  && BIAS="(isi Bias)"
[ -z "$HTF" ]   && HTF="(isi HTF H4/H1)"
[ -z "$KEYLVL" ]&& KEYLVL="(isi level)"
[ -z "$LIQ" ]   && LIQ="(isi liquidity)"
[ -z "$ENTRY" ] && ENTRY="(isi entry model)"
[ -z "$SESS" ]  && SESS="(isi sesi)"
[ -z "$INVAL" ] && INVAL="(isi invalidation)"

# 3) Logika analisis ringkas (sesuai bias + HTF + level)
bias_l=$(echo "$BIAS" | low)
htf_l=$(echo "$HTF" | low)

DIRECTION="—"
PREMIUMDISCOUNT=""
PLAYBOOK=""
RISKNOTE=""

if echo "$bias_l" | grep -qi "bear"; then
  DIRECTION="Bias: BEARISH"
  PLAYBOOK="Fokus SELL dari PREMIUM setelah sweep buyside lalu konfirmasi FVG/OB retest."
  RISKNOTE="Jangan entry di equilibrium; tunggu harga kembali ke premium sebelum sell."
else
  DIRECTION="Bias: BULLISH"
  PLAYBOOK="Fokus BUY dari DISCOUNT setelah sweep sellside lalu konfirmasi FVG/OB retest."
  RISKNOTE="Jangan entry di equilibrium; tunggu harga kembali ke discount sebelum buy."
fi

if echo "$htf_l" | grep -qi "premium"; then
  PREMIUMDISCOUNT="HTF: Harga di PREMIUM — tunggu rebalancing/return-to-mean lalu ambil setup pro-bias."
elif echo "$htf_l" | grep -qi "discount"; then
  PREMIUMDISCOUNT="HTF: Harga di DISCOUNT — tunggu sweep sisi berlawanan lalu ambil setup pro-bias."
else
  PREMIUMDISCOUNT="HTF: (cek premium/discount di H4/H1)."
fi

# 4) WARNING BLOCK – kebiasaan aman (ringkas)
read -r -d '' WARNING << 'WB'
==================== WARNING ====================
- HINDARI ENTRY TANPA KONFIRMASI M5/M1.
- WASPADA MSS TRAP TANPA RETEST OB/FVG.
- JANGAN ENTRY DI EQUILIBRIUM; CARI PREMIUM/DISCOUNT.
- IDENTIFIKASI SWEEP vs BREAKOUT (cek close/timeframe).
- HINDARI EKSEKUSI ASIA KECUALI ADA SWEEP + KONFIRMASI.
- JANGAN LUPA LOG/SCREENSHOT SETELAH EKSEKUSI.
================================================
WB

# 5) Susun analisis
read -r -d '' BODY << EOF2
ANALISIS PLAN — $DATE

$DIRECTION
$PREMIUMDISCOUNT
Playbook: $PLAYBOOK

Key Level: $KEYLVL
Liquidity: $LIQ
Entry Model: $ENTRY
Session Fokus: $SESS
Invalidation: $INVAL

$WARNING
EOF2

# 6) Simpan ke analyses/ + commit + push
echo "$BODY" > "$ANL"
echo "[ANALYZE] $ANL ditulis." | tee -a "$LOG"

# commit & push (fail-safe, jangan ganggu loop lain)
git -C "$ROOT" add "$ANL" >/dev/null 2>&1 || true
git -C "$ROOT" commit -m "analysis: $DATE" >/dev/null 2>&1 || true
git -C "$ROOT" push origin main >/dev/null 2>&1 || true

# 7) Kirim ke Telegram bila tersedia
if [ -f "$ENV" ] && [ -x "$SEND" ]; then
  bash "$SEND" "$BODY" || true
fi

exit 0
