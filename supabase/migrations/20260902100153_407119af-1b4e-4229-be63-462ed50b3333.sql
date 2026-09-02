CREATE TABLE public.schede (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT current_date,
  cliente TEXT NOT NULL DEFAULT '',
  lavoro TEXT NOT NULL DEFAULT '',
  n_ord TEXT NOT NULL DEFAULT '',
  n_ord_cliente TEXT NOT NULL DEFAULT '',
  operatore TEXT NOT NULL DEFAULT '',
  imballo_colli INTEGER,
  note TEXT NOT NULL DEFAULT '',
  problemi TEXT NOT NULL DEFAULT '',
  firma TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.schede TO authenticated;
GRANT ALL ON public.schede TO service_role;
ALTER TABLE public.schede ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Utenti gestiscono le proprie schede" ON public.schede FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.righe_scheda (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scheda_id UUID NOT NULL REFERENCES public.schede(id) ON DELETE CASCADE,
  chiave TEXT NOT NULL,
  attiva BOOLEAN NOT NULL DEFAULT false,
  n_fogli INTEGER,
  fornitore TEXT NOT NULL DEFAULT '',
  n_parti INTEGER,
  n_fasc INTEGER,
  n_pagine INTEGER,
  fori_qta INTEGER,
  diametro TEXT NOT NULL DEFAULT '',
  mezzo_taglio BOOLEAN NOT NULL DEFAULT false,
  tempo_assegnato INTEGER,
  tempo_effettivo INTEGER,
  ordine INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scheda_id, chiave)
);

CREATE INDEX idx_righe_scheda_scheda_id ON public.righe_scheda(scheda_id);
CREATE INDEX idx_schede_user_data ON public.schede(user_id, data DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.righe_scheda TO authenticated;
GRANT ALL ON public.righe_scheda TO service_role;
ALTER TABLE public.righe_scheda ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Utenti gestiscono le righe delle proprie schede" ON public.righe_scheda FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.schede s WHERE s.id = righe_scheda.scheda_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.schede s WHERE s.id = righe_scheda.scheda_id AND s.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_schede_updated_at BEFORE UPDATE ON public.schede FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();