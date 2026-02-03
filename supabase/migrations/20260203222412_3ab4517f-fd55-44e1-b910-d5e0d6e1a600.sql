-- Add priority field to customers for packing order
ALTER TABLE public.customers 
ADD COLUMN priority integer DEFAULT 50;

-- Add comment explaining the field
COMMENT ON COLUMN public.customers.priority IS 'Packing priority (1-100). Lower number = higher priority. Default 50.';

-- Create index for efficient sorting
CREATE INDEX idx_customers_priority ON public.customers(bakery_id, priority);