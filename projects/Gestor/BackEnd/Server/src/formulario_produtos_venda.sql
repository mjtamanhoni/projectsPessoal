-- Registra o formulario "Produtos de Venda" e vincula ao modulo PRODUCAO.
-- Idempotente: pode ser executado varias vezes sem duplicar.
-- Banco de destino: gestor (estrutura antiga, sem empresa_id em formulario/modulo_formulario).

DO $$
DECLARE
	v_form_id INTEGER;
	v_mod_id INTEGER;
BEGIN
	-- Modulo PRODUCAO (busca tolerante a acento/cedilha)
	SELECT id INTO v_mod_id FROM public.modulo
	WHERE nome ILIKE '%PRODU%'
	   OR upper(translate(nome, 'ÁÀÂÃÄÉÊÍÓÔÕÚÇ', 'AAAAAEEIOOOUC')) LIKE '%PRODUCAO%'
	ORDER BY id LIMIT 1;

	IF v_mod_id IS NULL THEN
		RAISE EXCEPTION 'Modulo PRODUCAO nao encontrado';
	END IF;

	-- Formulario
	SELECT id INTO v_form_id FROM public.formulario WHERE nome = 'Produtos de Venda' LIMIT 1;
	IF v_form_id IS NULL THEN
		INSERT INTO public.formulario (nome, status) VALUES ('Produtos de Venda', 1)
		RETURNING id INTO v_form_id;
	END IF;

	-- Vinculo modulo x formulario
	IF NOT EXISTS (
		SELECT 1 FROM public.modulo_formulario
		WHERE modulo_id = v_mod_id AND formulario_id = v_form_id
	) THEN
		INSERT INTO public.modulo_formulario (modulo_id, formulario_id, abertura)
		VALUES (v_mod_id, v_form_id, 0);
	END IF;

	RAISE NOTICE 'Formulario "Produtos de Venda" (id %) vinculado ao modulo % (id %)', v_form_id, v_mod_id, v_mod_id;
END $$;