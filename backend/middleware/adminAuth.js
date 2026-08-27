// ─────────────────────────────────────────────────────────────
//  PROTEÇÃO DO PAINEL DE ADMINISTRAÇÃO
//  Toda rota que só o administrador pode usar passa por aqui.
//
//  Como funciona: cada administrador tem uma conta (tabela `admins`,
//  identificada por e-mail). Pra usar o painel, a pessoa recebe um
//  código de 6 dígitos por e-mail e troca esse código por um "token
//  de sessão" — uma string aleatória guardada no banco. O painel
//  manda esse token em toda requisição (campo "admin_token" no
//  corpo), e aqui a gente confere se ele bate com algum admin
//  aprovado. Só o admin geral pode aprovar/negar novos pedidos.
// ─────────────────────────────────────────────────────────────

const db = require('../db/database');

function pegarTokenEnviado(req) {
  return (req.body && req.body.admin_token) || req.headers['x-admin-token'] || '';
}

// Devolve os dados do admin dono desse token, ou null.
async function pegarAdmin(req) {
  const token = pegarTokenEnviado(req);
  if (!token) return null;
  const admin = await db.get("SELECT * FROM admins WHERE sessao_token = ? AND status = 'aprovado'", [token]);
  return admin || null;
}

async function checarAdmin(req, res, next) {
  try {
    const admin = await pegarAdmin(req);
    if (!admin) return res.status(401).json({ erro: 'Sessão inválida — faça login de novo no painel' });
    req.admin = admin;
    next();
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao checar sessão: ' + err.message });
  }
}

async function checarAdminGeral(req, res, next) {
  try {
    const admin = await pegarAdmin(req);
    if (!admin) return res.status(401).json({ erro: 'Sessão inválida — faça login de novo no painel' });
    if (!admin.admin_geral) return res.status(403).json({ erro: 'Só o administrador geral pode fazer isso' });
    req.admin = admin;
    next();
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao checar sessão: ' + err.message });
  }
}

module.exports = { checarAdmin, checarAdminGeral, pegarAdmin, pegarTokenEnviado };
