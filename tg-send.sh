#!/bin/bash
set -e
ENV="$HOME/xau-sentinel/.env"
[ -f "$ENV" ] && source "$ENV"
[ -z "$TELEGRAM_BOT_TOKEN" ] && { echo "No TELEGRAM_BOT_TOKEN"; exit 0; }
[ -z "$TELEGRAM_CHAT_ID" ] && { echo "No TELEGRAM_CHAT_ID"; exit 0; }

MSG="$1"
# Escape karakter berbahaya untuk MarkdownV2 sederhana
ESCAPED=$(echo "$MSG" | sed -e 's/\\/\\\\/g' -e 's/_/\\_/g' -e 's/\*/\\*/g' -e 's/\[/\\[/g' -e 's/\]/\\]/g' -e 's/(/\\(/g' -e 's/)/\\)/g' -e 's/~/\\~/g' -e 's/`/\\`/g' -e 's/>/\\>/g' -e 's/#/\\#/g' -e 's/\\+/\\+/g' -e 's/-/\\-/g' -e 's/=/\\=/g' -e 's/!/\\!/g' -e 's/\./\\./g' -e 's/|/\\|/g')
curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{\"chat_id\":\"${TELEGRAM_CHAT_ID}\",\"text\":\"${ESCAPED}\",\"parse_mode\":\"MarkdownV2\"}" >/dev/null 2>&1 || true
