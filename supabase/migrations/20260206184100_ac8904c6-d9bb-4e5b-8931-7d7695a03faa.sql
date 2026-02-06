-- Create storage bucket for display assets (logos, backgrounds)
INSERT INTO storage.buckets (id, name, public)
VALUES ('display-assets', 'display-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload display assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'display-assets');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update display assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'display-assets');

-- Allow public read access to display assets
CREATE POLICY "Public read access to display assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'display-assets');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete display assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'display-assets');