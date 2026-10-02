-- Registra o formulario "Classificacao Produtos" (tela /produto-classificacao)
-- e o vincula ao modulo PRODUCAO. Idempotente: pode ser executado varias vezes.
--
-- Uso: ajuste EMP_ID (empresa) conforme o ambiente, e o modulo sera localizado
-- pelo nome (PRODUCAO / PRODUCAO V2 etc.).

DO $$
DECLARE
  v_emp_id    INTEGER := 1;            -- empresa MJTSystems (ajuste conforme o ambiente)
  v_usr_id    INTEGER := 1;            -- usuario que cadastra (ajuste conforme o ambiente)
  v_form_id   INTEGER;
  v_mod_id    INTEGER;
  v_seq       INTEGER;
BEGIN

  -- 1) Formulario
  SELECT id INTO v_form_id
    FROM public.formulario
   WHERE empresa_id = v_emp_id AND nome = 'Classificacao Produtos'
   LIMIT 1;

  IF v_form_id IS NULL THEN
    SELECT COALESCE(MAX(id), 0) + 1 INTO v_form_id
      FROM public.formulario WHERE empresa_id = v_emp_id;

    INSERT INTO public.formulario (empresa_id, id, nome, usuario_id)
    VALUES (v_emp_id, v_form_id, 'Classificacao Produtos', v_usr_id);
  END IF;

  -- 2) Modulo PRODUCAO (busca tolerante a acentos/cedilha)
  SELECT id INTO v_mod_id
    FROM public.modulo
   WHERE empresa_id = v_emp_id
     AND (nome ILIKE '%PRODU%' OR upper(translate(nome, 'ÁÀÂÃÄÉÊÍÓÔÕÚÇ', 'AAAAAEEIOOOUC')) LIKE '%PRODUCAO%')
   ORDER BY CASE WHEN nome ILIKE '%V2%' THEN 0 ELSE 1 END, id
   LIMIT 1;

  IF v_mod_id IS NOT NULL THEN
    -- 3) Vinculo modulo/formulario (evita duplicidade)
    IF NOT EXISTS (
      SELECT 1 FROM public.modulo_formulario
       WHERE empresa_id = v_emp_id AND modulo_id = v_mod_id AND formulario_id = v_form_id
    ) THEN
      SELECT COALESCE(MAX(id), 0) + 1 INTO v_seq
        FROM public.modulo_formulario WHERE empresa_id = v_emp_id;

      INSERT INTO public.modulo_formulario (empresa_id, id, modulo_id, formulario_id, abertura, usuario_id)
      VALUES (v_emp_id, v_seq, v_mod_id, v_form_id, 1, v_usr_id);
    END IF;
  END IF;

END $$;