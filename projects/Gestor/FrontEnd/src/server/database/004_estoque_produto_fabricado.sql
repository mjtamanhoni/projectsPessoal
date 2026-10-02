CREATE TABLE IF NOT EXISTS gestor.estoque_produto_fabricado (
    id serial4 NOT NULL,
    produto_fabricado_id int4 NOT NULL,
    quantidade numeric(18, 6) NOT NULL DEFAULT 0,
    data_atualizacao date NOT NULL DEFAULT CURRENT_DATE,
    observacao text NULL,
    CONSTRAINT estoque_produto_fabricado_pkey PRIMARY KEY (id),
    CONSTRAINT fk_epf_produto FOREIGN KEY (produto_fabricado_id) REFERENCES gestor.produto_fabricado(id),
    CONSTRAINT uq_estoque_produto_fabricado UNIQUE (produto_fabricado_id)
);

CREATE INDEX IF NOT EXISTS idx_estoque_produto_fabricado_produto ON gestor.estoque_produto_fabricado (produto_fabricado_id);
