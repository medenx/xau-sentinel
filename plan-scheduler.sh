#!/bin/bash
ROOT="$HOME/xau-sentinel"
MARK_DIR="$ROOT/.marks"
RUN_HOUR=06
RUN_MIN=30

mkdir -p "$MARK_DIR"

echo "[SCHED] Plan scheduler start $(date)" >> "$ROOT/.sync.log"

while true; do
  H=$(date +%H)
  M=$(date +%M)
  DATE=$(date +%F)
  MARK="$MARK_DIR/plan_sent_$DATE"

  # Jalan hanya jam 06:30, sekali per hari
  if [ "$H" = "$RUN_HOUR" ] && [ "$M" = "$RUN_MIN" ]; then
    if [ ! -f "$MARK" ]; then
      bash "$ROOT/plan-analyze.sh" >/dev/null 2>&1 || true
      date > "$MARK"
    fi
  fi

  sleep 30
done
