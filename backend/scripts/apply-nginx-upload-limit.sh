#!/bin/bash
# Apply 128MB upload limit on production Nginx so App Version ZIP uploads
# (up to 100MB file + multipart overhead) are not rejected with HTTP 413.
set -euo pipefail

SNIPPET_SRC="$(cd "$(dirname "$0")/.." && pwd)/nginx/client_max_body_size.conf"
DEST="/etc/nginx/conf.d/waadi-upload-limit.conf"

if [[ ! -f "$SNIPPET_SRC" ]]; then
  echo "Missing snippet: $SNIPPET_SRC"
  exit 1
fi

if [[ ! -d /etc/nginx/conf.d ]]; then
  echo "Nginx conf.d not found. Add this inside the api.waadi.in server block:"
  cat "$SNIPPET_SRC"
  exit 1
fi

sudo cp "$SNIPPET_SRC" "$DEST"
echo "Installed $DEST"

if sudo nginx -t; then
  sudo systemctl reload nginx || sudo service nginx reload
  echo "Nginx reloaded. client_max_body_size is now 128m."
else
  echo "nginx -t failed. Revert: sudo rm $DEST"
  exit 1
fi
