#!/bin/bash
LOCK="$HOME/xau-sentinel/.entry.lock"
while true; do (
  flock -n 9 || exit 0
  bash "$HOME/xau-sentinel/entry-alert.sh"
) 9>"$LOCK"
sleep 60
done
