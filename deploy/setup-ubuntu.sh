#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${1:-/opt/ithaven}"
SERVER_NAME="${2:-_}"

if [ ! -f "$APP_DIR/server.js" ]; then
  echo "Introuvable : $APP_DIR/server.js" >&2
  exit 1
fi

if [ ! -f "$APP_DIR/deploy/ithaven.service" ] || [ ! -f "$APP_DIR/deploy/nginx.conf" ]; then
  echo "Dossier deploy/ manquant dans $APP_DIR" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y nginx mysql-server nodejs npm openssl unzip curl certbot python3-certbot-nginx

DB_PASSWORD="$(openssl rand -hex 24)"
JWT_SECRET="$(openssl rand -hex 48)"
ADMIN_PASSWORD="$(openssl rand -base64 18 | tr -d '/+=')"

mysql <<SQL
CREATE DATABASE IF NOT EXISTS ecommerce CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'ithaven'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON ecommerce.* TO 'ithaven'@'localhost';
FLUSH PRIVILEGES;
SQL

TABLE_COUNT="$(mysql -Nse "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'ecommerce'")"
if [ "$TABLE_COUNT" -eq 0 ]; then
  mysql < "$APP_DIR/bd.sql"
fi

cat > "$APP_DIR/.env" <<EOF
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=ithaven
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=ecommerce
DB_SSL=
DB_SSL_CA=

JWT_SECRET=${JWT_SECRET}

ADMIN_EMAIL=admin@ithaven.tg
ADMIN_PASSWORD=${ADMIN_PASSWORD}

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
MAIL_FROM=
EOF
chmod 600 "$APP_DIR/.env"

cd "$APP_DIR"
npm install --omit=dev
npm run migrate

chown -R www-data:www-data "$APP_DIR"

install -m 644 "$APP_DIR/deploy/ithaven.service" /etc/systemd/system/ithaven.service

if [ "$SERVER_NAME" = "_" ]; then
  SERVER_LINE="server_name _;"
else
  SERVER_LINE="server_name ${SERVER_NAME} www.${SERVER_NAME};"
fi
sed "s|server_name _;|${SERVER_LINE}|" "$APP_DIR/deploy/nginx.conf" > /etc/nginx/sites-available/ithaven
rm -f /etc/nginx/sites-enabled/default
ln -sfn /etc/nginx/sites-available/ithaven /etc/nginx/sites-enabled/ithaven
nginx -t

systemctl daemon-reload
systemctl enable --now ithaven
systemctl restart nginx

sleep 3
curl -fsS http://127.0.0.1/api/health || true

echo "Identifiants admin : admin@ithaven.tg / ${ADMIN_PASSWORD}"
echo "Mot de passe MySQL : ${DB_PASSWORD}"
