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
* O painel executará os 20 testes unitários em um container Docker isolado e exibirá os resultados e a cobertura em tempo real.
* O commit atual da VM será marcado como **aprovado nos testes** somente se todos os testes passarem com sucesso.

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
