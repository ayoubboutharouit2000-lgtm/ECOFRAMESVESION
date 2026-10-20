#!/bin/bash
# Build dist/ and publish it to Cloudflare (Workers static assets, settings in wrangler.jsonc).
#
#   ./deploy-cloudflare.sh            deploy to production  -> https://ecoframes-vision.<account>.workers.dev
#   ./deploy-cloudflare.sh --preview  upload a preview version on its own URL, to check before going live
#
# Needs: python3, node (Wrangler runs through npx), and a one-time `npx wrangler@4 login`.
set -euo pipefail
cd "$(dirname "$0")"

python3 scripts/build-dist.py

if [ "${1:-}" = "--preview" ]; then
  npx -y wrangler@4 versions upload --message "Preview $(date '+%Y-%m-%d %H:%M')"
else
  npx -y wrangler@4 deploy --message "Deploy $(date '+%Y-%m-%d %H:%M')"
fi
