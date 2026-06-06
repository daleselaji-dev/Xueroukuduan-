#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/opt/flesh-is-weak-seminar}"
REPO_URL="${REPO_URL:-https://github.com/BoHuYeShan/flesh-is-weak-seminar.git}"
BRANCH="${BRANCH:-main}"
REPO_DIR="$APP_ROOT/repo"
SITE_DIR="$APP_ROOT/site"
API_DIR="$APP_ROOT/api"
RELEASES_DIR="$APP_ROOT/releases"
LOCK_FILE="$APP_ROOT/deploy.lock"

mkdir -p "$APP_ROOT" "$RELEASES_DIR"

exec 9>"$LOCK_FILE"
flock -n 9 || {
  echo "Another deployment is running."
  exit 1
}

if [ ! -d "$REPO_DIR/.git" ]; then
  rm -rf "$REPO_DIR"
  git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$REPO_DIR"
else
  git -C "$REPO_DIR" fetch --depth 1 origin "$BRANCH"
  git -C "$REPO_DIR" reset --hard "origin/$BRANCH"
fi

cd "$REPO_DIR"
npm ci
npm run build

if [ -d api ]; then
  cd "$REPO_DIR/api"
  npm ci --omit=dev
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RELEASE="$RELEASES_DIR/$STAMP"
mkdir -p "$RELEASE/site" "$RELEASE/api"

cp -a "$REPO_DIR/.vitepress/dist/." "$RELEASE/site/"
if [ -d "$REPO_DIR/api" ]; then
  cp -a "$REPO_DIR/api/." "$RELEASE/api/"
  rm -rf "$RELEASE/api/data"
fi

rm -rf "$SITE_DIR"
mkdir -p "$SITE_DIR"
cp -a "$RELEASE/site/." "$SITE_DIR/"

if [ -d "$RELEASE/api" ]; then
  mkdir -p "$API_DIR/data"
  find "$API_DIR" -mindepth 1 -maxdepth 1 ! -name data -exec rm -rf {} +
  cp -a "$RELEASE/api/." "$API_DIR/"
  rm -rf "$API_DIR/data"
  mkdir -p "$API_DIR/data"
  cd "$API_DIR"
  npm ci --omit=dev
  systemctl restart flesh-seminar-api.service
fi

chown -R www-data:www-data "$SITE_DIR"
chown -R ubuntu:ubuntu "$API_DIR"
systemctl reload nginx

find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d | sort | head -n -5 | xargs -r rm -rf

echo "Deployed $REPO_URL#$BRANCH at $STAMP"
