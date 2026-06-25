# Documentação de Arquitetura e CI/CD do Sistema Financeiro (Receita e Despesa)

**Aluna:** Samantha Gerhardt

Este documento descreve a arquitetura do sistema e a esteira de Integração Contínua e Entrega Contínua (CI/CD) implementada para o projeto **Receita e Despesa**.

---

## 1. Diagrama de Arquitetura

O sistema é implantado de forma totalmente dockerizada em uma única Máquina Virtual (VM), separando logicamente o painel DevOps, o ambiente de Homologação e o ambiente de Produção.

```mermaid
graph TD
    subgraph GitHub ["Repositório Git (GitHub)"]
        repo["samanthadg/receitaedespesa"]
    end

    subgraph VM ["Máquina Virtual Ubuntu (177.44.248.120)"]
        subgraph Docker ["Docker Compose Network"]
            admin["lancamento-admin (Porta 8080)<br/>Painel DevOps (Node.js)"]
            
            subgraph Homolog ["Ambiente de Homologação"]
                h_app["homolog-app (Porta 8081)<br/>Node.js / Express"]
                h_db["homolog-db (Porta 5433)<br/>PostgreSQL 18"]
                h_app -->|Conecta| h_db
            end

            subgraph Prod ["Ambiente de Produção"]
                p_app["prod-app (Porta 8082)<br/>Node.js / Express"]
                p_db["prod-db (Porta 5434)<br/>PostgreSQL 18"]
                p_app -->|Conecta| p_db
            end
        end
    end

    repo -->|Pull| admin
    admin -->|1. Executa CI (Linter & Jest)| admin
    admin -->|2. Deploy Homolog| h_app
    admin -->|3. Deploy Prod (Locker Guard)| p_app
```

---

## 2. Acesso à Aplicação

### 2.1. Repositório GitHub
O código-fonte e o histórico de revisões do sistema estão hospedados no endereço:
* **Link:** [https://github.com/samanthadg/receitaedespesa](https://github.com/samanthadg/receitaedespesa)

### 2.2. Endereços e Portas (VM)
A aplicação está implantada em uma Máquina Virtual na nuvem no IP **177.44.248.120**. Os serviços foram isolados no Docker nas seguintes portas:

| Ambiente / Serviço | URL de Acesso (Web) | Porta Interna | Porta do Banco (Externa) |
|---|---|---|---|
| **Painel DevOps (Admin)** | [http://177.44.248.120:8080](http://177.44.248.120:8080) | 8080 | N/A |
| **Homologação** | [http://177.44.248.120:8081](http://177.44.248.120:8081) | 3000 | 5433 |
| **Produção** | [http://177.44.248.120:8082](http://177.44.248.120:8082) | 3000 | 5434 |

### 2.3. Credenciais de Acesso Padrão

* **Painel Admin DevOps**:
  * **Usuário:** `admin`
  * **Senha:** `123456`
* **Aplicação Financeira (Homologação / Produção)**:
  * **Usuário:** `admin`
  * **Senha:** `admin123`

---

## 3. Tecnologias Utilizadas no Processo de CI/CD

Abaixo está o detalhamento completo de toda a esteira tecnológica utilizada no projeto para garantir integridade, validação de qualidade e controle de deploys.

### 3.1. Ambiente (Infraestrutura)
* **Sistema Operacional:** Ubuntu Server (Linux) – Proporciona alta estabilidade e segurança.
* **Máquina Virtual (VM):** Hospedada na nuvem, onde roda o Docker Engine.
* **Contêineres (Docker):** Todos os componentes da aplicação (front/back, bancos de dados, painel admin) rodam dentro de contêineres independentes. Isso evita o problema de incompatibilidade de dependências locais ("na minha máquina funciona").
* **Orquestração (Docker Compose):** Define a estrutura multi-container, configurando redes internas isoladas, volumes de dados persistentes para os bancos de dados PostgreSQL e mapeamento de portas externas.

### 3.2. Linguagem de Programação e Banco de Dados
* **Linguagem Principal:** Node.js (JavaScript) no backend usando o framework Express.js. O frontend utiliza HTML/CSS puro com templates dinâmicos em EJS (Embedded JavaScript) e JavaScript nativo (Vanilla JS).
* **Banco de Dados:** PostgreSQL 18 – Banco de dados relacional robusto e estável utilizado tanto em homologação quanto em produção (com instâncias e volumes de dados 100% isolados).
* **Migração de Banco de Dados:** Runner de migrações customizado (`migrate_app.js`) que lê os scripts `.sql` localizados na pasta `/db/migrations/` e os executa de forma transacional e sequencial.

### 3.3. Ferramentas para Controle de Mudança e Versionamento
* **Versionamento de Código:** Git – Ferramenta principal para controle de versão local e na VM.
* **Hospedagem de Código:** GitHub – Armazena o código e integra com as chaves SSH geradas na VM para sincronização rápida das atualizações.
* **Branch Principal:** A branch `main` concentra as alterações estáveis e testadas.

### 3.4. Integração Contínua e Entrega Contínua (CI/CD)
* **Motor de Automação:** Painel DevOps Integrado (Node.js) – Uma ferramenta customizada que gerencia o fluxo do pipeline no servidor da VM, disparando execuções de testes em containers efêmeros e deploys sob demanda.
* **Trava de Segurança (Pipeline Guard)**:
  * O deploy em Homologação só é liberado se os testes de CI passarem com sucesso para o commit atual.
  * O deploy em Produção só é habilitado se o commit atual tiver sido implantado com sucesso no ambiente de Homologação primeiro.
* **Deploy Granular**: O deploy é feito de forma individual (usando `docker compose up -d --build <service-name>`), garantindo que apenas a aplicação atualizada seja reiniciada, mantendo o banco de dados online e ativo.

### 3.5. Testes e Qualidade de Código
* **Testes Automatizados (Jest + Supertest):** 52 testes automatizados cobrem as lógicas de negócio, rotas e controllers da aplicação, garantindo uma cobertura de código superior a 80%.
* **Análise de Qualidade de Código (ESLint):** Linter estático que analisa o código JS no container isolado, detectando variáveis inutilizadas, erros de sintaxe, formatação ou problemas de escopo antes de permitir a execução dos testes.

### 3.6. Comunicação e Integração de Dados
* **Sincronização de Banco (DB Sync)**: Comando inteligente no Painel que realiza o `pg_dump` do banco de produção, faz a limpeza do banco de homologação e restaura os dados atualizados (`pg_restore`), facilitando testes com dados reais sem impactar os clientes.
* **Server-Sent Events (SSE)**: Permite que o Painel DevOps transmita em tempo real os logs detalhados do ESLint, o progresso dos testes unitários e as estatísticas do CI para o console da interface web.
