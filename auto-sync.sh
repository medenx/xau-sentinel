#!/bin/bash
cd ~/xau-sentinel

echo "====== CEK PERUBAHAN FILE ======"
git status

# Jika ada perubahan, langsung commit & push
if [[ -n $(git status --porcelain) ]]; then
  git add .
  git commit -m "Auto-sync: update $(date '+%Y-%m-%d %H:%M:%S')"
  git push origin main
  echo "✅ GitHub sudah diperbarui!"
else
  echo "⏩ Tidak ada perubahan, skip push."
fi

echo "====== DEPLOY KE RAILWAY ======"
railway up --detach

echo "====== DEPLOY COMPLETED ======"
