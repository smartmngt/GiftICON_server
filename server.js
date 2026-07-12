const express = require('express');
const cors = require('cors');
const webpush = require('web-push');
const { readJSON, writeJSON } = require('./db');

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '20mb' }));
app.use(cors({ origin: true, credentials: true }));

const ACCESS_KEY = process.env.ACCESS_KEY || 'gifticon-key';
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:smartmngt@gmail.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

function requireKey(req, res, next) {
  const key = req.headers['x-access-key'] || req.query.key;
  if (key !== ACCESS_KEY) return res.status(401).json({ error: '인증 실패' });
  next();
}

app.get('/api/gifticons', requireKey, (req, res) => {
  res.json(readJSON('gifticons.json', []));
});

app.post('/api/gifticons', requireKey, (req, res) => {
  const gifticons = req.body;
  if (!Array.isArray(gifticons)) return res.status(400).json({ error: '잘못된 데이터' });
  writeJSON('gifticons.json', gifticons);
  res.json({ ok: true, count: gifticons.length, savedAt: new Date().toISOString() });
});

app.get('/api/settings', requireKey, (req, res) => {
  res.json(readJSON('settings.json', { notifyDays: 7 }));
});

app.post('/api/settings', requireKey, (req, res) => {
  const { notifyDays } = req.body || {};
  writeJSON('settings.json', { notifyDays: notifyDays || 7 });
  res.json({ ok: true });
});

app.get('/api/vapid-public-key', (req, res) => {
  res.json({ key: VAPID_PUBLIC_KEY || '' });
});

app.post('/api/push-subscribe', requireKey, (req, res) => {
  const sub = req.body;
  if (!sub || !sub.endpoint) return res.status(400).json({ error: '구독 정보가 올바르지 않아요' });
  const subs = readJSON('subscriptions.json', []);
  if (!subs.some(s => s.endpoint === sub.endpoint)) {
    subs.push(sub);
    writeJSON('subscriptions.json', subs);
  }
  res.json({ ok: true });
});

async function sendPushToAll(title, body) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;
  const subs = readJSON('subscriptions.json', []);
  const payload = JSON.stringify({ title, body });
  const validSubs = [];
  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub, payload);
      validSubs.push(sub);
    } catch(e) {
      if (e.statusCode !== 410) validSubs.push(sub);
    }
  }
  writeJSON('subscriptions.json', validSubs);
}

app.post('/api/check-expiry', requireKey, async (req, res) => {
  const gifticons = readJSON('gifticons.json', []);
  const settings = readJSON('settings.json', { notifyDays: 7 });
  const notifyDays = settings.notifyDays || 7;
  const today = new Date(); today.setHours(0,0,0,0);
  const expiring = gifticons.filter(g => {
    if (g.used) return false;
    const diff = Math.ceil((new Date(g.expiry) - today) / 86400000);
    return diff >= 0 && diff <= notifyDays;
  });
  if (expiring.length > 0) {
    const list = expiring.map(g => `${g.brand} ${g.item}`).join(', ');
    await sendPushToAll(`⏰ 기프티콘 만료 임박!`, `${expiring.length}장이 ${notifyDays}일 안에 만료돼요: ${list}`);
    res.json({ ok: true, sent: expiring.length });
  } else {
    res.json({ ok: true, sent: 0 });
  }
});

app.get('/', (req, res) => {
  res.json({ ok: true, service: 'GiftICON Server', time: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`기프티콘 서버 실행 중: http://localhost:${PORT}`));
