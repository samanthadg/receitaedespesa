# Documentação dos testes automatizados

Pacote: `br.com.lancamento.testes` em `app/src/test/java/`.  
Total: **20** métodos de teste (JUnit 5), além da classe utilitária **`TestSummaryPrinter`** (não é teste: tem `main` e não é descoberta pelo Surefire como `@Test`).

---

## 1. Dependências e ferramentas

| Recurso | O que o código dos testes usa disso |
|--------|-------------------------------------|
| **`spring-boot-starter-test`** | JUnit 5 (`@Test`, asserções), Mockito (`mock`, `when`, `verify`), Spring Test: `MockMvc` para simular HTTP, `@WebMvcTest` / `@DataJpaTest` para subir só parte do Spring, `@MockBean` para trocar beans reais por mocks |
| **Bean Validation** (`jakarta.validation`) | `Validation.buildDefaultValidatorFactory().getValidator()` lê as mesmas anotações (`@NotBlank`, `@Positive`, etc.) das entidades **sem** subir o Spring |
| **`com.h2database:h2`** (escopo `test`) | O Spring injeta um DataSource H2 em memória quando roda `@DataJpaTest` — o teste grava e lê dados de verdade via JPA |
| **Maven Surefire** | Descobre classes `*Test`, executa métodos `@Test`, grava XML em `target/surefire-reports/` |

**`@Tag("...")` nas classes** — cada classe de teste leva uma tag (`auth`, `business`, `enum`, `mock`, `db`, `pdf`, `validation`). Scripts Maven podem rodar só um grupo (`-Dgroups=...` ou scripts do repositório).

---

## 2. Visão geral por arquivo

| Arquivo | Papel do código |
|---------|-----------------|
| `EnumDominioTest.java` | Garante que os **nomes** dos enums batem com o que o sistema espera (`RECEITA`, situações, etc.). |
| `ValidationTest.java` | Monta `Lancamento` / `Usuario` **inválidos** e pede ao `Validator` para listar erros; exige que a lista **não** fique vazia. |
| `BusinessRulesTest.java` | Mistura **enum inválido** (`valueOf`) e **regras** espelhadas nas constraints (valor zero, tipo nulo). |
| `LancamentoEmailServiceTest.java` | Instancia `LancamentoEmailService` com um **`JavaMailSender` falso** (Mockito) e verifica se `send` foi ou não chamado. |
| `LancamentoRepositoryStubTest.java` | Cria um **`LancamentoRepository` falso** que, no `save`, só preenche `id` — testa contrato “após salvar existe id” sem banco. |
| `LancamentoRepositoryJpaTest.java` | Sobe **JPA + H2**, usa o repositório **real** (`LancamentoRepository`) e valida persistência e consultas. |
| `AuthControllerTest.java` | Sobe só o **AuthController** + `MockMvc`; simula POST `/login` e inspeciona status, redirect ou view. |
| `LancamentoPdfExporterTest.java` | Chama o método estático que monta o PDF e checa se veio **byte[]** com tamanho &gt; 0. |
| `TestSummaryPrinter.java` | Lê os XML do Surefire e imprime **uma linha por teste** com status ok/erro (uso em relatório de entrega). |

---

## 3. O que cada teste faz no código (detalhado)

Abaixo: **arranjo** (dados iniciais), **ação** (chamada), **verificação** (o que o `assert` / `verify` exige).

### `EnumDominioTest` (`@Tag("enum")`)

1. **`tipoLancamento_receita_existeNoEnum`** — Chama `TipoLancamento.valueOf("RECEITA")`. Se o enum não tiver exatamente essa constante, `valueOf` lança exceção e o teste quebra. Usa `assertNotNull` só para forçar a avaliação com mensagem clara de falha.

2. **`tipoLancamento_valorInvalido_lancaExcecao`** — Chama `TipoLancamento.valueOf("INVALIDO")` dentro de `assertThrows(IllegalArgumentException.class, ...)`. O código **espera** a exceção padrão de enum do Java.

3. **`situacao_efetivado_existeNoEnum`** — Três chamadas `Situacao.valueOf("EFETIVADO")`, `"...PENDENTE"`, `"...CANCELADO"` envoltas em `assertDoesNotThrow`. Provam que esses literais existem (o banco e a UI usam esses valores).

---

### `ValidationTest` (`@Tag("validation")`)

Todos usam o **mesmo** `Validator` criado uma vez no campo da classe (`buildDefaultValidatorFactory().getValidator()`).

4. **`lancamento_descricaoVazia_naoDeveSerValido`** — Copia um `Lancamento` “bom” (`baseLancamento()`), coloca `setDescricao("")`, chama `validator.validate(l)`. Exige `violations.isEmpty()` ser **falso** — ou seja, pelo menos uma anotação (`@NotBlank` ou similar na entidade) disparou.

5. **`lancamento_valorNegativo_naoDeveSerValido`** — Igual, mas `setValor` com BigDecimal negativo. Valida que a constraint de valor positivo (ou equivalente) está ativa.

6. **`lancamento_dataNula_naoDeveSerValido`** — `setDataLancamento(null)` e `validate`. Garante `@NotNull` (ou similar) na data.

7. **`usuario_loginVazio_naoDeveSerValido`** — Monta `Usuario` válido em `baseUsuario()`, zera o login, `validate(u)`.

8. **`usuario_emailAcimaDe160Chars_naoDeveSerValido`** — Monta e-mail com `repeat(161) + "@x.com"` para passar do `@Size`/`@Email` configurado na entidade; `validate` deve acusar erro.

---

### `BusinessRulesTest` (`@Tag("business")`)

9. **`lancamento_situacaoInvalida_lancaExcecao`** — Não usa `Validator`: chama `Situacao.valueOf("SITUACAO_INVALIDA")` dentro de `assertThrows(IllegalArgumentException.class, ...)`. Documenta que strings aleatórias não viram enum.

10. **`lancamento_valorZero_naoDeveSerValido`** — Mesmo padrão do `ValidationTest`: `baseLancamento()`, `setValor(BigDecimal.ZERO)`, `validator.validate`, lista de violações **não** vazia.

11. **`lancamento_tipoNulo_naoDeveSerValido`** — `setTipoLancamento(null)` e `validate` — tipo obrigatório na entidade.

---

### `LancamentoEmailServiceTest` (`@Tag("mock")`)

12. **`emailService_criarLancamento_enviaEmail`** — Cria `mailSender = mock(JavaMailSender.class)` e `mime = mock(MimeMessage.class)`; `when(mailSender.createMimeMessage()).thenReturn(mime)`. Instancia `LancamentoEmailService` com **`enabled = true`**. Chama `service.onCreate(lancamento, "to@example.com")`. Por fim **`verify(mailSender, times(1)).send(any(MimeMessage.class))`**: o código de produção **precisa** ter chamado `send` uma vez.

13. **`emailService_mailDesabilitado_naoEnviaEmail`** — Mesmo arranjo de mocks, porém **`enabled = false`**. Depois de `onCreate`, **`verify(mailSender, never()).send(...)`** — garante atalho no serviço que não toca no SMTP quando desligado.

---

### `LancamentoRepositoryStubTest` (`@Tag("mock")`)

14. **`lancamentoRepo_salvar_retornaEntidade`** — `stub = mock(LancamentoRepository.class)`; `when(stub.save(any(Lancamento.class))).thenAnswer(inv -> { l.setId(123L); return l; })` simula o que o Hibernate faria (preencher id). Chama `stub.save(baseLancamentoSemId())` e **`assertNotNull(saved.getId())`**. Não há SQL: só contrato do `save`.

---

### `LancamentoRepositoryJpaTest` (`@Tag("db")`)

A classe tem `@DataJpaTest` com `spring.sql.init.mode=never` (não roda `data.sql` do projeto) e `ddl-auto=create-drop` (tabelas criadas só para o teste).

15. **`repositorio_salvarEBuscar_lancamentoEncontrado`** — `repository.save(novoLancamento(...))` gera linha no H2; confere `saved.getId()` não nulo; `findById` deve trazer a mesma descrição.

16. **`repositorio_listarPorSituacao_retornaApenasEfetivados`** — Salva três lançamentos (A efetivado, B pendente, C cancelado). `findBySituacao(EFETIVADO)` deve retornar **lista de tamanho 1** e todos com situação efetivada.

17. **`repositorio_contarLancamentos_retornaTotalCorreto`** — `deleteAll()` limpa a tabela do teste; salva quatro registros; `repository.count()` deve ser **4**.

---

### `AuthControllerTest` (`@Tag("auth")`)

`@WebMvcTest(AuthController.class)` carrega só o MVC desse controller. `UsuarioRepository` é `@MockBean` (não é o bean real).

18. **`login_credenciaisValidas_redirecionaParaHome`** — `when(usuarioRepository.findByLoginAndSenha("admin", "123")).thenReturn(Optional.of(usuarioAtivo))`. `mockMvc.perform(post("/login").param(...))` e **`andExpect(status().is3xxRedirection())`** + **`redirectedUrl("/lancamentos")`**.

19. **`login_credenciaisInvalidas_retornaMensagemDeErro`** — `findByLoginAndSenha` devolve `Optional.empty()`. Espera **200**, view **`auth/login`**, e **`model().attributeExists("error")`** — o controller colocou mensagem de erro no modelo.

---

### `LancamentoPdfExporterTest` (`@Tag("pdf")`)

20. **`pdfExporter_gerarPdf_naoRetornaNulo`** — Chama `LancamentoPdfExporter.export(List.of(baseLancamento()), null, null, "")`. O método interno usa **OpenPDF** para montar o documento. Asserções: `assertNotNull(pdf)` e `assertTrue(pdf.length > 0)` — confirma que a exportação gera bytes não vazios.

---

## 4. `TestSummaryPrinter` — o que esse código faz

Não contém `@Test`. O **`main`**:

1. Recebe argumentos opcionais: pasta dos relatórios (padrão `target/surefire-reports`) e, após `|`, lista de classes FQCN para filtrar.
2. Varre arquivos **`TEST-*.xml`** (formato Surefire).
3. Usa **DOM** (`DocumentBuilderFactory`) com recursos de segurança (DTD/entidades externas desligadas), lê cada `<testcase>` e define **ok** ou **erro** se existir filho `<failure>`, `<error>` ou `<skipped>`.
4. Percorre um **manifesto fixo** (`Entry[] MANIFEST`) com os 20 testes na ordem pedida na entrega e imprime linhas no formato:  
   `Teste N, <rótulo>, testa <objetivo>, ok|erro;`

Serve para **ler o resultado já gravado** pelo Maven e produzir um resumo legível, sem precisar abrir cada XML na mão.

---

## 5. Tabela rápida (referência)

| # | Classe | Método | Tag |
|---|--------|--------|-----|
| 1–3 | `EnumDominioTest` | (três métodos) | `enum` |
| 4–8 | `ValidationTest` | (cinco métodos) | `validation` |
| 9–11 | `BusinessRulesTest` | (três métodos) | `business` |
| 12–13 | `LancamentoEmailServiceTest` | (dois métodos) | `mock` |
| 14 | `LancamentoRepositoryStubTest` | `lancamentoRepo_salvar_retornaEntidade` | `mock` |
| 15–17 | `LancamentoRepositoryJpaTest` | (três métodos) | `db` |
| 18–19 | `AuthControllerTest` | (dois métodos) | `auth` |
| 20 | `LancamentoPdfExporterTest` | `pdfExporter_gerarPdf_naoRetornaNulo` | `pdf` |

---

## 6. Como executar

No diretório do módulo **`app`** (onde está o `pom.xml`):

```bash
mvn test
```

Ou, a partir da raiz do repositório:

```bash
mvn -f app/pom.xml test
```

Relatórios XML: `app/target/surefire-reports/`. Na VM, os scripts `scripts/run-tests-*.sh` encapsulam chamadas semelhantes (ver `DOCUMENTACAO_ENTREGA.md`).

---

## 7. Comentários no código-fonte

Cada método `@Test` em `br.com.lancamento.testes` possui um **JavaDoc** curto imediatamente acima de `@Test`, alinhado a esta documentação, para quem estiver lendo o `.java` diretamente no IDE.
