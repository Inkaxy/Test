-- Allow anonymous users to read orders for customers with valid display_token
-- This enables customer displays to show order data
CREATE POLICY "Public can view orders for display customers"
ON public.orders
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = orders.customer_id
    AND c.display_token IS NOT NULL
    AND c.has_dedicated_display = true
  )
);

-- Allow anonymous users to read products that are in orders for display customers
CREATE POLICY "Public can view products for display customers"
ON public.products
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.customers c ON c.id = o.customer_id
    WHERE o.product_id = products.id
    AND c.display_token IS NOT NULL
    AND c.has_dedicated_display = true
  )
);

-- Allow anonymous users to read packing_status for orders of display customers
CREATE POLICY "Public can view packing status for display customers"
ON public.packing_status
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.customers c ON c.id = o.customer_id
    WHERE o.id = packing_status.order_id
    AND c.display_token IS NOT NULL
    AND c.has_dedicated_display = true
  )
);