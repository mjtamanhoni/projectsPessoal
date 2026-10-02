CREATE TABLE IF NOT EXISTS servicos.horas_abatidas (
    id serial4 NOT NULL,
    usuario_id int4 NOT NULL,
    cliente_id int4 NOT NULL,
    servico_id int4 NOT NULL,
    data_abatimento date NOT NULL DEFAULT CURRENT_DATE,
    valor numeric(10, 2) NOT NULL,
    valor_hora numeric(10, 2) NOT NULL,
    quantidade_horas numeric(7, 2) NOT NULL,
    observacoes text NULL,
    CONSTRAINT horas_abatidas_pkey PRIMARY KEY (id),
    CONSTRAINT fk_abat_usuario FOREIGN KEY (usuario_id) REFERENCES gestor.usuario(id),
    CONSTRAINT fk_abat_cliente FOREIGN KEY (cliente_id) REFERENCES gestor.cliente(id),
    CONSTRAINT fk_abat_servico FOREIGN KEY (servico_id) REFERENCES servicos.servico(id)
);

CREATE INDEX IF NOT EXISTS idx_horas_abatidas_usuario ON servicos.horas_abatidas (usuario_id);
CREATE INDEX IF NOT EXISTS idx_horas_abatidas_data ON servicos.horas_abatidas (data_abatimento);

CREATE OR REPLACE VIEW gestor.v_saldo_horas AS
SELECT
    h.usuario_id,
    u.nome AS usuario_nome,
    s.nome AS servico_nome,
    s.horas_minimas,
    s.valor_hora,
    c.nome AS cliente_nome,
    COALESCE(SUM(h.quantidade_horas), 0) AS horas_trabalhadas,
    COALESCE(SUM(h.total_horas), 0) AS valor_trabalhado,
    COALESCE(a.horas_abatidas, 0) AS horas_abatidas,
    COALESCE(a.valor_abatido, 0) AS valor_abatido,
    COALESCE(SUM(h.quantidade_horas), 0) - COALESCE(a.horas_abatidas, 0) AS saldo_horas,
    COALESCE(SUM(h.total_horas), 0) - COALESCE(a.valor_abatido, 0) AS saldo_valor
FROM servicos.horas_trabalhadas h
JOIN gestor.usuario u ON u.id = h.usuario_id
JOIN servicos.servico s ON s.id = h.servico_id
JOIN gestor.cliente c ON c.id = h.cliente_id
LEFT JOIN (
    SELECT usuario_id,
           SUM(quantidade_horas) AS horas_abatidas,
           SUM(valor) AS valor_abatido
    FROM servicos.horas_abatidas
    GROUP BY usuario_id
) a ON a.usuario_id = h.usuario_id
GROUP BY h.usuario_id, u.nome, s.nome, s.horas_minimas, s.valor_hora, c.nome,
         a.horas_abatidas, a.valor_abatido;
