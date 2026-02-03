-- Allow anonymous users to read customers by display_token for public display pages
CREATE POLICY "Public can view customers by display_token"
ON public.customers
FOR SELECT
TO anon
USING (
  display_token IS NOT NULL 
  AND has_dedicated_display = true
);