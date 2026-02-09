
-- Create category_trips table
CREATE TABLE public.category_trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  bakery_id UUID NOT NULL REFERENCES public.bakeries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.category_trips ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as categories)
CREATE POLICY "Super admins can do everything with category_trips"
  ON public.category_trips FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Bakery admins can manage their category_trips"
  ON public.category_trips FOR ALL
  USING (has_bakery_role(bakery_id, 'bakery_admin'::app_role))
  WITH CHECK (has_bakery_role(bakery_id, 'bakery_admin'::app_role));

CREATE POLICY "Bakery users can view their category_trips"
  ON public.category_trips FOR SELECT
  USING (can_access_bakery(bakery_id));

CREATE POLICY "Public can view category_trips for active bakeries"
  ON public.category_trips FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM bakeries b
    WHERE b.id = category_trips.bakery_id AND b.short_id IS NOT NULL AND b.is_active = true
  ));

-- Add trip_id to orders (nullable for backward compatibility)
ALTER TABLE public.orders ADD COLUMN trip_id UUID REFERENCES public.category_trips(id) ON DELETE SET NULL;

-- Add trip_id to import_batches
ALTER TABLE public.import_batches ADD COLUMN trip_id UUID REFERENCES public.category_trips(id) ON DELETE SET NULL;

-- Add trip_id to category_onedrive_config
ALTER TABLE public.category_onedrive_config ADD COLUMN trip_id UUID REFERENCES public.category_trips(id) ON DELETE SET NULL;
-- Remove unique constraint on category_id to allow multiple configs per category (one per trip)
ALTER TABLE public.category_onedrive_config DROP CONSTRAINT IF EXISTS category_onedrive_config_category_id_key;
-- Add a unique constraint on (category_id, trip_id) instead
CREATE UNIQUE INDEX category_onedrive_config_category_trip_unique ON public.category_onedrive_config (category_id, COALESCE(trip_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Index for performance
CREATE INDEX idx_orders_trip_id ON public.orders(trip_id);
CREATE INDEX idx_category_trips_category_id ON public.category_trips(category_id);

-- Enable realtime for category_trips
ALTER PUBLICATION supabase_realtime ADD TABLE public.category_trips;

-- Trigger for updated_at
CREATE TRIGGER update_category_trips_updated_at
  BEFORE UPDATE ON public.category_trips
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
