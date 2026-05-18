#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

git rm -r --cached node_modules 2>/dev/null || true
git rm -r --cached app/node_modules 2>/dev/null || true
git rm --cached .env 2>/dev/null || true
git rm --cached app/server.key app/server.cert 2>/dev/null || true

echo "Fichiers retires du suivi Git. Validez le commit dans GitHub Desktop."
