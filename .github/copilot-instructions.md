# Copilot instructions for FootSocial (single-file Express app)

Purpose
- Short: Help AI agents be immediately productive modifying and extending this small Express + MongoDB app.

Big picture
- The whole app is a single file: `server.js`. It contains server startup, Mongoose models, JWT auth middleware, API routes, and an inline minimal frontend served at `/`.
- Data flow: requests -> `auth` middleware (when present) -> route handlers -> `User`/`Post` Mongoose models -> MongoDB at `mongodb://127.0.0.1:27017/footsocial`.

Key files
- `server.js` — single source of truth for behavior, models, routes, inline frontend.

Runtime & developer workflow
- Install dependencies (if not present): `npm install express mongoose bcrypt jsonwebtoken cors`.
- Start MongoDB locally or use Docker: `docker run -p 27017:27017 -d --name mongo mongo:6`.
- Run server: `node server.js` (listens on port 5000).
- The inline frontend uses `API = ""` so it expects same-origin (i.e., open http://localhost:5000). If testing from another origin set `API = 'http://localhost:5000'` in the served HTML.

API surface (examples)
- POST /api/register — body: `{ "username": "u", "password": "p" }`.
- POST /api/login — body: `{ "username": "u", "password": "p" }` -> returns `{ token }`.
- POST /api/post — Auth required. body `{ "content": "text" }`.
- GET /api/feed — Auth required. returns posts populated with `user.username`.
- POST /api/like/:id — Auth required. toggles current user's like on post id.

Auth and tokens (important details)
- JWT secret is hard-coded in `server.js` as `SECRET = "FOOTSOCIAL_SECRET"`. Prefer `process.env.SECRET` for production.
- The auth middleware expects the raw token in the `Authorization` header (no `Bearer ` prefix). Example curl usage:

  curl -X POST http://localhost:5000/api/login -H 'Content-Type: application/json' -d '{"username":"alice","password":"p"}'
  # then
  curl http://localhost:5000/api/feed -H "Authorization: <token>"

Data model notes
- `User` fields: `username` (unique), `passwordHash`, `followers`, `following`.
- `Post` fields: `user` (ref `User`), `content`, `likes` (array of `User` refs).
- Passwords hashed with `bcrypt` (saltRounds = 10).

Project-specific patterns & gotchas
- Single-file layout: everything (models, routes, middleware, frontend) lives in `server.js`. When making changes, update this file — tests and other modules are not present.
- `Authorization` header usage is non-standard (raw token required). When integrating other clients or tools, ensure headers match exactly.
- `register` does not handle unique-username errors gracefully — creating a duplicate username will cause an unhandled rejection/500. Add try/catch and return 409 on duplicates.
- Inline frontend injects UI and uses localStorage for token; the frontend calls the same endpoints and expects the token in `Authorization` header without `Bearer`.

Integration points
- MongoDB at `mongodb://127.0.0.1:27017/footsocial` (local). Tests or CI should mock the DB or use a throwaway Docker Mongo instance.
- No external third-party APIs; only npm modules listed above.

How AI agents should work on this repo (concise rules)
- Prefer minimal, surgical edits to `server.js`. Because the repo is one file, keep PRs focused and revertible.
- When adding features, also add a small usage example (curl or browser steps) near the change to make QA trivial.
- When changing auth behavior (e.g., adding `Bearer`), update both server logic and the inline frontend at `/`.
- Add environment configuration for secrets and DB URL before proposing production deployment changes. Example change: replace `SECRET` with `process.env.SECRET || 'FOOTSOCIAL_SECRET'`.

Suggested small refactors (safe, discoverable tasks)
- Extract `auth` middleware into `src/middleware/auth.js` and import it — keep behavior identical (raw `Authorization` header) unless explicitly updating clients.
- Move model definitions into `src/models/{User,Post}.js` and require them in `server.js`.
- Add basic error handling around `User.create` in `/api/register` to return 409 on duplicates.

When uncertain
- If a change affects client behaviour, update the inline frontend in `server.js` and include a short manual test (open http://localhost:5000 and exercise register/login/post).

If anything in this file is unclear or you want me to expand a section (endpoints, curl examples, or a small refactor PR), tell me which part to improve.
