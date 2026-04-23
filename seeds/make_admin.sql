-- change email to the email of the user that you want to promote
UPDATE accounts
SET role = 'admin'
WHERE email = 'admin@example.com';

-- change email to the email of the user that you want to promote
INSERT INTO admins (account_id)
SELECT account_id
FROM accounts
WHERE email = 'admin@example.com'
ON CONFLICT DO NOTHING;
