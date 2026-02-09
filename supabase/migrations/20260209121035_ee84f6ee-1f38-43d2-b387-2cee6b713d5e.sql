
CREATE OR REPLACE FUNCTION public.validate_display_token(_token text)
RETURNS TABLE(bakery_id uuid, bakery_name text, customer_id uuid, customer_name text) AS $$
BEGIN
  RETURN QUERY
  SELECT b.id AS bakery_id, b.name AS bakery_name, c.id AS customer_id, c.name AS customer_name
  FROM public.customers c
  JOIN public.bakeries b ON b.id = c.bakery_id
  WHERE c.has_dedicated_display = true
    AND (c.display_token::text = _token OR c.short_display_id = _token);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
