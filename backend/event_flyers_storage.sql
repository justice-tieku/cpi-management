-- Public event flyer storage for the pastor
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-flyers',
  'event-flyers',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Event flyers publicly readable" ON storage.objects;
CREATE POLICY "Event flyers publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-flyers');

DROP POLICY IF EXISTS "Event flyers pastor can upload" ON storage.objects;
CREATE POLICY "Event flyers pastor can upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'event-flyers'
  AND public.is_pastor()
);

DROP POLICY IF EXISTS "Event flyers pastor can replace" ON storage.objects;
CREATE POLICY "Event flyers pastor can replace"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'event-flyers'
  AND public.is_pastor()
)
WITH CHECK (
  bucket_id = 'event-flyers'
  AND public.is_pastor()
);

DROP POLICY IF EXISTS "Event flyers pastor can delete" ON storage.objects;
CREATE POLICY "Event flyers pastor can delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'event-flyers'
  AND public.is_pastor()
);
