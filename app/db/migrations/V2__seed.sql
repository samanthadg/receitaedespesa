INSERT INTO usuario (nome, login, senha, situacao)
VALUES ('Administrador', 'admin', '123456', 'ATIVO')
ON CONFLICT (login) DO NOTHING;

INSERT INTO lancamento (descricao, data_lancamento, valor, tipo_lancamento, situacao) VALUES
('Salário', '2026-03-05', 5500.00, 'RECEITA', 'EFETIVADO'),
('Aluguel', '2026-03-08', 1800.00, 'DESPESA', 'EFETIVADO'),
('Internet', '2026-03-10', 120.90, 'DESPESA', 'EFETIVADO'),
('Academia', '2026-03-11', 99.90, 'DESPESA', 'EFETIVADO'),
('Freelance', '2026-03-12', 800.00, 'RECEITA', 'EFETIVADO'),
('Supermercado', '2026-03-14', 356.42, 'DESPESA', 'EFETIVADO'),
('Energia', '2026-03-15', 210.33, 'DESPESA', 'PENDENTE'),
('Água', '2026-03-16', 89.70, 'DESPESA', 'PENDENTE'),
('Venda (OLX)', '2026-03-18', 250.00, 'RECEITA', 'EFETIVADO'),
('Consulta médica', '2026-03-20', 180.00, 'DESPESA', 'CANCELADO');
