-- Accesso anonimo per lo sviluppo: l'app non richiede piu una sessione Supabase.
ALTER TABLE public.schede ALTER COLUMN user_id DROP NOT NULL;

DROP POLICY IF EXISTS "Utenti gestiscono le proprie schede" ON public.schede;
DROP POLICY IF EXISTS "Utenti gestiscono le righe delle proprie schede" ON public.righe_scheda;

CREATE POLICY "Sviluppo accesso pubblico alle schede" ON public.schede
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Sviluppo accesso pubblico alle righe" ON public.righe_scheda
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);
