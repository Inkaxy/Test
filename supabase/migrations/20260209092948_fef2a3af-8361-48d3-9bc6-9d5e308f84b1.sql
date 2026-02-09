-- Fix: Restrict public kiosk access to only recent orders (current date ±7 days)
-- This prevents competitors from analyzing historical business patterns

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public can view orders for kiosk" ON orders;

-- Create new policy with date restriction
CREATE POLICY "Public can view recent orders for kiosk"
ON public.orders FOR SELECT TO anon
USING (
  delivery_date >= CURRENT_DATE - INTERVAL '1 day'
  AND delivery_date <= CURRENT_DATE + INTERVAL '7 days'
  AND EXISTS (
    SELECT 1 FROM public.bakeries b 
    WHERE b.id = orders.bakery_id 
    AND b.short_id IS NOT NULL 
    AND b.is_active = true
  )
);

-- Also restrict packing_status to match (defense in depth)
DROP POLICY IF EXISTS "Public can view packing_status for kiosk" ON packing_status;

CREATE POLICY "Public can view recent packing_status for kiosk"
ON public.packing_status FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN bakeries b ON b.id = o.bakery_id
    WHERE o.id = packing_status.order_id 
    AND o.delivery_date >= CURRENT_DATE - INTERVAL '1 day'
    AND o.delivery_date <= CURRENT_DATE + INTERVAL '7 days'
    AND b.short_id IS NOT NULL 
    AND b.is_active = true
  )
);