-- =============================================================================
-- FIX: Fjern SECURITY DEFINER VIEW og erstatt med sikker funksjon
-- =============================================================================

-- Drop the problematic view
DROP VIEW IF EXISTS public.bakeries_public;

-- Create a safe function instead that returns only public data
CREATE OR REPLACE FUNCTION public.get_bakery_public_info(_short_id text)
RETURNS TABLE (
  id uuid,
  name text,
  short_id text,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT 
    b.id,
    b.name,
    b.short_id,
    b.is_active
  FROM bakeries b
  WHERE b.short_id = _short_id
    AND b.is_active = true
  LIMIT 1;
$$;

-- Grant execute to public
GRANT EXECUTE ON FUNCTION public.get_bakery_public_info(text) TO anon, authenticated;

-- Also update validate_display_token to be SECURITY INVOKER for safety
CREATE OR REPLACE FUNCTION public.validate_display_token(_token uuid)
RETURNS TABLE (
  customer_id uuid,
  customer_name text,
  bakery_id uuid,
  bakery_name text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT 
    c.id as customer_id,
    c.name as customer_name,
    b.id as bakery_id,
    b.name as bakery_name
  FROM customers c
  JOIN bakeries b ON b.id = c.bakery_id
  WHERE c.display_token = _token 
    AND c.has_dedicated_display = true
    AND c.is_active = true
    AND b.is_active = true
  LIMIT 1;
$$;
