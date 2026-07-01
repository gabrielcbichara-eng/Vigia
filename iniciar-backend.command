#!/bin/bash
# ────────────────────────────────────────────────
#  VIGIA — Iniciar Backend
#  Dê duplo clique neste arquivo para rodar o servidor.
# ────────────────────────────────────────────────

# Vai para a pasta backend (relativa a este script)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/backend"

clear
echo "╔═══════════════════════════════════════╗"
echo "║        🗺️  VIGIA — Iniciando...        ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# Verifica se Node.js está instalado
if ! command -v node &> /dev/null; then
  echo "❌ Node.js não encontrado!"
  echo ""
  echo "Por favor, instale o Node.js primeiro:"
  echo "→ Acesse https://nodejs.org e baixe a versão LTS"
  echo ""
  read -p "Pressione Enter para fechar..."
  exit 1
fi

echo "✅ Node.js encontrado: $(node --version)"
echo ""

# Sempre instala/atualiza dependências
echo "📦 Instalando dependências..."
npm install
echo ""

echo "🚀 Iniciando servidor VIGIA..."
echo "   Acesse o app em: abra o arquivo app/vigia-app.html no navegador"
echo "   Para parar: feche esta janela"
echo ""

npm start

read -p "Pressione Enter para fechar..."
