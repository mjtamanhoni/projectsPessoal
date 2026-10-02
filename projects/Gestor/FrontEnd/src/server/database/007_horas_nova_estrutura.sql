-- =============================================================================
-- Migracao 007: Nova Estrutura de Horas (Lancamentos E/S)
-- =============================================================================
-- Baseada na tabela lanc_horas_trabalhadas (tipo_lancamento = 'E' entrada, 'S' saida)
-- Substitui a logica de hora_inicio/hora_termino por pares de lancamentos.
--
-- Estrutura criada:
--   1. vw_horas_trabalhadas      (VIEW)  - Horas calculadas a partir dos pares E/S
--   2. horas_abatidas            (TABLE) - Abatimentos de horas (banco de horas)
--   3. vw_horas_saldo_diario     (VIEW)  - Saldo diario por usuario/cliente/servico
--   4. vw_horas_saldo_mensal     (VIEW)  - Saldo mensal com abatimentos
--   5. horas_saldo_geral         (TABLE) - Saldo geral acumulado (carregado mes a mes)
--   6. horas_excedidas           (TABLE) - Horas excedentes por mes/ano
-- =============================================================================

-- =============================================================================
-- 1. VIEW: vw_horas_trabalhadas
--    Calcula as horas trabalhadas a partir dos pares E (entrada) e S (saida)
--    de lanc_horas_trabalhadas.
-- =============================================================================
DROP VIEW IF EXISTS public.vw_horas_trabalhadas CASCADE;

CREATE OR REPLACE VIEW public.vw_horas_trabalhadas AS
WITH lancamentos_com grupos AS (
    SELECT
        l.empresa_id,
        l.usuario_id,
        l.cliente_id,
        l.servico_id,
        l.data_servico,
        l.hora_lancamento,
        l.tipo_lancamento,
        l.valor_hora,
        l.observacoes,
        l.status,
        l.created_at,
        -- Assign a group number: increments each time tipo_lancamento = 'E'
        SUM(CASE WHEN l.tipo_lancamento = 'E' THEN 1 ELSE 0 END)
            OVER (
                PARTITION BY l.empresa_id, l.usuario_id, l.cliente_id, l.servico_id, l.data_servico
                ORDER BY l.hora_lancamento
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS grupo
    FROM public.lanc_horas_trabalhadas l
    WHERE l.status = 1
),
pares AS (
    SELECT
        e.empresa_id,
        e.usuario_id,
        e.cliente_id,
        e.servico_id,
        e.data_servico,
        e.hora_lancamento AS hora_entrada,
        s.hora_lancamento AS hora_saida,
        e.valor_hora,
        e.observacoes,
        e.grupo,
        -- Calculo das horas trabalhadas em decimais
        EXTRACT(EPOCH FROM (s.hora_lancamento - e.hora_lancamento)) / 3600.0 AS quantidade_horas,
        -- Valor total = horas * valor_hora
        (EXTRACT(EPOCH FROM (s.hora_lancamento - e.hora_lancamento)) / 3600.0) * e.valor_hora AS total_horas
    FROM lancamentos_com_grupo e
    JOIN lancamentos_com_grupo s
        ON  s.empresa_id = e.empresa_id
        AND s.usuario_id = e.usuario_id
        AND s.cliente_id = e.cliente_id
        AND s.servico_id = e.servico_id
        AND s.data_servico = e.data_servico
        AND s.tipo_lancamento = 'S'
        AND s.grupo = e.grupo
    WHERE e.tipo_lancamento = 'E'
)
SELECT
    p.empresa_id,
    ROW_NUMBER() OVER (
        PARTITION BY p.empresa_id
        ORDER BY p.data_servico, p.hora_entrada, p.usuario_id, p.cliente_id, p.servico_id
    )::INTEGER AS id,
    p.usuario_id,
    u.nome AS usuario_nome,
    p.cliente_id,
    c.nome AS cliente_nome,
    p.servico_id,
    sv.nome AS servico_nome,
    p.valor_hora,
    p.data_servico,
    p.hora_entrada,
    p.hora_saida,
    ROUND(p.quantidade_horas::NUMERIC, 5) AS quantidade_horas,
    ROUND(p.total_horas::NUMERIC, 2) AS total_horas,
    p.observacoes,
    1 AS status,
    p.created_at
FROM pares p
LEFT JOIN public.usuario u ON u.empresa_id = p.empresa_id AND u.id = p.usuario_id
LEFT JOIN public.cliente c ON c.empresa_id = p.empresa_id AND c.id = p.cliente_id
LEFT JOIN public.servico sv ON sv.empresa_id = p.empresa_id AND sv.id = p.servico_id;

COMMENT ON VIEW public.vw_horas_trabalhadas IS 'Horas trabalhadas calculadas a partir dos pares E/S de lanc_horas_trabalhadas';


-- =============================================================================
-- 2. TABELA: horas_abatidas
--    Mantida a estrutura existente - registros de abatimento de horas.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.horas_abatidas (
    empresa_id          INTEGER NOT NULL,
    id                  INTEGER NOT NULL,
    usuario_id          INTEGER NOT NULL,
    cliente_id          INTEGER NOT NULL,
    servico_id          INTEGER NOT NULL,
    data_abatimento     DATE NOT NULL DEFAULT CURRENT_DATE,
    valor               NUMERIC(10, 2) NOT NULL,
    valor_hora          NUMERIC(10, 2) NOT NULL,
    quantidade_horas    NUMERIC(7, 2) NOT NULL,
    observacoes         TEXT,
    usuario_cadastro    INTEGER,
    status              SMALLINT NOT NULL DEFAULT 1,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by          INTEGER,

    CONSTRAINT horas_abatidas_pk PRIMARY KEY (empresa_id, id),
    CONSTRAINT fk_ha_empresa FOREIGN KEY (empresa_id) REFERENCES public.empresa(id),
    CONSTRAINT fk_ha_usuario FOREIGN KEY (empresa_id, usuario_id) REFERENCES public.usuario(empresa_id, id),
    CONSTRAINT fk_ha_cliente FOREIGN KEY (empresa_id, cliente_id) REFERENCES public.cliente(empresa_id, id),
    CONSTRAINT fk_ha_servico FOREIGN KEY (empresa_id, servico_id) REFERENCES public.servico(empresa_id, id)
);

COMMENT ON TABLE public.horas_abatidas IS 'Registro de abatimento de horas (consumo do banco de horas)';

-- Sequencia para horas_abatidas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'horas_abatidas_id_seq') THEN
        CREATE SEQUENCE public.horas_abatidas_id_seq
            AS INTEGER START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
        ALTER TABLE public.horas_abatidas ALTER COLUMN id SET DEFAULT nextval('public.horas_abatidas_id_seq');
    END IF;
END $$;


-- =============================================================================
-- 3. VIEW: vw_horas_saldo_diario
--    Saldo diario de horas por usuario/cliente/servico.
--    Calcula: total trabalhado - total abatido no dia.
-- =============================================================================
DROP VIEW IF EXISTS public.vw_horas_saldo_diario CASCADE;

CREATE OR REPLACE VIEW public.vw_horas_saldo_diario AS
SELECT
    ht.empresa_id,
    ht.usuario_id,
    ht.usuario_nome,
    ht.cliente_id,
    ht.cliente_nome,
    ht.servico_id,
    ht.servico_nome,
    ht.data_servico,
    ROUND(SUM(ht.quantidade_horas)::NUMERIC, 5) AS horas_trabalhadas,
    ROUND(SUM(ht.total_horas)::NUMERIC, 2) AS valor_trabalhado,
    ROUND(COALESCE(ab.horas_abatidas, 0)::NUMERIC, 5) AS horas_abatidas,
    ROUND(COALESCE(ab.valor_abatido, 0)::NUMERIC, 2) AS valor_abatido,
    ROUND((SUM(ht.quantidade_horas) - COALESCE(ab.horas_abatidas, 0))::NUMERIC, 5) AS saldo_horas,
    ROUND((SUM(ht.total_horas) - COALESCE(ab.valor_abatido, 0))::NUMERIC, 2) AS saldo_valor
FROM public.vw_horas_trabalhadas ht
LEFT JOIN (
    SELECT
        empresa_id,
        usuario_id,
        data_abatimento,
        SUM(quantidade_horas) AS horas_abatidas,
        SUM(valor) AS valor_abatido
    FROM public.horas_abatidas
    WHERE status = 1
    GROUP BY empresa_id, usuario_id, data_abatimento
) ab ON  ab.empresa_id = ht.empresa_id
     AND ab.usuario_id = ht.usuario_id
     AND ab.data_abatimento = ht.data_servico
WHERE ht.status = 1
GROUP BY
    ht.empresa_id, ht.usuario_id, ht.usuario_nome,
    ht.cliente_id, ht.cliente_nome,
    ht.servico_id, ht.servico_nome,
    ht.data_servico,
    ab.horas_abatidas, ab.valor_abatido;

COMMENT ON VIEW public.vw_horas_saldo_diario IS 'Saldo diario de horas trabalhadas vs abatidas por usuario/cliente/servico';


-- =============================================================================
-- 4. VIEW: vw_horas_saldo_mensal
--    Saldo mensal de horas por usuario.
--    Acumula todas as horas do mes e subtrai os abatimentos do mes.
-- =============================================================================
DROP VIEW IF EXISTS public.vw_horas_saldo_mensal CASCADE;

CREATE OR REPLACE VIEW public.vw_horas_saldo_mensal AS
SELECT
    ht.empresa_id,
    ht.usuario_id,
    ht.usuario_nome,
    EXTRACT(MONTH FROM ht.data_servico)::INTEGER AS mes,
    EXTRACT(YEAR FROM ht.data_servico)::INTEGER AS ano,
    ROUND(SUM(ht.quantidade_horas)::NUMERIC, 5) AS horas_trabalhadas,
    ROUND(SUM(ht.total_horas)::NUMERIC, 2) AS valor_trabalhado,
    ROUND(COALESCE(ab.horas_abatidas, 0)::NUMERIC, 5) AS horas_abatidas,
    ROUND(COALESCE(ab.valor_abatido, 0)::NUMERIC, 2) AS valor_abatido,
    ROUND((SUM(ht.quantidade_horas) - COALESCE(ab.horas_abatidas, 0))::NUMERIC, 5) AS saldo_horas,
    ROUND((SUM(ht.total_horas) - COALESCE(ab.valor_abatido, 0))::NUMERIC, 2) AS saldo_valor,
    -- Acumulado de meses anteriores (carrega automaticamente)
    ROUND(COALESCE(
        (SELECT SUM(ht2.total_horas)
         FROM public.vw_horas_trabalhadas ht2
         WHERE ht2.empresa_id = ht.empresa_id
           AND ht2.usuario_id = ht.usuario_id
           AND ht2.status = 1
           AND (
               EXTRACT(YEAR FROM ht2.data_servico) < ht.data_servico
               OR (
                   EXTRACT(YEAR FROM ht2.data_servico) = EXTRACT(YEAR FROM ht.data_servico)
                   AND EXTRACT(MONTH FROM ht2.data_servico) < EXTRACT(MONTH FROM ht.data_servico)
               )
           )
        ), 0
    )::NUMERIC, 2) AS valor_acumulado_anterior,
    -- Saldo acumulado geral = valor_trabalhado_ate_mes - valor_abatido_ate_mes
    ROUND(COALESCE(
        (SELECT SUM(ht2.total_horas)
         FROM public.vw_horas_trabalhadas ht2
         WHERE ht2.empresa_id = ht.empresa_id
           AND ht2.usuario_id = ht.usuario_id
           AND ht2.status = 1
           AND (
               EXTRACT(YEAR FROM ht2.data_servico) < ht.data_servico
               OR (
                   EXTRACT(YEAR FROM ht2.data_servico) = EXTRACT(YEAR FROM ht.data_servico)
                   AND EXTRACT(MONTH FROM ht2.data_servico) <= EXTRACT(MONTH FROM ht.data_servico)
               )
           )
        ), 0
    )::NUMERIC, 2)
    - COALESCE(
        (SELECT SUM(ha2.valor)
         FROM public.horas_abatidas ha2
         WHERE ha2.empresa_id = ht.empresa_id
           AND ha2.usuario_id = ht.usuario_id
           AND ha2.status = 1
           AND (
               EXTRACT(YEAR FROM ha2.data_abatimento) < ht.data_servico
               OR (
                   EXTRACT(YEAR FROM ha2.data_abatimento) = EXTRACT(YEAR FROM ht.data_servico)
                   AND EXTRACT(MONTH FROM ha2.data_abatimento) <= EXTRACT(MONTH FROM ht.data_servico)
               )
           )
        ), 0
    )::NUMERIC, 2) AS saldo_acumulado_geral
FROM public.vw_horas_trabalhadas ht
LEFT JOIN (
    SELECT
        empresa_id,
        usuario_id,
        EXTRACT(MONTH FROM data_abatimento)::INTEGER AS mes,
        EXTRACT(YEAR FROM data_abatimento)::INTEGER AS ano,
        SUM(quantidade_horas) AS horas_abatidas,
        SUM(valor) AS valor_abatido
    FROM public.horas_abatidas
    WHERE status = 1
    GROUP BY empresa_id, usuario_id, EXTRACT(MONTH FROM data_abatimento), EXTRACT(YEAR FROM data_abatimento)
) ab ON  ab.empresa_id = ht.empresa_id
     AND ab.usuario_id = ht.usuario_id
     AND ab.mes = EXTRACT(MONTH FROM ht.data_servico)
     AND ab.ano = EXTRACT(YEAR FROM ht.data_servico)
WHERE ht.status = 1
GROUP BY
    ht.empresa_id, ht.usuario_id, ht.usuario_nome,
    EXTRACT(MONTH FROM ht.data_servico),
    EXTRACT(YEAR FROM ht.data_servico),
    ht.data_servico,
    ab.horas_abatidas, ab.valor_abatido;

COMMENT ON VIEW public.vw_horas_saldo_mensal IS 'Saldo mensal de horas com acumulado de meses anteriores';


-- =============================================================================
-- 5. TABELA: horas_saldo_geral
--    Armazena o saldo geral acumulado por usuario, carregado mes a mes.
--    Usado para carry-forward eficiente (evita subqueries correlacionadas).
--    Atualizado por funcao/trigger apos fechamento mensal.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.horas_saldo_geral (
    empresa_id          INTEGER NOT NULL,
    id                  INTEGER NOT NULL,
    usuario_id          INTEGER NOT NULL,
    mes_referencia      INTEGER NOT NULL,  -- 1-12
    ano_referencia      INTEGER NOT NULL,
    horas_trabalhadas   NUMERIC(10, 5) NOT NULL DEFAULT 0,
    valor_trabalhado    NUMERIC(10, 2) NOT NULL DEFAULT 0,
    horas_abatidas      NUMERIC(10, 5) NOT NULL DEFAULT 0,
    valor_abatido       NUMERIC(10, 2) NOT NULL DEFAULT 0,
    saldo_horas         NUMERIC(10, 5) NOT NULL DEFAULT 0,
    saldo_valor         NUMERIC(10, 2) NOT NULL DEFAULT 0,
    saldo_anterior_horas NUMERIC(10, 5) NOT NULL DEFAULT 0,
    saldo_anterior_valor NUMERIC(10, 2) NOT NULL DEFAULT 0,
    saldo_final_horas   NUMERIC(10, 5) NOT NULL DEFAULT 0,
    saldo_final_valor   NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status              SMALLINT NOT NULL DEFAULT 1,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT horas_saldo_geral_pk PRIMARY KEY (empresa_id, id),
    CONSTRAINT horas_saldo_geral_unique UNIQUE (empresa_id, usuario_id, mes_referencia, ano_referencia),
    CONSTRAINT fk_hsg_empresa FOREIGN KEY (empresa_id) REFERENCES public.empresa(id),
    CONSTRAINT fk_hsg_usuario FOREIGN KEY (empresa_id, usuario_id) REFERENCES public.usuario(empresa_id, id)
);

COMMENT ON TABLE public.horas_saldo_geral IS 'Saldo geral acumulado de horas por usuario/mes (carry-forward)';

-- Sequencia para horas_saldo_geral
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'horas_saldo_geral_id_seq') THEN
        CREATE SEQUENCE public.horas_saldo_geral_id_seq
            AS INTEGER START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
        ALTER TABLE public.horas_saldo_geral ALTER COLUMN id SET DEFAULT nextval('public.horas_saldo_geral_id_seq');
    END IF;
END $$;


-- =============================================================================
-- 6. TABELA: horas_excedidas
--    Mantida a estrutura existente - horas excedentes por mes/ano.
--    Pode ser populada pela funcao de fechamento mensal.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.horas_excedidas (
    empresa_id          INTEGER NOT NULL,
    id                  INTEGER NOT NULL,
    usuario_id          INTEGER NOT NULL,
    cliente_id          INTEGER NOT NULL,
    servico_id          INTEGER NOT NULL,
    mes_origem          INTEGER NOT NULL,
    ano_origem          INTEGER NOT NULL,
    delta_horas         NUMERIC(10, 2) NOT NULL,
    data_criacao        DATE NOT NULL DEFAULT CURRENT_DATE,
    usuario_cadastro    INTEGER,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT horas_excedidas_pk PRIMARY KEY (empresa_id, id),
    CONSTRAINT horas_excedidas_unique UNIQUE (empresa_id, usuario_id, cliente_id, servico_id, mes_origem, ano_origem),
    CONSTRAINT fk_he_empresa FOREIGN KEY (empresa_id) REFERENCES public.empresa(id),
    CONSTRAINT fk_he_usuario FOREIGN KEY (empresa_id, usuario_id) REFERENCES public.usuario(empresa_id, id),
    CONSTRAINT fk_he_cliente FOREIGN KEY (empresa_id, cliente_id) REFERENCES public.cliente(empresa_id, id),
    CONSTRAINT fk_he_servico FOREIGN KEY (empresa_id, servico_id) REFERENCES public.servico(empresa_id, id)
);

COMMENT ON TABLE public.horas_excedidas IS 'Controle de horas excedentes por usuario/cliente/servico/mes/ano';

-- Sequencia para horas_excedidas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'horas_excedidas_id_seq') THEN
        CREATE SEQUENCE public.horas_excedidas_id_seq
            AS INTEGER START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
        ALTER TABLE public.horas_excedidas ALTER COLUMN id SET DEFAULT nextval('public.horas_excedidas_id_seq');
    END IF;
END $$;


-- =============================================================================
-- FUNCAO: fn_horas_fechar_mes
--    Fecha o mes de horas de um usuario, calculando:
--    - Saldo do mes (trabalhado - abatido)
--    - Carry-forward para o proximo mes
--    - Horas excedentes (se houver)
--
--    Parametros:
--      p_empresa_id  - ID da empresa
--      p_usuario_id  - ID do usuario
--      p_mes         - Mes a fechar (1-12)
--      p_ano         - Ano a fechar
--
--    Retorna: JSON com o resultado do fechamento
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fn_horas_fechar_mes(
    p_empresa_id INTEGER,
    p_usuario_id INTEGER,
    p_mes INTEGER,
    p_ano INTEGER
) RETURNS JSON AS $$
DECLARE
    v_horas_trabalhadas NUMERIC(10,5) := 0;
    v_valor_trabalhado  NUMERIC(10,2) := 0;
    v_horas_abatidas    NUMERIC(10,5) := 0;
    v_valor_abatido     NUMERIC(10,2) := 0;
    v_saldo_anterior_h  NUMERIC(10,5) := 0;
    v_saldo_anterior_v  NUMERIC(10,2) := 0;
    v_saldo_final_h     NUMERIC(10,5) := 0;
    v_saldo_final_v     NUMERIC(10,2) := 0;
    v_saldo_geral_h     NUMERIC(10,5) := 0;
    v_saldo_geral_v     NUMERIC(10,2) := 0;
    v_delta_horas       NUMERIC(10,2) := 0;
    v_prox_mes          INTEGER;
    v_prox_ano          INTEGER;
    v_saldo_id          INTEGER;
BEGIN
    -- Calcular proximo mes
    IF p_mes = 12 THEN
        v_prox_mes := 1;
        v_prox_ano := p_ano + 1;
    ELSE
        v_prox_mes := p_mes + 1;
        v_prox_ano := p_ano;
    END IF;

    -- Buscar horas trabalhadas do mes
    SELECT
        COALESCE(SUM(ht.quantidade_horas), 0),
        COALESCE(SUM(ht.total_horas), 0)
    INTO v_horas_trabalhadas, v_valor_trabalhado
    FROM public.vw_horas_trabalhadas ht
    WHERE ht.empresa_id = p_empresa_id
      AND ht.usuario_id = p_usuario_id
      AND ht.status = 1
      AND EXTRACT(MONTH FROM ht.data_servico) = p_mes
      AND EXTRACT(YEAR FROM ht.data_servico) = p_ano;

    -- Buscar abatimentos do mes
    SELECT
        COALESCE(SUM(quantidade_horas), 0),
        COALESCE(SUM(valor), 0)
    INTO v_horas_abatidas, v_valor_abatido
    FROM public.horas_abatidas
    WHERE empresa_id = p_empresa_id
      AND usuario_id = p_usuario_id
      AND status = 1
      AND EXTRACT(MONTH FROM data_abatimento) = p_mes
      AND EXTRACT(YEAR FROM data_abatimento) = p_ano;

    -- Buscar saldo anterior (mes anterior)
    SELECT
        COALESCE(saldo_final_horas, 0),
        COALESCE(saldo_final_valor, 0)
    INTO v_saldo_anterior_h, v_saldo_anterior_v
    FROM public.horas_saldo_geral
    WHERE empresa_id = p_empresa_id
      AND usuario_id = p_usuario_id
      AND (
          (ano_referencia = p_ano AND mes_referencia < p_mes)
          OR (ano_referencia < p_ano)
      )
    ORDER BY ano_referencia DESC, mes_referencia DESC
    LIMIT 1;

    -- Calcular saldo final do mes
    v_saldo_final_h := v_saldo_anterior_h + v_horas_trabalhadas - v_horas_abatidas;
    v_saldo_final_v := v_saldo_anterior_v + v_valor_trabalhado - v_valor_abatido;

    -- Saldo geral acumulado (ate o mes atual)
    v_saldo_geral_h := v_saldo_final_h;
    v_saldo_geral_v := v_saldo_final_v;

    -- UPSERT no horas_saldo_geral
    INSERT INTO public.horas_saldo_geral (
        empresa_id, usuario_id, mes_referencia, ano_referencia,
        horas_trabalhadas, valor_trabalhado,
        horas_abatidas, valor_abatido,
        saldo_horas, saldo_valor,
        saldo_anterior_horas, saldo_anterior_valor,
        saldo_final_horas, saldo_final_valor
    ) VALUES (
        p_empresa_id, p_usuario_id, p_mes, p_ano,
        v_horas_trabalhadas, v_valor_trabalhado,
        v_horas_abatidas, v_valor_abatido,
        v_horas_trabalhadas - v_horas_abatidas, v_valor_trabalhado - v_valor_abatido,
        v_saldo_anterior_h, v_saldo_anterior_v,
        v_saldo_final_h, v_saldo_final_v
    )
    ON CONFLICT (empresa_id, usuario_id, mes_referencia, ano_referencia)
    DO UPDATE SET
        horas_trabalhadas = EXCLUDED.horas_trabalhadas,
        valor_trabalhado = EXCLUDED.valor_trabalhado,
        horas_abatidas = EXCLUDED.horas_abatidas,
        valor_abatido = EXCLUDED.valor_abatido,
        saldo_horas = EXCLUDED.saldo_horas,
        saldo_valor = EXCLUDED.saldo_valor,
        saldo_anterior_horas = EXCLUDED.saldo_anterior_horas,
        saldo_anterior_valor = EXCLUDED.saldo_anterior_valor,
        saldo_final_horas = EXCLUDED.saldo_final_horas,
        saldo_final_valor = EXCLUDED.saldo_final_valor,
        updated_at = NOW();

    -- Se o saldo ficou negativo, registrar como horas excedidas
    IF v_saldo_final_h < 0 THEN
        v_delta_horas := ABS(v_saldo_final_h);

        INSERT INTO public.horas_excedidas (
            empresa_id, usuario_id, cliente_id, servico_id,
            mes_origem, ano_origem, delta_horas
        )
        SELECT
            p_empresa_id,
            p_usuario_id,
            ht.cliente_id,
            ht.servico_id,
            p_mes,
            p_ano,
            ROUND((v_delta_horas * (SUM(ht.quantidade_horas) / NULLIF(v_horas_trabalhadas, 0)))::NUMERIC, 2)
        FROM public.vw_horas_trabalhadas ht
        WHERE ht.empresa_id = p_empresa_id
          AND ht.usuario_id = p_usuario_id
          AND ht.status = 1
          AND EXTRACT(MONTH FROM ht.data_servico) = p_mes
          AND EXTRACT(YEAR FROM ht.data_servico) = p_ano
        GROUP BY ht.cliente_id, ht.servico_id
        ON CONFLICT (empresa_id, usuario_id, cliente_id, servico_id, mes_origem, ano_origem)
        DO UPDATE SET
            delta_horas = EXCLUDED.delta_horas,
            data_criacao = CURRENT_DATE;
    END IF;

    -- Preparar carry-forward para o proximo mes
    -- O saldo final deste mes sera o saldo anterior do proximo
    -- (ja sera calculado automaticamente quando fn_horas_fechar_mes for chamado para o proximo mes)

    -- Retornar resultado
    RETURN json_build_object(
        'empresa_id', p_empresa_id,
        'usuario_id', p_usuario_id,
        'mes', p_mes,
        'ano', p_ano,
        'horas_trabalhadas', v_horas_trabalhadas,
        'valor_trabalhado', v_valor_trabalhado,
        'horas_abatidas', v_horas_abatidas,
        'valor_abatido', v_valor_abatido,
        'saldo_anterior_horas', v_saldo_anterior_h,
        'saldo_anterior_valor', v_saldo_anterior_v,
        'saldo_final_horas', v_saldo_final_h,
        'saldo_final_valor', v_saldo_final_v,
        'horas_excedentes', CASE WHEN v_saldo_final_h < 0 THEN ABS(v_saldo_final_h) ELSE 0 END
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.fn_horas_fechar_mes(INTEGER, INTEGER, INTEGER, INTEGER) IS
    'Fecha o mes de horas de um usuario, calculando saldo e carry-forward';


-- =============================================================================
-- FUNCAO: fn_horas_calcular_saldo_atual
--    Calcula o saldo atual de horas de um usuario sem persistir.
--    Util para consultas rapidas no dashboard.
--
--    Parametros:
--      p_empresa_id  - ID da empresa
--      p_usuario_id  - ID do usuario
--
--    Retorna: JSON com o saldo atual
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fn_horas_calcular_saldo_atual(
    p_empresa_id INTEGER,
    p_usuario_id INTEGER
) RETURNS JSON AS $$
DECLARE
    v_horas_trabalhadas NUMERIC(10,5) := 0;
    v_valor_trabalhado  NUMERIC(10,2) := 0;
    v_horas_abatidas    NUMERIC(10,5) := 0;
    v_valor_abatido     NUMERIC(10,2) := 0;
    v_saldo_horas       NUMERIC(10,5) := 0;
    v_saldo_valor       NUMERIC(10,2) := 0;
BEGIN
    -- Total trabalhado (todos os meses)
    SELECT
        COALESCE(SUM(ht.quantidade_horas), 0),
        COALESCE(SUM(ht.total_horas), 0)
    INTO v_horas_trabalhadas, v_valor_trabalhado
    FROM public.vw_horas_trabalhadas ht
    WHERE ht.empresa_id = p_empresa_id
      AND ht.usuario_id = p_usuario_id
      AND ht.status = 1;

    -- Total abatido (todos os meses)
    SELECT
        COALESCE(SUM(quantidade_horas), 0),
        COALESCE(SUM(valor), 0)
    INTO v_horas_abatidas, v_valor_abatido
    FROM public.horas_abatidas
    WHERE empresa_id = p_empresa_id
      AND usuario_id = p_usuario_id
      AND status = 1;

    -- Saldo
    v_saldo_horas := v_horas_trabalhadas - v_horas_abatidas;
    v_saldo_valor := v_valor_trabalhado - v_valor_abatido;

    RETURN json_build_object(
        'empresa_id', p_empresa_id,
        'usuario_id', p_usuario_id,
        'horas_trabalhadas', ROUND(v_horas_trabalhadas, 5),
        'valor_trabalhado', ROUND(v_valor_trabalhado, 2),
        'horas_abatidas', ROUND(v_horas_abatidas, 5),
        'valor_abatido', ROUND(v_valor_abatido, 2),
        'saldo_horas', ROUND(v_saldo_horas, 5),
        'saldo_valor', ROUND(v_saldo_valor, 2)
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.fn_horas_calcular_saldo_atual(INTEGER, INTEGER) IS
    'Calcula o saldo atual de horas de um usuario (sem persistir)';


-- =============================================================================
-- FUNCAO: fn_horas_listar_saldos
--    Lista os saldos de horas de todos os usuarios de uma empresa.
--    Util para o dashboard de horas.
--
--    Parametros:
--      p_empresa_id  - ID da empresa
--
--    Retorna: SETOF JSON com os saldos
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fn_horas_listar_saldos(
    p_empresa_id INTEGER
) RETURNS SETOF JSON AS $$
BEGIN
    RETURN QUERY
    SELECT json_build_object(
        'usuario_id', u.id,
        'usuario_nome', u.nome,
        'horas_trabalhadas', ROUND(COALESCE(ht.total_horas, 0)::NUMERIC, 5),
        'valor_trabalhado', ROUND(COALESCE(ht.total_valor, 0)::NUMERIC, 2),
        'horas_abatidas', ROUND(COALESCE(ab.total_horas, 0)::NUMERIC, 5),
        'valor_abatido', ROUND(COALESCE(ab.total_valor, 0)::NUMERIC, 2),
        'saldo_horas', ROUND(COALESCE(ht.total_horas, 0) - COALESCE(ab.total_horas, 0), 5),
        'saldo_valor', ROUND(COALESCE(ht.total_valor, 0) - COALESCE(ab.total_valor, 0), 2)
    )
    FROM public.usuario u
    LEFT JOIN (
        SELECT usuario_id,
               SUM(quantidade_horas) AS total_horas,
               SUM(total_horas) AS total_valor
        FROM public.vw_horas_trabalhadas
        WHERE empresa_id = p_empresa_id AND status = 1
        GROUP BY usuario_id
    ) ht ON ht.usuario_id = u.id
    LEFT JOIN (
        SELECT usuario_id,
               SUM(quantidade_horas) AS total_horas,
               SUM(valor) AS total_valor
        FROM public.horas_abatidas
        WHERE empresa_id = p_empresa_id AND status = 1
        GROUP BY usuario_id
    ) ab ON ab.usuario_id = u.id
    WHERE u.empresa_id = p_empresa_id
      AND u.status = 1
    ORDER BY u.nome;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.fn_horas_listar_saldos(INTEGER) IS
    'Lista os saldos de horas de todos os usuarios de uma empresa';


-- =============================================================================
-- TRIGGER: fn_horas_atualizar_saldo_geral
--    Atualiza automaticamente o horas_saldo_geral quando um registro
--    e inserido, atualizado ou removido em lanc_horas_trabalhadas.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fn_horas_trigger_atualizar_saldo() RETURNS TRIGGER AS $$
DECLARE
    v_empresa_id INTEGER;
    v_usuario_id INTEGER;
    v_mes INTEGER;
    v_ano INTEGER;
BEGIN
    -- Determinar empresa, usuario, mes e ano
    IF TG_OP = 'DELETE' THEN
        v_empresa_id := OLD.empresa_id;
        v_usuario_id := OLD.usuario_id;
        v_mes := EXTRACT(MONTH FROM OLD.data_servico)::INTEGER;
        v_ano := EXTRACT(YEAR FROM OLD.data_servico)::INTEGER;
    ELSE
        v_empresa_id := NEW.empresa_id;
        v_usuario_id := NEW.usuario_id;
        v_mes := EXTRACT(MONTH FROM NEW.data_servico)::INTEGER;
        v_ano := EXTRACT(YEAR FROM NEW.data_servico)::INTEGER;
    END IF;

    -- Chamar a funcao de fechamento para recalcular
    PERFORM public.fn_horas_fechar_mes(v_empresa_id, v_usuario_id, v_mes, v_ano);

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger em lanc_horas_trabalhadas
DROP TRIGGER IF EXISTS trg_horas_atualizar_saldo ON public.lanc_horas_trabalhadas;

CREATE TRIGGER trg_horas_atualizar_saldo
    AFTER INSERT OR UPDATE OR DELETE ON public.lanc_horas_trabalhadas
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_horas_trigger_atualizar_saldo();


-- =============================================================================
-- TRIGGER: fn_horas_trigger_atualizar_saldo_abatimento
--    Atualiza automaticamente o horas_saldo_geral quando um registro
--    e inserido, atualizado ou removido em horas_abatidas.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fn_horas_trigger_atualizar_saldo_abatimento() RETURNS TRIGGER AS $$
DECLARE
    v_empresa_id INTEGER;
    v_usuario_id INTEGER;
    v_mes INTEGER;
    v_ano INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_empresa_id := OLD.empresa_id;
        v_usuario_id := OLD.usuario_id;
        v_mes := EXTRACT(MONTH FROM OLD.data_abatimento)::INTEGER;
        v_ano := EXTRACT(YEAR FROM OLD.data_abatimento)::INTEGER;
    ELSE
        v_empresa_id := NEW.empresa_id;
        v_usuario_id := NEW.usuario_id;
        v_mes := EXTRACT(MONTH FROM NEW.data_abatimento)::INTEGER;
        v_ano := EXTRACT(YEAR FROM NEW.data_abatimento)::INTEGER;
    END IF;

    PERFORM public.fn_horas_fechar_mes(v_empresa_id, v_usuario_id, v_mes, v_ano);

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_horas_atualizar_saldo_abatimento ON public.horas_abatidas;

CREATE TRIGGER trg_horas_atualizar_saldo_abatimento
    AFTER INSERT OR UPDATE OR DELETE ON public.horas_abatidas
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_horas_trigger_atualizar_saldo_abatimento();


-- =============================================================================
-- VIEWS DE CONSULTA (DASHBOARD)
-- =============================================================================

-- View: Saldo geral por usuario (para dashboard)
CREATE OR REPLACE VIEW public.vw_horas_saldo_geral AS
SELECT
    hsg.empresa_id,
    hsg.usuario_id,
    u.nome AS usuario_nome,
    hsg.mes_referencia,
    hsg.ano_referencia,
    hsg.horas_trabalhadas,
    hsg.valor_trabalhado,
    hsg.horas_abatidas,
    hsg.valor_abatido,
    hsg.saldo_horas,
    hsg.saldo_valor,
    hsg.saldo_anterior_horas,
    hsg.saldo_anterior_valor,
    hsg.saldo_final_horas,
    hsg.saldo_final_valor,
    hsg.updated_at
FROM public.horas_saldo_geral hsg
LEFT JOIN public.usuario u ON u.empresa_id = hsg.empresa_id AND u.id = hsg.usuario_id
WHERE hsg.status = 1;

COMMENT ON VIEW public.vw_horas_saldo_geral IS 'Saldo geral de horas por usuario/mes (dados persistidos)';


-- View: Horas excedentes com detalhes
CREATE OR REPLACE VIEW public.vw_horas_excedentes AS
SELECT
    he.empresa_id,
    he.id,
    he.usuario_id,
    u.nome AS usuario_nome,
    he.cliente_id,
    c.nome AS cliente_nome,
    he.servico_id,
    s.nome AS servico_nome,
    he.mes_origem,
    he.ano_origem,
    he.delta_horas,
    he.data_criacao,
    he.created_at
FROM public.horas_excedidas he
LEFT JOIN public.usuario u ON u.empresa_id = he.empresa_id AND u.id = he.usuario_id
LEFT JOIN public.cliente c ON c.empresa_id = he.empresa_id AND c.id = he.cliente_id
LEFT JOIN public.servico s ON s.empresa_id = he.empresa_id AND s.id = he.servico_id;

COMMENT ON VIEW public.vw_horas_excedentes IS 'Horas excedentes com detalhes de usuario/cliente/servico';


-- =============================================================================
-- DADOS DE EXEMPLO (comentar em producao)
-- =============================================================================

-- Exemplo: Inserir lancamentos de entrada e saida para teste
-- INSERT INTO public.lanc_horas_trabalhadas (empresa_id, usuario_id, cliente_id, servico_id, valor_hora, data_servico, hora_lancamento, tipo_lancamento)
-- VALUES
--     (1, 1, 1, 1, 50.00, '2026-08-28', '08:00:00', 'E'),
--     (1, 1, 1, 1, 50.00, '2026-08-28', '12:00:00', 'S'),
--     (1, 1, 1, 1, 50.00, '2026-08-28', '13:00:00', 'E'),
--     (1, 1, 1, 1, 50.00, '2026-08-28', '17:00:00', 'S');


-- =============================================================================
-- FIM DA MIGRACAO 007
-- =============================================================================
