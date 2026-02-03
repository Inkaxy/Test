-- Drop the old unique constraint that only checks bakery_id + delivery_date
ALTER TABLE public.import_batches 
DROP CONSTRAINT import_batches_bakery_id_delivery_date_key;

-- Add new unique constraint that includes category_id
-- This allows the same date to be imported to different categories
ALTER TABLE public.import_batches 
ADD CONSTRAINT import_batches_bakery_date_category_key 
UNIQUE (bakery_id, delivery_date, category_id);