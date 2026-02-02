-- Create a function to set up a new bakery for a user during registration
-- This runs with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.setup_bakery_for_new_user(
  _user_id uuid,
  _bakery_name text,
  _display_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bakery_id uuid;
  _short_id text;
BEGIN
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
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.setup_bakery_for_new_user(uuid, text, text) TO authenticated;