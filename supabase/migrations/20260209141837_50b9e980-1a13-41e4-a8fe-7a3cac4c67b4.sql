-- Drop the old unique constraint that doesn't account for trips
ALTER TABLE public.import_batches DROP CONSTRAINT import_batches_bakery_date_category_key;

-- Create new unique constraint that includes trip_id
-- Using a unique index with COALESCE to handle NULL trip_id correctly
CREATE UNIQUE INDEX import_batches_bakery_date_category_trip_key 
ON public.import_batches (bakery_id, delivery_date, category_id, COALESCE(trip_id, '00000000-0000-0000-0000-000000000000'::uuid));