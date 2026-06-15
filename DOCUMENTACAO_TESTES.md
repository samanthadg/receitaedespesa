# Documentação Técnica dos Testes (Node.js & Jest)

Este documento detalha o conjunto de **20 testes unitários** desenvolvidos para a aplicação Lancamento em Node.js/JavaScript, utilizando a biblioteca **Jest** e **Supertest** para validações.

---

## 1. Estrutura dos Arquivos de Teste

Os testes estão unificados no arquivo `app/tests/app.test.js`. O ambiente de testes foi configurado para simular o banco de dados e os serviços externos por meio de stubs e mocks (evitando dependências externas).

---

## 2. Relação dos 20 Testes

### EnumDominioTest
1. **`tipoLancamento_receita_existeNoEnum`** — Valida que a constante `RECEITA` existe no objeto de constantes.
2. **`tipoLancamento_valorInvalido_lancaExcecao`** — Garante que valores inválidos no domínio disparam uma exceção correspondente.
3. **`situacao_efetivado_existeNoEnum`** — Confirma a presença das situações `EFETIVADO`, `PENDENTE` e `CANCELADO`.

### ValidationTest
4. **`lancamento_descricaoVazia_naoDeveSerValido`** — Garante que a descrição não pode ser em branco.
5. **`lancamento_valorNegativo_naoDeveSerValido`** — Impede que valores negativos sejam cadastrados.
6. **`lancamento_dataNula_naoDeveSerValido`** — Valida que a data do lançamento é obrigatória.
7. **`usuario_loginVazio_naoDeveSerValido`** — Impede a criação de usuários com login em branco.
8. **`usuario_emailAcimaDe160Chars_naoDeveSerValido`** — Impede e-mails com mais de 160 caracteres.

### BusinessRulesTest
9. **`lancamento_situacaoInvalida_lancaExcecao`** — Valida que passar uma situação inexistente retorna nulo ou dispara comportamento de erro de parse.
10. **`lancamento_valorZero_naoDeveSerValido`** — Impede o cadastro de lançamentos com valor igual a zero.
11. **`lancamento_tipoNulo_naoDeveSerValido`** — Exige a definição de tipo de lançamento (Receita/Despesa).

### LancamentoEmailServiceTest
12. **`emailService_criarLancamento_enviaEmail`** — Valida que o serviço chama a biblioteca de e-mails (`sendMail`) se o envio estiver habilitado.
13. **`emailService_mailDesabilitado_naoEnviaEmail`** — Garante que o e-mail não é enviado quando desabilitado na configuração.

### LancamentoPdfExporterTest
14. **`pdfExporter_gerarPdf_naoRetornaNulo`** — Testa a geração de PDF, garantindo que retorne um buffer com dados.

### LancamentoRepositoryStubTest
15. **`mapRow_converteCamposDoBanco`** — Testa o mapeamento de colunas do banco de dados (snake_case) para propriedades da aplicação (camelCase).

### LancamentoRepositoryJpaTest
16. **`repositorio_salvarEBuscar_lancamentoEncontrado`** — Testa o fluxo de persistência de lançamentos, garantindo que o salvamento retorne o objeto correto com o ID preenchido.
17. **`repositorio_listarPorSituacao_retornaApenasEfetivados`** — Valida a filtragem de lançamentos por situação (ex: EFETIVADO).
18. **`repositorio_contarLancamentos_retornaTotalCorreto`** — Testa o método de contagem (`count`) de lançamentos na tabela.

### AuthControllerTest
19. **`login_credenciaisValidas_redirecionaParaHome`** — Testa a rota de login via **Supertest**. Quando as credenciais são válidas, deve retornar redirecionamento (302) para `/lancamentos`.
20. **`login_credenciaisInvalidas_retornaMensagemDeErro`** — Garante que o controller renderize a página de login com mensagem de erro quando as credenciais forem inválidas.

---

## 3. Como Executar os Testes

Os testes são executados de forma isolada dentro do container de CI.

### Executar no Container (Recomendado)
Para rodar todos os testes unitários dentro de um container Docker isolado:
```bash
docker run --rm -v /opt/lancamento/app:/workspace -w /workspace node:20-alpine sh -c "npm install && npm test"
```

### Executar via Script
Você também pode usar o script de conveniência:
```bash
cd /opt/lancamento
./scripts/run-tests-all.sh
```
