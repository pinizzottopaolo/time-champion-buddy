ALTER TABLE public.schede
  ADD COLUMN IF NOT EXISTS tempo_composizione_assegnato integer,
  ADD COLUMN IF NOT EXISTS tempo_composizione_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS formato_carta text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS imp_manuale boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resa text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS resa_bv boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resa_fr boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinza_mm integer,
  ADD COLUMN IF NOT EXISTS dop_t_mm integer,
  ADD COLUMN IF NOT EXISTS taglio_netto boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinza_squadra boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinza_pinza boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ciano text NOT NULL DEFAULT 'NO',
  ADD COLUMN IF NOT EXISTS verifica_ciano_lastre text NOT NULL DEFAULT '';

ALTER TABLE public.schede DROP CONSTRAINT IF EXISTS schede_reparto_check;
ALTER TABLE public.schede ADD CONSTRAINT schede_reparto_check
  CHECK (reparto IN ('confezione', 'stampa', 'prestampa'));

ALTER TABLE public.schede DROP CONSTRAINT IF EXISTS schede_ciano_check;
ALTER TABLE public.schede ADD CONSTRAINT schede_ciano_check CHECK (ciano IN ('SI', 'NO'));