# Roteiro de Apresentação DevOps (CI/CD & Docker)

Este roteiro descreve passo a passo a demonstração prática que você deve realizar para a banca avaliadora, provando o funcionamento da automação, testes e travas de segurança dos ambientes.

---

## Passo 1: Controle de Containers (Derrubar e Subir)

Mostre que o controle da infraestrutura está centralizado e automatizado via Docker Compose.

1. **Derrubar tudo e limpar imagens/volumes via terminal**:
   Acesse o terminal da VM via SSH e execute os comandos para parar tudo, limpar o Docker e deletar a pasta do projeto (deixando a VM totalmente limpa):
   ```bash
   cd /opt/lancamento
   sudo docker compose down -v
   sudo docker system prune -a --volumes -f
   cd / && sudo rm -rf /opt/lancamento
   ```
2. **Mostrar que o Docker está totalmente limpo (sem imagens ou containers)**:
   - Rode no terminal da VM para listar os containers:
     ```bash
     sudo docker ps -a
     ```
     *(Verifique que nenhum container existe).*
   - Rode no terminal da VM para listar as imagens:
     ```bash
     sudo docker image ls
     ```
     *(Mostre à banca que a lista está vazia, provando que todas as imagens foram removidas).*
   - Acesse no navegador as portas de Homologação (`http://177.44.248.120:8081`) e Produção (`http://177.44.248.120:8082`) e mostre que as páginas estão fora do ar.
3. **Subir tudo com apenas um comando (do zero absoluto)**:
   No terminal de uma VM totalmente limpa do zero, basta executar este comando único para instalar as dependências, clonar o projeto do Git, liberar as portas no firewall e subir todos os containers:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/samanthadg/receitaedespesa/main/bootstrap.sh | bash
   ```
   *(Caso você já tenha o projeto clonado localmente na VM na pasta `/opt/lancamento`, você também pode executá-lo rodando `./bootstrap.sh` dentro da pasta).*
4. **Mostrar que tudo está online**:
   - Rode no terminal da VM:
     ```bash
     sudo docker ps
     ```
     *(Mostre os 5 containers rodando: admin, homolog-db, homolog-app, prod-db, prod-app).*
   - Mostre o Painel Admin acessível em `http://177.44.248.120:8080` e faça login com `admin` / `123456`.

---

## Passo 2: Introduzir Erro no Desenvolvimento Local (PC)

Simule um cenário real onde um desenvolvedor comete um erro que compromete a integridade do sistema.

1. **Fazer alteração com erro de Lógica de Negócio na Aplicação (no seu computador)**:
   No seu PC, abra o arquivo `app/src/domain/validation.js` e altere a regra de validação de valor para permitir que lançamentos com valor `0` passem sem erro:
   ```javascript
   // Procure pela linha 9:
   if (Number.isNaN(valor) || valor <= 0) errors.push('valor');
   
   // E altere para (permitindo valor zero):
   if (Number.isNaN(valor) || valor < 0) errors.push('valor');
   ```
   *(Isso causará a falha do teste unitário "lancamento_valorZero_naoDeveSerValido").*
2. **Fazer alteração no Banco de Dados**:
   Você pode criar um arquivo de migration SQL novo (ex: `app/db/migrations/V4__nova_tabela.sql` no seu PC) para simular alteração de banco:
   ```sql
   CREATE TABLE IF NOT EXISTS teste_banca (
     id SERIAL PRIMARY KEY,
     mensagem VARCHAR(100) NOT NULL
   );
   ```
3. **Enviar as alterações para o Git (PC)**:
   Commite e envie o código com o erro do seu PC local para o GitHub:
   ```bash
   git add .
   git commit -m "feat: nova tabela e modificação do servidor"
   git push origin main
   ```

---

## Passo 3: Puxar Alteração e Executar Testes (VM)

Demonstre como a automação de testes do CI age como uma barreira protetora contra código quebrado.

1. **Puxar alterações do Git na VM**:
   No Painel Admin (`http://177.44.248.120:8080`), olhe o card **Controle de Versão (Git)**:
   - O status estará **DESATUALIZADO**.
   - Clique em **"Puxar do Git (Pull)"**. A VM receberá o código com o erro.
2. **Executar Testes (CI)**:
   Clique no botão **"Rodar Integração (CI)"** no painel:
   - O painel executará a **Etapa 1/3 (Verificação de ambiente)**, validando as versões do Node e PostgreSQL com as do repositório.
   - Em seguida, executará a **Etapa 2/3 (Qualidade de código com ESLint)**.
   - Por fim, iniciará a **Etapa 3/3 (Testes Jest)**, rodando 52 testes unitários de forma automática dentro de um container isolado.
   - No console de logs do painel, você verá a falha do teste específico (`lancamento_valorZero_naoDeveSerValido`) sendo registrada em tempo real.
   - O painel atualizará o status dos testes para **FALHOU** (Vermelho).
3. **Demonstrar a Trava de Segurança (Locker)**:
   - **O botão "Deploy Homologação" ficará completamente oculto (invisível) no painel!**
   - Mostre à banca que é impossível promover o código quebrado, pois o painel oculta o botão de deploy impedindo a ação física.

---

## Passo 4: Corrigir o Erro e Completar Deploy em Homologação

Mostre o ciclo de correção e validação no ambiente de homologação.

1. **Corrigir o código no seu computador (PC)**:
   Reverta a alteração no arquivo `app/src/domain/validation.js` de volta para a validação correta:
   ```javascript
   // Altere de volta para:
   if (Number.isNaN(valor) || valor <= 0) errors.push('valor');
   ```
2. **Subir a correção para o Git (PC)**:
   ```bash
   git add .
   git commit -m "fix: corrigida regra de validação de valor"
   git push origin main
   ```
3. **Puxar correção na VM**:
   No Painel Admin, clique em **"Puxar do Git (Pull)"**.
4. **Executar Testes (CI)**:
   Clique em **"Rodar Integração (CI)"**:
   - O pipeline executará as 3 etapas (Ambiente, ESLint, Jest) com sucesso.
   - Os 52 testes rodarão de forma automática e passarão com sucesso.
   - O status dos testes mudará para **OK** (Verde).
5. **Realizar Deploy em Homologação**:
   - **O botão "Deploy Homologação" se tornará visível automaticamente** no painel!
   - Clique em **"Deploy Homologação"**. Os logs do Docker Compose aparecerão no console em tempo real.
   - Acesse `http://177.44.248.120:8081` no navegador para provar que a Homologação foi atualizada com sucesso.

---

## Passo 5: Promover para Produção

Demonstre a garantia de ordem e estabilidade de deploys.

1. **Promover para Produção**:
   - **O botão "Deploy Produção" agora se tornará visível**, pois a homologação do commit atual foi concluída.
   - Clique em **"Deploy Produção"**.
   - Confirme a caixa de diálogo (modal de proteção).
   - O deploy em Produção ocorrerá de forma isolada.
2. **Demonstração Final**:
   Acesse a URL de Produção (`http://177.44.248.120:8082`) e mostre a aplicação rodando de forma estável.

---

## Dica extra: Como inspecionar os Bancos de Dados via CLI (Terminal)

Para verificar os dados gravados nos bancos em tempo real durante a apresentação:

* **Ver o Banco de Homologação**:
  ```bash
  sudo docker exec -it homolog-db psql -U lancamento_user -d lancamento_db
  ```
* **Ver o Banco de Produção**:
  ```bash
  sudo docker exec -it prod-db psql -U lancamento_user -d lancamento_db
  ```

* **Listar as tabelas**: `\dt`
* **Ver dados da tabela de lançamentos**: `SELECT * FROM lancamento;`
* **Ver dados da tabela de usuários**: `SELECT * FROM usuario;`
* **Sair do console**: `\q`
