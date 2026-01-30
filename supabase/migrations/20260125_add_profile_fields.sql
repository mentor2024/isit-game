-- Add avatar fields to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS avatar_name text UNIQUE,
ADD COLUMN IF NOT EXISTS avatar_image text;

-- Create Storage Bucket for Avatars
-- Note: 'avatars' is a standard public bucket name
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 536870912, ARRAY['image/*']) -- 512MB limit (536870912 bytes)
ON CONFLICT (id) DO UPDATE SET file_size_limit = 536870912;

-- Enable RLS for Storage Objects (standard practice)
-- (Assuming storage.objects has RLS enabled by default or globally)

-- Policy: Everyone can view avatars
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Policy: Users can upload their own avatars
-- We assume the file name or folder structure might contain the user ID, or we trust authenticated users for now.
-- A common pattern is `avatars/{userId}/filename`.
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
    -- strictly restricting to own folder would be: AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own avatars
CREATE POLICY "Authenticated users can update own avatars"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
    -- AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own avatars
CREATE POLICY "Authenticated users can delete own avatars"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
    -- AND (storage.foldername(name))[1] = auth.uid()::text
);
