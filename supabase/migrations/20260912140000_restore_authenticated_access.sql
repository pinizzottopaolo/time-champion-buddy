-- Ripristina RLS per utente dopo la precedente modalita pubblica di sviluppo.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.schede (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data date NOT NULL DEFAULT current_date,
  cliente text NOT NULL DEFAULT '',
  lavoro text NOT NULL DEFAULT '',
  n_ord text NOT NULL DEFAULT '',
  n_ord_cliente text NOT NULL DEFAULT '',
  operatore text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  problemi text NOT NULL DEFAULT '',
  firma text NOT NULL DEFAULT '',
  reparto text NOT NULL DEFAULT 'confezione',
  completata boolean NOT NULL DEFAULT false,
  archiviata boolean NOT NULL DEFAULT false,
  gruppo_id uuid,
  foto_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.righe_scheda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheda_id uuid NOT NULL REFERENCES public.schede(id) ON DELETE CASCADE,
  chiave text NOT NULL,
  attiva boolean NOT NULL DEFAULT false,
  tempo_assegnato integer,
  tempo_effettivo integer,
  ordine integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scheda_id, chiave)
);

CREATE TABLE IF NOT EXISTS public.lavori (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheda_id uuid REFERENCES public.schede(id) ON DELETE CASCADE,
  reparto text NOT NULL DEFAULT 'confezione',
  titolo text NOT NULL DEFAULT '',
  stato text NOT NULL DEFAULT 'da_fare',
  priorita text NOT NULL DEFAULT 'normale',
  tempo_assegnato integer,
  tempo_effettivo integer,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS schede_user_data_idx ON public.schede(user_id, data DESC);
CREATE INDEX IF NOT EXISTS righe_scheda_scheda_id_idx ON public.righe_scheda(scheda_id);
CREATE INDEX IF NOT EXISTS lavori_user_created_idx ON public.lavori(user_id, created_at DESC);

ALTER TABLE public.schede ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.righe_scheda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lavori ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.schede, public.righe_scheda, public.lavori TO authenticated;
GRANT ALL ON public.schede, public.righe_scheda, public.lavori TO service_role;

INSERT INTO storage.buckets (id, name, public)
VALUES ('commesse-foto', 'commesse-foto', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Sviluppo accesso pubblico alle schede" ON public.schede;
DROP POLICY IF EXISTS "Sviluppo accesso pubblico alle righe" ON public.righe_scheda;
DROP POLICY IF EXISTS "Utenti gestiscono le proprie schede" ON public.schede;
DROP POLICY IF EXISTS "Utenti gestiscono le righe delle proprie schede" ON public.righe_scheda;
DROP POLICY IF EXISTS "Utenti gestiscono i propri lavori" ON public.lavori;

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

CREATE POLICY "Utenti gestiscono i propri lavori" ON public.lavori
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

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