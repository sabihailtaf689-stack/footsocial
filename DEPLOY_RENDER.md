Render deploy (one-time manual steps)

1. Sign in to Render with GitHub.
2. Create New -> Web Service -> Connect your repo.
3. Settings:
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plan: Free
4. Add environment variables in Render dashboard:
   - `MONGO_URL` (or `MONGO_URI` as used in README)
   - `CLOUDINARY_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - `SECRET` (JWT secret)
5. Deploy and wait. If you need to trigger a deploy from the CLI, use Render API with your API key.

Trigger redeploy example (requires RENDER_API_KEY and SERVICE_ID):

```bash
curl -X POST \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -d '{"clearCache":true}' \
  https://api.render.com/v1/services/$SERVICE_ID/deploys
```
