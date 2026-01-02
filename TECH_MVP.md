Technical Implementation & MVP

Stack (MVP)
- Backend: Node.js (Express) — `server.js` prototype
- DB: MongoDB for metadata (matches, events, posts, users)
- Cache/Realtime: Redis for counters, leaderboards, and pub/sub
- Realtime transport: WebSockets (socket.io) or SSE for timelines
- Storage: S3-compatible object storage for clips; CDN for delivery
- ML/Batch: Serverless GPU or batch workers for highlight detection and composition

Event Pipeline
- Ingest layer normalizes feeds to schema: {matchId, timestamp, eventType, playerIds, x, y, meta}
- Queue (Kafka/Rabbit/Redis streams) for downstream consumers (xG service, highlights, heatmap aggregator)
- Store raw events and derived metrics in Mongo; push live deltas via WebSocket.

MVP Components & APIs (sketch)
- POST /api/register, /api/login (existing)
- POST /api/post — create clip post (existing model) + metadata
- GET /api/feed — include `clipTags`, `matchId`, `minute`
- GET /api/match/:id/timeline — returns ordered events + clip IDs
- GET /api/match/:id/xg — time-series xG and win-probability
- WS /live/match/:id — subscribe to live events, xG deltas, polls
- POST /api/predictions — submit prediction; server computes score after TTL

Data flow for a live event -> highlight
1. Event arrives (live feed) -> normalized event stored
2. xG service computes delta and persists timeseries
3. Highlight detector checks event pattern -> if hit, request short clip generation or tag existing clip
4. WebSocket pushes timeline update with clip link

MVP Hosting & infra
- Start small: single Node process + Mongo (managed or Docker), Redis managed service, S3 (AWS/GCP/MinIO), Cloudflare CDN.
- Autoscale: separate services for real-time, ingestion, and heavy video composition jobs.

Operational concerns
- Copyright: include fingerprinting and DMCA takedown process.
- Moderation: community moderators and automated profanity and image detection.
- Anti-cheat: reputation-based weighting for votes and prediction leaderboards.

Testing & Metrics
- Key metrics: DAU, clips/day, live engagement (WS connections/min), prediction participation rate, churn by club.
- Start A/B tests on highlight ranking model and poll timing.

MVP Deliverables (6-week milestones)
- Week 1–2: Core posts + basic reels ingestion + local clip upload flow
- Week 3–4: Live timeline API + xG mini-service + WebSocket feed
- Week 5–6: Micro predictions, leaderboards, and badges integration

Next: Roadmap with priorities and per-sprint tasks.