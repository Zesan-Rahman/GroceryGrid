#!/usr/bin/env bash
set -euo pipefail

# ─── Wait for PostgreSQL ──────────────────────────────────────────────────────
# Pure bash TCP check — avoids depending on pg_isready being on PATH outside
# of nix-shell. /dev/tcp is a bash built-in; no external tools needed.
PGHOST="${PGHOST:-db}"
PGPORT="${PGPORT:-5432}"
echo "Waiting for PostgreSQL at ${PGHOST}:${PGPORT}…"
until (echo > /dev/tcp/${PGHOST}/${PGPORT}) 2>/dev/null; do
  sleep 1
done
echo "PostgreSQL is ready."

# ─── Optional: initialise schema + seeds on first boot ───────────────────────
# Set INIT_DB=true in your environment to run this block once.
if [[ "${INIT_DB:-false}" == "true" ]]; then
  echo "Ensuring role and database exist (in case of persisted volume)..."
  nix-shell /app/shell.nix --run "psql postgresql://postgres:${POSTGRES_PASSWORD:-changeme}@${PGHOST}:${PGPORT}/postgres -c \"
    DO \\\$do\\\$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'grocery_user') THEN
        CREATE ROLE grocery_user WITH LOGIN SUPERUSER PASSWORD '${POSTGRES_PASSWORD:-changeme}';
      END IF;
    END
    \\\$do\\\$;
  \"" || true

  nix-shell /app/shell.nix --run "psql postgresql://postgres:${POSTGRES_PASSWORD:-changeme}@${PGHOST}:${PGPORT}/postgres -tc \"SELECT 1 FROM pg_database WHERE datname = 'grocerygrid'\" | grep -q 1 || psql postgresql://postgres:${POSTGRES_PASSWORD:-changeme}@${PGHOST}:${PGPORT}/postgres -c \"CREATE DATABASE grocerygrid OWNER grocery_user;\"" || true

  echo "Running schema…"
  nix-shell /app/shell.nix --run "psql \"${DATABASE_URL}\" -f /app/schema/schema.sql"
  echo "Running seeds…"
  nix-shell /app/shell.nix --run "psql \"${DATABASE_URL}\" -f /app/seeds/everything.sql"
  echo "Database initialised."
fi

# ─── Install secrets ──────────────────────────────────────────────────────────
# Docker Compose mounts each secret as a read-only file under /run/secrets/.
# We copy them into the locations Drogon expects before starting the server.

install_secret() {
  local secret_name="$1"
  local dest="$2"
  local src="/run/secrets/${secret_name}"
  if [[ ! -f "$src" ]]; then
    echo "ERROR: Docker secret '${secret_name}' not found at ${src}" >&2
    exit 1
  fi
  mkdir -p "$(dirname "$dest")"
  cp "$src" "$dest"
}

install_secret config_json   /app/config.json
install_secret model_json    /app/models/model.json

# ─── Start the server ─────────────────────────────────────────────────────────
exec nix-shell /app/shell.nix --run "/app/GroceryGrid"