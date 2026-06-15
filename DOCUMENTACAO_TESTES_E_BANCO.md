# Guia de Apresentação e Testes (CI/CD DevOps)

Este guia detalha o passo a passo de como demonstrar o funcionamento dos ambientes de Integração, Homologação e Produção em Docker na VM da Univates para o projeto migrado para **Node.js/JavaScript**.

---

## 1. Parar e Iniciar Tudo com Um Só Comando

### Parar Tudo
Para parar todos os ambientes de uma vez, execute no terminal da VM:
```bash
cd /opt/lancamento
sudo docker compose down
```
*Validação:* Tente acessar `http://177.44.248.120:8080` (Painel), `8081` (Homolog) e `8082` (Prod) e verifique que estão fora do ar.

### Iniciar Tudo
Para iniciar todos os containers com um único comando, execute:
```bash
cd /opt/lancamento
sudo docker compose up -d
```
*Validação:* Execute `sudo docker ps` e mostre os 5 containers ativos:
1. `lancamento-admin` (Painel DevOps na porta 8080)
2. `homolog-app` (App Homologação na porta 8081)
3. `homolog-db` (Banco PostgreSQL na porta 5433)
4. `prod-app` (App Produção na porta 8082)
5. `prod-db` (Banco PostgreSQL na porta 5434)

---

## 2. Independência dos Bancos de Dados

1. Acesse o ambiente de **Homologação** em `http://177.44.248.120:8081/login`
   - Credenciais: Usuário `admin` / Senha `123456`
2. Cadastre um novo lançamento (ex: "Jantar de Negócios", Valor `150.00`, DESPESA).
3. Acesse o ambiente de **Produção** em `http://177.44.248.120:8082/login`
   - Use as mesmas credenciais.
4. Demonstre que o lançamento cadastrado em Homologação **não aparece** na lista de Produção, comprovando que os bancos de dados são totalmente independentes e isolados.

---

## 3. Fluxo de Atualização (Alteração de Palavra e Nova Tabela)

### Passo 1: Alterar uma palavra na aplicação
No terminal da VM (ou via editor), edite a view EJS de listagem de lançamentos:
```bash
sudo nano /opt/lancamento/app/views/lancamentos/lista.ejs
```
Localize a tag `<h1>Lançamentos</h1>` (por volta da linha 48) e altere para:
```html
<h1>Controle Financeiro (Homolog)</h1>
```

### Passo 2: Criar uma nova tabela no banco de dados (Migration)
Crie um novo arquivo de migração JavaScript no diretório de migrações:
```bash
sudo nano /opt/lancamento/app/db/migrations/V4__criar_tabela_auditoria.sql
```
Adicione o seguinte conteúdo SQL:
```sql
CREATE TABLE IF NOT EXISTS auditoria (
  id BIGSERIAL PRIMARY KEY,
  data_hora TIMESTAMP NOT NULL DEFAULT NOW(),
  acao VARCHAR(100) NOT NULL
);
```

### Passo 3: Executar o Pipeline de Integração e Deploy em Homologação
1. Acesse o **Painel Admin** em `http://177.44.248.120:8080`.
2. No card **Controle de Mudanças (Fase A)**, preencha:
   - Autor: `univates`
   - Descrição: `Alterado titulo principal e criada tabela de auditoria`
   - Clique em **Registrar Mudança**.
3. No card **Pipeline**, clique em **Rodar Integração (CI)**.
   - Isso executará a instalação limpa de dependências, os 20 testes unitários via **Jest** e calculará a cobertura de código. Acompanhe os logs em tempo real no console do painel.
4. Assim que o CI terminar com sucesso, clique em **Deploy Homologação**.
   - Isso reconstruirá o container de homologação com o novo código do EJS e aplicará a migração V4 no banco de Homologação.
5. Acesse `http://177.44.248.120:8081` e mostre o novo título: **Controle Financeiro (Homolog)**.
6. Mostre que em Produção (`http://177.44.248.120:8082`) a palavra **não mudou** e a tabela de auditoria ainda não existe no banco de Produção.

### Passo 4: Atualizar o ambiente de Produção
1. No Painel Admin (`http://177.44.248.120:8080`), clique em **Deploy Produção**.
2. Confirme a promoção na janela de confirmação.
3. Acesse `http://177.44.248.120:8082` e verifique que o título agora foi atualizado em Produção.
4. Para provar que a nova tabela de auditoria foi criada automaticamente pela migração no banco de Produção, execute na VM:
   ```bash
   sudo docker exec -it prod-db psql -U lancamento_user -d lancamento_db -c "\dt"
   ```
   *Resultado esperado:* A tabela `auditoria` deve aparecer listada junto com `usuario`, `lancamento` e `schema_migrations`.

---

## 4. Quebrar os Testes e a Qualidade de Código

Para demonstrar que o pipeline de integração funciona e bloqueia deploys inválidos, podemos introduzir falhas nos testes:

### Quebrar Teste Unitário
1. Edite a lógica de validação de valor de lançamentos:
   ```bash
   sudo nano /opt/lancamento/app/src/domain/validation.js
   ```
2. Mude a linha:
   ```javascript
   if (Number.isNaN(valor) || valor <= 0) errors.push('valor');
   ```
   para exigir valor mínimo de `100`:
   ```javascript
   if (Number.isNaN(valor) || valor <= 100) errors.push('valor');
   ```
3. No Painel Admin, clique em **Rodar Integração (CI)**.
4. O Jest falhará na execução dos testes e o painel exibirá:
   - **Passaram:** menor que 20 (ex: 18 ou 19 passados).
   - Mensagem de falha destacada em vermelho no terminal do painel.
   - O status do pipeline mudará para **Erro** impedindo deploys automáticos seguros.
