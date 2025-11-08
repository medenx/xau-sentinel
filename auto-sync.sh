#!/bin/bash
PROJECT_DIR="$HOME/xau-sentinel"
LOG_FILE="$PROJECT_DIR/.sync.log"
INTERVAL=60
MIRROR_REPO="https://github.com/USERNAME/REPO-BACKUP.git"  # Ganti jika ingin aktifkan backup
START_HOUR=8    # 08:00
END_HOUR=22     # 22:00 (tidak sync di >=22)

cd "$PROJECT_DIR" || { echo "❌ Project tidak ditemukan: $PROJECT_DIR" | tee -a "$LOG_FILE"; exit 1; }

rotate_logs() {
  # Rotasi bila >1MB
  if [ -f "$LOG_FILE" ]; then
    size=$(wc -c < "$LOG_FILE")
    if [ "$size" -gt 1048576 ]; then
      mv "$LOG_FILE" "${LOG_FILE}.$(date +%Y%m%d%H%M%S)" 2>/dev/null || true
      : > "$LOG_FILE"
      echo "🧹 Log dirotasi ($(date))" >> "$LOG_FILE"
    fi
  fi
}

echo "=== Auto-sync start ($(date)) ===" >> "$LOG_FILE"

# Tarik dulu saat mulai (auto-pull saat Termux dibuka)
rotate_logs
if ping -c 1 -W 1 google.com >/dev/null 2>&1; then
  git pull --rebase --autostash >> "$LOG_FILE" 2>&1 || { git rebase --abort >/dev/null 2>&1; git pull --no-rebase >> "$LOG_FILE" 2>&1; }
else
  echo "🌐 Tidak ada internet saat start ($(date))" >> "$LOG_FILE"
fi

while true; do
  rotate_logs

  # Time window 08:00–22:00
  H=$(date +%H)
  if [ "$H" -lt "$START_HOUR" ] || [ "$H" -ge "$END_HOUR" ]; then
    echo "⏸ Di luar jam sinkron (sekarang: $H). Tidur $INTERVAL dtk." >> "$LOG_FILE"
    sleep "$INTERVAL"
    continue
  fi

  # Battery check (pause jika <15%)
  battery=$(dumpsys battery 2>/dev/null | awk '/level/{print $2}')
  if [ -n "$battery" ] && [ "$battery" -lt 15 ]; then
    echo "🔋 Baterai $battery% <15% — pause 120 dtk ($(date))" | tee -a "$LOG_FILE"
    sleep 120
    continue
  fi

  # Internet check
  if ! ping -c 1 -W 1 google.com >/dev/null 2>&1; then
    echo "🌐 Offline ($(date)) — retry $INTERVAL dtk" >> "$LOG_FILE"
    sleep "$INTERVAL"
    continue
  fi

  echo "⏳ Cek sinkron ($(date))..." >> "$LOG_FILE"

  # Commit dulu semua perubahan lokal (tracked/untracked)
  if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
    git add -A
    git commit -m "AutoSync-local: $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE" 2>&1 || true
  fi

  # Pull (rebase + autostash) → fallback merge
  if ! git pull --rebase --autostash >> "$LOG_FILE" 2>&1; then
    echo "⚠️ Rebase gagal — fallback merge ($(date))" | tee -a "$LOG_FILE"
    git rebase --abort >/dev/null 2>&1 || true
    if ! git pull --no-rebase >> "$LOG_FILE" 2>&1; then
      echo "❌ Pull (merge) gagal — cek manual ($(date))" | tee -a "$LOG_FILE"
      sleep "$INTERVAL"
      continue
    fi
  fi

  # Push jika ada commit lokal yang belum dikirim
  if [ -n "$(git log --oneline @{u}.. 2>/dev/null)" ]; then
    if git push origin main >> "$LOG_FILE" 2>&1; then
      echo "✅ Push ke origin/main ($(date))" >> "$LOG_FILE"
    else
      echo "❌ Push origin gagal ($(date))" | tee -a "$LOG_FILE"
    fi
  else
    echo "✔ Up-to-date dengan origin ($(date))" >> "$LOG_FILE"
  fi

  # Mirror backup (aktif jika MIRROR_REPO diubah)
  if [ "$MIRROR_REPO" != "https://github.com/USERNAME/REPO-BACKUP.git" ]; then
    if git push "$MIRROR_REPO" main >> "$LOG_FILE" 2>&1; then
      echo "🗄  Mirror backup sukses ($(date))" >> "$LOG_FILE"
    else
      echo "⚠️ Mirror backup gagal/ belum diatur kredensial ($(date))" >> "$LOG_FILE"
    fi
  fi

  sleep "$INTERVAL"
done
