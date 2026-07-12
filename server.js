const express = require('express');
const cors = require('cors');
const path = require('path');
const { readJSON, writeJSON } = require('./db');

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '20mb' })); // 이미지 base64 크기 허용
app.use(cors({ origin: true, credentials: true }));

const ACCESS_KEY = process.env.ACCESS_KEY || 'gifticon-key';

// 간단한 키 인증
function requireKey(req, res, next) {
  const key = req.headers['x-access-key'] || req.query.key;
  if (key !== ACCESS_KEY) return res.status(401).json({ error: '인증 실패' });
  next();
}

// ═══════════════════════════════════════════
// 기프티콘 목록 조회
// ═══════════════════════════════════════════
app.get('/api/gifticons', requireKey, (req, res) => {
  const data = readJSON('gifticons.json', []);
  res.json(data);
});

// ═══════════════════════════════════════════
// 기프티콘 전체 저장 (앱에서 변경시 전체 동기화)
// ═══════════════════════════════════════════
app.post('/api/gifticons', requireKey, (req, res) => {
  const gifticons = req.body;
  if (!Array.isArray(gifticons)) return res.status(400).json({ error: '잘못된 데이터' });
  writeJSON('gifticons.json', gifticons);
  res.json({ ok: true, count: gifticons.length, savedAt: new Date().toISOString() });
});

// ═══════════════════════════════════════════
// 이미지 업로드 (base64)
// ═══════════════════════════════════════════
app.post('/api/images', requireKey, (req, res) => {
  const { id, imageData } = req.body || {};
  if (!id || !imageData) return res.status(400).json({ error: 'id와 imageData 필요' });

  const images = readJSON('images.json', {});
  images[id] = imageData; // base64 그대로 저장
  writeJSON('images.json', images);

  res.json({ ok: true, id });
});

// ═══════════════════════════════════════════
// 이미지 조회
// ═══════════════════════════════════════════
app.get('/api/images/:id', requireKey, (req, res) => {
  const images = readJSON('images.json', {});
  const imageData = images[req.params.id];
  if (!imageData) return res.status(404).json({ error: '이미지 없음' });
  res.json({ ok: true, imageData });
});

// ═══════════════════════════════════════════
// 헬스체크
// ═══════════════════════════════════════════
app.get('/', (req, res) => {
  res.json({ ok: true, service: 'GiftICON Server', time: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`기프티콘 서버 실행 중: http://localhost:${PORT}`));
