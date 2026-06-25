# Guia de Desenvolvimento, Testes e Sincronização (DevOps)

Este guia orienta o desenvolvedor sobre o fluxo correto de trabalho local, controle de versão, testes automatizados e sincronização de dados entre os ambientes de Homologação e Produção na VM.

---

## 1. Fluxo de Desenvolvimento e Envio de Alterações (Local ➔ Git)

Todo o desenvolvimento deve ser feito de forma segura em seu computador local antes de ser enviado para a VM.

1. **Faça as Alterações Localmente:**
   Edite o código, views HTML (EJS), ou adicione migrations no banco em seu computador pessoal.
2. **Execute os Testes Unitários Localmente:**
   No diretório da aplicação (`/app`), rode os testes localmente para validar que sua alteração não quebrou nada:
   ```bash
   npm test
   ```
3. **Envie as Alterações para o Git:**
   Com os testes passando localmente, faça o commit e o envio das alterações para o repositório remoto:
   ```bash
   git add .
   git commit -m "Ajuste na mensagem de erro e criação de tabela"
   git push origin main
   ```

---

## 2. Atualização e Validação do Código na VM

Uma vez que o código foi atualizado no Git remoto, acesse o **Painel Integrado DevOps** (`http://177.44.248.120:8080`):

### Passo A: Verificar se a VM está Atualizada
O painel contém o card **Controle de Versão (Git)** que faz a comparação com o repositório remoto:
* **Status "ATUALIZADO" (Verde):** A VM está na mesma versão do Git remoto.
* **Status "DESATUALIZADO" (Vermelho):** O painel detectou novos commits no repositório remoto. Ele exibirá o aviso: *"Há atualizações pendentes no Git remoto. Clique em 'Puxar do Git' para atualizar."*
* **Ação:** Se estiver desatualizado, clique no botão **Puxar do Git (Pull)**. O painel baixará os novos arquivos da nuvem e atualizará a VM automaticamente.

### Passo B: Executar Testes de CI Automatizados
Antes de implantar em qualquer ambiente, clique em **Rodar Integração (CI)** no painel:
* O painel executará a **Etapa 1/3 (Verificação de ambiente e infraestrutura)**, comparando as versões ativas com as definidas nos arquivos de configuração do projeto (`Dockerfile` e `docker-compose.yml`).
* Em seguida, executará a **Etapa 2/3 (Qualidade de código com ESLint)**.
* Por fim, executará a **Etapa 3/3 (Testes Jest)**, rodando 52 testes individuais de forma isolada em um container Docker, exibindo os resultados e a cobertura em tempo real.
* O commit atual da VM será marcado como **aprovado nos testes** somente se o pipeline for concluído com sucesso.

---

## 3. Deploy nos Ambientes e Segurança do Pipeline

Para garantir a estabilidade em Produção, o pipeline possui travas de segurança rígidas e automatizadas:

### Passo C: Deploy em Homologação
* Clique no botão **Deploy Homologação** no painel.
* **Trava de Segurança:** O painel **BLOQUEARÁ** o deploy se o commit atual da VM não tiver passado no teste de CI anteriormente.
* **Validação:** Acesse `http://177.44.248.120:8081` para testar as novas alterações visualmente.

### Passo D: Deploy em Produção
* Clique no botão **Deploy Produção** no painel e confirme a promoção.
* **Trava de Segurança (Garantia de Ordem):** O painel **BLOQUEARÁ** o deploy em Produção se o commit atual não tiver sido implantado primeiro no ambiente de Homologação. Não é possível atualizar a Produção diretamente sem antes passar pela homologação do mesmo commit.
* **Validação:** Acesse `http://177.44.248.120:8082` para ver as alterações aplicadas na Produção.

---

## 4. Sincronização de Dados (Copiar Produção ➔ Homologação)

Se você precisar testar a Homologação com dados reais de Produção, o painel possui uma ferramenta de sincronização direta de banco de dados:

1. No painel, clique em **Sincronizar Dados (Prod ➔ Homolog)**.
2. Confirme a operação no alerta exibido pelo navegador.
3. O painel executará de forma automatizada:
   * Backup (`pg_dump`) dos dados de produção.
   * Limpeza de dados antigos do banco de homologação.
   * Restauração (`pg_restore`) do backup de produção para o banco de homologação.
4. **Resultado:** O banco de homologação passará a ter exatamente os mesmos registros (lançamentos e usuários) da Produção, permitindo testes idênticos aos de produção com total segurança.

---

## 5. Comandos de Terminal Correspondentes (Execução Manual na VM)

Para fins de demonstração ou execução manual, todos os comandos executados pelo painel administrativo podem ser rodados diretamente no terminal do host (VM):

### A. Verificação de Ambiente (Check de Infraestrutura)
```bash
bash /opt/lancamento/scripts/env-check.sh
```

### B. Rodar Integração (CI - ESLint & Testes Jest)
Executa o ESLint e os testes Jest isoladamente dentro do container padrão do pipeline:
```bash
docker run --rm \
  -v /opt/lancamento/app:/workspace \
  -w /workspace \
  node:20-alpine \
  sh -c "npm ci && npm run lint && echo \"ESLINT_PASSED\" && npm test"
```

### C. Deploy em Homologação
```bash
docker compose -f /opt/lancamento/docker-compose.yml up -d --build homolog-app
```

### D. Deploy em Produção
```bash
docker compose -f /opt/lancamento/docker-compose.yml up -d --build prod-app
```

### E. Sincronização de Banco de Dados (Produção ➔ Homologação)
```bash
# 1. Faz o dump dos dados do banco de Produção
docker exec prod-db pg_dump -U lancamento_user -d lancamento_db -F c -b -v -f /tmp/prod_backup.dump

# 2. Copia o backup do container de Produção para o host
docker cp prod-db:/tmp/prod_backup.dump /tmp/prod_backup.dump

# 3. Copia o backup do host para o container de Homologação
docker cp /tmp/prod_backup.dump homolog-db:/tmp/prod_backup.dump

# 4. Limpa e reseta a estrutura e dados de Homologação
docker exec homolog-db psql -U lancamento_user -d lancamento_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO lancamento_user;"

# 5. Restaura os dados na base de Homologação
docker exec homolog-db pg_restore -U lancamento_user -d lancamento_db -v /tmp/prod_backup.dump

# 6. Limpa os arquivos de backup temporários
rm -f /tmp/prod_backup.dump
docker exec prod-db rm -f /tmp/prod_backup.dump
docker exec homolog-db rm -f /tmp/prod_backup.dump
```

### F. Iniciar / Parar Serviços Globais
* **Iniciar tudo:**
  ```bash
  docker compose -f /opt/lancamento/docker-compose.yml up -d
  ```
* **Parar tudo (exceto painel admin):**
  ```bash
  docker compose -f /opt/lancamento/docker-compose.yml stop homolog-db homolog-app prod-db prod-app
  ```

### G. Atualização de Código (Git Pull)
```bash
cd /opt/lancamento && git pull
```
