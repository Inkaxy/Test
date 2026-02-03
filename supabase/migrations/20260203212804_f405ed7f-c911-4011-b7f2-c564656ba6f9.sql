-- Add category_id to import_batches table
ALTER TABLE public.import_batches 
ADD COLUMN category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_import_batches_category_id ON public.import_batches(category_id);

-- Create composite index for duplicate checking
CREATE INDEX idx_import_batches_bakery_date_category 
ON public.import_batches(bakery_id, delivery_date, category_id);