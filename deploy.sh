#!/bin/bash

PROJECT_DIR="$HOME/xau-sentinel"

# Masuk ke folder project
cd $PROJECT_DIR || { echo "Folder project tidak ditemukan!"; exit 1; }

# Cek apakah ini repo git
if [ ! -d ".git" ]; then
    echo "Ini bukan repository Git!"
    exit 1
fi

echo "Menjalankan Git Add..."
git add .

echo "Commit perubahan..."
git commit -m "auto update"

echo "Push ke GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo "Push berhasil → Deploy ke Railway..."
    railway up
else
    echo "Push gagal → Railway tidak dijalankan"
fi
