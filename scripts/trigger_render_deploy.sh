#!/usr/bin/env bash
# Trigger a Render deploy for an existing service via Render API.
# Usage: RENDER_API_KEY=<key> SERVICE_ID=<id> ./scripts/trigger_render_deploy.sh
set -e
if [ -z "$RENDER_API_KEY" ] || [ -z "$SERVICE_ID" ]; then
  echo "Please set RENDER_API_KEY and SERVICE_ID environment variables."
  echo "Example: RENDER_API_KEY=abc SERVICE_ID=srv-xyz ./scripts/trigger_render_deploy.sh"
  exit 1
fi
curl -s -X POST \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -d '{"clearCache":true}' \
  https://api.render.com/v1/services/$SERVICE_ID/deploys | jq .

echo "Triggered deploy for $SERVICE_ID"