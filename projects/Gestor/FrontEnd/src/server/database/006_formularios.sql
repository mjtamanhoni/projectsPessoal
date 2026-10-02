DO $$
BEGIN
  -- Form names that were missing from the public.formulario table

  IF NOT EXISTS (SELECT 1 FROM public.formulario WHERE nome = 'Estoque Insumo') THEN
    INSERT INTO public.formulario (nome) VALUES ('Estoque Insumo');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.formulario WHERE nome = 'Estoque Produto Fabricado') THEN
    INSERT INTO public.formulario (nome) VALUES ('Estoque Produto Fabricado');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.formulario WHERE nome = 'Modulos') THEN
    INSERT INTO public.formulario (nome) VALUES ('Modulos');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.formulario WHERE nome = 'Modulo x Formulario') THEN
    INSERT INTO public.formulario (nome) VALUES ('Modulo x Formulario');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.formulario WHERE nome = 'Empresa x Modulo') THEN
    INSERT INTO public.formulario (nome) VALUES ('Empresa x Modulo');
  END IF;

END $$;
