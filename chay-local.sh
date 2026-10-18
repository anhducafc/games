#!/usr/bin/env sh
cd "$(dirname "$0")"
if [ ! -f dist/index.html ]; then
  echo "Đang build lần đầu..."; npm install && npm run build || exit 1
fi
( sleep 1; (xdg-open http://localhost:8080/ || open http://localhost:8080/) >/dev/null 2>&1 ) &
exec node tools/serve.mjs dist 8080
