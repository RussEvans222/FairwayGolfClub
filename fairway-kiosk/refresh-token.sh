#!/bin/bash
# Refresh the Salesforce access token in .env
# Run: ./refresh-token.sh

FRESH_TOKEN=$(node -e "
const { AuthInfo } = require('/usr/local/lib/sf/node_modules/@salesforce/core');
(async () => {
  const auth = await AuthInfo.create({ username: 'storm.bd727290084d27@salesforce.com' });
  const fields = auth.getFields(true);
  process.stdout.write(fields.accessToken);
})();
" 2>/dev/null)

if [ -z "$FRESH_TOKEN" ]; then
  echo "❌ Failed to get token — make sure you're logged in: sf org login web --alias FairwayGolfClub"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

sed -i '' "s|^VITE_SF_ACCESS_TOKEN=.*|VITE_SF_ACCESS_TOKEN=${FRESH_TOKEN}|" "$ENV_FILE"
echo "✅ Token refreshed in .env"
echo "   Restart the dev server (Ctrl+C then npm run dev) for it to take effect."
