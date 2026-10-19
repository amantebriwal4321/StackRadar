#!/bin/sh
# Create a local demo branch with a failing test and a vulnerable npm manifest.
# Does not push. Run from anywhere inside the repo.
set -eu

root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$root"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Working tree is dirty. Commit or stash first."
  exit 1
fi

branch=demo/transcend-failing-pipeline
if git show-ref --verify --quiet "refs/heads/$branch"; then
  echo "Branch $branch already exists."
  exit 1
fi

git switch -c "$branch"
git apply docs/gitlab-transcend/demo/failing-pipeline.patch
git add backend/tests/test_transcend_demo_failure.py demo/package.json demo/package-lock.json
echo "Seeded $branch with the failing test and demo/package-lock.json."
echo "Not pushed. When you want it on GitLab: git push -u gitlab $branch"
