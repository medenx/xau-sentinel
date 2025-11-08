#!/bin/bash

PROJECT_DIR="$HOME/xau-sentinel"
cd "$PROJECT_DIR" || exit 1

while true; do
  echo "⏳ Mengecek sinkronisasi dengan GitHub..."

  git pull --rebase

  if ! git diff --quiet || ! git diff --cached --quiet; then
    git add .
    git commit -m "AutoSync: $(date '+%Y-%m-%d %H:%M:%S')" >/dev/null 2>&1
    git push origin main
    echo "✅ Perubahan otomatis dikirim ke GitHub ($(date))"
  else
    echo "✔ Sudah sinkron ($(date))"
  fi

  sleep 60
done
