const fs = require('fs');
const path = require('path');

const base = path.join(process.cwd(), '.cache');

function ensureBase() {
  if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
}

function writeJSON(name, data) {
  ensureBase();
  const f = path.join(base, name);
  fs.writeFileSync(f, JSON.stringify({ savedAt: Date.now(), data }));
}

function readJSON(name, maxAgeMs = 5 * 60 * 1000) { // default 5 menit
  try {
    const f = path.join(base, name);
    if (!fs.existsSync(f)) return null;
    const raw = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (!raw?.savedAt) return null;
    if (Date.now() - raw.savedAt > maxAgeMs) return null;
    return raw.data;
  } catch {
    return null;
  }
}

function writeText(name, text) {
  ensureBase();
  const f = path.join(base, name);
  fs.writeFileSync(f, text ?? '', 'utf8');
}

function readText(name) {
  try {
    const f = path.join(base, name);
    if (!fs.existsSync(f)) return '';
    return fs.readFileSync(f, 'utf8');
  } catch {
    return '';
  }
}

module.exports = { writeJSON, readJSON, writeText, readText };
