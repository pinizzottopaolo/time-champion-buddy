ALTER TABLE public.schede
  ADD COLUMN IF NOT EXISTS fogli_prelevati integer,
  ADD COLUMN IF NOT EXISTS fogli_stampati integer,
  ADD COLUMN IF NOT EXISTS tipo_stampa text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS colore text NOT NULL DEFAULT '';