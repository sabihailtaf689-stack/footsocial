#!/usr/bin/env bash
# Quick init script: sets git user if needed, initializes repo and commits
set -e
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  git init
fi
git add .
if git diff --staged --quiet; then
  echo "No changes to commit."
else
  git commit -m "chore: initial commit"
fi
# ensure main branch
git branch -M main || true

echo "Repository initialized locally. To push, run:"
echo "  ./scripts/push-to-github.sh https://github.com/yourusername/yourrepo.git"