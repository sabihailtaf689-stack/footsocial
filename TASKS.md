Prototype Engineering Backlog (Phase 1)

1. Auth & Profiles (2 days)
- Implement robust register/login (handle duplicate usernames)
- Add profile fields: favorite club, region, badges

2. Posts & Reels (4 days)
- Endpoint to upload clip metadata and small video file
- Server-side basic de-dupe (perceptual hash) and tagging

3. Event Timeline & xG Mini-service (6 days)
- Simple event schema and ingestion endpoint
- Lightweight xG model (pretrained or heuristics) producing delta per event
- Store timeseries and expose /api/match/:id/xg

4. Realtime (3 days)
- WebSocket gateway for live timeline and poll updates
- Client demo page to subscribe to a match feed

5. Micro Predictions & Leaderboard (3 days)
- Prediction cards with TTL, immediate scoring, persistent leaderboards in Redis

6. Badges & Reputation (2 days)
- Points engine for prediction accuracy and posts
- Badge issuance rules and UI hooks

7. DevOps & Infra (ongoing)
- Docker compose for Node + Mongo + Redis for local dev
- CI pipeline to run lint and small test suite

Estimates assume small team and reuse of open-source components for xG and highlight detection.

Deliverables: working local prototype that supports upload -> timeline -> live push -> prediction -> leaderboard.