CREATE TABLE IF NOT EXISTS gestor.estoque_insumo (
    id serial4 NOT NULL,
    insumo_id int4 NOT NULL,
    quantidade numeric(18, 6) NOT NULL DEFAULT 0,
    data_atualizacao date NOT NULL DEFAULT CURRENT_DATE,
    observacao text NULL,
    CONSTRAINT estoque_insumo_pkey PRIMARY KEY (id),
    CONSTRAINT fk_ei_insumo FOREIGN KEY (insumo_id) REFERENCES gestor.insumo(id),
    CONSTRAINT uq_estoque_insumo UNIQUE (insumo_id)
);

CREATE INDEX IF NOT EXISTS idx_estoque_insumo_insumo ON gestor.estoque_insumo (insumo_id);
