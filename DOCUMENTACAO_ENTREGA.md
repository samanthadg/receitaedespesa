# Documentação da Aplicação e Publicação

## Passo 3 - Documentação (passo a passo)

## Da aplicação

### 1) Número de classes da aplicação

Total de classes Java: **11**

- `LancamentoApplication`
- `Lancamento`
- `Usuario`
- `TipoLancamento` (enum)
- `Situacao` (enum)
- `LancamentoRepository`
- `UsuarioRepository`
- `HomeController`
- `AuthController`
- `AuthInterceptor`
- `WebConfig`

### 2) Modelagem do banco de dados

Tabela `lancamento`:
- `id` (BIGSERIAL, PK)
- `descricao` (VARCHAR(200), NOT NULL)
- `data_lancamento` (DATE, NOT NULL)
- `valor` (NUMERIC(14,2), NOT NULL)
- `tipo_lancamento` (VARCHAR(20), NOT NULL) - RECEITA/DESPESA
- `situacao` (VARCHAR(20), NOT NULL) - PENDENTE/EFETIVADO/CANCELADO

Tabela `usuario`:
- `id` (BIGSERIAL, PK)
- `nome` (VARCHAR(120), NOT NULL)
- `login` (VARCHAR(60), NOT NULL, UNIQUE)
- `senha` (VARCHAR(255), NOT NULL)
- `situacao` (VARCHAR(20), NOT NULL)

### 3) Interface desenvolvida

- Tela de login: `/login` (autenticação por usuário/senha da tabela `usuario`)
- Tela de listagem: `/lancamentos`
- Funcionalidades da tela de lançamentos:
  - Adicionar lançamento
  - Excluir lançamento
  - Ordenar por colunas (ID, descrição, data, valor, tipo, situação)

## Da publicação

### Passo a passo

Premissas:
- VM: **Ubuntu 24**
- Acesso: **root** (ou usuário com `sudo`)
- Fonte do projeto: **repositório Git** (Github)

#### 1) Acessar a VM

```bash
ssh root@177.44.248.120
```

#### 2) Atualizar pacotes e instalar Git

```bash
apt update -y
apt install -y git
```

#### 3) Baixar o projeto do Git para `/opt`

Substitua pela URL do seu repositório:

```bash
cd /opt
git clone https://github.com/SEU_USUARIO/SEU_REPO.git lancamento
```

#### 4) Provisionar a VM (instalar ferramentas e preparar banco)

O provisionamento instala e configura:
- Java 21 (Temurin)
- Maven
- PostgreSQL 18
- Criação do banco `lancamento_db` e usuário `lancamento_user`
- Permissões no schema `public` para criação das tabelas
- Criação do serviço systemd `lancamento.service`
- Liberação da porta 8080 no `ufw`

Execute:

```bash
cd /opt/lancamento
bash scripts/provision-ubuntu24.sh
```

#### 5) Compilar a aplicação

```bash
bash -lc "cd /opt/lancamento/app && mvn -DskipTests package"
```

#### 6) Subir a aplicação como serviço

```bash
systemctl enable --now lancamento
systemctl status lancamento --no-pager
```

#### 7) Validar localmente (na VM)

```bash
ss -lntp | grep :8080 || true
curl -i http://localhost:8080/login
```

#### 8) Acesso externo (URL)

- `http://177.44.248.120:8080/login`

#### 9) Logs e troubleshooting (se necessário)

```bash
journalctl -u lancamento -n 200 --no-pager
journalctl -u lancamento -f
```

#### 10) Credenciais de acesso à aplicação

- Usuário: `financeiro`
- Senha: `fin2026`

## Dos tempos

- Desenvolvimento da aplicação: **60 min**
- Criação do ambiente na VM: **20 min**
- Publicação da aplicação: **5 min**

## Entrega

- Arquivo da documentação em PDF: `DOCUMENTACAO_ENTREGA.pdf`
- Link de acesso à aplicação na VM: `http://177.44.248.120:8080/login`
- Credenciais de acesso:
  - Usuário: `financeiro`
  - Senha: `fin2026`
- Link do repositório (Github): **preencher com o link final do seu repositório**

