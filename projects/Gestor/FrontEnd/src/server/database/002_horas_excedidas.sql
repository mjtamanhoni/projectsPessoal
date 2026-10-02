CREATE TABLE IF NOT EXISTS servicos.horas_excedidas (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES gestor.usuario(id),
    cliente_id INTEGER NOT NULL REFERENCES gestor.cliente(codigo),
    servico_id INTEGER NOT NULL REFERENCES servicos.servico(codigo),
    mes_origem INTEGER NOT NULL CHECK (mes_origem >= 1 AND mes_origem <= 12),
    ano_origem INTEGER NOT NULL,
    delta_horas NUMERIC(10,2) NOT NULL,
    data_criacao DATE NOT NULL DEFAULT CURRENT_DATE,
    UNIQUE(usuario_id, cliente_id, servico_id, mes_origem, ano_origem)
);

CREATE INDEX IF NOT EXISTS idx_horas_excedidas_usuario ON servicos.horas_excedidas (usuario_id);
CREATE INDEX IF NOT EXISTS idx_horas_excedidas_data ON servicos.horas_excedidas (ano_origem, mes_origem);
