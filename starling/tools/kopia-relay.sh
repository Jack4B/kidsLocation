#!/bin/sh
# Daily copy of the relay database on CT8, kept for 7 days.
# Install once:  sh kopia-relay.sh --install   (adds a cron line at 03:17)
# The database holds only sealed posts and public keys, never plaintext.
set -eu
DB="${STARLING_DB_PATH:-$HOME/starling/relay/data/starling.db}"
OUT="$HOME/kopie-relay"
KEEP=7

if [ "${1:-}" = "--install" ]; then
  SELF="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
  ( crontab -l 2>/dev/null | grep -v 'kopia-relay.sh' ; echo "17 3 * * * /bin/sh $SELF >> $HOME/kopie-relay.log 2>&1" ) | crontab -
  echo "cron set: 17 3 * * *"
  exec /bin/sh "$SELF"
fi

mkdir -p "$OUT"
chmod 700 "$OUT"
DEST="$OUT/starling-$(date +%Y%m%d).db"
rm -f "$DEST"
# VACUUM INTO makes a consistent copy while the relay keeps writing.
node -e 'const { DatabaseSync } = require("node:sqlite"); const db = new DatabaseSync(process.argv[1]); db.exec("VACUUM INTO \x27" + process.argv[2].replace(/\x27/g, "\x27\x27") + "\x27"); db.close();' "$DB" "$DEST" 2>/dev/null
chmod 600 "$DEST"
ls -1t "$OUT"/starling-*.db | tail -n +$((KEEP + 1)) | xargs -r rm -f
echo "$(date '+%F %T') ok $DEST $(wc -c < "$DEST") B"
