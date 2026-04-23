BEGIN;

UPDATE accounts
SET role = 'store_owner'
WHERE email = 'owner@example.com';

-- Replace 1 below with the store_id that the owner is associated with
INSERT INTO store_owners (account_id, store_id, is_verified)
SELECT account_id, 1, TRUE
FROM accounts
WHERE email = 'owner@example.com'
ON CONFLICT (account_id) DO UPDATE
SET store_id = EXCLUDED.store_id,
  is_verified = EXCLUDED.is_verified;

COMMIT;
