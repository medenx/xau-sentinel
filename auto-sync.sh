#!/bin/bash

PROJECT_DIR="$HOME/xau-sentinel"
INTERVAL=60   # cek tiap 60 detik

cd "$PROJECT_DIR" || { echo "❌ Folder project tidak ditemukan"; sleep "$INTERVAL"; exit 1; }

while true; do
  echo "⏳ Mengecek sinkronisasi dengan GitHub..."

  # 1) Commit dulu kalau ada perubahan lokal (tracked, staged, atau untracked)
  if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
    echo "📌 Perubahan lokal terdeteksi → commit sebelum pull"
    git add -A
    git commit -m "AutoSync-local: $(date '+%Y-%m-%d %H:%M:%S')" >/dev/null 2>&1 || true
  fi

  # 2) Pull dari remote (rebase lebih rapi). Coba autostash; jika gagal, fallback merge.
  if ! git pull --rebase --autostash; then
    echo "⚠️ Rebase gagal → mencoba fallback merge"
    git rebase --abort >/dev/null 2>&1 || true
    git pull --no-rebase || echo "❌ Pull (merge) juga gagal — cek manual"
  fi

  # 3) Push hanya jika ada commit yang belum terkirim ke upstream
  if [ -n "$(git log --oneline @{u}.. 2>/dev/null)" ]; then
    echo "🚀 Mengirim perubahan ke GitHub..."
    if git push origin main; then
      echo "✅ Push sukses ($(date))"
    else
      echo "⚠️ Push gagal ($(date))"
    fi
  else
    echo "✔ Sudah sinkron ($(date))"
  fi

  sleep "$INTERVAL"
done
