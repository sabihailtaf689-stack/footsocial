#!/usr/bin/env bash
# Creates a GitHub repo using the gh CLI, pushes current repo there.
# Usage: ./scripts/create_github_repo.sh <owner> <repo-name> [public|private]
set -e
if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required: https://cli.github.com/"
  exit 1
fi
OWNER=${1:-}
REPO=${2:-}
VIS=${3:-public}
if [ -z "$OWNER" ] || [ -z "$REPO" ]; then
  echo "Usage: $0 <owner> <repo-name> [public|private]"; exit 1
fi
# make sure repo initialized
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not a git repo. Run ./scripts/quick-init-repo.sh first."; exit 1
fi
# create remote
FULLNAME="$OWNER/$REPO"
if gh repo view "$FULLNAME" >/dev/null 2>&1; then
  echo "Repository $FULLNAME already exists on GitHub. Skipping creation."
else
  echo "Creating GitHub repo $FULLNAME..."
  gh repo create "$FULLNAME" --$VIS --confirm
fi
# set remote and push
if git remote | grep origin >/dev/null 2>&1; then
  git remote remove origin
fi
git remote add origin "https://github.com/$FULLNAME.git"
# push
git branch -M main || true
git push -u origin main

echo "Repo created and pushed: https://github.com/$FULLNAME"