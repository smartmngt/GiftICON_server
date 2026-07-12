const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || '/tmp/data';

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON(filename, defaultVal) {
  ensureDir();
  const file = path.join(DATA_DIR, filename);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return defaultVal;
  }
}

function writeJSON(filename, data) {
  ensureDir();
  const file = path.join(DATA_DIR, filename);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = { readJSON, writeJSON };
