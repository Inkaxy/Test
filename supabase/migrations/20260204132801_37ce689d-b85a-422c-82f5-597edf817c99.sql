-- Add scheduling columns to category_onedrive_config
ALTER TABLE public.category_onedrive_config
ADD COLUMN IF NOT EXISTS sync_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sync_time time DEFAULT '05:00',
ADD COLUMN IF NOT EXISTS sync_days text[] DEFAULT ARRAY['monday','tuesday','wednesday','thursday','friday'],
ADD COLUMN IF NOT EXISTS delete_after_import boolean DEFAULT false;