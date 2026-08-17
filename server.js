const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== إعدادات مهمة ==========
const DASHBOARD_PASSWORD = "123456";        // غير دي لكلمة سر قوية
const API_KEY = "my-secret-key-2026";       // مفتاح السكريبت (حطه في روبلوكس كمان)

// تخزين البيانات في الذاكرة
let activeUsers = {};      // { userId: { username, lastSeen, joinTime } }
let kicks = {};            // { userId: { reason, expireAt, permanent } }

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ========== حماية الداشبورد ==========
function checkAuth(req, res, next) {
  const password = req.headers['x-dashboard-password'] || req.query.password;
  if (password === DASHBOARD_PASSWORD) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
}

// ========== API للسكريبت بتاع روبلوكس ==========

// نبضة (Heartbeat)
app.post('/api/heartbeat', (req, res) => {
  const key = req.headers['x-api-key'];
  if (key !== API_KEY) {
    return res.status(403).json({ error: "Invalid API Key" });
  }

  const { userId, username } = req.body;
  if (!userId || !username) {
    return res.status(400).json({ error: "Missing data" });
  }

  const now = Date.now();

  // تحديث المستخدم
  activeUsers[userId] = {
    username,
    lastSeen: now,
    joinTime: activeUsers[userId]?.joinTime || now
  };

  // فحص لو فيه طرد
  const kickInfo = kicks[userId];
  if (kickInfo) {
    if (kickInfo.permanent || kickInfo.expireAt > now) {
      return res.json({
        kicked: true,
        reason: kickInfo.reason || "تم طردك من قبل الأدمن",
        remaining: kickInfo.permanent ? null : Math.ceil((kickInfo.expireAt - now) / 1000)
      });
    } else {
      // انتهى وقت الطرد المؤقت
      delete kicks[userId];
    }
  }

  res.json({ kicked: false });
});

// ========== API للداشبورد ==========

// جلب قائمة المستخدمين
app.get('/api/users', checkAuth, (req, res) => {
  const now = Date.now();
  const users = [];

  // حذف اللي ما بعتش نبضة من أكتر من 45 ثانية
  for (const [userId, data] of Object.entries(activeUsers)) {
    if (now - data.lastSeen > 45000) {
      delete activeUsers[userId];
    } else {
      users.push({
        userId,
        username: data.username,
        lastSeen: data.lastSeen,
        joinTime: data.joinTime,
        onlineFor: Math.floor((now - data.joinTime) / 1000)
      });
    }
  }

  res.json({ users, kicks });
});

// طرد لاعب
app.post('/api/kick', checkAuth, (req, res) => {
  const { userId, reason, durationMinutes, permanent } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  const now = Date.now();
  kicks[userId] = {
    reason: reason || "تم طردك من قبل الأدمن",
    permanent: permanent === true,
    expireAt: permanent ? null : now + (durationMinutes || 60) * 60 * 1000
  };

  // حذف من النشطين
  delete activeUsers[userId];

  res.json({ success: true });
});

// إلغاء الطرد
app.post('/api/unkick', checkAuth, (req, res) => {
  const { userId } = req.body;
  if (userId && kicks[userId]) {
    delete kicks[userId];
  }
  res.json({ success: true });
});

// صفحة اللوجين
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Dashboard running on port ${PORT}`);
});
