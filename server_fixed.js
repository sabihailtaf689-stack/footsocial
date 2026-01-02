// FOOTSOCIAL — cleaned server implementation (server_fixed.js)
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { Server: IOServer } = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json());

const SECRET = process.env.SECRET || 'FOOTSOCIAL_SECRET';

mongoose.connect(process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/footsocial')
  .catch(err => console.error('mongo connect error', err));

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  passwordHash: String,
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  favoriteClub: String,
  badges: [String],
  reputation: { type: Number, default: 0 },
  role: { type: String, default: 'user' },
}, { timestamps: true });

const PostSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: String,
  clipUrl: String,
  thumbnailUrl: String,
  durationSec: Number,
  matchId: String,
  minute: Number,
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

const MatchEventSchema = new mongoose.Schema({
  matchId: String,
  timestamp: Date,
  minute: Number,
  eventType: String,
  playerIds: [String],
  team: String,
  x: Number,
  y: Number,
  meta: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

const PredictionSchema = new mongoose.Schema({
  matchId: String,
  question: String,
  choices: [String],
  expiresAt: Date,
  resolvedAt: Date,
  correctChoice: String,
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  submissions: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, choice: String, createdAt: Date }],
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const Post = mongoose.model('Post', PostSchema);
const MatchEvent = mongoose.model('MatchEvent', MatchEventSchema);
const Prediction = mongoose.model('Prediction', PredictionSchema);

function estimateXGFromEvent(e) {
  if (!e || !e.eventType) return 0;
  const t = String(e.eventType).toLowerCase();
  if (t === 'goal') return 0.7;
  if (t === 'big_chance') return 0.5;
  if (t === 'shot_on_target' || t === 'shot') return 0.3;
  if (t === 'shot_off_target') return 0.05;
  return 0;
}

function computeWinProb(homeXG, awayXG) {
  const diff = (homeXG || 0) - (awayXG || 0);
  const prob = 1 / (1 + Math.exp(-0.6 * diff));
  return Math.max(0, Math.min(1, prob));
}

const server = http.createServer(app);
const io = new IOServer(server, { cors: { origin: '*' } });

io.on('connection', socket => {
  socket.on('join', matchId => { if (matchId) socket.join('match:' + matchId); });
  socket.on('leave', matchId => { if (matchId) socket.leave('match:' + matchId); });
});

function auth(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.sendStatus(401);
  try {
    const decoded = jwt.verify(token, SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.sendStatus(401);
  }
}

app.post('/api/register', async (req, res) => {
  const { username, password, favoriteClub } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  const existing = await User.findOne({ username });
  if (existing) return res.status(409).json({ error: 'username_taken' });
  const hash = await bcrypt.hash(password, 10);
  try {
    const user = await User.create({ username, passwordHash: hash, favoriteClub, badges: ['newcomer'] });
    return res.status(201).json({ success: true, id: user._id });
  } catch (err) {
    if (err && err.code === 11000) return res.status(409).json({ error: 'username_taken' });
    console.error(err); return res.sendStatus(500);
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ error: 'invalid' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(400).json({ error: 'invalid' });
  const token = jwt.sign({ id: user._id }, SECRET);
  res.json({ token });
});

app.get('/api/me', auth, async (req, res) => {
  const user = await User.findById(req.userId).select('username favoriteClub badges reputation createdAt');
  if (!user) return res.sendStatus(404);
  res.json(user);
});

app.patch('/api/me', auth, async (req, res) => {
  const { favoriteClub } = req.body || {};
  const updates = {};
  if (favoriteClub !== undefined) updates.favoriteClub = favoriteClub;
  const user = await User.findByIdAndUpdate(req.userId, updates, { new: true }).select('username favoriteClub badges reputation createdAt');
  if (!user) return res.sendStatus(404);
  res.json(user);
});

app.post('/api/post', auth, async (req, res) => {
  const { content, clipUrl, thumbnailUrl, durationSec, matchId, minute } = req.body || {};
  if (clipUrl) {
    const dup = await Post.findOne({ clipUrl });
    if (dup) return res.status(409).json({ error: 'duplicate_clip' });
  }
  const post = await Post.create({ user: req.userId, content, clipUrl, thumbnailUrl, durationSec, matchId, minute });
  res.status(201).json(post);
});

app.post('/api/clip', auth, async (req, res) => {
  const { clipUrl, thumbnailUrl, durationSec, matchId, minute, tags } = req.body || {};
  if (!clipUrl) return res.status(400).json({ error: 'clipUrl required' });
  const dup = await Post.findOne({ clipUrl });
  if (dup) return res.status(409).json({ error: 'duplicate_clip' });
  const post = await Post.create({ user: req.userId, clipUrl, thumbnailUrl, durationSec, matchId, minute, content: JSON.stringify({ tags }) });
  res.status(201).json(post);
});

app.get('/api/feed', auth, async (req, res) => {
  const posts = await Post.find().populate('user', 'username').sort({ createdAt: -1 }).limit(100);
  res.json(posts);
});

app.post('/api/like/:id', auth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.sendStatus(404);
  const idx = post.likes.findIndex(x => String(x) === String(req.userId));
  if (idx >= 0) post.likes.splice(idx, 1); else post.likes.push(req.userId);
  await post.save();
  res.json({ likes: post.likes.length });
});

app.post('/api/match/:id/event', async (req, res) => {
  const matchId = req.params.id;
  const { eventType, minute, playerIds, team, x, y, meta, timestamp } = req.body || {};
  const ev = await MatchEvent.create({ matchId, eventType, minute: minute || 0, playerIds: playerIds || [], team, x, y, meta: meta || {}, timestamp: timestamp ? new Date(timestamp) : new Date() });
  try { io.to('match:' + matchId).emit('match:event', ev); } catch (e) { console.warn('emit event failed', e && e.message); }
  const events = await MatchEvent.find({ matchId }).sort({ minute: 1, createdAt: 1 });
  let home = 0, away = 0; const entries = [];
  events.forEach(e => {
    const xg = (e.meta && typeof e.meta.xg === 'number') ? e.meta.xg : estimateXGFromEvent(e);
    if (String(e.team).toLowerCase() === 'home') home += xg; else away += xg;
    entries.push({ minute: e.minute, timestamp: e.timestamp, xgHome: Number(home.toFixed(4)), xgAway: Number(away.toFixed(4)), winProbHome: Number(computeWinProb(home, away).toFixed(4)) });
  });
  try { io.to('match:' + matchId).emit('match:xg', { entries }); } catch (e) { console.warn('emit xg failed', e && e.message); }
  res.status(201).json(ev);
});

app.get('/api/match/:id/timeline', async (req, res) => {
  const events = await MatchEvent.find({ matchId: req.params.id }).sort({ minute: 1, createdAt: 1 }).limit(100);
  res.json(events);
});

app.get('/api/match/:id/xg', async (req, res) => {
  const events = await MatchEvent.find({ matchId: req.params.id }).sort({ minute: 1, createdAt: 1 });
  let home = 0, away = 0; const entries = [];
  events.forEach(e => {
    const xg = (e.meta && typeof e.meta.xg === 'number') ? e.meta.xg : estimateXGFromEvent(e);
    if (String(e.team).toLowerCase() === 'home') home += xg; else away += xg;
    entries.push({ minute: e.minute, timestamp: e.timestamp, xgHome: Number(home.toFixed(4)), xgAway: Number(away.toFixed(4)), winProbHome: Number(computeWinProb(home, away).toFixed(4)) });
  });
  res.json({ entries });
});

app.post('/api/match/:id/prediction', auth, async (req, res) => {
  const matchId = req.params.id; const { question, choices, expiresInSec } = req.body || {};
  if (!question || !Array.isArray(choices) || choices.length < 2) return res.status(400).json({ error: 'invalid' });
  const expiresAt = expiresInSec ? new Date(Date.now() + Number(expiresInSec) * 1000) : new Date(Date.now() + 5 * 60 * 1000);
  const p = await Prediction.create({ matchId, question, choices, expiresAt, creator: req.userId, submissions: [] });
  try { io.to('match:' + matchId).emit('prediction:new', p); } catch (e) {}
  res.status(201).json(p);
});

app.post('/api/prediction/:pid/submit', auth, async (req, res) => {
  const pid = req.params.pid; const { choice } = req.body || {};
  if (!choice) return res.status(400).json({ error: 'choice required' });
  const p = await Prediction.findById(pid);
  if (!p) return res.status(404).json({ error: 'not_found' });
  if (p.expiresAt && new Date() > p.expiresAt) return res.status(400).json({ error: 'expired' });
  if (!p.choices.includes(choice)) return res.status(400).json({ error: 'invalid_choice' });
  if (p.submissions.find(s => String(s.user) === String(req.userId))) return res.status(409).json({ error: 'already_submitted' });
  p.submissions.push({ user: req.userId, choice, createdAt: new Date() }); await p.save();
  try { io.to('match:' + p.matchId).emit('prediction:update', { id: p._id, counts: p.submissions.reduce((acc, s) => { acc[s.choice] = (acc[s.choice]||0)+1; return acc; }, {}) }); } catch (e) {}
  res.json({ success: true });
});

app.get('/api/prediction/:pid', async (req, res) => {
  const p = await Prediction.findById(req.params.pid).populate('submissions.user', 'username');
  if (!p) return res.status(404).json({ error: 'not_found' });
  const counts = p.submissions.reduce((acc, s) => { acc[s.choice] = (acc[s.choice]||0)+1; return acc; }, {});
  res.json({ prediction: p, counts });
});

app.post('/api/prediction/:pid/resolve', auth, async (req, res) => {
  const pid = req.params.pid; const { correctChoice } = req.body || {};
  const p = await Prediction.findById(pid).populate('submissions.user'); if (!p) return res.status(404).json({ error: 'not_found' });
  if (!p.choices.includes(correctChoice)) return res.status(400).json({ error: 'invalid_choice' });
  if (p.resolvedAt) return res.status(400).json({ error: 'already_resolved' });
  // allow only the creator or an admin to resolve
  const requester = await User.findById(req.userId).select('role');
  if (!requester) return res.sendStatus(401);
  if (String(p.creator) !== String(req.userId) && requester.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  p.correctChoice = correctChoice; p.resolvedAt = new Date(); await p.save();
  const awarded = [];
  for (const s of p.submissions) {
    if (String(s.choice) === String(correctChoice)) {
      await User.findByIdAndUpdate(s.user._id, { $inc: { reputation: 10 } });
      awarded.push({ user: s.user.username || s.user._id, points: 10 });
    }
  }
  try { io.to('match:' + p.matchId).emit('prediction:resolved', { id: p._id, correctChoice, awarded }); } catch (e) {}
  res.json({ success: true, awarded });
});

app.get('/api/leaderboard', async (req, res) => {
  const top = await User.find().sort({ reputation: -1 }).limit(20).select('username reputation favoriteClub badges'); res.json(top);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`FootSocial running → http://localhost:${PORT}`));