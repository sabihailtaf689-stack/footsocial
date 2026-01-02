// FOOTSOCIAL — cleaned server implementation (copied from server_fixed.js)
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const { Server: IOServer } = require('socket.io');
const fs = require('fs');
const multer = require('multer');
// image/video processing
const sharp = require('sharp');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const app = express();
app.use(cors());
app.use(express.json());
// Serve static frontend files from /public
app.use(express.static(path.join(__dirname, 'public')));

// ensure uploads dir exists and serve uploads
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) try{ fs.mkdirSync(uploadsDir, { recursive: true }); }catch(e){}
app.use('/uploads', express.static(uploadsDir));

// multer for file uploads (images/videos)
const upload = multer({ dest: uploadsDir });

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

const CommentSchema = new mongoose.Schema({
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: String,
  reports: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, reason: String, createdAt: Date }],
  reportCount: { type: Number, default: 0 },
  removed: { type: Boolean, default: false },
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
const Comment = mongoose.model('Comment', CommentSchema);

const NotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: String,
  payload: mongoose.Schema.Types.Mixed,
  read: { type: Boolean, default: false },
}, { timestamps: true });

const Notification = mongoose.model('Notification', NotificationSchema);

// Badge/reputation helper
async function awardBadges(userId){
  const u = await User.findById(userId);
  if(!u) return;
  const badges = new Set(u.badges||[]);
  if((u.reputation||0) >= 100) badges.add('legend');
  else if((u.reputation||0) >= 50) badges.add('star');
  else if((u.reputation||0) >= 20) badges.add('popular');
  else if((u.reputation||0) >= 10) badges.add('rising');
  const arr = Array.from(badges);
  if(arr.length !== (u.badges||[]).length){ u.badges = arr; await u.save(); }
}

async function createNotification(userId, type, payload){
  if(!userId) return;
  try{ await Notification.create({ user: userId, type, payload }); }catch(e){}
}
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

app.post('/api/post', auth, upload.single('media'), async (req, res) => {
  // Accepts either JSON body (clipUrl/thumbnailUrl) OR multipart/form-data with a file field named 'media'.
  const { content, clipUrl, thumbnailUrl, durationSec, matchId, minute } = req.body || {};
  let clip = clipUrl || '';
  let thumb = thumbnailUrl || '';

  // If a file was uploaded, store its public URL and optionally generate thumbnails/previews
  if (req.file && req.file.path) {
    const inputPath = req.file.path;
    const mime = (req.file.mimetype || '').toLowerCase();
    // default web path to the uploaded file
    const uploadedWebPath = '/uploads/' + req.file.filename;
    try {
      if (mime.startsWith('video/')){
        // video: set clip, and generate a jpg thumbnail at 1s
        clip = uploadedWebPath;
        const thumbFilename = 'thumb-' + req.file.filename + '.jpg';
        const thumbPath = path.join(uploadsDir, thumbFilename);
        await new Promise((resolve, reject) => {
          ffmpeg(inputPath)
            .screenshots({ timestamps: ['1'], filename: thumbFilename, folder: uploadsDir, size: '640x?' })
            .on('end', resolve)
            .on('error', reject);
        });
        thumb = '/uploads/' + thumbFilename;
      } else if (mime.startsWith('image/')){
        // image: create a resized jpeg thumbnail
        const outFilename = 'thumb-' + req.file.filename + '.jpg';
        const outPath = path.join(uploadsDir, outFilename);
        try { await sharp(inputPath).resize({ width: 1080 }).jpeg({ quality: 82 }).toFile(outPath); thumb = '/uploads/' + outFilename; }
        catch(e){ console.warn('sharp resize failed', e && e.message); thumb = uploadedWebPath; }
      } else {
        // other types: keep uploaded path
        thumb = uploadedWebPath;
      }
    } catch(e){ console.warn('media processing failed', e && e.message); thumb = uploadedWebPath; }
  }

  if (clip) {
    const dup = await Post.findOne({ clipUrl: clip });
    if (dup) return res.status(409).json({ error: 'duplicate_clip' });
  }
  const post = await Post.create({ user: req.userId, content, clipUrl: clip, thumbnailUrl: thumb, durationSec, matchId, minute });
  // award first_post badge
  const me = await User.findById(req.userId);
  if (me && (!me.badges || !me.badges.includes('first_post'))){ me.badges = me.badges || []; me.badges.push('first_post'); await me.save(); }
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
  // paginated feed: ?page=0&limit=20
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const page = Math.max(0, Number(req.query.page) || 0);
  const posts = await Post.find().populate('user', 'username').sort({ createdAt: -1 }).skip(page * limit).limit(limit);
  res.json(posts);
});

// Comments for a post
app.get('/api/post/:id/comments', async (req, res) => {
  const comments = await Comment.find({ post: req.params.id, removed: { $ne: true } }).populate('user', 'username').sort({ createdAt: 1 }).limit(500);
  res.json(comments);
});

// Report a comment (auth)
app.post('/api/comment/:id/report', auth, async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) return res.status(404).json({ error: 'not_found' });
  const reason = (req.body && req.body.reason) ? String(req.body.reason).slice(0, 500) : 'reported';
  comment.reports = comment.reports || [];
  comment.reports.push({ user: req.userId, reason, createdAt: new Date() });
  comment.reportCount = (comment.reportCount || 0) + 1;
  await comment.save();
  // notify admins? simple: create notification for post owner
  try{ await createNotification(comment.user, 'comment:reported', { commentId: comment._id, by: req.userId, reason }); }catch(e){}
  res.json({ success: true, reportCount: comment.reportCount });
});

// Admin: list reported comments
app.get('/api/moderation/comments', auth, async (req, res) => {
  const requester = await User.findById(req.userId).select('role'); if(!requester || requester.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  const items = await Comment.find({ reportCount: { $gt: 0 } }).populate('user', 'username').sort({ reportCount: -1, createdAt: -1 }).limit(500);
  res.json(items);
});

// Admin: take action on reported comment
app.post('/api/moderation/comment/:id/action', auth, async (req, res) => {
  const { action } = req.body || {};
  const requester = await User.findById(req.userId).select('role'); if(!requester || requester.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  const c = await Comment.findById(req.params.id);
  if(!c) return res.status(404).json({ error: 'not_found' });
  if(action === 'remove'){ c.removed = true; await c.save(); return res.json({ success: true, removed: true }); }
  if(action === 'restore'){ c.removed = false; await c.save(); return res.json({ success: true, removed: false }); }
  res.status(400).json({ error: 'invalid_action' });
});

app.post('/api/post/:id/comment', auth, async (req, res) => {
  const text = (req.body && req.body.text) ? String(req.body.text).trim() : '';
  if (!text) return res.status(400).json({ error: 'text required' });
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: 'post_not_found' });
  const c = await Comment.create({ post: post._id, user: req.userId, text });
  const populated = await c.populate('user', 'username');
  // notify post owner
  if (String(post.user) !== String(req.userId)){
    await createNotification(post.user, 'comment', { postId: post._id, from: req.userId, text });
  }
  res.status(201).json(populated);
});

app.post('/api/like/:id', auth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.sendStatus(404);
  const idx = post.likes.findIndex(x => String(x) === String(req.userId));
  let added = false;
  if (idx >= 0) post.likes.splice(idx, 1); else { post.likes.push(req.userId); added = true; }
  await post.save();
  // update reputation and badges for post owner when liked
  try{
    if (added && String(post.user) !== String(req.userId)){
      await User.findByIdAndUpdate(post.user, { $inc: { reputation: 1 } });
      await awardBadges(post.user);
      await createNotification(post.user, 'like', { postId: post._id, from: req.userId });
    }
    if(!added && String(post.user) !== String(req.userId)){
      await User.findByIdAndUpdate(post.user, { $inc: { reputation: -1 } });
    }
  }catch(e){console.warn('reputation update failed', e && e.message)}
  res.json({ likes: post.likes.length });
});

// Follow / unfollow toggle
app.post('/api/user/:id/follow', auth, async (req, res) => {
  const targetId = req.params.id;
  if (String(targetId) === String(req.userId)) return res.status(400).json({ error: 'cannot_follow_self' });
  const me = await User.findById(req.userId);
  const target = await User.findById(targetId);
  if (!me || !target) return res.status(404).json({ error: 'not_found' });
  const isFollowing = me.following.some(f => String(f) === String(targetId));
  if (isFollowing) {
    me.following = me.following.filter(f => String(f) !== String(targetId));
    target.followers = target.followers.filter(f => String(f) !== String(req.userId));
  } else {
    me.following.push(targetId);
    target.followers.push(req.userId);
  }
  await me.save(); await target.save();
  // notify target
  if(String(target._id) !== String(req.userId)){
    await createNotification(target._id, 'follow', { from: req.userId });
    try{ await User.findByIdAndUpdate(target._id, { $inc: { reputation: 2 } }); await awardBadges(target._id); }catch(e){}
  }
  res.json({ following: !isFollowing, followerCount: target.followers.length, followingCount: me.following.length });
});

// Public profile by username
app.get('/api/user/:username', async (req, res) => {
  const u = await User.findOne({ username: req.params.username }).select('username favoriteClub badges reputation followers following createdAt');
  if (!u) return res.status(404).json({ error: 'not_found' });
  res.json({ id: u._id, username: u.username, favoriteClub: u.favoriteClub, badges: u.badges, reputation: u.reputation, followerCount: (u.followers||[]).length, followingCount: (u.following||[]).length, createdAt: u.createdAt });
});

// Followers / following lists
app.get('/api/user/:id/followers', async (req, res) => {
  const u = await User.findById(req.params.id).populate('followers', 'username');
  if (!u) return res.status(404).json({ error: 'not_found' });
  res.json((u.followers||[]).map(x=>({ id: x._id, username: x.username })));
});

app.get('/api/user/:id/following', async (req, res) => {
  const u = await User.findById(req.params.id).populate('following', 'username');
  if (!u) return res.status(404).json({ error: 'not_found' });
  res.json((u.following||[]).map(x=>({ id: x._id, username: x.username })));
});

// Change username (safe)
app.post('/api/me/username', auth, async (req, res) => {
  const wanted = (req.body && req.body.username) ? String(req.body.username).trim() : '';
  if (!wanted) return res.status(400).json({ error: 'username required' });
  const existing = await User.findOne({ username: wanted });
  if (existing && String(existing._id) !== String(req.userId)) return res.status(409).json({ error: 'username_taken' });
  const u = await User.findByIdAndUpdate(req.userId, { username: wanted }, { new: true }).select('username favoriteClub badges reputation');
  res.json(u);
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
      await awardBadges(s.user._id);
      await createNotification(s.user._id, 'prediction:won', { predictionId: p._id, points: 10 });
      awarded.push({ user: s.user.username || s.user._id, points: 10 });
    }
  }
  try { io.to('match:' + p.matchId).emit('prediction:resolved', { id: p._id, correctChoice, awarded }); } catch (e) {}
  res.json({ success: true, awarded });
});

app.get('/api/leaderboard', async (req, res) => {
  const top = await User.find().sort({ reputation: -1 }).limit(20).select('username reputation favoriteClub badges'); res.json(top);
});

// Notifications
app.get('/api/notifications', auth, async (req, res) => {
  const items = await Notification.find({ user: req.userId }).sort({ createdAt: -1 }).limit(100);
  res.json(items);
});

app.post('/api/notifications/:id/read', auth, async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { read: true });
  res.json({ success: true });
});

// Minimal homepage so visiting / in a browser shows a friendly page
// Serve a minimal single-page app so the site is interactive from the browser.
// Serve index.html from /public when root requested
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`FootSocial running → http://localhost:${PORT}`));

// Clean entry; server implementation begins below
