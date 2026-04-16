# Documentação — Aplicação e Publicação (passo a passo)

**Aluna:** Samantha Danieli Gerhardt  
**Repositório:** `https://github.com/samanthadg/receitaedespesa.git`

---

## 1. Da aplicação

### 1.1 Número de classes da aplicação

O código da aplicação (pacote `br.com.lancamento`) está organizado em **15 classes Java**:

| # | Classe |
|---|--------|
| 1 | `br.com.lancamento.LancamentoApplication` |
| 2 | `br.com.lancamento.domain.Lancamento` |
| 3 | `br.com.lancamento.domain.Usuario` |
| 4 | `br.com.lancamento.domain.TipoLancamento` |
| 5 | `br.com.lancamento.domain.Situacao` |
| 6 | `br.com.lancamento.repo.LancamentoRepository` |
| 7 | `br.com.lancamento.repo.UsuarioRepository` |
| 8 | `br.com.lancamento.service.LancamentoEmailService` |
| 9 | `br.com.lancamento.web.AuthController` |
| 10 | `br.com.lancamento.web.AuthInterceptor` |
| 11 | `br.com.lancamento.web.HomeController` |
| 12 | `br.com.lancamento.web.LancamentoController` |
| 13 | `br.com.lancamento.web.LancamentoPdfExporter` |
| 14 | `br.com.lancamento.web.UsuarioController` |
| 15 | `br.com.lancamento.web.WebConfig` |

Camadas: **Web** (controllers, interceptor, MVC), **Domínio** (entidades e enums), **Persistência** (Spring Data JPA), **Serviços** (envio de e-mail SMTP).

### 1.2 Modelagem do banco de dados

O PostgreSQL armazena duas tabelas principais.

**Tabela `usuario`**

- `id` — BIGSERIAL, PK  
- `nome` — VARCHAR(120), NOT NULL  
- `login` — VARCHAR(60), NOT NULL, UNIQUE  
- `senha` — VARCHAR(255), NOT NULL  
- `situacao` — VARCHAR(20), NOT NULL (`ATIVO` / `INATIVO`)  
- `email` — VARCHAR(160);  **obrigatório no cadastro pela interface**

**Tabela `lancamento`**

- `id` — BIGSERIAL, PK  
- `descricao` — VARCHAR(200), NOT NULL  
- `data_lancamento` — DATE, NOT NULL  
- `valor` — NUMERIC(14,2), NOT NULL  
- `tipo_lancamento` — VARCHAR(20), NOT NULL (`RECEITA` / `DESPESA`)  
- `situacao` — VARCHAR(20), NOT NULL (`EFETIVADO` / `PENDENTE` / `CANCELADO`)

**Como o schema chega ao banco:** na primeira execução (e nas seguintes, conforme configuração), o Spring Boot executa `classpath:schema.sql` e `classpath:data.sql` (`spring.sql.init` em `application.yml`), com `hibernate.ddl-auto: validate`. Ou seja, **as tabelas não são criadas pelo script shell de provisionamento**; o **banco vazio + usuário SQL** são criados na VM pelo script, e o **DDL** vem do projeto (`app/src/main/resources/schema.sql`).

---

### 1.3 Interface desenvolvida

- **Tecnologia:** páginas **HTML** servidas por **Thymeleaf** (templates em `app/src/main/resources/templates/`), estilização simples com **CSS** embutido nos templates.  
- **Fluxo:** após **login** (`/login`), o usuário autenticado acessa **lançamentos** e **usuários**.  
- **Telas principais:**  
  - **Login** — formulário usuário/senha, mensagens de erro.  
  - **Lançamentos** — listagem com filtros (data, situação), ordenação por colunas, ações incluir/editar/excluir, link de **exportação PDF** (`/lancamentos/export/pdf`), feedback visual (mensagens de sucesso/erro).  
  - **Usuários** — listagem e CRUD (nome, login, senha, situação, **e-mail obrigatório**).  
- **Integração:** notificações por **e-mail (SMTP Gmail)** ao criar, alterar ou excluir um lançamento (destinatário: e-mail do usuário logado).

---

## 2. Da publicação

**Premissas:** VM com **Ubuntu 24.04**, acesso **root** ou usuário com **sudo**, repositório no GitHub (link acima).

### 2.1 Como acessar a VM

1. Obtenha o **endereço IP** (ou hostname) da VM no painel do provedor (Azure, AWS, etc.).  
2. No seu computador, abra um terminal e conecte-se por **SSH** (substitua `SEU_IP` e o usuário conforme o provedor — muitas imagens usam `ubuntu` em vez de `root`):

```bash
ssh root@SEU_IP
```

Se usar chave privada:

```bash
ssh -i caminho/para/sua_chave.pem ubuntu@SEU_IP
```

### 2.2 Instalação de cada ferramenta

Tudo abaixo pode ser feito **automaticamente** pelo script `scripts/provision-ubuntu24.sh` (e é chamado por `scripts/install-build-run-ubuntu24.sh`). Aqui está o que esse provisionamento instala e para que serve:

| Ferramenta | O que faz o script | Uso no projeto |
|------------|-------------------|----------------|
| **Pacotes base** (`apt-get`) | `ca-certificates`, `curl`, `gnupg`, `lsb-release`, `unzip`, **git**, **ufw**, **maven** | Git para clonar o repositório; Maven para compilar o JAR; UFW para liberar a porta da aplicação |
| **Java 21 (Eclipse Temurin)** | Adiciona repositório Adoptium, instala `temurin-21-jdk`, ajusta `update-alternatives` quando possível, gera `/etc/profile.d/lancamento-java.sh` com `JAVA_HOME` e `PATH` | Executar Spring Boot 3.4 / bytecode Java 21 |
| **PostgreSQL 18** | Adiciona repositório PGDG, instala `postgresql-18` e cliente | Banco relacional da aplicação |
| **Banco e usuário SQL** | `createdb` se não existir; `CREATE ROLE` / `GRANT` / permissões no schema `public` | Database `lancamento_db`, usuário `lancamento_user` (senha padrão alinhada ao `/etc/lancamento.env`) |
| **systemd** | Unidade `lancamento.service` lendo `/etc/lancamento.env`, `JAVA_HOME` apontando para Temurin 21 | Subir o JAR como serviço (`systemctl enable --now lancamento`) |
| **Firewall (UFW)** | `ufw allow 8080/tcp`, `ufw --force enable` | Acesso HTTP à aplicação na porta 8080 |

**Ordem recomendada na prática:** clonar o projeto → rodar o provisionamento (ou o script único de build/run) → editar `/etc/lancamento.env` (SMTP, etc.) → compilar e habilitar o serviço (já incluído em `install-build-run-ubuntu24.sh`).

### 2.3 Implantação da aplicação

1. **Clonar o repositório** em `/opt/lancamento`:

```bash
apt update -y
apt install -y git
mkdir -p /opt
cd /opt
git clone https://github.com/samanthadg/receitaedespesa.git lancamento
cd /opt/lancamento
```

2. **Provisionar a VM** (instala tudo da tabela acima + arquivos de serviço):

```bash
sudo bash scripts/provision-ubuntu24.sh
```

3. **Configurar variáveis** em `/etc/lancamento.env` (banco já vem coerente com o provisionamento; ajuste **SMTP** antes de produção):

```bash
sudo nano /etc/lancamento.env
```

Exemplo mínimo para e-mail ativo:

```env
DB_URL=jdbc:postgresql://localhost:5432/lancamento_db
DB_USER=lancamento_user
DB_PASSWORD=lancamento_pass
PORT=8080

APP_MAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seuemail@gmail.com
SMTP_PASS=SENHA_DE_APP_DO_GOOGLE
APP_MAIL_FROM=seuemail@gmail.com
APP_PUBLIC_BASE_URL=http://SEU_IP:8080
```

4. **Compilar e subir o serviço** (recomendado — um comando):

```bash
cd /opt/lancamento
sudo bash scripts/install-build-run-ubuntu24.sh
```

Esse script chama o `provision-ubuntu24.sh`, executa `mvn -DskipTests package` em `app/`, faz `systemctl daemon-reload` e `systemctl enable --now lancamento`.

**Alternativa manual** (após já ter provisionado):

```bash
source /etc/profile.d/lancamento-java.sh
cd /opt/lancamento/app
mvn clean -DskipTests package
sudo systemctl daemon-reload
sudo systemctl enable --now lancamento
```

5. **Validar:**

```bash
sudo systemctl status lancamento --no-pager
ss -lntp | grep :8080 || true
curl -i http://localhost:8080/login
sudo journalctl -u lancamento -n 200 --no-pager
```

**Java/Maven:** se aparecer `release version 21 not supported`, force o JDK 21 antes do Maven:

```bash
export JAVA_HOME=/usr/lib/jvm/temurin-21-jdk-amd64
export PATH="$JAVA_HOME/bin:$PATH"
mvn -v
```

### 2.4 URL de acesso

No navegador (a partir da sua máquina ou da rede permitida pelo firewall do provedor):

`http://SEU_IP:8080/login`

Substitua `SEU_IP` pelo IP público da VM.

**Credenciais iniciais** (seed em `app/src/main/resources/data.sql`):

- Login: `financeiro`  
- Senha: `fin2026`  

Recomenda-se alterar a senha e garantir **e-mail** no usuário para receber notificações.

---

## 3. Dos tempos

Registro orientativo do tempo gasto por etapa (ajuste os valores conforme seu cronômetro real):

| Etapa | Tempo documentado |
|-------|-------------------|
| Desenvolvimento da aplicação | 120 min |
| Criação do ambiente na VM | 30 min |
| Publicação da aplicação | 15 min |

*Exemplo de formato pedido no enunciado:* desenvolvimento **60 min**, ambiente na VM **15 min**, publicação **5 min** — use números que reflitam **seu** trabalho.

---

## 4. Scripts de inicialização e banco

- **`scripts/provision-ubuntu24.sh`** — Foi o script principalmente evoluído para VM “do zero”: instala **Java 21 Temurin**, **Maven**, **PostgreSQL 18**, cria o **database** `lancamento_db` e o **usuário** `lancamento_user`, ajusta permissões no schema `public`, grava **`/etc/lancamento.env`** (incluindo placeholders **SMTP** e flags de e-mail), cria **`lancamento.service`** no systemd com `JAVA_HOME`/`PATH` para o Temurin 21, e configura **UFW** na porta 8080.  
- **`scripts/install-build-run-ubuntu24.sh`** — Orquestra: chama o provisionamento, roda **`mvn package`**, `daemon-reload` e **`enable --now lancamento`**.  
- **Criação das tabelas:** feita pela aplicação via **`schema.sql`** / **`data.sql`** no classpath, **não** por um `psql` apontando para `scripts/sql/`. Os arquivos em `scripts/sql/` servem como **referência manual** (por exemplo, reproduzir o modelo fora do Spring); **não** são invocados automaticamente pelos scripts shell atuais.

---

## 5. Variáveis de ambiente (referência rápida)

| Variável | Função |
|----------|--------|
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | Conexão JDBC PostgreSQL |
| `PORT` | Porta HTTP (ex.: 8080) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Gmail (recomenda-se **App Password**) |
| `APP_MAIL_ENABLED`, `APP_MAIL_FROM`, `APP_MAIL_TO` | Liga/desliga e-mail e remetente/destino fallback |
| `APP_PUBLIC_BASE_URL` | Base de links em e-mails (opcional) |

---

## 6. Testes automatizados (20 cenários)

Os testes foram implementados em **JUnit 5** (Spring Boot Starter Test) e ficam reunidos no pacote **`br.com.lancamento.testes`**, pasta:

`app/src/test/java/br/com/lancamento/testes/`

A execução na VM é feita pelos scripts em `scripts/`. O Maven roda em modo silencioso (`-q`); na tela aparece **apenas** o resumo gerado em **Java** pela classe `br.com.lancamento.testes.TestSummaryPrinter` (via `exec-maven-plugin` após os testes), no formato:

`Teste N, <rótulo>, testa <objetivo>, ok|erro;`

**Requisito:** apenas **JDK 21** e Maven (já previstos no provisionamento da VM).

### 6.1 Como executar na VM

Rodar **todos os testes** (na raiz do clone, não dentro de `app/`):

```bash
cd /opt/lancamento
git pull
chmod +x scripts/run-tests-all.sh scripts/run-tests-by-type.sh
./scripts/run-tests-all.sh
```

Se o Maven falhar e você precisar ver o log completo:

```bash
LANCAMENTO_TESTS_VERBOSE=1 ./scripts/run-tests-all.sh
```

Rodar **por tipo** (enum/validation/business/mock/db/auth/pdf):

```bash
cd /opt/lancamento
./scripts/run-tests-by-type.sh enum
./scripts/run-tests-by-type.sh validation
./scripts/run-tests-by-type.sh business
./scripts/run-tests-by-type.sh mock
./scripts/run-tests-by-type.sh db
./scripts/run-tests-by-type.sh auth
./scripts/run-tests-by-type.sh pdf
```

### 6.2 Lista dos 20 testes

**Enum e domínio**

1. `tipoLancamento_receita_existeNoEnum()` — verifica `RECEITA` no enum `TipoLancamento` (`br.com.lancamento.testes.EnumDominioTest`)
2. `tipoLancamento_valorInvalido_lancaExcecao()` — valor inválido lança `IllegalArgumentException` (`br.com.lancamento.testes.EnumDominioTest`)
3. `situacao_efetivado_existeNoEnum()` — `EFETIVADO`, `PENDENTE`, `CANCELADO` no enum `Situacao` (`br.com.lancamento.testes.EnumDominioTest`)

**Input / validação**

4. `lancamento_descricaoVazia_naoDeveSerValido()` — descrição vazia falha validação (`br.com.lancamento.testes.ValidationTest`)
5. `lancamento_valorNegativo_naoDeveSerValido()` — valor negativo falha validação (`br.com.lancamento.testes.ValidationTest`)
6. `lancamento_dataNula_naoDeveSerValido()` — data nula falha validação (`br.com.lancamento.testes.ValidationTest`)
7. `usuario_loginVazio_naoDeveSerValido()` — login vazio falha validação (`br.com.lancamento.testes.ValidationTest`)
8. `usuario_emailAcimaDe160Chars_naoDeveSerValido()` — e-mail > 160 chars falha validação (`br.com.lancamento.testes.ValidationTest`)

**Regra de negócio**

9. `lancamento_situacaoInvalida_lancaExcecao()` — situação inválida lança exceção (`br.com.lancamento.testes.BusinessRulesTest`)
10. `lancamento_valorZero_naoDeveSerValido()` — valor zero falha validação (`br.com.lancamento.testes.BusinessRulesTest`)
11. `lancamento_tipoNulo_naoDeveSerValido()` — tipo nulo falha validação (`br.com.lancamento.testes.BusinessRulesTest`)

**Mock / Stub**

12. `emailService_criarLancamento_enviaEmail()` — ao criar lançamento, chama envio 1 vez (`br.com.lancamento.testes.LancamentoEmailServiceTest`)
13. `emailService_mailDesabilitado_naoEnviaEmail()` — e-mail desabilitado não chama envio (`br.com.lancamento.testes.LancamentoEmailServiceTest`)
14. `lancamentoRepo_salvar_retornaEntidade()` — stub do repositório retorna entidade com ID (`br.com.lancamento.testes.LancamentoRepositoryStubTest`)

**Banco de dados (JPA)**

15. `repositorio_salvarEBuscar_lancamentoEncontrado()` — salva e busca por ID (`br.com.lancamento.testes.LancamentoRepositoryJpaTest`)
16. `repositorio_listarPorSituacao_retornaApenasEfetivados()` — filtra por `EFETIVADO` (`br.com.lancamento.testes.LancamentoRepositoryJpaTest`)
17. `repositorio_contarLancamentos_retornaTotalCorreto()` — `count()` retorna N (`br.com.lancamento.testes.LancamentoRepositoryJpaTest`)

**Autenticação / rota**

18. `login_credenciaisValidas_redirecionaParaHome()` — POST `/login` redireciona para `/lancamentos` (`br.com.lancamento.testes.AuthControllerTest`)
19. `login_credenciaisInvalidas_retornaMensagemDeErro()` — POST `/login` retorna `auth/login` com mensagem de erro (`br.com.lancamento.testes.AuthControllerTest`)

**Exportação / PDF**

20. `pdfExporter_gerarPdf_naoRetornaNulo()` — exportação PDF retorna bytes não nulos (`br.com.lancamento.testes.LancamentoPdfExporterTest`)

---

## 7. Entrega (artefatos)

- **`DOCUMENTACAO_ENTREGA.pdf`** — este documento.  
- Link do repositório: `https://github.com/samanthadg/receitaedespesa.git`
