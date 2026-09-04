ALTER TABLE public.schede ADD COLUMN IF NOT EXISTS archiviata boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS schede_archiviata_idx ON public.schede (user_id, archiviata);
CREATE INDEX IF NOT EXISTS schede_cliente_idx ON public.schede (cliente);
CREATE INDEX IF NOT EXISTS schede_lavoro_idx ON public.schede (lavoro);