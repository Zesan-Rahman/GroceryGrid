INSERT INTO price_entries (item_id, store_id, receipt_id, logged_price, upload_date, price_date) VALUES
-- Lactaid Whole Milk (1 Gallon)
(1, (SELECT store_id FROM stores WHERE name = 'TRADER JOE''S #547'), NULL, 5.99, '2025-01-15 10:23:00', '2025-01-15'),
(1, (SELECT store_id FROM stores WHERE name = 'TRADER JOE''S #547'), NULL, 5.99, '2025-02-03 14:11:00', '2025-02-03'),
(1, (SELECT store_id FROM stores WHERE name = 'TRADER JOE''S #547'), NULL, 6.29, '2025-03-20 09:45:00', '2025-03-20'),

-- Large White Eggs (per dozen)
(2, (SELECT store_id FROM stores WHERE name = 'TRADER JOE''S #547'), NULL, 4.49, '2025-01-15 10:23:00', '2025-01-15'),
(2, (SELECT store_id FROM stores WHERE name = 'TRADER JOE''S #547'), NULL, 5.19, '2025-02-03 14:11:00', '2025-02-03'),
(2, (SELECT store_id FROM stores WHERE name = 'TRADER JOE''S #547'), NULL, 4.99, '2025-03-20 09:45:00', '2025-03-20'),

-- Organic Bananas (per lb)
(3, (SELECT store_id FROM stores WHERE name = 'TRADER JOE''S #547'), NULL, 0.29, '2025-01-18 11:00:00', '2025-01-18'),
(3, (SELECT store_id FROM stores WHERE name = 'TRADER JOE''S #547'), NULL, 0.29, '2025-02-10 16:30:00', '2025-02-10'),
(3, (SELECT store_id FROM stores WHERE name = 'TRADER JOE''S #547'), NULL, 0.32, '2025-03-25 13:15:00', '2025-03-25'),

-- Chicken Breast (per lb)
(4, (SELECT store_id FROM stores WHERE name = 'TRADER JOE''S #547'), NULL, 7.99, '2025-01-20 09:00:00', '2025-01-20'),
(4, (SELECT store_id FROM stores WHERE name = 'TRADER JOE''S #547'), NULL, 8.49, '2025-02-14 12:00:00', '2025-02-14'),
(4, (SELECT store_id FROM stores WHERE name = 'TRADER JOE''S #547'), NULL, 8.49, '2025-03-30 10:30:00', '2025-03-30'),

-- Sandwich Bread (per loaf)
(5, (SELECT store_id FROM stores WHERE name = 'TRADER JOE''S #547'), NULL, 3.49, '2025-01-22 08:45:00', '2025-01-22'),
(5, (SELECT store_id FROM stores WHERE name = 'TRADER JOE''S #547'), NULL, 3.49, '2025-02-18 17:00:00', '2025-02-18'),
(5, (SELECT store_id FROM stores WHERE name = 'TRADER JOE''S #547'), NULL, 3.79, '2025-04-01 11:20:00', '2025-04-01');

DO $$
DECLARE
    lidl_id INT;
BEGIN
    SELECT store_id INTO lidl_id FROM stores WHERE name = 'LIDL #1579';

    INSERT INTO price_entries (item_id, store_id, receipt_id, logged_price, upload_date, price_date) VALUES
    -- Lactaid Whole Milk (1 Gallon)
    (1, lidl_id, NULL, 5.49, '2025-01-17 09:00:00', '2025-01-17'),
    (1, lidl_id, NULL, 5.49, '2025-02-06 10:30:00', '2025-02-06'),
    (1, lidl_id, NULL, 5.79, '2025-03-23 08:45:00', '2025-03-23'),

    -- Large White Eggs (per dozen)
    (2, lidl_id, NULL, 3.99, '2025-01-17 09:00:00', '2025-01-17'),
    (2, lidl_id, NULL, 4.79, '2025-02-06 10:30:00', '2025-02-06'),
    (2, lidl_id, NULL, 4.49, '2025-03-23 08:45:00', '2025-03-23'),

    -- Organic Bananas (per lb)
    (3, lidl_id, NULL, 0.25, '2025-01-20 11:15:00', '2025-01-20'),
    (3, lidl_id, NULL, 0.25, '2025-02-12 14:00:00', '2025-02-12'),
    (3, lidl_id, NULL, 0.29, '2025-03-28 10:00:00', '2025-03-28'),

    -- Chicken Breast (per lb)
    (4, lidl_id, NULL, 6.99, '2025-01-22 08:30:00', '2025-01-22'),
    (4, lidl_id, NULL, 7.49, '2025-02-16 09:45:00', '2025-02-16'),
    (4, lidl_id, NULL, 7.49, '2025-04-01 08:15:00', '2025-04-01'),

    -- Sandwich Bread (per loaf)
    (5, lidl_id, NULL, 2.99, '2025-01-24 07:45:00', '2025-01-24'),
    (5, lidl_id, NULL, 2.99, '2025-02-21 09:00:00', '2025-02-21'),
    (5, lidl_id, NULL, 3.19, '2025-04-03 11:00:00', '2025-04-03');
END $$;
