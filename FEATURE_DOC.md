FootSocial — Football-First Product Features

Overview
- Single-line vision: A social platform engineered around the match experience — moments, tactics, and fandom.
- Approach: Design features like a match plan: Formation (core social), Tactics (live analytics), Set Pieces (interactive), Training Ground (community).

Core Social Features
- Football Reels
  - What: 15–60s vertical clips auto-identified as goals, key chances, skills, or tactical moments.
  - Why fans love it: Instant high-impact viewing; easy sharing and discovery of match-defining moments.
  - How: Event-tagging + ML highlight detector; store clip metadata and CDN delivery; user uploads auto-tagged and de-duplicated.

- Tactical Stories
  - What: 24-hour annotated clips (arrows, slow-mo, voiceover, heat overlays).
  - Why: Quick coach-level analysis and shareable micro-tactics.
  - How: Client-drawn overlays persisted as layers; server compositing for export.

- Player & Club Stat Cards
  - What: Real-time stat widgets with sparklines, recent form, and compare buttons.
  - Why: Instant context on players/clubs; authoritative reference during debates.
  - How: Ingest partner feeds or public event streams; cache derived metrics for UI widgets.

- Verified Fan Hubs
  - What: Club and city fanspaces with curated content, events, and local meetups.
  - Why: Strengthens identity and retention.
  - How: Group objects, geo-tags, events calendar, moderation tools.

Live Match & Statistics
- Live xG & Win-Probability Timeline
  - What: Continuous graph; tap a point to see event clip and analytics.
  - Why: Visual storytelling; identifies turning points.
  - How: Compute xG per event, push via WebSocket/SSE; timeline entries linked to clip IDs.

- Minute-by-Minute Tactical Timeline
  - What: Events, substitutions, tactical snapshots, and short-form video per minute.
  - Why: Scan or rewatch matches quickly.
  - How: Event ingestion, index by match+minute, serve clips by timestamp.

- Live Player Ratings (AI + Crowd)
  - What: Hybrid ratings blending automated metrics and weighted fan votes.
  - Why: Dynamic debate fuel with data backing.
  - How: Metric model server-side; reputation-weighted votes; smoothing and anti-abuse.

Interactive Features
- Micro Predictions
  - What: Short TTL predictions (next 5/10 minutes outcomes).
  - Why: Fast, social, high signal for engagement and retention.
  - How: Redis for counters; immediate scoring; leaderboards.

- Coach Mode Polls
  - What: Tactical polls with formation overlay simulations.
  - Why: Empowers fans to act like managers.
  - How: Client formation editor, server poll aggregator, overlay on heatmaps.

- Live Fan Voting & Captain's Vote
  - What: Time-limited votes (MOTM, captain) with badge multipliers.
  - Why: Drives engagement and competition.
  - How: Timed polls, reputation weighting, persisted leaderboards.

Tactical & Analysis Tools
- Formation Planner
  - What: Drag-and-drop tactical board with exportable animation.
  - Why: Coaches and enthusiasts prototype and share ideas.
  - How: JSON format for formations; SVG/Canvas editor and server-side render for shareable clips.

- Set-Piece Simulator
  - What: Simulate corner/free-kick routines with probabilistic outcomes.
  - Why: Gamifies tactical creativity and educates fans.
  - How: Stochastic engine using historical conversion rates; exportable routines.

Community & Gamification
- Badges & Seasons
  - What: Season-long progression for predictions, content, and contributions.
  - Why: Long-term retention and bragging rights.
  - How: Points engine, badge issuance, seasonal resets.

- Rivalry Leagues & Leaderboards
  - What: Club-based leaderboards and seasonal rivalries.
  - Why: Fuel competition and community.
  - How: Aggregate points, display per-club leaderboards, anti-cheat measures.

Unique Wow Features
- AR Replay on Table
  - What: Project a 3D simplified replay on mobile surfaces.
  - Why: Deeply immersive and shareable.
  - How: Precompute simplified player trajectories; render via ARCore/ARKit.

- Instant VAR Rewind
  - What: Multi-angle synchronized rewind with frame-accurate seeking.
  - Why: Premium rewatch experience for critical incidents.
  - How: Time-aligned camera sources and byte-range HLS indexing.

MVP Focus (top priorities)
- Short-term MVP (3 months): Football Reels, basic Player/Club stat cards, live xG timeline (visual), profiles & fan hubs, micro predictions, basic badges.
- Core tech: Node/Express + Mongo for metadata (existing `server.js`), Redis for live counters, WebSocket gateway for live pushes, S3/CDN for clips.

Next doc: technical implementation and MVP plan (stack, infra, API sketches).