// ─────────────────────────────────────────────────────────────
//  ROTAS DE USUÁRIOS
//  /api/usuarios — criar conta, buscar usuário, login
// ─────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { enviarEmailCodigo, enviarEmailBoasVindas, emailConfigurado } = require('../services/email');

// Gera um código de verificação de 6 dígitos
function gerarCodigo() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// POST /api/usuarios — criar nova conta
// Com e-mail configurado: a conta nasce "pendente" e recebe um
// código de 6 dígitos por e-mail. Sem e-mail: nasce ativa direto.
router.post('/', async (req, res) => {
  try {
    const { nome, sobrenome, email, tel, cpf, cep, nascimento, genero } = req.body;

    // Validação básica
    if (!nome || !sobrenome || !email || !cpf || !cep) {
      return res.status(400).json({ erro: 'Campos obrigatórios: nome, sobrenome, email, cpf, cep' });
    }

    // Verifica se CPF ou e-mail já existem
    const existente = await db.get('SELECT id FROM usuarios WHERE cpf = ? OR email = ?', [cpf, email]);
    if (existente) {
      return res.status(409).json({ erro: 'CPF ou e-mail já cadastrado' });
    }

    const podeVerificar = emailConfigurado();
    const codigo = podeVerificar ? gerarCodigo() : null;

    const result = await db.run(
      'INSERT INTO usuarios (nome, sobrenome, email, tel, cpf, cep, nascimento, genero, verificado, codigo_verif) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [nome, sobrenome, email, tel || null, cpf, cep, nascimento || null, genero || null, podeVerificar ? 0 : 1, codigo]
    );

    if (podeVerificar) {
      enviarEmailCodigo({ destinatario: email, nome, codigo }).catch(err => console.error('Erro ao enviar código:', err.message));
    }

    const usuario = await db.get('SELECT * FROM usuarios WHERE id = ?', [result.lastInsertRowid]);
    delete usuario.codigo_verif; // o código nunca viaja na resposta!
    console.log(`👤 Novo usuário: ${nome} ${sobrenome} (${email})${podeVerificar ? ' — aguardando verificação' : ''}`);
    res.status(201).json({ mensagem: 'Conta criada!', usuario, precisa_verificar: podeVerificar });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao criar conta: ' + err.message });
  }
});

// POST /api/usuarios/verificar — ativa a conta com o código de 6 dígitos
router.post('/verificar', async (req, res) => {
  try {
    const { email, codigo } = req.body;
    if (!email || !codigo) return res.status(400).json({ erro: 'Informe e-mail e código' });

    const usuario = await db.get('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (!usuario) return res.status(404).json({ erro: 'Conta não encontrada' });
    if (Number(usuario.verificado) === 1) return res.json({ mensagem: 'Conta já está ativa!', usuario: { id: usuario.id } });

    if (String(usuario.codigo_verif) !== String(codigo).trim()) {
      return res.status(400).json({ erro: 'Código incorreto. Confira o e-mail e tente de novo.' });
    }

    await db.run('UPDATE usuarios SET verificado = 1, codigo_verif = NULL WHERE id = ?', [usuario.id]);
    // Agora sim: e-mail de boas-vindas
    enviarEmailBoasVindas({ destinatario: usuario.email, nome: usuario.nome }).catch(() => {});
    console.log(`✅ Conta verificada: ${usuario.email}`);
    res.json({ mensagem: 'Conta verificada!', usuario: { id: usuario.id } });
  } catch (err) {
    res.status(500).json({ erro: 'Erro: ' + err.message });
  }
});

// POST /api/usuarios/reenviar-codigo — gera e envia um novo código
router.post('/reenviar-codigo', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ erro: 'Informe o e-mail' });
    const usuario = await db.get('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (!usuario) return res.status(404).json({ erro: 'Conta não encontrada' });
    if (Number(usuario.verificado) === 1) return res.json({ mensagem: 'Conta já está ativa!' });
    if (!emailConfigurado()) return res.status(503).json({ erro: 'Envio de e-mail não configurado no servidor' });

    const codigo = gerarCodigo();
    await db.run('UPDATE usuarios SET codigo_verif = ? WHERE id = ?', [codigo, usuario.id]);
    await enviarEmailCodigo({ destinatario: usuario.email, nome: usuario.nome, codigo });
    res.json({ mensagem: 'Novo código enviado!' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro: ' + err.message });
  }
});

// GET /api/usuarios/:id — buscar usuário por ID
router.get('/:id', async (req, res) => {
  try {
    const usuario = await db.get('SELECT * FROM usuarios WHERE id = ?', [req.params.id]);
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });
    // Remove CPF da resposta por segurança
    const { cpf, ...seguro } = usuario;
    res.json(seguro);
  } catch (err) {
    res.status(500).json({ erro: 'Erro: ' + err.message });
  }
});

// POST /api/usuarios/login — login por e-mail + CPF
router.post('/login', async (req, res) => {
  try {
    const { email, cpf } = req.body;
    if (!email || !cpf) return res.status(400).json({ erro: 'Informe e-mail e CPF' });

    const usuario = await db.get('SELECT * FROM usuarios WHERE email = ? AND cpf = ?', [email, cpf]);
    if (!usuario) return res.status(401).json({ erro: 'E-mail ou CPF incorretos' });

    // Conta ainda não verificada → pede o código
    if (Number(usuario.verificado) !== 1) {
      return res.status(403).json({ erro: 'Conta ainda não verificada. Digite o código enviado por e-mail.', precisa_verificar: true });
    }

    delete usuario.codigo_verif;
    console.log(`🔑 Login: ${usuario.nome} ${usuario.sobrenome}`);
    res.json({ mensagem: 'Login realizado!', usuario });
  } catch (err) {
    res.status(500).json({ erro: 'Erro: ' + err.message });
  }
});

module.exports = router;
