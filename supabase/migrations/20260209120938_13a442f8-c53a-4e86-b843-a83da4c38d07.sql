
-- Drop the old UUID-typed validate_display_token to resolve overload ambiguity
DROP FUNCTION IF EXISTS public.validate_display_token(uuid);
