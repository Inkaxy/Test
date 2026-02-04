-- Allow bakery admins to update their own bakery (used for bakery-level settings like auto-delete, deviation config, packing row style)
-- Existing policies only allow super admins to write; normal bakery admins currently get 0 updated rows.

CREATE POLICY "Bakery admins can update their bakery"
ON public.bakeries
FOR UPDATE
USING (has_bakery_role(id, 'bakery_admin'::app_role))
WITH CHECK (has_bakery_role(id, 'bakery_admin'::app_role));
