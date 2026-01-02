#!/usr/bin/env bash
# Usage: ./scripts/push-to-github.sh <git-remote-url>
set -e
if [ -z "$1" ]; then
  echo "Usage: $0 <git-remote-url>"
  exit 1
fi
REMOTE=$1
if git remote | grep origin >/dev/null 2>&1; then
  git remote remove origin
fi
git remote add origin "$REMOTE"
# push
git push -u origin main

echo "Pushed to $REMOTE"