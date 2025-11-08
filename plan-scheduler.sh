#!/bin/bash
ROOT="$HOME/xau-sentinel"
while true; do
  now=$(date +%H:%M)
  if [ "$now" = "06:30" ]; then
    echo "=== [AUTO] Menjalankan plan-analyze.sh ($(date))" >> "$ROOT/.plan.log"
    bash "$ROOT/plan-analyze.sh"
    sleep 60       # Hindari double-execution dalam 1 menit
  fi
  sleep 20
done
