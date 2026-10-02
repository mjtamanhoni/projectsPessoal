DO $$
BEGIN
  -- ============================================================
  -- 1. Create empresa table
  -- ============================================================
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'gestor' AND table_name = 'empresa') THEN
    CREATE TABLE gestor.empresa (
      id SERIAL PRIMARY KEY,
      razao_social VARCHAR(200) NOT NULL,
      fantasia VARCHAR(200),
      cnpj_cpf VARCHAR(20),
      inscricao_estadual_identidade VARCHAR(20),
      regime_tributario VARCHAR(50),
      endereco TEXT,
      telefone VARCHAR(20),
      celular VARCHAR(20),
      email VARCHAR(200)
    );
  END IF;

  -- ============================================================
  -- 2. Insert default empresa
  -- ============================================================
  IF NOT EXISTS (SELECT 1 FROM gestor.empresa WHERE id = 1) THEN
    INSERT INTO gestor.empresa (id, razao_social, cnpj_cpf)
    VALUES (1, 'MARCOS TAMANHONI', '56134688000157');
  END IF;

  -- ============================================================
  -- 3. usuario
  -- ============================================================
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'gestor' AND table_name = 'usuario' AND column_name = 'empresa_id') THEN
    ALTER TABLE gestor.usuario ADD COLUMN empresa_id INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE gestor.usuario ADD CONSTRAINT fk_usuario_empresa FOREIGN KEY (empresa_id) REFERENCES gestor.empresa(id);
  END IF;

  -- ============================================================
  -- Helper: add empresa_id + usuario_id to a table
  -- ============================================================
  -- fornecedor
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'gestor' AND table_name = 'fornecedor' AND column_name = 'empresa_id') THEN
    ALTER TABLE gestor.fornecedor ADD COLUMN empresa_id INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE gestor.fornecedor ADD COLUMN usuario_id INTEGER NOT NULL DEFAULT 3;
    ALTER TABLE gestor.fornecedor ADD CONSTRAINT fk_fornecedor_empresa FOREIGN KEY (empresa_id) REFERENCES gestor.empresa(id);
  END IF;

  -- cliente
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'gestor' AND table_name = 'cliente' AND column_name = 'empresa_id') THEN
    ALTER TABLE gestor.cliente ADD COLUMN empresa_id INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE gestor.cliente ADD COLUMN usuario_id INTEGER NOT NULL DEFAULT 3;
    ALTER TABLE gestor.cliente ADD CONSTRAINT fk_cliente_empresa FOREIGN KEY (empresa_id) REFERENCES gestor.empresa(id);
  END IF;

  -- categoria_pagar
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'gestor' AND table_name = 'categoria_pagar' AND column_name = 'empresa_id') THEN
    ALTER TABLE gestor.categoria_pagar ADD COLUMN empresa_id INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE gestor.categoria_pagar ADD COLUMN usuario_id INTEGER NOT NULL DEFAULT 3;
    ALTER TABLE gestor.categoria_pagar ADD CONSTRAINT fk_categoria_pagar_empresa FOREIGN KEY (empresa_id) REFERENCES gestor.empresa(id);
  END IF;

  -- categoria_receber
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'gestor' AND table_name = 'categoria_receber' AND column_name = 'empresa_id') THEN
    ALTER TABLE gestor.categoria_receber ADD COLUMN empresa_id INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE gestor.categoria_receber ADD COLUMN usuario_id INTEGER NOT NULL DEFAULT 3;
    ALTER TABLE gestor.categoria_receber ADD CONSTRAINT fk_categoria_receber_empresa FOREIGN KEY (empresa_id) REFERENCES gestor.empresa(id);
  END IF;

  -- contas_pagar (already has usuario_id)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'gestor' AND table_name = 'contas_pagar' AND column_name = 'empresa_id') THEN
    ALTER TABLE gestor.contas_pagar ADD COLUMN empresa_id INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE gestor.contas_pagar ADD CONSTRAINT fk_contas_pagar_empresa FOREIGN KEY (empresa_id) REFERENCES gestor.empresa(id);
  END IF;

  -- contas_receber (already has usuario_id)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'gestor' AND table_name = 'contas_receber' AND column_name = 'empresa_id') THEN
    ALTER TABLE gestor.contas_receber ADD COLUMN empresa_id INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE gestor.contas_receber ADD CONSTRAINT fk_contas_receber_empresa FOREIGN KEY (empresa_id) REFERENCES gestor.empresa(id);
  END IF;

  -- servico
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'servicos' AND table_name = 'servico' AND column_name = 'empresa_id') THEN
    ALTER TABLE servicos.servico ADD COLUMN empresa_id INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE servicos.servico ADD COLUMN usuario_id INTEGER NOT NULL DEFAULT 3;
    ALTER TABLE servicos.servico ADD CONSTRAINT fk_servico_empresa FOREIGN KEY (empresa_id) REFERENCES gestor.empresa(id);
  END IF;

  -- horas_trabalhadas (already has usuario_id)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'servicos' AND table_name = 'horas_trabalhadas' AND column_name = 'empresa_id') THEN
    ALTER TABLE servicos.horas_trabalhadas ADD COLUMN empresa_id INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE servicos.horas_trabalhadas ADD CONSTRAINT fk_horas_trabalhadas_empresa FOREIGN KEY (empresa_id) REFERENCES gestor.empresa(id);
  END IF;

  -- horas_abatidas (already has usuario_id)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'servicos' AND table_name = 'horas_abatidas' AND column_name = 'empresa_id') THEN
    ALTER TABLE servicos.horas_abatidas ADD COLUMN empresa_id INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE servicos.horas_abatidas ADD CONSTRAINT fk_horas_abatidas_empresa FOREIGN KEY (empresa_id) REFERENCES gestor.empresa(id);
  END IF;

  -- horas_excedidas (already has usuario_id)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'servicos' AND table_name = 'horas_excedidas' AND column_name = 'empresa_id') THEN
    ALTER TABLE servicos.horas_excedidas ADD COLUMN empresa_id INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE servicos.horas_excedidas ADD CONSTRAINT fk_horas_excedidas_empresa FOREIGN KEY (empresa_id) REFERENCES gestor.empresa(id);
  END IF;

  -- formulario
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'gestor' AND table_name = 'formulario' AND column_name = 'empresa_id') THEN
    ALTER TABLE gestor.formulario ADD COLUMN empresa_id INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE gestor.formulario ADD COLUMN usuario_id INTEGER NOT NULL DEFAULT 3;
    ALTER TABLE gestor.formulario ADD CONSTRAINT fk_formulario_empresa FOREIGN KEY (empresa_id) REFERENCES gestor.empresa(id);
  END IF;

  -- usuario_formulario (already has usuario_id)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'gestor' AND table_name = 'usuario_formulario' AND column_name = 'empresa_id') THEN
    ALTER TABLE gestor.usuario_formulario ADD COLUMN empresa_id INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE gestor.usuario_formulario ADD CONSTRAINT fk_usuario_formulario_empresa FOREIGN KEY (empresa_id) REFERENCES gestor.empresa(id);
  END IF;

  -- permissao
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'gestor' AND table_name = 'permissao' AND column_name = 'empresa_id') THEN
    ALTER TABLE gestor.permissao ADD COLUMN empresa_id INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE gestor.permissao ADD COLUMN usuario_id INTEGER NOT NULL DEFAULT 3;
    ALTER TABLE gestor.permissao ADD CONSTRAINT fk_permissao_empresa FOREIGN KEY (empresa_id) REFERENCES gestor.empresa(id);
  END IF;

  -- usuario_formulario_permissao
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'gestor' AND table_name = 'usuario_formulario_permissao' AND column_name = 'empresa_id') THEN
    ALTER TABLE gestor.usuario_formulario_permissao ADD COLUMN empresa_id INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE gestor.usuario_formulario_permissao ADD COLUMN usuario_id INTEGER NOT NULL DEFAULT 3;
    ALTER TABLE gestor.usuario_formulario_permissao ADD CONSTRAINT fk_uf_permissao_empresa FOREIGN KEY (empresa_id) REFERENCES gestor.empresa(id);
  END IF;

  -- insumo
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'gestor' AND table_name = 'insumo' AND column_name = 'empresa_id') THEN
    ALTER TABLE gestor.insumo ADD COLUMN empresa_id INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE gestor.insumo ADD COLUMN usuario_id INTEGER NOT NULL DEFAULT 3;
    ALTER TABLE gestor.insumo ADD CONSTRAINT fk_insumo_empresa FOREIGN KEY (empresa_id) REFERENCES gestor.empresa(id);
  END IF;

  -- compra_insumo
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'gestor' AND table_name = 'compra_insumo' AND column_name = 'empresa_id') THEN
    ALTER TABLE gestor.compra_insumo ADD COLUMN empresa_id INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE gestor.compra_insumo ADD COLUMN usuario_id INTEGER NOT NULL DEFAULT 3;
    ALTER TABLE gestor.compra_insumo ADD CONSTRAINT fk_compra_insumo_empresa FOREIGN KEY (empresa_id) REFERENCES gestor.empresa(id);
  END IF;

  -- produto_fabricado
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'gestor' AND table_name = 'produto_fabricado' AND column_name = 'empresa_id') THEN
    ALTER TABLE gestor.produto_fabricado ADD COLUMN empresa_id INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE gestor.produto_fabricado ADD COLUMN usuario_id INTEGER NOT NULL DEFAULT 3;
    ALTER TABLE gestor.produto_fabricado ADD CONSTRAINT fk_produto_fabricado_empresa FOREIGN KEY (empresa_id) REFERENCES gestor.empresa(id);
  END IF;

  -- receita_ingrediente
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'gestor' AND table_name = 'receita_ingrediente' AND column_name = 'empresa_id') THEN
    ALTER TABLE gestor.receita_ingrediente ADD COLUMN empresa_id INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE gestor.receita_ingrediente ADD COLUMN usuario_id INTEGER NOT NULL DEFAULT 3;
    ALTER TABLE gestor.receita_ingrediente ADD CONSTRAINT fk_receita_ingrediente_empresa FOREIGN KEY (empresa_id) REFERENCES gestor.empresa(id);
  END IF;

  -- custo_adicional_tipo
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'gestor' AND table_name = 'custo_adicional_tipo' AND column_name = 'empresa_id') THEN
    ALTER TABLE gestor.custo_adicional_tipo ADD COLUMN empresa_id INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE gestor.custo_adicional_tipo ADD COLUMN usuario_id INTEGER NOT NULL DEFAULT 3;
    ALTER TABLE gestor.custo_adicional_tipo ADD CONSTRAINT fk_custo_adicional_tipo_empresa FOREIGN KEY (empresa_id) REFERENCES gestor.empresa(id);
  END IF;

  -- fabricacao
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'gestor' AND table_name = 'fabricacao' AND column_name = 'empresa_id') THEN
    ALTER TABLE gestor.fabricacao ADD COLUMN empresa_id INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE gestor.fabricacao ADD COLUMN usuario_id INTEGER NOT NULL DEFAULT 3;
    ALTER TABLE gestor.fabricacao ADD CONSTRAINT fk_fabricacao_empresa FOREIGN KEY (empresa_id) REFERENCES gestor.empresa(id);
  END IF;

  -- fabricacao_custo_adicional
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'gestor' AND table_name = 'fabricacao_custo_adicional' AND column_name = 'empresa_id') THEN
    ALTER TABLE gestor.fabricacao_custo_adicional ADD COLUMN empresa_id INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE gestor.fabricacao_custo_adicional ADD COLUMN usuario_id INTEGER NOT NULL DEFAULT 3;
    ALTER TABLE gestor.fabricacao_custo_adicional ADD CONSTRAINT fk_fabricacao_custo_adicional_empresa FOREIGN KEY (empresa_id) REFERENCES gestor.empresa(id);
  END IF;

  -- venda_produto (already has usuario_id)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'gestor' AND table_name = 'venda_produto' AND column_name = 'empresa_id') THEN
    ALTER TABLE gestor.venda_produto ADD COLUMN empresa_id INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE gestor.venda_produto ADD CONSTRAINT fk_venda_produto_empresa FOREIGN KEY (empresa_id) REFERENCES gestor.empresa(id);
  END IF;

  -- estoque_insumo
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'gestor' AND table_name = 'estoque_insumo' AND column_name = 'empresa_id') THEN
    ALTER TABLE gestor.estoque_insumo ADD COLUMN empresa_id INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE gestor.estoque_insumo ADD COLUMN usuario_id INTEGER NOT NULL DEFAULT 3;
    ALTER TABLE gestor.estoque_insumo ADD CONSTRAINT fk_estoque_insumo_empresa FOREIGN KEY (empresa_id) REFERENCES gestor.empresa(id);
  END IF;

  -- estoque_produto_fabricado
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'gestor' AND table_name = 'estoque_produto_fabricado' AND column_name = 'empresa_id') THEN
    ALTER TABLE gestor.estoque_produto_fabricado ADD COLUMN empresa_id INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE gestor.estoque_produto_fabricado ADD COLUMN usuario_id INTEGER NOT NULL DEFAULT 3;
    ALTER TABLE gestor.estoque_produto_fabricado ADD CONSTRAINT fk_estoque_produto_empresa FOREIGN KEY (empresa_id) REFERENCES gestor.empresa(id);
  END IF;

END $$;
