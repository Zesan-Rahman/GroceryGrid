# GroceryGrid

GroceryGrid has two parts:

- A C++ backend built with Drogon and CMake.
- A React frontend built with Vite in [`frontend/`](/home/iyeung/Documents/Projects/GroceryGrid/frontend).

The backend loads [`config.json`](/home/iyeung/Documents/Projects/GroceryGrid/config.json) at startup, connects to PostgreSQL, and serves the API on port `8080`. The frontend dev server runs on port `5173` and proxies `/api/*` requests to `http://127.0.0.1:8080`.

## Prerequisites

Install the following before trying to run the project:

- A C++17-capable compiler
- CMake
- Drogon, installed so `find_package(Drogon CONFIG REQUIRED)` works
- PostgreSQL server
- PostgreSQL client/development libraries
- Node.js and npm

On Fedora-like systems, the package names are typically close to:

```bash
sudo dnf install cmake gcc-c++ postgresql postgresql-server postgresql-devel nodejs npm
```

You also need Drogon itself. How you install it depends on your machine:

- If your distro provides a Drogon development package, install that.
- Otherwise build and install Drogon from source so CMake can find `DrogonConfig.cmake`.

## 1. Configure PostgreSQL

This app expects a PostgreSQL database named `main` and uses the schema in [`schema/schema.sql`](/home/iyeung/Documents/Projects/GroceryGrid/schema/schema.sql).

Detailed database setup is in [`DB_SETUP.md`](/home/iyeung/Documents/Projects/GroceryGrid/DB_SETUP.md). The short version is:

1. Start PostgreSQL.
2. Create the database user and database.
3. Load the schema.

Example:

```bash
sudo -u postgres psql
```

```sql
CREATE USER grocery_user WITH PASSWORD 'change-me';
CREATE DATABASE main OWNER grocery_user;
GRANT ALL PRIVILEGES ON DATABASE main TO grocery_user;
```

Then import the schema from the repo root:

```bash
psql -h 127.0.0.1 -p 5432 -U grocery_user -d main -f schema/schema.sql
```

## 2. Create `config.json`

The backend always loads `config.json` from the repo root:

- [`main.cc`](/home/iyeung/Documents/Projects/GroceryGrid/main.cc)

Use [`template_config.json`](/home/iyeung/Documents/Projects/GroceryGrid/template_config.json) as the starting point and create a local `config.json` that matches your database credentials.

The minimum required fields are:

```json
{
  "listeners": [
    {
      "address": "0.0.0.0",
      "port": 8080,
      "https": false
    }
  ],
  "db_clients": [
    {
      "name": "default",
      "rdbms": "postgresql",
      "host": "127.0.0.1",
      "port": 5432,
      "dbname": "main",
      "user": "grocery_user",
      "passwd": "your-password",
      "is_fast": false,
      "number_of_connections": 1,
      "timeout": -1.0,
      "auto_batch": false
    }
  ],
  "app": {}
}
```

`config.json` should stay local and should not be committed.

## 3. Build and run the backend

From the repo root:

```bash
cd build
cmake ..
./build/GroceryGrid
```

Run the server from the repo root so it can find `config.json`.

If startup succeeds, the API is available at:

```text
http://127.0.0.1:8080
```

Quick check:

```bash
curl -i http://127.0.0.1:8080/api/auth/me
```

If you are not logged in yet, an unauthorized response is expected. The important part is that the server is reachable.

## 4. Install and run the frontend

The frontend lives in [`frontend/`](/home/iyeung/Documents/Projects/GroceryGrid/frontend).

Install dependencies:

```bash
npm --prefix frontend install
```

Start the development server:

```bash
npm --prefix frontend run dev
```

Open:

```text
http://127.0.0.1:5173
```

The Vite dev server proxies `/api/*` to the backend on `127.0.0.1:8080`, so both processes should be running during development.

## 5. Optional verification

Frontend production build:

```bash
npm --prefix frontend run build
```

Backend test binary:

```bash
cmake --build build --target GroceryGrid_test
./build/test/GroceryGrid_test
```

## Notes

- The generated model files in [`models/`](/home/iyeung/Documents/Projects/GroceryGrid/models) compile successfully, but current GCC versions may emit deprecation warnings from generated Drogon code.
- If the schema changes, regenerate the model files using the instructions in [`DB_SETUP.md`](/home/iyeung/Documents/Projects/GroceryGrid/DB_SETUP.md).
- There is a repo-root `package.json`, but the actual frontend app is defined by [`frontend/package.json`](/home/iyeung/Documents/Projects/GroceryGrid/frontend/package.json).
