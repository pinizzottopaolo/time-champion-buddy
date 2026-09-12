-- Ripristina RLS per utente dopo la precedente modalita pubblica di sviluppo.
DROP POLICY IF EXISTS "Sviluppo accesso pubblico alle schede" ON public.schede;
DROP POLICY IF EXISTS "Sviluppo accesso pubblico alle righe" ON public.righe_scheda;
DROP POLICY IF EXISTS "Utenti gestiscono le proprie schede" ON public.schede;
DROP POLICY IF EXISTS "Utenti gestiscono le righe delle proprie schede" ON public.righe_scheda;

CREATE POLICY "Utenti gestiscono le proprie schede" ON public.schede
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utenti gestiscono le righe delle proprie schede" ON public.righe_scheda
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.schede s
    WHERE s.id = righe_scheda.scheda_id
      AND (s.user_id = auth.uid() OR s.user_id IS NULL)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.schede s
    WHERE s.id = righe_scheda.scheda_id
      AND s.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Accesso pubblico foto commesse" ON storage.objects;
DROP POLICY IF EXISTS "Inserimento pubblico foto commesse" ON storage.objects;
DROP POLICY IF EXISTS "Modifica pubblica foto commesse" ON storage.objects;
DROP POLICY IF EXISTS "Eliminazione pubblica foto commesse" ON storage.objects;
DROP POLICY IF EXISTS "Utenti leggono le proprie foto commesse" ON storage.objects;
DROP POLICY IF EXISTS "Utenti caricano le proprie foto commesse" ON storage.objects;
DROP POLICY IF EXISTS "Utenti modificano le proprie foto commesse" ON storage.objects;
DROP POLICY IF EXISTS "Utenti eliminano le proprie foto commesse" ON storage.objects;

CREATE POLICY "Utenti leggono le proprie foto commesse" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'commesse-foto' AND (storage.foldername(name))[1] = (select auth.uid()::text));

CREATE POLICY "Utenti caricano le proprie foto commesse" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'commesse-foto' AND (storage.foldername(name))[1] = (select auth.uid()::text));

CREATE POLICY "Utenti modificano le proprie foto commesse" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'commesse-foto' AND (storage.foldername(name))[1] = (select auth.uid()::text))
  WITH CHECK (bucket_id = 'commesse-foto' AND (storage.foldername(name))[1] = (select auth.uid()::text));

CREATE POLICY "Utenti eliminano le proprie foto commesse" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'commesse-foto' AND (storage.foldername(name))[1] = (select auth.uid()::text));