-- testdata: hard split between rows real customers caused and rows from the owner testing (Build playground, checks).
-- conversations.is_test stays the single source of truth; a row is test when the customer who wrote it only has test conversations.
ALTER TABLE bot_table_rows ADD COLUMN is_test INTEGER NOT NULL DEFAULT 0;
UPDATE bot_table_rows SET is_test=1
 WHERE customer_id IS NOT NULL
   AND EXISTS (SELECT 1 FROM conversations c WHERE c.customer_id=bot_table_rows.customer_id AND c.is_test=1)
   AND NOT EXISTS (SELECT 1 FROM conversations c WHERE c.customer_id=bot_table_rows.customer_id AND c.is_test=0);
CREATE INDEX IF NOT EXISTS idx_bot_table_rows_table_test ON bot_table_rows(table_id, is_test, created_at);
