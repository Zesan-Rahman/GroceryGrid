BEGIN;
\i 'stores_seed.sql'
\i 'accounts_seed.sql'
\i 'items_seed.sql'

\i 'receipts_seed.sql'

\i 'price_entries_seed.sql'

COMMIT;
