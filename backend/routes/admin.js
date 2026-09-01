// ─────────────────────────────────────────────────────────────
//  ROTAS DE ADMINISTRAÇÃO
//
//  Fluxo "Já tem conta?" (admins normais):
//    POST /entrar            → confere e-mail, manda código
//    POST /verificar-codigo  → confere código, devolve token
//    POST /sair              → invalida o token
//    POST /me                → confere se um token salvo ainda vale
//
//  Login rápido do admin geral (variável de ambiente ADMIN_PASSWORD,
//  sem precisar de código por e-mail toda vez):
//    POST /entrar-geral
//
//  Fluxo "Criar uma nova conta admin":
//    POST /solicitar         → pede acesso (fica pendente)
//
//  Só o admin geral:
//    GET  /pedidos           → lista pedidos pendentes
//    POST /pedidos/:id/aprovar
//    POST /pedidos/:id/negar
// ─────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db/database');
const { checarAdminGeral, pegarAdmin } = require('../middleware/adminAuth');
const {
  enviarEmailCodigoAdmin, enviarEmailPedidoAdmin,
  enviarEmailAdminAprovado, enviarEmailAdminNegado, emailConfigurado
} = require('../services/email');

function gerarCodigo() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
function gerarToken() {
  return crypto.randomBytes(24).toString('hex');
}

const REGIOES_VALIDAS = ['vitoria', 'piranema', 'ambos'];
function normalizarRegiao(v) {
  return REGIOES_VALIDAS.includes(v) ? v : 'ambos';
}

// ── Login rápido do admin geral: só senha, sem e-mail/código ──
router.post('/entrar-geral', async (req, res) => {
  try {
    const senha = String(req.body.senha || '');
    if (!process.env.ADMIN_PASSWORD) {
      return res.status(503).json({ erro: 'Login por senha não configurado no servidor' });
    }
    if (!senha || senha !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ erro: 'Senha incorreta' });
    }
    const geral = await db.get("SELECT * FROM admins WHERE admin_geral = 1 AND status = 'aprovado'");
    if (!geral) return res.status(500).json({ erro: 'Admin geral não encontrado no banco' });

    const token = gerarToken();
    await db.run('UPDATE admins SET sessao_token = ? WHERE id = ?', [token, geral.id]);
    res.json({ token, email: geral.email, admin_geral: true, regiao: 'ambos' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro: ' + err.message });
  }
});

// ── PASSO 1 de "Já tem conta?": confere o e-mail e manda código ──
router.post('/entrar', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ erro: 'Informe o e-mail' });

    const admin = await db.get('SELECT * FROM admins WHERE email = ?', [email]);
    if (!admin || admin.status !== 'aprovado') {
      return res.status(401).json({ erro: 'E-mail inválido, busque autorização' });
    }

    const codigo = gerarCodigo();
    await db.run('UPDATE admins SET codigo_verif = ? WHERE id = ?', [codigo, admin.id]);

    if (!emailConfigurado()) {
      // Sem e-mail configurado (só acontece em desenvolvimento local —
      // em produção o e-mail sempre está configurado): mostra o código
      // no console do servidor, já que não há como mandar por e-mail.
      console.log(`🔑 [DEV — sem e-mail configurado] Código de admin para ${email}: ${codigo}`);
      return res.json({ mensagem: 'E-mail não configurado — veja o código no console do servidor (modo dev)', codigo_dev: codigo });
    }

    const resultado = await enviarEmailCodigoAdmin({ destinatario: email, codigo });
    if (!resultado.ok) {
      return res.status(502).json({ erro: 'Não conseguimos enviar o e-mail: ' + resultado.erro });
    }
    res.json({ mensagem: 'Código enviado! Confira seu e-mail.' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro: ' + err.message });
  }
});

// ── PASSO 2: confere o código e devolve o token de sessão ──
router.post('/verificar-codigo', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const codigo = String(req.body.codigo || '').trim();
    if (!email || !codigo) return res.status(400).json({ erro: 'Informe e-mail e código' });

    const admin = await db.get('SELECT * FROM admins WHERE email = ?', [email]);
    if (!admin || admin.status !== 'aprovado') {
      return res.status(401).json({ erro: 'E-mail inválido, busque autorização' });
    }
    if (!admin.codigo_verif || String(admin.codigo_verif) !== codigo) {
      return res.status(400).json({ erro: 'Código incorreto' });
    }

    const token = gerarToken();
    await db.run('UPDATE admins SET sessao_token = ?, codigo_verif = NULL WHERE id = ?', [token, admin.id]);
    res.json({ token, email: admin.email, admin_geral: !!admin.admin_geral, regiao: admin.admin_geral ? 'ambos' : (admin.regiao || 'ambos') });
  } catch (err) {
    res.status(500).json({ erro: 'Erro: ' + err.message });
  }
});

// ── Confere se um token salvo (localStorage) ainda é válido ──
router.post('/me', async (req, res) => {
  const admin = await pegarAdmin(req);
  if (!admin) return res.status(401).json({ erro: 'Sessão inválida' });
  res.json({ email: admin.email, admin_geral: !!admin.admin_geral, regiao: admin.admin_geral ? 'ambos' : (admin.regiao || 'ambos') });
});

// ── Sai da conta (invalida o token no servidor) ──
router.post('/sair', async (req, res) => {
  try {
    const admin = await pegarAdmin(req);
    if (admin) await db.run('UPDATE admins SET sessao_token = NULL WHERE id = ?', [admin.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro: ' + err.message });
  }
});

// ── "Criar uma nova conta admin": pede acesso ──
router.post('/solicitar', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) return res.status(400).json({ erro: 'Informe um e-mail válido' });
    const regiao = normalizarRegiao(req.body.regiao);

    const existente = await db.get('SELECT * FROM admins WHERE email = ?', [email]);
    if (existente && existente.status === 'aprovado') {
      return res.status(409).json({ erro: 'Esse e-mail já é administrador — use "Já tem conta"' });
    }
    if (existente && existente.status === 'pendente') {
      return res.status(409).json({ erro: 'Já existe um pedido aguardando aprovação para esse e-mail' });
    }

    if (existente) {
      await db.run("UPDATE admins SET status = 'pendente', regiao_solicitada = ?, regiao = ? WHERE id = ?", [regiao, regiao, existente.id]);
    } else {
      await db.run("INSERT INTO admins (email, status, regiao_solicitada, regiao) VALUES (?, 'pendente', ?, ?)", [email, regiao, regiao]);
    }

    // Avisa o(s) admin(s) geral(is) por e-mail, com link direto pro painel
    const gerais = await db.all("SELECT email FROM admins WHERE admin_geral = 1 AND status = 'aprovado'");
    for (const g of gerais) {
      enviarEmailPedidoAdmin({ destinatario: g.email, emailSolicitante: email }).catch(err => console.error('Erro ao avisar admin geral:', err.message));
    }

    res.status(201).json({ mensagem: 'Pedido enviado! Aguarde a aprovação do administrador geral.' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro: ' + err.message });
  }
});

// ── Lista pedidos pendentes (só admin geral) ──
router.get('/pedidos', checarAdminGeral, async (req, res) => {
  try {
    const pedidos = await db.all("SELECT id, email, regiao_solicitada, criado_em FROM admins WHERE status = 'pendente' ORDER BY criado_em DESC");
    res.json(pedidos);
  } catch (err) {
    res.status(500).json({ erro: 'Erro: ' + err.message });
  }
});

// ── Aprova um pedido (só admin geral) ──
router.post('/pedidos/:id/aprovar', checarAdminGeral, async (req, res) => {
  try {
    const pedido = await db.get('SELECT * FROM admins WHERE id = ?', [req.params.id]);
    if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado' });
    // O admin geral pode confirmar a região pedida ou trocar por outra na hora de aprovar
    const regiao = req.body.regiao ? normalizarRegiao(req.body.regiao) : (pedido.regiao_solicitada || 'ambos');
    await db.run("UPDATE admins SET status = 'aprovado', regiao = ? WHERE id = ?", [regiao, pedido.id]);
    enviarEmailAdminAprovado({ destinatario: pedido.email }).catch(err => console.error('Erro ao avisar aprovação:', err.message));
    res.json({ mensagem: 'Aprovado!' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro: ' + err.message });
  }
});

// ── Nega um pedido (só admin geral) ──
router.post('/pedidos/:id/negar', checarAdminGeral, async (req, res) => {
  try {
    const pedido = await db.get('SELECT * FROM admins WHERE id = ?', [req.params.id]);
    if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado' });
    await db.run("UPDATE admins SET status = 'negado' WHERE id = ?", [pedido.id]);
    enviarEmailAdminNegado({ destinatario: pedido.email }).catch(err => console.error('Erro ao avisar negação:', err.message));
    res.json({ mensagem: 'Negado' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro: ' + err.message });
  }
});

// ── Lista todos os administradores aprovados (só admin geral) ──
router.get('/lista', checarAdminGeral, async (req, res) => {
  try {
    const admins = await db.all("SELECT id, email, admin_geral, regiao, criado_em FROM admins WHERE status = 'aprovado' ORDER BY admin_geral DESC, criado_em ASC");
    res.json(admins);
  } catch (err) {
    res.status(500).json({ erro: 'Erro: ' + err.message });
  }
});

// ── Muda a região de um admin já aprovado (só admin geral) ──
router.patch('/:id/regiao', checarAdminGeral, async (req, res) => {
  try {
    const alvo = await db.get('SELECT * FROM admins WHERE id = ?', [req.params.id]);
    if (!alvo) return res.status(404).json({ erro: 'Admin não encontrado' });
    if (alvo.admin_geral) return res.status(403).json({ erro: 'O administrador geral sempre vê tudo' });
    const regiao = normalizarRegiao(req.body.regiao);
    await db.run('UPDATE admins SET regiao = ? WHERE id = ?', [regiao, alvo.id]);
    res.json({ mensagem: 'Região atualizada', regiao });
  } catch (err) {
    res.status(500).json({ erro: 'Erro: ' + err.message });
  }
});

// ── Remove um administrador (só admin geral) ──
// A conta removida perde a sessão na hora e precisa pedir acesso de
// novo (Criar uma nova conta admin) e esperar aprovação, como se
// nunca tivesse sido admin. O admin geral não pode ser removido.
router.delete('/:id', checarAdminGeral, async (req, res) => {
  try {
    const alvo = await db.get('SELECT * FROM admins WHERE id = ?', [req.params.id]);
    if (!alvo) return res.status(404).json({ erro: 'Admin não encontrado' });
    if (alvo.admin_geral) return res.status(403).json({ erro: 'Não é possível remover o administrador geral' });
    await db.run('DELETE FROM admins WHERE id = ?', [alvo.id]);
    res.json({ mensagem: 'Admin removido' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro: ' + err.message });
  }
});

module.exports = router;
