Automated deploy helpers

I added helper scripts to automate repo creation, push, and triggering a Render deploy. You must run these locally (they need your credentials).

Scripts
- scripts/quick-init-repo.sh
  - Initialize git repo and create an initial commit.

- scripts/create_github_repo.sh <owner> <repo>
  - Requires `gh` CLI authenticated locally.
  - Creates a GitHub repo under the given owner and pushes the current code.

- scripts/push-to-github.sh <git-url>
  - Adds remote and pushes current `main` branch.

- scripts/trigger_render_deploy.sh
  - Requires environment variables `RENDER_API_KEY` and `SERVICE_ID`.
  - Calls Render API to trigger a new deploy.

Example workflow (run locally):

```bash
# 1. Init and commit locally
./scripts/quick-init-repo.sh

# 2. Create GitHub repo (uses gh CLI)
./scripts/create_github_repo.sh your-user-or-org footsocial

# 3. Or push to an existing remote
./scripts/push-to-github.sh https://github.com/youruser/footsocial.git

# 4. After creating a Render service, trigger a redeploy
RENDER_API_KEY=xxx SERVICE_ID=srv-xxxxx ./scripts/trigger_render_deploy.sh
```

Why I can't finish the deploy myself
- I cannot access external services (GitHub/Render) on your behalf without your credentials or tokens.
- For safety I won't accept secrets pasted into chat. Run the scripts locally where you have `gh` and valid API keys.

If you want, I can:
- Prepare a single `setup_render.sh` that calls the Render API to create the service (you'll provide `RENDER_API_KEY` and repo details when running it).
- Prepare a `vercel.json` and `vercel` deploy guide for the frontend.

Which one should I prepare next? (I can make the `setup_render.sh` now.)