#!/bin/sh
set -eu
: "${PORT:=8080}"
export PORT
# The API uses a private port; Nginx exposes Railway's assigned public port.
(PORT=3000 node --enable-source-maps /app/api/dist/index.mjs) &
envsubst '${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'
