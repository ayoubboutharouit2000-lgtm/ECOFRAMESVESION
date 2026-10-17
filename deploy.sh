#!/bin/bash
# Build dist/ and publish it to Netlify (site: ecoframes-vision).
#
#   ./deploy.sh            deploy to production  -> https://ecoframes-vision.netlify.app
#   ./deploy.sh --preview  draft deploy on a unique URL, to check before going live
#
# Needs: python3, node (the Netlify CLI runs through npx), and a one-time `npx netlify-cli login`.
set -euo pipefail
cd "$(dirname "$0")"

python3 scripts/build-dist.py

if [ "${1:-}" = "--preview" ]; then
  npx -y netlify-cli deploy --dir=dist --message "Preview $(date '+%Y-%m-%d %H:%M')"
else
  npx -y netlify-cli deploy --prod --dir=dist --message "Deploy $(date '+%Y-%m-%d %H:%M')"
fi
