ALTER TABLE public.schede
  ADD COLUMN IF NOT EXISTS reparto text NOT NULL DEFAULT 'confezione',
  ADD COLUMN IF NOT EXISTS completata boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS foto_url text;

ALTER TABLE public.schede DROP CONSTRAINT IF EXISTS schede_reparto_check;
ALTER TABLE public.schede ADD CONSTRAINT schede_reparto_check CHECK (reparto IN ('confezione','stampa'));

CREATE INDEX IF NOT EXISTS schede_reparto_idx ON public.schede (reparto, completata);