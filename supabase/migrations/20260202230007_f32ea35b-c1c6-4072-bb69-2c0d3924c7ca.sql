-- Drop and recreate the release_customer_lock function to fix the boolean comparison
DROP FUNCTION IF EXISTS public.release_customer_lock(uuid, date);

CREATE OR REPLACE FUNCTION public.release_customer_lock(_customer_id uuid, _delivery_date date)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _row_count INTEGER;
BEGIN
  DELETE FROM customer_locks
  WHERE customer_id = _customer_id
    AND delivery_date = _delivery_date
    AND locked_by = auth.uid();
  
  GET DIAGNOSTICS _row_count = ROW_COUNT;
  RETURN _row_count > 0;
END;
$function$;

-- Drop and recreate the extend_customer_lock function to fix the boolean comparison
DROP FUNCTION IF EXISTS public.extend_customer_lock(uuid, date, integer);

CREATE OR REPLACE FUNCTION public.extend_customer_lock(_customer_id uuid, _delivery_date date, _extension_minutes integer DEFAULT 15)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _row_count INTEGER;
BEGIN
  UPDATE customer_locks
  SET expires_at = now() + (_extension_minutes || ' minutes')::INTERVAL,
      updated_at = now()
  WHERE customer_id = _customer_id
    AND delivery_date = _delivery_date
    AND locked_by = auth.uid();
  
  GET DIAGNOSTICS _row_count = ROW_COUNT;
  RETURN _row_count > 0;
END;
$function$;