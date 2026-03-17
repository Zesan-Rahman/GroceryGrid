CREATE DATABASE main;

CREATE TABLE accounts (
    account_id   SERIAL PRIMARY KEY,
    email        VARCHAR(255) UNIQUE NOT NULL,
    password     VARCHAR(255) NOT NULL,
    name         VARCHAR(100),
    account_creation_date TIMESTAMP DEFAULT NOW(),
    role         VARCHAR(50) NOT NULL 
);

CREATE TABLE stores (
    store_id     SERIAL PRIMARY KEY,
    name         VARCHAR(255) NOT NULL,
    location     VARCHAR(255)
);

CREATE TABLE store_owners (
    account_id   INT PRIMARY KEY REFERENCES accounts(account_id),
    store_id     INT REFERENCES stores(store_id),
    is_verified  BOOLEAN DEFAULT FALSE
);

CREATE TABLE items (
    item_id      SERIAL PRIMARY KEY,
    item_name    VARCHAR(255) NOT NULL,
    category     VARCHAR(100)
);

CREATE TABLE receipts (
    receipt_id       SERIAL PRIMARY KEY,
    store_id         INT REFERENCES stores(store_id),
    user_id          INT REFERENCES accounts(account_id),
    raw_image_file   TEXT, --URL?
    upload_timestamp TIMESTAMP DEFAULT NOW(),
    trust_status VARCHAR(50) DEFAULT 'safe' -- 'safe', 'flagged' 
);

CREATE TABLE price_entries (
    entry_id     SERIAL PRIMARY KEY,
    item_id      INT REFERENCES items(item_id),
    store_id     INT REFERENCES stores(store_id),
    receipt_id   INT REFERENCES receipts(receipt_id),
    logged_price DECIMAL(10, 2) NOT NULL,
    upload_date  TIMESTAMP DEFAULT NOW(),
    price_date   DATE,
);

CREATE TABLE carts (
    cart_id     SERIAL PRIMARY KEY,
    account_id  INT REFERENCES accounts(account_id)
);

CREATE TABLE cart_items (
    cart_id  INT REFERENCES carts(cart_id),
    item_id  INT REFERENCES items(item_id),
    PRIMARY KEY (cart_id, item_id)
);

CREATE TABLE reports (
    report_id           SERIAL PRIMARY KEY,
    reporter_account_id INT REFERENCES accounts(account_id),
    flagged_item_id     INT REFERENCES items(item_id),
    reason_for_report   TEXT,
    report_timestamp    TIMESTAMP DEFAULT NOW(),
    resolution_status   VARCHAR(50) DEFAULT 'open' -- 'open', 'resolved', 'dismissed'
);

