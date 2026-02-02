-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Enable realtime for packing_status table
ALTER PUBLICATION supabase_realtime ADD TABLE public.packing_status;

-- Add display_settings table for per-category display configuration
CREATE TABLE public.display_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bakery_id UUID NOT NULL REFERENCES public.bakeries(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  display_type TEXT NOT NULL DEFAULT 'shared' CHECK (display_type IN ('shared', 'customer')),
  settings JSONB NOT NULL DEFAULT '{
    "background_color": "#1a1a2e",
    "card_background_color": "#16213e",
    "text_color": "#ffffff",
    "pending_color": "#6b7280",
    "packing_color": "#f59e0b",
    "completed_color": "#22c55e",
    "customer_name_font_size": "2rem",
    "product_font_size": "1rem",
    "show_progress_bar": true,
    "progress_bar_style": "bar",
    "animation_enabled": true,
    "animation_speed": "normal",
    "columns": 3,
    "show_clock": true,
    "show_date": true
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(bakery_id, category_id, display_type)
);

-- Enable RLS
ALTER TABLE public.display_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for display_settings
CREATE POLICY "Super admins can manage all display_settings"
ON public.display_settings
FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Bakery admins can manage their display_settings"
ON public.display_settings
FOR ALL
USING (has_bakery_role(bakery_id, 'bakery_admin'))
WITH CHECK (has_bakery_role(bakery_id, 'bakery_admin'));

CREATE POLICY "Anyone can view display_settings for public displays"
ON public.display_settings
FOR SELECT
USING (true);

-- Add display_token to customers for unique customer display URLs
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS display_token UUID UNIQUE DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS has_dedicated_display BOOLEAN DEFAULT false;

-- Create index for display token lookups
CREATE INDEX IF NOT EXISTS idx_customers_display_token ON public.customers(display_token);

-- Update trigger for display_settings
CREATE TRIGGER update_display_settings_updated_at
BEFORE UPDATE ON public.display_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();