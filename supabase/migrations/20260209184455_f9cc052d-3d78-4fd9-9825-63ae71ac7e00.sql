
-- Drop the old unique constraint that doesn't include trip_id
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS "or…kery_id_product_id_customer_id_delivery_date_key";

-- Find and drop the actual constraint name
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT c.conname INTO constraint_name
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE t.relname = 'orders'
      AND n.nspname = 'public'
      AND c.contype = 'u'
      AND EXISTS (
        SELECT 1 FROM unnest(c.conkey) k
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k
        WHERE a.attname IN ('bakery_id', 'product_id', 'customer_id', 'delivery_date')
      );
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

-- Create new unique constraint that includes trip_id (using COALESCE for null trip_id)
CREATE UNIQUE INDEX orders_bakery_product_customer_date_trip_key 
ON public.orders (bakery_id, product_id, customer_id, delivery_date, COALESCE(trip_id, '00000000-0000-0000-0000-000000000000'));
