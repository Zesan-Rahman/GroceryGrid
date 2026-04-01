# Database Setup Guide

This guide covers setting up the PostgreSQL database for local development. The sample shell commands are for a Fedora system.

## Prerequisites

You will need:
- PostgreSQL 14 or later
- The `schema.sql` file from the `schema/` folder of this repo
- The `model.json` file from the `model/` folder of this repo
- You may also need to manually change `config.json` to contain
the database name, user, and password for this to properly work. Might
be best to pull these values from a .env file or something.
- `psql` command line tool (installed alongside PostgreSQL)
- Install PostgreSQL before building drogon. If drogon was installed
before, rebuild it

---

## 1. Install PostgreSQL and PostgreSQL Development Environment
```bash
sudo dnf install postgresql postgresql-server libpq-devel
```

---

## 2. Start and Setup PostgresSQL
```bash
sudo postgresql-setup --initdb --unit postgresql
sudo systemctl start postgresql
sudo systemctl enable postgresql # use if you want postgresql to start on boot
```

---

## 3. Create the User and Database
```bash
sudo -u postgres psql <<EOF
CREATE USER grocery_user WITH PASSWORD '<use password in model.config>';
CREATE DATABASE main OWNER <use user's name in model.config>;
GRANT ALL PRIVILEGES ON DATABASE main TO <use user's name in model.config>;
EOF
```

---
## 4. Load the Schema

From the root of the repo, run:
```bash
psql -h 127.0.0.1 -p 5432 -U grocery_user -d main -f schema/schema.sql
```

Verify the tables were created:
```bash
psql -h 127.0.0.1 -p 5432 -U grocery_user -d main -c "\dt"
```

You should see all tables listed:
```
 accounts
 admin_reports
 admins
 cart_items
 carts
 items
 price_entries
 receipts
 reports
 store_owners
 stores
```

---

## 5. Regenerating Drogon Models (after schema changes only)

If the schema changes, the models in `models/` need to be regenerated. You will need `drogon_ctl` installed.

First apply your schema changes to the database, then from the project root run:
```bash
drogon_ctl create model models
```

Type `y` when prompted. Commit the regenerated model files alongside your schema changes.

> **Note:** If you are just cloning the repo to build and run the project, you do **not** need to regenerate models. The model files are already committed to the repo.
