#!/bin/bash
set -u
PROJECT_DIR="$HOME/xau-sentinel"
notify_telegram() {
  ENV="$HOME/xau-sentinel/.env";
  [ -f "$ENV" ] || return 0;
  . "$ENV";
  [ -z "$TELEGRAM_BOT_TOKEN" ] && return 0;
  [ -z "$TELEGRAM_CHAT_ID" ] && return 0;
  bash $HOME/xau-sentinel/tg-send.sh "$1" >/dev/null 2>&1 || true
}
LOG_FILE="$PROJECT_DIR/.sync.log"
CONFLICT_LOG="$PROJECT_DIR/.conflict.log"
BASE_INTERVAL=60         # interval dasar (detik)
MAX_IDLE_FACTOR=5        # interval bisa naik sampai 5x saat idle
IDLE_COUNT=0
MIRROR_REPO="https://github.com/USERNAME/REPO-BACKUP.git"  # ganti jika ingin aktifkan mirror
START_HOUR=8   # sinkron aktif mulai 08:00
END_HOUR=22    # non-aktif >= 22:00

cd "$PROJECT_DIR" || { echo "❌ Project tidak ditemukan: $PROJECT_DIR" | tee -a "$LOG_FILE"; exit 1; }

log() { echo "$@" | tee -a "$LOG_FILE" >/dev/null; }

rotate_logs() {
  # Rotasi bila >1MB dan kompres arsip lama
  if [ -f "$LOG_FILE" ]; then
    local size
    size=$(wc -c < "$LOG_FILE")
    if [ "$size" -gt 1048576 ]; then
      local stamp
      stamp=$(date +%Y%m%d%H%M%S)
      mv "$LOG_FILE" "${LOG_FILE}.${stamp}" 2>/dev/null || true
      gzip -f "${LOG_FILE}.${stamp}" 2>/dev/null || true
      : > "$LOG_FILE"
      log "🧹 Rotasi & kompres log (${stamp})"
    fi
  fi
}

protect_lock() {
  # P1: auto-perbaiki index.lock jika tidak ada proses git aktif
  if [ -f ".git/index.lock" ]; then
    if ! pgrep -f "git " >/dev/null 2>&1; then
      rm -f ".git/index.lock"
      log "🔓 index.lock ditemukan dan dihapus otomatis"; notify_telegram "index.lock dibersihkan otomatis"
    else
      log "⏳ index.lock ada & git masih berjalan — menunggu"
      return 1
    fi
  fi
  return 0
}

in_time_window() {
  local H
  H=$(date +%H)
  [ "$H" -ge "$START_HOUR" ] && [ "$H" -lt "$END_HOUR" ]
}

have_internet() {
  ping -c 1 -W 1 google.com >/dev/null 2>&1
}

battery_ok() {
  local level
  level=$(dumpsys battery 2>/dev/null | awk '/level/{print $2}')
  # Jika tidak bisa baca battery (sebagian device), anggap OK
  [ -z "$level" ] && return 0
  [ "$level" -ge 15 ]
}

handle_conflicts() {
  # P2: deteksi konflik pull
  if [ -n "$(git ls-files -u 2>/dev/null)" ]; then
    local stamp
    stamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "=== Konflik terdeteksi ($stamp) ===" >> "$CONFLICT_LOG"
    git status >> "$CONFLICT_LOG" 2>&1
    echo "" >> "$CONFLICT_LOG"
    log "⚠️ Konflik merge terdeteksi — detail tersimpan di .conflict.log. Sinkron dihentikan sementara sampai konflik diselesaikan."
    return 1
  fi
  return 0
}

self_heal() {
  # P6: self-health sederhana — jika command sebelumnya gagal, jeda dan lanjut
  sleep 2
}

adaptive_sleep() {
  # P3: interval adaptif — makin idle, makin lama jedanya
  local factor=$(( IDLE_COUNT + 1 ))
  [ "$factor" -gt "$MAX_IDLE_FACTOR" ] && factor="$MAX_IDLE_FACTOR"
  local dur=$(( BASE_INTERVAL * factor ))
  sleep "$dur"
}

# ---- STARTUP ----
rotate_logs
log "=== Auto-sync start ($(date)) ==="

# Auto-pull saat start (sekali)
if have_internet; then
  protect_lock || sleep 5
  if ! git pull --rebase --autostash >> "$LOG_FILE" 2>&1; then
    git rebase --abort >/dev/null 2>&1 || true
    git pull --no-rebase >> "$LOG_FILE" 2>&1 || true
  fi
else
  log "🌐 Tidak ada internet saat start"
fi

# Loop utama
while true; do
  rotate_logs

  # Time window
  if ! in_time_window; then
    log "⏸ Di luar jam sinkron (sekarang $(date +%H))."
    IDLE_COUNT=$(( IDLE_COUNT + 1 ))
    adaptive_sleep
    continue
  fi

  # Battery
  if ! battery_ok; then
    log "🔋 Baterai <15% — pause 120 detik."; notify_telegram "Baterai <15% \- sinkron pause"
    sleep 120
    continue
  fi

  # Internet
  if ! have_internet; then
    log "🌐 Offline — retry nanti."; notify_telegram "Offline: auto\-sync tunda"
    IDLE_COUNT=$(( IDLE_COUNT + 1 ))
    adaptive_sleep
    continue
  fi

  # Lindungi lock
  if ! protect_lock; then
    IDLE_COUNT=$(( IDLE_COUNT + 1 ))
    adaptive_sleep
    continue
  fi

  log "⏳ Cek sinkron ($(date))..."

  local_changed=false
  # Commit lokal (tracked/untracked) sebelum pull
  if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
    git add -A
    if git commit -m "AutoSync-local: $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE" 2>&1; then
      local_changed=true
      log "📝 Commit lokal otomatis dibuat."
    fi
  fi

  # Pull (rebase + autostash) → fallback merge
  if ! git pull --rebase --autostash >> "$LOG_FILE" 2>&1; then
    log "⚠️ Rebase gagal — fallback merge"; notify_telegram "Rebase gagal \- fallback merge"
    git rebase --abort >/dev/null 2>&1 || true
    if ! git pull --no-rebase >> "$LOG_FILE" 2>&1; then
      log "❌ Pull gagal — akan dicoba ulang nanti."; notify_telegram "Pull gagal, akan retry"
      self_heal
      IDLE_COUNT=$(( IDLE_COUNT + 1 ))
      adaptive_sleep
      continue
    fi
  fi

  # Cek konflik
  if ! handle_conflicts; then
    # Jangan push kalau konflik
    IDLE_COUNT=$(( IDLE_COUNT + 1 ))
    adaptive_sleep
    continue
  fi

  # Push jika ada commit lokal belum terkirim
  if [ -n "$(git log --oneline @{u}.. 2>/dev/null)" ]; then
    if git push origin main >> "$LOG_FILE" 2>&1; then
      log "✅ Push ke origin/main sukses."
      IDLE_COUNT=0
    else
      log "❌ Push ke origin gagal."; notify_telegram "Push ke GitHub GAGAL"
      self_heal
      IDLE_COUNT=$(( IDLE_COUNT + 1 ))
      adaptive_sleep
      continue
    fi
  else
    # Tidak ada yang dipush — idle naik
    IDLE_COUNT=$(( IDLE_COUNT + 1 ))
    log "✔ Up-to-date dengan origin."
  fi

  # P5: Mirror backup (aktif jika URL diganti)
  if [ "$MIRROR_REPO" != "https://github.com/USERNAME/REPO-BACKUP.git" ]; then
    if git push "$MIRROR_REPO" main >> "$LOG_FILE" 2>&1; then
      log "🗄  Mirror backup sukses."
    else
      log "⚠️ Mirror backup gagal / belum diatur kredensial."
    fi
  fi

  adaptive_sleep
done
