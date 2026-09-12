-- Bucket pubblico per le foto delle commesse in modalita anonima.
INSERT INTO storage.buckets (id, name, public)
VALUES ('commesse-foto', 'commesse-foto', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Accesso pubblico foto commesse" ON storage.objects;
DROP POLICY IF EXISTS "Inserimento pubblico foto commesse" ON storage.objects;
DROP POLICY IF EXISTS "Modifica pubblica foto commesse" ON storage.objects;
DROP POLICY IF EXISTS "Eliminazione pubblica foto commesse" ON storage.objects;

CREATE POLICY "Accesso pubblico foto commesse" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'commesse-foto');

CREATE POLICY "Inserimento pubblico foto commesse" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'commesse-foto');

CREATE POLICY "Modifica pubblica foto commesse" ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (bucket_id = 'commesse-foto')
  WITH CHECK (bucket_id = 'commesse-foto');

CREATE POLICY "Eliminazione pubblica foto commesse" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'commesse-foto');