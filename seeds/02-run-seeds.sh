#!/bin/bash
set -e

echo "Running seeds from /seeds..."
cd /seeds
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f everything.sql
