#!/bin/bash
# Script de Inicialização Completa da VM (Bootstrap)
set -e

echo "=== [0/5] Verificando e Instalando Git ==="
if ! command -v git &> /dev/null; then
    sudo apt-get update -y && sudo apt-get install -y git
fi

echo "=== [0.5/5] Clonando Repositório ==="
if [ ! -d "/opt/lancamento/.git" ]; then
    sudo mkdir -p /opt/lancamento
    sudo chown -R $USER:$USER /opt/lancamento
    git clone https://github.com/samanthadg/receitaedespesa.git /opt/lancamento
fi

echo "=== [0.7/5] Configurando Chave SSH para o GitHub ==="
SSH_KEY="$HOME/.ssh/id_ed25519"
if [ ! -f "$SSH_KEY" ]; then
    echo "Gerando nova chave SSH..."
    mkdir -p "$HOME/.ssh"
    chmod 700 "$HOME/.ssh"
    ssh-keygen -t ed25519 -N "" -f "$SSH_KEY"
fi

echo ""
echo "======================================================="
echo " 🔑 CHAVE SSH GERADA PARA CADASTRAR NO GITHUB: 🔑"
echo "======================================================="
cat "${SSH_KEY}.pub"
echo "======================================================="
echo "1. Copie a linha acima."
echo "2. Cole em: https://github.com/settings/keys"
echo "======================================================="
echo ""

# Espera o usuário adicionar a chave (funciona mesmo sob curl | bash redirecionando o tty)
if [ -t 0 ] || [ -c /dev/tty ]; then
    read -p "Após adicionar a chave no GitHub, pressione [ENTER] para continuar..." < /dev/tty
else
    echo "Modo não-interativo. Certifique-se de adicionar a chave acima no seu GitHub!"
fi

# Altera a URL remota do Git para usar SSH nas próximas operações
cd /opt/lancamento
git remote set-url origin git@github.com:samanthadg/receitaedespesa.git

# Adiciona o GitHub nos hosts conhecidos
mkdir -p "$HOME/.ssh"
ssh-keyscan -t ed25519 github.com >> "$HOME/.ssh/known_hosts" 2>/dev/null || true

# Testa conexão com o GitHub
echo "Testando conexão SSH com o GitHub..."
ssh -n -T -o StrictHostKeyChecking=no git@github.com 2>&1 || true

echo "=== [1/5] Verificando e Instalando Docker ==="
if ! command -v docker &> /dev/null; then
    sudo apt-get update -y
    sudo apt-get install -y ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo systemctl enable docker
    sudo systemctl start docker
    echo "=== Docker instalado com sucesso ==="
else
    echo "=== Docker já instalado ==="
fi

echo "=== [2/5] Desativando Serviços Nativos Concorrentes ==="
sudo systemctl stop lancamento 2>/dev/null || true
sudo systemctl disable lancamento 2>/dev/null || true
sudo systemctl stop postgresql 2>/dev/null || true
sudo systemctl disable postgresql 2>/dev/null || true
echo "=== Serviços nativos desativados ==="

echo "=== [3/5] Configurando Firewall (UFW) ==="
sudo ufw allow 8080/tcp
sudo ufw allow 8081/tcp
sudo ufw allow 8082/tcp
sudo ufw --force enable
echo "=== Firewall configurado ==="

echo "=== [4/5] Ajustando Permissões de Usuário e Pasta ==="
sudo usermod -aG docker $USER 2>/dev/null || true
sudo chown -R $USER:$USER /opt/lancamento
echo "=== Permissões configuradas ==="

echo "=== [5/5] Construindo e Subindo os Containers ==="
cd /opt/lancamento
docker compose up -d --build

echo ""
echo "======================================================="
echo " 🎉 VM CONFIGURADA E INFRAESTRUTURA DOCKER ONLINE! 🎉"
echo "======================================================="
echo "Painel DevOps: http://localhost:8080 (ou IP da VM)"
echo "Homologação:   http://localhost:8081"
echo "Produção:      http://localhost:8082"
echo "======================================================="
