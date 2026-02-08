-- =============================================================================
-- FASE 1: SIKKERHETSFORBEDRINGER - RLS og Database Funksjoner
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Fix privilege escalation i setup_bakery_for_new_user()
-- Legger til validering at _user_id matcher auth.uid()
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.setup_bakery_for_new_user(_user_id uuid, _bakery_name text, _display_name text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _bakery_id uuid;
  _short_id text;
BEGIN
  -- SECURITY: Validate that user can only setup bakery for themselves
  IF _user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot setup bakery for another user';
  END IF;

  -- Generate a unique short_id for the bakery
  _short_id := lower(regexp_replace(_bakery_name, '[^a-zA-Z0-9]', '', 'g'));
  _short_id := substring(_short_id from 1 for 20);
  
  -- Make sure short_id is unique by appending random chars if needed
  WHILE EXISTS (SELECT 1 FROM bakeries WHERE short_id = _short_id) LOOP
    _short_id := _short_id || substr(md5(random()::text), 1, 4);
  END LOOP;
  
  -- Create the bakery
  INSERT INTO bakeries (name, short_id, is_active)
  VALUES (_bakery_name, _short_id, true)
  RETURNING id INTO _bakery_id;
  
  -- Create or update the user's profile with bakery_id
  INSERT INTO profiles (user_id, bakery_id, display_name)
  VALUES (_user_id, _bakery_id, _display_name)
  ON CONFLICT (user_id) DO UPDATE SET 
    bakery_id = _bakery_id,
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name);
  
  -- Assign bakery_admin role
  INSERT INTO user_roles (user_id, role, bakery_id)
  VALUES (_user_id, 'bakery_admin', _bakery_id)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN _bakery_id;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 2. Opprett VIEW for offentlig bakeri-informasjon (uten settings)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.bakeries_public AS
SELECT 
  id,
  name,
  short_id,
  is_active
FROM public.bakeries
WHERE short_id IS NOT NULL AND is_active = true;

-- Grant SELECT on the view to public
GRANT SELECT ON public.bakeries_public TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. Opprett funksjon for å validere display token uten å eksponere det
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_display_token(_token uuid)
RETURNS TABLE (
  customer_id uuid,
  customer_name text,
  bakery_id uuid,
  bakery_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
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

-- Grant execute to public for display token validation
GRANT EXECUTE ON FUNCTION public.validate_display_token(uuid) TO anon, authenticated;
