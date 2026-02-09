
-- Add short_display_id column to customers
ALTER TABLE public.customers ADD COLUMN short_display_id text UNIQUE;

-- Create index for fast lookups
CREATE INDEX idx_customers_short_display_id ON public.customers (short_display_id) WHERE short_display_id IS NOT NULL;

-- Function to generate a short random ID (6 chars, alphanumeric lowercase)
CREATE OR REPLACE FUNCTION public.generate_short_display_id()
RETURNS text AS $$
DECLARE
  chars text := 'abcdefghjkmnpqrstuvwxyz23456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Auto-generate short_display_id when has_dedicated_display is enabled
CREATE OR REPLACE FUNCTION public.auto_generate_short_display_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.has_dedicated_display = true AND (NEW.short_display_id IS NULL OR NEW.short_display_id = '') THEN
    LOOP
      NEW.short_display_id := public.generate_short_display_id();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.customers WHERE short_display_id = NEW.short_display_id AND id != NEW.id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_auto_short_display_id
BEFORE INSERT OR UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_short_display_id();

-- Backfill existing customers that have dedicated display enabled
UPDATE public.customers SET short_display_id = public.generate_short_display_id() WHERE has_dedicated_display = true AND short_display_id IS NULL;

-- Update validate_display_token to also accept short_display_id
CREATE OR REPLACE FUNCTION public.validate_display_token(_token text)
RETURNS TABLE(bakery_id uuid, bakery_name text, customer_id uuid, customer_name text) AS $$
BEGIN
  RETURN QUERY
  SELECT b.id AS bakery_id, b.name AS bakery_name, c.id AS customer_id, c.name AS customer_name
  FROM public.customers c
  JOIN public.bakeries b ON b.id = c.bakery_id
  WHERE c.has_dedicated_display = true
    AND (c.display_token = _token OR c.short_display_id = _token);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
