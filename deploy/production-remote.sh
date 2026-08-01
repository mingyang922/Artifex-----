#!/usr/bin/env bash
set -Eeuo pipefail

ARCHIVE="${1:?archive path is required}"
EXPECTED_SHA="${2:?expected SHA-256 is required}"
APP_DIR="${3:-/opt/Artifex-----}"
EXPECTED_VERSION="${4:-}"
CONTAINER_NAME="${ARTIFEX_CONTAINER_NAME:-artifex-platform}"
BACKUP_ROOT="${ARTIFEX_BACKUP_ROOT:-/opt/artifex-backups}"
LOCK_FILE="/tmp/artifex-production-deploy.lock"

exec 9>"$LOCK_FILE"
flock -n 9 || {
  echo "[error] another Artifex deployment is running"
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "[error] missing command: $1"
    exit 1
  }
}

for command_name in docker sha256sum tar flock; do
  require_command "$command_name"
done

sudo docker compose version >/dev/null
sudo test -d "$APP_DIR"
sudo test -f "$APP_DIR/.env"
sudo test -f "$APP_DIR/docker-compose.yml"
test -f "$ARCHIVE"

ACTUAL_SHA="$(sha256sum "$ARCHIVE" | awk '{print $1}')"
if [[ "${ACTUAL_SHA,,}" != "${EXPECTED_SHA,,}" ]]; then
  echo "[error] archive checksum mismatch"
  echo "expected=$EXPECTED_SHA"
  echo "actual=$ACTUAL_SHA"
  exit 1
fi

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGING_DIR="/opt/artifex-release-$TIMESTAMP"
BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP"
FAILED_DIR="/opt/artifex-failed-$TIMESTAMP"
ROLLBACK_CONTAINER="${CONTAINER_NAME}-rollback-${TIMESTAMP,,}"
DEPLOY_PROJECT="artifex-release-${TIMESTAMP,,}"
DATA_VOLUME="$(sudo docker inspect "$CONTAINER_NAME" \
  --format '{{range .Mounts}}{{if eq .Destination "/app/backend/data"}}{{.Name}}{{end}}{{end}}')"

if [[ -z "$DATA_VOLUME" ]]; then
  echo "[error] could not resolve the production data volume"
  exit 1
fi

cleanup_staging() {
  if [[ -d "$STAGING_DIR" ]]; then
    sudo rm -rf -- "$STAGING_DIR"
  fi
}
trap cleanup_staging EXIT

sudo mkdir -p "$STAGING_DIR" "$BACKUP_DIR"
sudo tar -xzf "$ARCHIVE" -C "$STAGING_DIR"

sudo test -f "$STAGING_DIR/package.json"
sudo test -f "$STAGING_DIR/Dockerfile"
sudo test -f "$STAGING_DIR/docker-compose.yml"

DEPLOY_VERSION="$(awk \
  -F'"' '/"version"[[:space:]]*:/ { print $4; exit }' "$STAGING_DIR/package.json")"
if [[ -n "$EXPECTED_VERSION" && "$DEPLOY_VERSION" != "$EXPECTED_VERSION" ]]; then
  echo "[error] package version mismatch: expected $EXPECTED_VERSION, got $DEPLOY_VERSION"
  exit 1
fi

sudo cp -a "$APP_DIR/.env" "$STAGING_DIR/.env"
if sudo test -f "$APP_DIR/config/ark-rest-api.local.json"; then
  sudo cp -a "$APP_DIR/config/ark-rest-api.local.json" \
    "$STAGING_DIR/config/ark-rest-api.local.json"
fi
if sudo grep -q '^ARTIFEX_DATA_VOLUME=' "$STAGING_DIR/.env"; then
  sudo sed -i "s|^ARTIFEX_DATA_VOLUME=.*|ARTIFEX_DATA_VOLUME=$DATA_VOLUME|" "$STAGING_DIR/.env"
else
  printf '\nARTIFEX_DATA_VOLUME=%s\n' "$DATA_VOLUME" | sudo tee -a "$STAGING_DIR/.env" >/dev/null
fi
sudo chmod 600 "$STAGING_DIR/.env"

echo "[info] building Artifex $DEPLOY_VERSION"
(
  cd "$STAGING_DIR"
  sudo docker compose --project-name artifex----- build
)

sudo tar -czf "$BACKUP_DIR/source.tgz" \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='backend/data' \
  -C "$APP_DIR" .

echo "$DATA_VOLUME" | sudo tee "$BACKUP_DIR/data-volume.txt" >/dev/null
echo "$DEPLOY_VERSION" | sudo tee "$BACKUP_DIR/deploy-version.txt" >/dev/null
echo "$ROLLBACK_CONTAINER" | sudo tee "$BACKUP_DIR/rollback-container.txt" >/dev/null

rollback() {
  echo "[rollback] restoring previous release"
  set +e
  sudo docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1
  if [[ -d "$APP_DIR" && -d "$BACKUP_DIR/app" ]]; then
    sudo mv "$APP_DIR" "$FAILED_DIR"
  fi
  if [[ -d "$BACKUP_DIR/app" ]]; then
    sudo mv "$BACKUP_DIR/app" "$APP_DIR"
  fi
  if sudo docker container inspect "$ROLLBACK_CONTAINER" >/dev/null 2>&1; then
    sudo docker rename "$ROLLBACK_CONTAINER" "$CONTAINER_NAME"
    sudo docker start "$CONTAINER_NAME" >/dev/null
  fi
  set -e
}

sudo docker stop "$CONTAINER_NAME" >/dev/null
sudo tar -czf "$BACKUP_DIR/data.tgz" \
  -C "/var/lib/docker/volumes/$DATA_VOLUME/_data" .
sudo docker rename "$CONTAINER_NAME" "$ROLLBACK_CONTAINER"
if ! sudo mv "$APP_DIR" "$BACKUP_DIR/app"; then
  rollback
  exit 1
fi
if ! sudo mv "$STAGING_DIR" "$APP_DIR"; then
  rollback
  exit 1
fi
trap - EXIT

if ! (
  cd "$APP_DIR"
  sudo docker compose --project-name "$DEPLOY_PROJECT" up -d --no-build
); then
  rollback
  exit 1
fi

HEALTHY=0
for _ in $(seq 1 30); do
  STATUS="$(sudo docker inspect "$CONTAINER_NAME" --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' 2>/dev/null || true)"
  if [[ "$STATUS" == "healthy" ]]; then
    HEALTHY=1
    break
  fi
  sleep 2
done

if [[ "$HEALTHY" -ne 1 ]]; then
  sudo docker logs --tail 100 "$CONTAINER_NAME" || true
  rollback
  exit 1
fi

HEALTH_JSON="$(sudo docker exec "$CONTAINER_NAME" wget -qO- http://127.0.0.1:3000/api/health)"
if [[ "$HEALTH_JSON" != *"\"version\":\"$DEPLOY_VERSION\""* ]]; then
  echo "[error] health endpoint returned an unexpected version: $HEALTH_JSON"
  rollback
  exit 1
fi

rm -f -- "$ARCHIVE"
echo "[success] deployed Artifex $DEPLOY_VERSION"
echo "[success] backup: $BACKUP_DIR"
echo "[success] rollback container: $ROLLBACK_CONTAINER"
echo "[success] health: $HEALTH_JSON"
