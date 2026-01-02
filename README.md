FootSocial — Prototype README

Quick start (dev)
1. Ensure MongoDB is running locally on `mongodb://127.0.0.1:27017` (or update `server.js` connection). Docker example:

```powershell
# start Mongo in Docker (if Docker installed)
docker run -p 27017:27017 -d --name mongo mongo:6
```

2. Install dependencies (already in repo):

```powershell
cd "C:\Users\sabih\OneDrive\Desktop\site 1.0"
npm install
```

3. Start the server:

```powershell
node server.js
```

Open http://localhost:5000 to use the inline demo UI. The demo expects the token in the `Authorization` header without `Bearer ` prefix.

Dev helper script

I added `start-dev.ps1` to automate common local dev steps (requires Docker + Chrome):

```powershell
# run once to start mongo (docker), server and open chrome
.\start-dev.ps1
```

If Docker is not available the script will instruct you to start MongoDB manually.

Notes
- Clips and heavy media should be stored in S3; the prototype keeps only metadata.
- To prototype live features, run a Redis instance for pub/sub and counters.
- See `FEATURE_DOC.md`, `TECH_MVP.md`, `ROADMAP.md`, `TASKS.md`, and `DATA_SPEC.md` for product and engineering details.

Docker compose (quick dev)

Create `.env` with overrides (optional):

```
MONGO_URL=mongodb://mongo:27017/footsocial
PORT=5000
SECRET=FOOTSOCIAL_SECRET
```

Then run:

```powershell
docker compose up -d
npm install
npm start
```

This will start a Mongo container (image: `mongo:6`) and the app can connect via `MONGO_URL`.

Deploying to GitHub
-------------------

1. Create a new repository on GitHub (UI) or via the CLI. Then push this project:

```bash
git init
git add .
git commit -m "Initial FootSocial"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo>.git
git push -u origin main
```

2. GitHub Actions (CI): a workflow is included at `.github/workflows/ci.yml` — it will build the Docker image and push to GitHub Container Registry (GHCR) as `ghcr.io/<owner>/<repo>:latest` when you push to `main`.

3. (Optional) To allow the workflow to push to GHCR you may need to enable `packages: write` permissions for the Actions `GITHUB_TOKEN` in repository settings, or create a Personal Access Token and store it in `secrets.GITHUB_TOKEN`.

4. Once the image is published you can deploy it to any container host (GitHub Actions, DigitalOcean, AWS ECS, etc.) using the published image.

If you want I can initialize a local git repo and prepare a push commit for you; I cannot push to your GitHub account without credentials.

Frontend on Vercel (free) + Cloudinary (free) for media
-----------------------------------------------------

If you want a completely free deployment using Vercel for hosting the frontend and Cloudinary for media storage, follow these steps:

1. Create a free Cloudinary account and an **unsigned upload preset** (settings → upload → upload presets → create). Note the `cloud name` and the `upload preset` name.

2. Edit `public/app.js` and set `CLOUDINARY_CLOUD` and `CLOUDINARY_UPLOAD_PRESET` to the values from Cloudinary (for development you can edit directly; for Vercel use environment variables and a small client-side build step).

3. Deploy the frontend to Vercel (it will serve `public/` as a static site). The feed and user actions will still POST metadata to the backend API. You can:
	- Keep the backend locally or on any free Docker host; or
	- Convert the backend endpoints to Vercel serverless functions (they can connect to MongoDB Atlas free tier).

Quick Vercel deploy (frontend-only):

```bash
# from your project root
# install vercel CLI if needed: npm i -g vercel
vercel deploy --prod --name footsocial-frontend public
```

Notes:
- Using Cloudinary unsigned uploads avoids server-side media processing and makes the frontend fully static-friendly.
- MongoDB Atlas provides a free M0 tier suitable for testing; Vercel serverless functions can connect to it.
- If you want, I can convert the backend to serverless functions and remove server-side media processing so the entire app (frontend + serverless API) can live on Vercel + MongoDB Atlas + Cloudinary free tiers.
