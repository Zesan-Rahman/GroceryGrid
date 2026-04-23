INSERT INTO cart_items (account_id, item_id, quantity)
SELECT 
    (SELECT account_id FROM accounts WHERE email = 'user@example.com'),
    (SELECT item_id FROM items WHERE item_name = 'Lactaid Whole Milk (1 Gallon)'),
    3;

INSERT INTO cart_items (account_id, item_id, quantity)
SELECT 
    (SELECT account_id FROM accounts WHERE email = 'user@example.com'),
    (SELECT item_id FROM items WHERE item_name = 'Large White Eggs (per dozen)'),
    2;

INSERT INTO cart_items (account_id, item_id, quantity)
SELECT 
    (SELECT account_id FROM accounts WHERE email = 'user@example.com'),
    (SELECT item_id FROM items WHERE item_name = 'Sandwich Bread (per loaf)'),
    10;