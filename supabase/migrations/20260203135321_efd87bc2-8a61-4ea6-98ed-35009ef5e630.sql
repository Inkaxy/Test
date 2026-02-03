-- Add category_id to orders table for category-specific order data
ALTER TABLE public.orders ADD COLUMN category_id uuid REFERENCES public.categories(id);

-- Create index for efficient queries
CREATE INDEX idx_orders_category_id ON public.orders(category_id);

-- Create table for OneDrive configuration per category
CREATE TABLE public.category_onedrive_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bakery_id uuid NOT NULL REFERENCES public.bakeries(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  onedrive_folder_url text,
  onedrive_folder_id text,
  last_sync_at timestamp with time zone,
  sync_status text DEFAULT 'not_configured',
  sync_error text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(category_id)
);

-- Enable RLS
ALTER TABLE public.category_onedrive_config ENABLE ROW LEVEL SECURITY;

-- RLS policies for category_onedrive_config
CREATE POLICY "Super admins can manage all OneDrive configs"
ON public.category_onedrive_config
FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Bakery admins can manage their OneDrive configs"
ON public.category_onedrive_config
FOR ALL
USING (has_bakery_role(bakery_id, 'bakery_admin'))
WITH CHECK (has_bakery_role(bakery_id, 'bakery_admin'));

CREATE POLICY "Bakery users can view their OneDrive configs"
ON public.category_onedrive_config
FOR SELECT
USING (can_access_bakery(bakery_id));

-- Create trigger for updated_at
CREATE TRIGGER update_category_onedrive_config_updated_at
BEFORE UPDATE ON public.category_onedrive_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();