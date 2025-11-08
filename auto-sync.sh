#!/bin/bash

PROJECT_DIR="$HOME/xau-sentinel"
LOG_FILE="$PROJECT_DIR/.sync.log"
INTERVAL=60
MIRROR_REPO="https://github.com/USERNAME/NAMA-REPO-BACKUP.git"

echo "=== Auto-sync berjalan ($(date)) ===" >> "$LOG_FILE"

cd "$PROJECT_DIR" || exit 1

while true; do
  # 1. Cek baterai
  battery=$(dumpsys battery 2>/dev/null | grep level | awk '{print $2}')
  if [ -n "$battery" ] && [ "$battery" -lt 15 ]; then
    echo "⚠️ Baterai di bawah 15%. Sinkron dihentikan sementara." | tee -a "$LOG_FILE"
    sleep 120
    continue
  fi

  # 2. Cek internet
  if ! ping -c 1 -W 1 google.com >/dev/null 2>&1; then
    echo "🌐 Tidak ada internet ($(date)). Tunggu..." >> "$LOG_FILE"
    sleep "$INTERVAL"
    continue
  fi

  echo "⏳ Mengecek sinkronisasi ($(date))..." >> "$LOG_FILE"

  # 3. Auto-commit perubahan lokal sebelum pull
  if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
    git add -A
    git commit -m "AutoSync-local: $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE" 2>&1 || true
  fi

  # 4. Pull dari GitHub utama
  if ! git pull --rebase --autostash >> "$LOG_FILE" 2>&1; then
    git rebase --abort >/dev/null 2>&1 || true
    git pull --no-rebase >> "$LOG_FILE" 2>&1
  fi

  # 5. Push ke GitHub utama jika ada commit baru
  if [ -n "$(git log --oneline @{u}.. 2>/dev/null)" ]; then
    git push origin main >> "$LOG_FILE" 2>&1
    echo "✅ Push ke GitHub ($(date))" >> "$LOG_FILE"
  fi

  # 6. Backup ke repo mirror (placeholder)
  if [ "$MIRROR_REPO" != "https://github.com/USERNAME/NAMA-REPO-BACKUP.git" ]; then
    git push "$MIRROR_REPO" main >> "$LOG_FILE" 2>&1 || echo "⚠️ Mirror GitHub belum aktif." >> "$LOG_FILE"
  fi

  echo "✔ Sinkronisasi selesai ($(date))" >> "$LOG_FILE"

  sleep "$INTERVAL"
done
