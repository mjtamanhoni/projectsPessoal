-- Migration 008: Adiciona campo 'impresso' na tabela encomenda
-- 0 = nao impresso (impressao automatica pendente)
-- 1 = impresso

ALTER TABLE public.encomenda ADD COLUMN impresso INTEGER NOT NULL DEFAULT 0;

-- Reseta registros existentes para 0 (nao impresso) para permitir impressao automatica
UPDATE public.encomenda SET impresso = 0 WHERE impresso = 1;

COMMENT ON COLUMN public.encomenda.impresso IS 'Flag de impressao automatica: 0=nao impresso, 1=impresso';
