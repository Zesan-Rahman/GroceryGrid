# syntax=docker/dockerfile:1

# ─── Stage 1: Nix builder ────────────────────────────────────────────────────
FROM nixos/nix:latest AS builder

RUN echo 'filter-syscalls = false' >> /etc/nix/nix.conf

WORKDIR /app

# Copy the shell.nix first so the dependency layer is cached independently
COPY shell.nix /app/shell.nix

# Pre-build / cache all Nix dependencies declared in shell.nix
RUN nix-shell /app/shell.nix --run "echo dependencies ready"

# Copy the rest of the source tree
COPY . /app

# Build the C++ backend inside the Nix shell
RUN nix-shell /app/shell.nix --run " \
    cmake -B build \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_EXPORT_COMPILE_COMMANDS=ON && \
    cmake --build build --parallel \$(nproc) \
    "

# ─── Stage 2: Frontend builder ───────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build          # emits to /frontend/dist

# ─── Stage 3: Runtime (NixOS) ────────────────────────────────────────────────
# We stay on a NixOS base so the Nix store paths that the binary was linked
# against are available at runtime without having to copy every .so manually.
FROM nixos/nix:latest AS runtime

RUN echo 'filter-syscalls = false' >> /etc/nix/nix.conf

WORKDIR /app

# Bring shell.nix so we can install *only* the runtime closure
COPY shell.nix /app/shell.nix

# Install runtime deps into the store (build tools like cmake/gcc are still
# pulled in transitively but the important thing is the shared libs are present)
RUN nix-shell /app/shell.nix --run "echo runtime deps cached"

# Copy compiled backend binary
COPY --from=builder /app/build/GroceryGrid /app/GroceryGrid

# Copy config.yaml (non-secret Drogon settings, e.g. document_root, logging)
COPY config.yaml /app/config.yaml
# NOTE: config.json is intentionally NOT copied here — it is injected at
# runtime via Docker secrets and written to /app/config.json by the entrypoint.

# Copy the compiled frontend into the directory Drogon will serve as static files.
# Adjust the destination path to match the "document_root" in your config.yaml.
COPY --from=frontend-builder /frontend/dist /app/www

# Copy DB schema + seeds so the entrypoint script can initialise the DB if needed
COPY schema/ /app/schema/
COPY seeds/  /app/seeds/

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/app/docker-entrypoint.sh"]