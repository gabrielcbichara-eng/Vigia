// ─────────────────────────────────────────────────────────────
//  SERVIDOR PRINCIPAL DO VIGIA
//  Este é o "cérebro" do app. Quando você rodar este arquivo,
//  o servidor começa a funcionar e fica esperando conexões.
// ─────────────────────────────────────────────────────────────

// Carrega as variáveis secretas do arquivo .env
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Garante que a pasta de fotos existe (importante no servidor da internet,
// que começa "zerado" toda vez que liga)
fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });

const app = express();
const PORT = process.env.PORT || 3000;

// ── MIDDLEWARES ──
// cors: permite que o app (frontend) se comunique com este servidor
app.use(cors());
// express.json: permite receber dados em formato JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Serve as fotos enviadas pelo app
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── ROTAS ──
// Cada rota é como uma "porta" do servidor.
// Quando o app pede algo, o servidor sabe qual porta usar.
app.use('/api/denuncias', require('./routes/denuncias'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/forum', require('./routes/forum'));
app.use('/api/lista-espera', require('./routes/lista-espera'));
app.use('/api/admin', require('./routes/admin'));

// Rota raiz — só para confirmar que está funcionando
app.get('/', (req, res) => {
  res.json({
    status: '✅ VIGIA Backend rodando!',
    versao: '1.0.0',
    endpoints: {
      denuncias: {
        'GET  /api/denuncias': 'Lista todas as denúncias',
        'POST /api/denuncias': 'Cria nova denúncia (com IRR calculado pela IA)',
        'GET  /api/denuncias/:id': 'Detalhes de uma denúncia',
        'GET  /api/denuncias/stats/resumo': 'Estatísticas gerais'
      },
      usuarios: {
        'POST /api/usuarios': 'Criar conta',
        'POST /api/usuarios/login': 'Fazer login',
        'GET  /api/usuarios/:id': 'Dados do usuário'
      }
    }
  });
});

// ── INICIA O SERVIDOR ──
// Primeiro prepara o banco de dados (local ou Turso), depois abre as portas
const db = require('./db/database');
db.init().then(() => {
app.listen(PORT, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════╗');
  console.log('║        🗺️  VIGIA BACKEND               ║');
  console.log('╠═══════════════════════════════════════╣');
  console.log(`║  ✅ Rodando em http://localhost:${PORT}   ║`);
  console.log(`║  📊 Banco de dados: db/vigia.db        ║`);
  console.log(`║  🤖 IRR: ${process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'sua_chave_aqui' ? 'Claude API ✅' : 'Modo local ⚠️ '}               ║`);
  console.log(`║  📧 E-mail: ${process.env.EMAIL_USER && process.env.EMAIL_USER !== 'seuemail@gmail.com' ? 'Configurado ✅  ' : 'Não configurado ⚠️'}      ║`);
  console.log('╚═══════════════════════════════════════╝');
  console.log('');
  console.log('Para parar o servidor: Ctrl + C');
  console.log('');
});
}).catch(err => {
  console.error('❌ Erro ao preparar o banco de dados:', err.message);
  process.exit(1);
});
