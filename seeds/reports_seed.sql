INSERT INTO reports (reporter_account_id, price_entry_id, reason_for_report, resolution_status)
SELECT 
    (SELECT account_id FROM accounts WHERE email = 'user@example.com'),
    (SELECT entry_id FROM price_entries LIMIT 1 OFFSET 0),
    'wrong price, its actually $4.50, not $4.29',
    'open';

INSERT INTO reports (reporter_account_id, price_entry_id, reason_for_report, resolution_status)
SELECT 
    (SELECT account_id FROM accounts WHERE email = 'a@a.com'),
    (SELECT entry_id FROM price_entries LIMIT 1 OFFSET 4),
    'something something wrong',
    'open';

INSERT INTO reports (reporter_account_id, price_entry_id, reason_for_report, resolution_status)
SELECT 
    (SELECT account_id FROM accounts WHERE email = 'user@example.com'),
    (SELECT entry_id FROM price_entries LIMIT 1 OFFSET 9),
    'im just opening a ticket for fun',
    'resolved';

INSERT INTO admin_reports (admin_account_id, report_id)
SELECT 
    (SELECT account_id FROM accounts WHERE email = 'admin@example.com'),
    report_id
FROM reports
WHERE reason_for_report LIKE 'The price%' OR reason_for_report LIKE 'This item%';
