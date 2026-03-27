INSERT INTO usuario (nome, login, senha, situacao)
VALUES ('Operador Financeiro', 'financeiro', 'fin2026', 'ATIVO')
ON CONFLICT (login)
DO UPDATE SET
  nome = EXCLUDED.nome,
  senha = EXCLUDED.senha,
  situacao = EXCLUDED.situacao;

INSERT INTO lancamento (descricao, data_lancamento, valor, tipo_lancamento, situacao)
SELECT 'Salário', DATE '2026-03-05', 5500.00, 'RECEITA', 'EFETIVADO'
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento
  WHERE descricao = 'Salário' AND data_lancamento = DATE '2026-03-05' AND valor = 5500.00 AND tipo_lancamento = 'RECEITA' AND situacao = 'EFETIVADO'
);
INSERT INTO lancamento (descricao, data_lancamento, valor, tipo_lancamento, situacao)
SELECT 'Aluguel', DATE '2026-03-08', 1800.00, 'DESPESA', 'EFETIVADO'
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento
  WHERE descricao = 'Aluguel' AND data_lancamento = DATE '2026-03-08' AND valor = 1800.00 AND tipo_lancamento = 'DESPESA' AND situacao = 'EFETIVADO'
);
INSERT INTO lancamento (descricao, data_lancamento, valor, tipo_lancamento, situacao)
SELECT 'Internet', DATE '2026-03-10', 120.90, 'DESPESA', 'EFETIVADO'
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento
  WHERE descricao = 'Internet' AND data_lancamento = DATE '2026-03-10' AND valor = 120.90 AND tipo_lancamento = 'DESPESA' AND situacao = 'EFETIVADO'
);
INSERT INTO lancamento (descricao, data_lancamento, valor, tipo_lancamento, situacao)
SELECT 'Academia', DATE '2026-03-11', 99.90, 'DESPESA', 'EFETIVADO'
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento
  WHERE descricao = 'Academia' AND data_lancamento = DATE '2026-03-11' AND valor = 99.90 AND tipo_lancamento = 'DESPESA' AND situacao = 'EFETIVADO'
);
INSERT INTO lancamento (descricao, data_lancamento, valor, tipo_lancamento, situacao)
SELECT 'Freelance', DATE '2026-03-12', 800.00, 'RECEITA', 'EFETIVADO'
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento
  WHERE descricao = 'Freelance' AND data_lancamento = DATE '2026-03-12' AND valor = 800.00 AND tipo_lancamento = 'RECEITA' AND situacao = 'EFETIVADO'
);
INSERT INTO lancamento (descricao, data_lancamento, valor, tipo_lancamento, situacao)
SELECT 'Supermercado', DATE '2026-03-14', 356.42, 'DESPESA', 'EFETIVADO'
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento
  WHERE descricao = 'Supermercado' AND data_lancamento = DATE '2026-03-14' AND valor = 356.42 AND tipo_lancamento = 'DESPESA' AND situacao = 'EFETIVADO'
);
INSERT INTO lancamento (descricao, data_lancamento, valor, tipo_lancamento, situacao)
SELECT 'Energia', DATE '2026-03-15', 210.33, 'DESPESA', 'PENDENTE'
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento
  WHERE descricao = 'Energia' AND data_lancamento = DATE '2026-03-15' AND valor = 210.33 AND tipo_lancamento = 'DESPESA' AND situacao = 'PENDENTE'
);
INSERT INTO lancamento (descricao, data_lancamento, valor, tipo_lancamento, situacao)
SELECT 'Água', DATE '2026-03-16', 89.70, 'DESPESA', 'PENDENTE'
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento
  WHERE descricao = 'Água' AND data_lancamento = DATE '2026-03-16' AND valor = 89.70 AND tipo_lancamento = 'DESPESA' AND situacao = 'PENDENTE'
);
INSERT INTO lancamento (descricao, data_lancamento, valor, tipo_lancamento, situacao)
SELECT 'Venda (OLX)', DATE '2026-03-18', 250.00, 'RECEITA', 'EFETIVADO'
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento
  WHERE descricao = 'Venda (OLX)' AND data_lancamento = DATE '2026-03-18' AND valor = 250.00 AND tipo_lancamento = 'RECEITA' AND situacao = 'EFETIVADO'
);
INSERT INTO lancamento (descricao, data_lancamento, valor, tipo_lancamento, situacao)
SELECT 'Consulta médica', DATE '2026-03-20', 180.00, 'DESPESA', 'CANCELADO'
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento
  WHERE descricao = 'Consulta médica' AND data_lancamento = DATE '2026-03-20' AND valor = 180.00 AND tipo_lancamento = 'DESPESA' AND situacao = 'CANCELADO'
);

