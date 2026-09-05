ALTER TABLE public.schede
  ADD COLUMN IF NOT EXISTS formato_finito text NOT NULL DEFAULT ''::text,
  ADD COLUMN IF NOT EXISTS gruppo_id uuid;

UPDATE public.schede SET gruppo_id = id WHERE gruppo_id IS NULL;

CREATE INDEX IF NOT EXISTS schede_gruppo_id_idx ON public.schede (gruppo_id);