-- ============================================================
-- Relatorio IA - formulario + vinculo com TODOS os modulos
-- Executar em bancos JA existentes (em bancos novos o
-- ddl_gestor_v2.sql ja cria o formulario automaticamente).
-- Idempotente: pode rodar mais de uma vez.
-- ============================================================

-- 1. Formulario (aparece na tela de Formularios)
INSERT INTO formulario (nome)
SELECT 'Relatorio IA'
WHERE NOT EXISTS (SELECT 1 FROM formulario WHERE nome = 'Relatorio IA');

-- 2. Vincula o formulario a TODOS os modulos (GERAL, GESTOR, HORAS, PRODUCAO...)
--    abertura = 99 deixa o item por ultimo na ordem do menu.
INSERT INTO modulo_formulario (modulo_id, formulario_id, abertura)
SELECT m.id, f.id, 99
FROM modulo m
CROSS JOIN formulario f
WHERE f.nome = 'Relatorio IA'
  AND NOT EXISTS (
    SELECT 1 FROM modulo_formulario mf
    WHERE mf.modulo_id = m.id AND mf.formulario_id = f.id
  );

-- 3. (Opcional) Liberar o formulario para todos os usuarios que ja possuem
--    acesso irrestrito nao precisa disto; para usuarios restritos, vincule
--    na tela "Usuario x Formulario" depois de rodar este script.
