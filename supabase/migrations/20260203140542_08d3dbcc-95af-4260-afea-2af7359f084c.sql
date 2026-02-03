-- Add color column to categories for card customization
ALTER TABLE public.categories 
ADD COLUMN card_color text DEFAULT 'primary';

-- Add comment for documentation
COMMENT ON COLUMN public.categories.card_color IS 'Color identifier for packing card display (e.g., primary, amber, blue, green, purple, rose)';