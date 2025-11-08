import dotenv from "dotenv";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";

dotenv.config();
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID_DEFAULT = process.env.TELEGRAM_CHAT_ID;
if (!TOKEN) {
  console.log("No TELEGRAM_BOT_TOKEN in .env");
  process.exit(0);
}

const API = `https://api.telegram.org/bot${TOKEN}`;
const DATA_DIR = process.env.HOME + "/xau-sentinel";
const PLAN_DIR = path.join(DATA_DIR, "plans");
const JRNL_DIR = path.join(DATA_DIR, "journal");
[PLAN_DIR, JRNL_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

let offset = 0;

function now() {
  return new Date().toISOString().replace('T',' ').slice(0,19);
}

async function send(chatId, text) {
  const target = chatId || CHAT_ID_DEFAULT;
  if (!target) return;
  try {
    await fetch(`${API}/sendMessage`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ chat_id: target, text })
    });
  } catch {}
}

function getBattery() {
  try {
    const out = execSync("dumpsys battery | grep level | awk '{print $2}'", {encoding:"utf8"}).trim();
    return out || "NA";
  } catch { return "NA"; }
}

function getNet() {
  try {
    execSync("ping -c 1 -W 1 google.com >/dev/null 2>&1");
    return "online";
  } catch { return "offline"; }
}

function gitShortStatus() {
  try {
    const b = execSync("git rev-parse --abbrev-ref HEAD", {encoding:"utf8"}).trim();
    const s = execSync("git status --porcelain", {encoding:"utf8"}).trim();
    return `branch: ${b} | dirty: ${s ? "yes" : "no"}`;
  } catch { return "git NA"; }
}

function tailSyncLog(n=20) {
  try {
    return execSync(`tail -n ${n} ${DATA_DIR}/.sync.log`, {encoding:"utf8"});
  } catch { return "No .sync.log yet"; }
}

// Risk calculator for XAUUSD (gold):
// Assumption: 1 lot = $1 per 0.01 (1 pip) move.
// lot = (balance * risk%) / (SL_pips * 1)
function riskCalc(balanceUsd, riskPercent, slPips) {
  const riskAmt = balanceUsd * (riskPercent/100);
  const lot = riskAmt / (slPips * 1.0);
  return { riskAmt: +riskAmt.toFixed(2), lot: +lot.toFixed(3) };
}

function writeAndCommit(filePath, content, commitMsg) {
  fs.writeFileSync(filePath, content);
  try {
    execSync("git add .", {cwd: DATA_DIR});
    execSync(`git commit -m "${commitMsg}"`, {cwd: DATA_DIR});
    execSync("git push origin main", {cwd: DATA_DIR});
  } catch (e) {}
}

async function handleCommand(msg) {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();

  if (text === "/start") {
    await send(chatId, "Bot aktif. Perintah: /status, /log, /plan <teks>, /journal <teks>, /risk <risk%> SL=<pips> BAL=<usd optional>");
    return;
  }

  if (text === "/status") {
    const bat = getBattery();
    const net = getNet();
    const git = gitShortStatus();
    const time = now();
    await send(chatId, `STATUS\n- time: ${time}\n- battery: ${bat}%\n- net: ${net}\n- ${git}`);
    return;
  }

  if (text.startsWith("/log")) {
    const lines = text.split(" ")[1] || "20";
    const n = Math.min(200, Math.max(5, parseInt(lines) || 20));
    await send(chatId, `.sync.log (tail -n ${n}):\n` + tailSyncLog(n).slice(-3900));
    return;
  }

  if (text.startsWith("/plan")) {
    const content = text.replace("/plan","").trim();
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth()+1).padStart(2,"0");
    const dd = String(d.getDate()).padStart(2,"0");
    const file = path.join(PLAN_DIR, `${yyyy}-${mm}-${dd}.md`);
    const md = `# Plan ${yyyy}-${mm}-${dd}\n\nPair: XAUUSD\n\n${content ? content + "\n" : ""}Created: ${now()}\n`;
    writeAndCommit(file, md, `plan: ${yyyy}-${mm}-${dd}`);
    await send(chatId, `Plan disimpan: ${yyyy}-${mm}-${dd}`);
    return;
  }

  if (text.startsWith("/journal")) {
    const content = text.replace("/journal","").trim();
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth()+1).padStart(2,"0");
    const dd = String(d.getDate()).padStart(2,"0");
    const file = path.join(JRNL_DIR, `${yyyy}-${mm}-${dd}.md`);
    const md = `# Journal ${yyyy}-${mm}-${dd}\n\n${content ? content + "\n" : ""}Created: ${now()}\n`;
    writeAndCommit(file, md, `journal: ${yyyy}-${mm}-${dd}`);
    await send(chatId, `Journal disimpan: ${yyyy}-${mm}-${dd}`);
    return;
  }

  if (text.startsWith("/risk")) {
    // formats:
    // /risk 1% SL=50
    // /risk 0.5% SL=200 BAL=250
    const mRisk = text.match(/(\d+(\.\d+)?)%/i);
    const mSL = text.match(/SL\s*=\s*(\d+(\.\d+)?)/i);
    const mBAL = text.match(/BAL\s*=\s*(\d+(\.\d+)?)/i);
    const riskPct = mRisk ? parseFloat(mRisk[1]) : 1.0;
    const slPips = mSL ? parseFloat(mSL[1]) : 50;
    const bal = mBAL ? parseFloat(mBAL[1]) : 100; // default
    const { riskAmt, lot } = riskCalc(bal, riskPct, slPips);
    await send(chatId, `RISK (XAUUSD)\n- balance: $${bal}\n- risk: ${riskPct}% ($${riskAmt})\n- SL: ${slPips} pips (0.01 = 1 pip)\n- lot size: ${lot}`);
    return;
  }

  // echo fallback
  if (text.length) {
    await send(chatId, `Echo: ${text}`);
  }
}

async function loop() {
  while (true) {
    try {
      const res = await fetch(`${API}/getUpdates?timeout=20&offset=${offset}`);
      const data = await res.json();
      if (data.ok && data.result && data.result.length) {
        for (const upd of data.result) {
          offset = upd.update_id + 1;
          if (upd.message) await handleCommand(upd.message);
        }
      }
    } catch (e) {
      // keep alive
    }
  }
}

console.log("Telegram bot polling started.");
loop();
