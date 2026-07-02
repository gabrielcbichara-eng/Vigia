// ─────────────────────────────────────────────────────────────
//  ROTA DA LISTA DE NOVIDADES (site de divulgação)
//  POST /api/lista-espera — guarda o e-mail e manda uma confirmação
// ─────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { enviarEmailListaEspera } = require('../services/email');

router.post('/', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ erro: 'Informe um e-mail válido' });
    }

    const existente = await db.get('SELECT id FROM lista_espera WHERE email = ?', [email]);
    if (!existente) {
      await db.run('INSERT INTO lista_espera (email) VALUES (?)', [email]);
      console.log(`📬 Novo e-mail na lista de novidades: ${email}`);
      enviarEmailListaEspera({ destinatario: email }).catch(err => console.error('Erro ao enviar confirmação:', err.message));
    }

    res.status(201).json({ mensagem: 'Inscrito!' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno: ' + err.message });
  }
});

module.exports = router;
