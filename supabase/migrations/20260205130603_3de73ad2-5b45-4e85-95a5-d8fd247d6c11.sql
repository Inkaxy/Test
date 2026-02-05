-- Add public (anon) RLS policies for kiosk access
-- All policies require bakery to have short_id and be active

-- 1. bakeries - Public read access by short_id
CREATE POLICY "Public can view bakeries by short_id"
  ON public.bakeries FOR SELECT
  TO anon
  USING (short_id IS NOT NULL AND is_active = true);

-- 2. categories - Public read access for active bakeries
CREATE POLICY "Public can view categories for active bakeries"
  ON public.categories FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.bakeries b 
      WHERE b.id = categories.bakery_id 
      AND b.short_id IS NOT NULL 
      AND b.is_active = true
    )
  );

-- 3. orders - Public read access for kiosk
CREATE POLICY "Public can view orders for kiosk"
  ON public.orders FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.bakeries b 
      WHERE b.id = orders.bakery_id 
      AND b.short_id IS NOT NULL 
      AND b.is_active = true
    )
  );

-- 4. customers - Public read access for kiosk
CREATE POLICY "Public can view customers for kiosk"
  ON public.customers FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.bakeries b 
      WHERE b.id = customers.bakery_id 
      AND b.short_id IS NOT NULL 
      AND b.is_active = true
    )
  );

-- 5. products - Public read access for kiosk
CREATE POLICY "Public can view products for kiosk"
  ON public.products FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.bakeries b 
      WHERE b.id = products.bakery_id 
      AND b.short_id IS NOT NULL 
      AND b.is_active = true
    )
  );

-- 6. packing_status - Public read, insert, and update for kiosk
CREATE POLICY "Public can view packing_status for kiosk"
  ON public.packing_status FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.bakeries b ON b.id = o.bakery_id
      WHERE o.id = packing_status.order_id
      AND b.short_id IS NOT NULL 
      AND b.is_active = true
    )
  );

CREATE POLICY "Public can insert packing_status for kiosk"
  ON public.packing_status FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.bakeries b ON b.id = o.bakery_id
      WHERE o.id = order_id
      AND b.short_id IS NOT NULL 
      AND b.is_active = true
    )
  );

CREATE POLICY "Public can update packing_status for kiosk"
  ON public.packing_status FOR UPDATE
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.bakeries b ON b.id = o.bakery_id
      WHERE o.id = packing_status.order_id
      AND b.short_id IS NOT NULL 
      AND b.is_active = true
    )
  );