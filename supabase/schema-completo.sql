-- time-champion-buddy - schema completo Supabase
-- Eseguire nel SQL Editor di Supabase.
-- Le policy anon sono intenzionalmente aperte per lo sviluppo: restringerle prima della produzione.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.utenti (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  nome text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  ruolo text NOT NULL DEFAULT 'operatore',
  attivo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT utenti_ruolo_check CHECK (ruolo IN ('admin', 'responsabile', 'operatore'))
);

CREATE TABLE IF NOT EXISTS public.schede (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  titolo text NOT NULL DEFAULT '',
  cliente text NOT NULL DEFAULT '',
  codice_lavoro text NOT NULL DEFAULT '',
  lavoro text NOT NULL DEFAULT '',
  n_ord text NOT NULL DEFAULT '',
  n_ord_cliente text NOT NULL DEFAULT '',
  operatore text NOT NULL DEFAULT '',
  reparto text NOT NULL DEFAULT 'confezione',
  stato text NOT NULL DEFAULT 'da_fare',
  priorita text NOT NULL DEFAULT 'normale',
  data_creazione timestamptz NOT NULL DEFAULT now(),
  data date NOT NULL DEFAULT current_date,
  completata boolean NOT NULL DEFAULT false,
  archiviata boolean NOT NULL DEFAULT false,
  gruppo_id uuid,
  foto_url text,
  note text NOT NULL DEFAULT '',
  problemi text NOT NULL DEFAULT '',
  firma text NOT NULL DEFAULT '',
  tipo_carta text NOT NULL DEFAULT '',
  formato text NOT NULL DEFAULT '',
  formato_finito text NOT NULL DEFAULT '',
  quantita integer,
  imballo_colli integer,
  tempo_assegnato integer,
  tempo_effettivo integer,

  -- Prestampa
  tempo_composizione_assegnato numeric,
  tempo_composizione_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  formato_carta text NOT NULL DEFAULT '',
  imp_manuale boolean NOT NULL DEFAULT false,
  resa text NOT NULL DEFAULT '',
  resa_bv boolean NOT NULL DEFAULT false,
  resa_fr boolean NOT NULL DEFAULT false,
  pinza_mm numeric,
  dop_t_mm numeric,
  taglio_netto boolean NOT NULL DEFAULT false,
  pinza_squadra boolean NOT NULL DEFAULT false,
  pinza_pinza boolean NOT NULL DEFAULT false,
  ciano text NOT NULL DEFAULT 'NO',
  magenta text NOT NULL DEFAULT 'NO',
  giallo text NOT NULL DEFAULT 'NO',
  nero text NOT NULL DEFAULT 'NO',
  verifica_ciano_lastre text NOT NULL DEFAULT '',

  -- Stampa
  fogli_prelevati integer,
  fogli_stampati integer,
  tipo_stampa text NOT NULL DEFAULT '',
  colore text NOT NULL DEFAULT '',
  macchina_stampa text NOT NULL DEFAULT '',
  supporto_stampa text NOT NULL DEFAULT '',
  fronte_retro boolean NOT NULL DEFAULT false,
  numero_lastre integer,
  tempo_avviamento_stampa numeric,
  tempo_macchina_stampa numeric,

  -- Cartotecnica
  fustella text NOT NULL DEFAULT '',
  fustellatura boolean NOT NULL DEFAULT false,
  cordonatura boolean NOT NULL DEFAULT false,
  piega boolean NOT NULL DEFAULT false,
  incollatura boolean NOT NULL DEFAULT false,
  punti_incollatura integer,
  materiali_cartotecnica text NOT NULL DEFAULT '',
  pezzi_foglio integer,

  -- Allestimento / Confezione
  tipologia_allestimento text NOT NULL DEFAULT '',
  rilegatura text NOT NULL DEFAULT '',
  cucitura boolean NOT NULL DEFAULT false,
  brossura boolean NOT NULL DEFAULT false,
  plastificazione text NOT NULL DEFAULT '',
  verniciatura text NOT NULL DEFAULT '',
  raccolta boolean NOT NULL DEFAULT false,
  confezionamento text NOT NULL DEFAULT '',
  pezzi_confezione integer,

  -- Spedizione
  indirizzo_spedizione text NOT NULL DEFAULT '',
  referente_spedizione text NOT NULL DEFAULT '',
  vettore text NOT NULL DEFAULT '',
  numero_colli integer,
  peso_kg numeric,
  data_spedizione date,
  tracking text NOT NULL DEFAULT '',
  note_spedizione text NOT NULL DEFAULT '',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT schede_reparto_check CHECK (reparto IN (
    'prestampa', 'stampa', 'cartotecnica', 'allestimento',
    'confezione', 'spedizione', 'nobilitazione', 'taglio', 'altro'
  )),
  CONSTRAINT schede_stato_check CHECK (stato IN ('da_fare', 'in_lavorazione', 'completata', 'archiviata')),
  CONSTRAINT schede_priorita_check CHECK (priorita IN ('bassa', 'normale', 'alta', 'urgente')),
  CONSTRAINT schede_ciano_check CHECK (ciano IN ('SI', 'NO')),
  CONSTRAINT schede_magenta_check CHECK (magenta IN ('SI', 'NO')),
  CONSTRAINT schede_giallo_check CHECK (giallo IN ('SI', 'NO')),
  CONSTRAINT schede_nero_check CHECK (nero IN ('SI', 'NO'))
);

-- Compatibilita con installazioni che hanno gia eseguito una versione precedente.
ALTER TABLE public.schede
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS titolo text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS codice_lavoro text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS stato text NOT NULL DEFAULT 'da_fare',
  ADD COLUMN IF NOT EXISTS priorita text NOT NULL DEFAULT 'normale',
  ADD COLUMN IF NOT EXISTS data_creazione timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS tempo_composizione_assegnato numeric,
  ADD COLUMN IF NOT EXISTS tempo_composizione_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS formato_carta text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS imp_manuale boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resa text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS resa_bv boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resa_fr boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinza_mm numeric,
  ADD COLUMN IF NOT EXISTS dop_t_mm numeric,
  ADD COLUMN IF NOT EXISTS taglio_netto boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinza_squadra boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinza_pinza boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ciano text NOT NULL DEFAULT 'NO',
  ADD COLUMN IF NOT EXISTS verifica_ciano_lastre text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS magenta text NOT NULL DEFAULT 'NO',
  ADD COLUMN IF NOT EXISTS giallo text NOT NULL DEFAULT 'NO',
  ADD COLUMN IF NOT EXISTS nero text NOT NULL DEFAULT 'NO',
  ADD COLUMN IF NOT EXISTS macchina_stampa text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS supporto_stampa text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fronte_retro boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS numero_lastre integer,
  ADD COLUMN IF NOT EXISTS tempo_avviamento_stampa numeric,
  ADD COLUMN IF NOT EXISTS tempo_macchina_stampa numeric,
  ADD COLUMN IF NOT EXISTS fustella text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fustellatura boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cordonatura boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS piega boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS incollatura boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS punti_incollatura integer,
  ADD COLUMN IF NOT EXISTS materiali_cartotecnica text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pezzi_foglio integer,
  ADD COLUMN IF NOT EXISTS tipologia_allestimento text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS rilegatura text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cucitura boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS brossura boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS plastificazione text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS verniciatura text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS raccolta boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS confezionamento text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pezzi_confezione integer,
  ADD COLUMN IF NOT EXISTS indirizzo_spedizione text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS referente_spedizione text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS vettore text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS numero_colli integer,
  ADD COLUMN IF NOT EXISTS peso_kg numeric,
  ADD COLUMN IF NOT EXISTS data_spedizione date,
  ADD COLUMN IF NOT EXISTS tracking text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS note_spedizione text NOT NULL DEFAULT '';

ALTER TABLE public.schede DROP CONSTRAINT IF EXISTS schede_reparto_check;
ALTER TABLE public.schede ADD CONSTRAINT schede_reparto_check CHECK (reparto IN (
  'prestampa', 'stampa', 'cartotecnica', 'allestimento',
  'confezione', 'spedizione', 'nobilitazione', 'taglio', 'altro'
));
ALTER TABLE public.schede DROP CONSTRAINT IF EXISTS schede_stato_check;
ALTER TABLE public.schede ADD CONSTRAINT schede_stato_check
  CHECK (stato IN ('da_fare', 'in_lavorazione', 'completata', 'archiviata'));
ALTER TABLE public.schede DROP CONSTRAINT IF EXISTS schede_priorita_check;
ALTER TABLE public.schede ADD CONSTRAINT schede_priorita_check
  CHECK (priorita IN ('bassa', 'normale', 'alta', 'urgente'));
ALTER TABLE public.schede DROP CONSTRAINT IF EXISTS schede_ciano_check;
ALTER TABLE public.schede ADD CONSTRAINT schede_ciano_check CHECK (ciano IN ('SI', 'NO'));
ALTER TABLE public.schede DROP CONSTRAINT IF EXISTS schede_magenta_check;
ALTER TABLE public.schede ADD CONSTRAINT schede_magenta_check CHECK (magenta IN ('SI', 'NO'));
ALTER TABLE public.schede DROP CONSTRAINT IF EXISTS schede_giallo_check;
ALTER TABLE public.schede ADD CONSTRAINT schede_giallo_check CHECK (giallo IN ('SI', 'NO'));
ALTER TABLE public.schede DROP CONSTRAINT IF EXISTS schede_nero_check;
ALTER TABLE public.schede ADD CONSTRAINT schede_nero_check CHECK (nero IN ('SI', 'NO'));

CREATE TABLE IF NOT EXISTS public.righe_scheda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheda_id uuid NOT NULL REFERENCES public.schede(id) ON DELETE CASCADE,
  chiave text NOT NULL,
  attiva boolean NOT NULL DEFAULT false,
  n_fogli integer,
  fornitore text NOT NULL DEFAULT '',
  n_parti integer,
  n_fasc integer,
  n_pagine integer,
  fori_qta integer,
  diametro text NOT NULL DEFAULT '',
  mezzo_taglio boolean NOT NULL DEFAULT false,
  tempo_assegnato integer,
  tempo_effettivo integer,
  ordine integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scheda_id, chiave)
);

CREATE TABLE IF NOT EXISTS public.log_tempi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheda_id uuid NOT NULL REFERENCES public.schede(id) ON DELETE CASCADE,
  riga_id uuid REFERENCES public.righe_scheda(id) ON DELETE CASCADE,
  reparto text NOT NULL DEFAULT 'confezione',
  operatore_id uuid REFERENCES public.utenti(id) ON DELETE SET NULL,
  iniziato_at timestamptz NOT NULL DEFAULT now(),
  terminato_at timestamptz,
  ore numeric,
  nota text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.note_reparto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheda_id uuid NOT NULL REFERENCES public.schede(id) ON DELETE CASCADE,
  reparto text NOT NULL,
  autore_id uuid REFERENCES public.utenti(id) ON DELETE SET NULL,
  testo text NOT NULL,
  importante boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS schede_reparto_stato_idx ON public.schede(reparto, stato, completata);
CREATE INDEX IF NOT EXISTS schede_cliente_idx ON public.schede(cliente);
CREATE INDEX IF NOT EXISTS schede_data_idx ON public.schede(data DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS schede_gruppo_id_idx ON public.schede(gruppo_id);
CREATE INDEX IF NOT EXISTS righe_scheda_scheda_id_idx ON public.righe_scheda(scheda_id);
CREATE INDEX IF NOT EXISTS log_tempi_scheda_id_idx ON public.log_tempi(scheda_id, iniziato_at DESC);
CREATE INDEX IF NOT EXISTS note_reparto_scheda_id_idx ON public.note_reparto(scheda_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.aggiorna_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS utenti_updated_at ON public.utenti;
CREATE TRIGGER utenti_updated_at BEFORE UPDATE ON public.utenti
FOR EACH ROW EXECUTE FUNCTION public.aggiorna_updated_at();

DROP TRIGGER IF EXISTS schede_updated_at ON public.schede;
CREATE TRIGGER schede_updated_at BEFORE UPDATE ON public.schede
FOR EACH ROW EXECUTE FUNCTION public.aggiorna_updated_at();

DROP TRIGGER IF EXISTS note_reparto_updated_at ON public.note_reparto;
CREATE TRIGGER note_reparto_updated_at BEFORE UPDATE ON public.note_reparto
FOR EACH ROW EXECUTE FUNCTION public.aggiorna_updated_at();

ALTER TABLE public.utenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schede ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.righe_scheda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_tempi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_reparto ENABLE ROW LEVEL SECURITY;

-- Sviluppo: accesso CRUD pubblico. In produzione sostituire con policy basate su auth.uid().
DROP POLICY IF EXISTS utenti_dev_select ON public.utenti;
DROP POLICY IF EXISTS utenti_dev_insert ON public.utenti;
DROP POLICY IF EXISTS utenti_dev_update ON public.utenti;
DROP POLICY IF EXISTS utenti_dev_delete ON public.utenti;
CREATE POLICY utenti_dev_select ON public.utenti FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY utenti_dev_insert ON public.utenti FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY utenti_dev_update ON public.utenti FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY utenti_dev_delete ON public.utenti FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS schede_dev_select ON public.schede;
DROP POLICY IF EXISTS schede_dev_insert ON public.schede;
DROP POLICY IF EXISTS schede_dev_update ON public.schede;
DROP POLICY IF EXISTS schede_dev_delete ON public.schede;
CREATE POLICY schede_dev_select ON public.schede FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY schede_dev_insert ON public.schede FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY schede_dev_update ON public.schede FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY schede_dev_delete ON public.schede FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS righe_scheda_dev_select ON public.righe_scheda;
DROP POLICY IF EXISTS righe_scheda_dev_insert ON public.righe_scheda;
DROP POLICY IF EXISTS righe_scheda_dev_update ON public.righe_scheda;
DROP POLICY IF EXISTS righe_scheda_dev_delete ON public.righe_scheda;
CREATE POLICY righe_scheda_dev_select ON public.righe_scheda FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY righe_scheda_dev_insert ON public.righe_scheda FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY righe_scheda_dev_update ON public.righe_scheda FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY righe_scheda_dev_delete ON public.righe_scheda FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS log_tempi_dev_select ON public.log_tempi;
DROP POLICY IF EXISTS log_tempi_dev_insert ON public.log_tempi;
DROP POLICY IF EXISTS log_tempi_dev_update ON public.log_tempi;
DROP POLICY IF EXISTS log_tempi_dev_delete ON public.log_tempi;
CREATE POLICY log_tempi_dev_select ON public.log_tempi FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY log_tempi_dev_insert ON public.log_tempi FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY log_tempi_dev_update ON public.log_tempi FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY log_tempi_dev_delete ON public.log_tempi FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS note_reparto_dev_select ON public.note_reparto;
DROP POLICY IF EXISTS note_reparto_dev_insert ON public.note_reparto;
DROP POLICY IF EXISTS note_reparto_dev_update ON public.note_reparto;
DROP POLICY IF EXISTS note_reparto_dev_delete ON public.note_reparto;
CREATE POLICY note_reparto_dev_select ON public.note_reparto FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY note_reparto_dev_insert ON public.note_reparto FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY note_reparto_dev_update ON public.note_reparto FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY note_reparto_dev_delete ON public.note_reparto FOR DELETE TO anon, authenticated USING (true);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.utenti, public.schede, public.righe_scheda,
  public.log_tempi, public.note_reparto TO anon, authenticated;
GRANT ALL ON public.utenti, public.schede, public.righe_scheda, public.log_tempi, public.note_reparto TO service_role;

COMMIT;

-- Produzione: rimuovere le policy *_dev e usare policy con auth.uid().
