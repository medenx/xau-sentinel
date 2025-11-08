#!/bin/bash
cd ~/xau-sentinel

echo "🔍 CEK PERUBAHAN FILE..."
if [[ -n $(git status --porcelain) ]]; then
  git add .
  git commit -m "Auto-sync: $(date '+%Y-%m-%d %H:%M:%S')"
  git push origin main
  echo "✅ Sinkron GitHub selesai."
else
  echo "⏩ Tidak ada perubahan, skip push."
fi

echo "⚙️ Deploy ke Railway..."
railway up --detach
echo "✅ Railway berhasil di-deploy!"
