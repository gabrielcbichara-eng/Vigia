// ─────────────────────────────────────────────────────────────
//  ROTAS DO FÓRUM
//  GET  /api/forum                 → lista os posts, por urgência
//  POST /api/forum                 → publica post (IA analisa e pode
//                                    aumentar o IRR da denúncia ligada)
//  GET/POST /api/forum/:id/comentarios → comentários do post
//  POST /api/forum/:id/curtir      → curte ou descurte um post
// ─────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { ligarPostADenuncia } = require('../services/forum-ia');
const { recalcularIRR } = require('../services/engajamento');
const { checarAdmin } = require('../middleware/adminAuth');

// ── LISTAR POSTS ──
// Ordem por "pontuação de urgência": IRR da denúncia ligada vale
// muito (x10), curtidas valem um pouco (x2), e posts recentes ganham
// um empurrãozinho (até 100 pontos que somem em ~4 dias).
router.get('/', async (req, res) => {
  try {
    const posts = await db.all(`
      SELECT p.id, p.autor, p.tag, p.texto, p.curtidas, p.denuncia_id, p.criado_em,
             d.irr AS den_irr, d.tipo AS den_tipo, d.localizacao AS den_loc,
             (SELECT COUNT(*) FROM forum_comentarios fc WHERE fc.post_id = p.id) AS comentarios
      FROM forum_posts p
      LEFT JOIN denuncias d ON p.denuncia_id = d.id
    `);

    const agora = Date.now();
    const lista = posts.map(p => {
      const horas = (agora - new Date(String(p.criado_em).replace(' ', 'T') + 'Z').getTime()) / 3600000;
      return { ...p, comentarios: Number(p.comentarios), score: Number(p.den_irr || 0) * 10 + Number(p.curtidas) * 2 + Math.max(0, 100 - horas) };
    });
    lista.sort((a, b) => b.score - a.score);
    res.json(lista);
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno: ' + err.message });
  }
});

// ── PUBLICAR POST ──
router.post('/', async (req, res) => {
  try {
    const { autor, tag, texto, usuario_id } = req.body;
    if (!texto || !texto.trim()) return res.status(400).json({ erro: 'O texto do post é obrigatório' });

    // 1. Salva o post
    const result = await db.run(
      'INSERT INTO forum_posts (usuario_id, autor, tag, texto) VALUES (?, ?, ?, ?)',
      [usuario_id || null, (autor || 'Anônimo').slice(0, 60), tag || 'forum', texto.trim().slice(0, 1000)]
    );
    const postId = result.lastInsertRowid;

    // 2. A IA tenta descobrir de qual denúncia aberta o post fala
    const denunciasAbertas = await db.all(
      "SELECT id, tipo, descricao, localizacao, irr, irr_motivo FROM denuncias WHERE status = 'aberta' ORDER BY criado_em DESC LIMIT 30"
    );

    let vinculo = null;
    const denunciaId = await ligarPostADenuncia({ texto, denuncias: denunciasAbertas });

    if (denunciaId) {
      // 3. Liga o post à denúncia
      await db.run('UPDATE forum_posts SET denuncia_id = ? WHERE id = ?', [denunciaId, postId]);

      // 4. Recalcula o IRR com a pressão total da comunidade
      const den = denunciasAbertas.find(d => d.id === denunciaId);
      const resultado = await recalcularIRR(denunciaId);

      vinculo = {
        denuncia_id: denunciaId,
        tipo: den.tipo,
        localizacao: den.localizacao,
        irr_antigo: Number(den.irr),
        irr_novo: resultado ? resultado.irr : Number(den.irr)
      };
      console.log(`🤖 Post #${postId} ligado à denúncia #${denunciaId} — IRR ${den.irr}% → ${vinculo.irr_novo}%`);
    }

    const post = await db.get('SELECT * FROM forum_posts WHERE id = ?', [postId]);
    res.status(201).json({ mensagem: 'Post publicado!', post, vinculo });
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno: ' + err.message });
  }
});

// ── COMENTÁRIOS DOS POSTS ──
router.get('/:id/comentarios', async (req, res) => {
  try {
    res.json(await db.all('SELECT id, autor, texto, criado_em FROM forum_comentarios WHERE post_id = ? ORDER BY criado_em DESC', [req.params.id]));
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno: ' + err.message });
  }
});

router.post('/:id/comentarios', async (req, res) => {
  try {
    const post = await db.get('SELECT id FROM forum_posts WHERE id = ?', [req.params.id]);
    if (!post) return res.status(404).json({ erro: 'Post não encontrado' });
    const { autor, texto, usuario_id } = req.body;
    if (!texto || !texto.trim()) return res.status(400).json({ erro: 'O texto é obrigatório' });
    const result = await db.run(
      'INSERT INTO forum_comentarios (post_id, usuario_id, autor, texto) VALUES (?, ?, ?, ?)',
      [post.id, usuario_id || null, (autor || 'Anônimo').slice(0, 60), texto.trim().slice(0, 500)]
    );
    res.status(201).json({ comentario: await db.get('SELECT * FROM forum_comentarios WHERE id = ?', [result.lastInsertRowid]) });
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno: ' + err.message });
  }
});

// ── CURTIR / DESCURTIR ──
router.post('/:id/curtir', async (req, res) => {
  try {
    const delta = req.body && (req.body.delta === -1 || req.body.delta === '-1') ? -1 : 1;
    const post = await db.get('SELECT id, curtidas FROM forum_posts WHERE id = ?', [req.params.id]);
    if (!post) return res.status(404).json({ erro: 'Post não encontrado' });
    const novas = Math.max(0, Number(post.curtidas) + delta);
    await db.run('UPDATE forum_posts SET curtidas = ? WHERE id = ?', [novas, post.id]);
    res.json({ curtidas: novas });
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno: ' + err.message });
  }
});

// ─── DELETE /api/forum/:id ─────────────────────────────────────
// Apaga um post e os comentários dele (admin — moderação)
router.delete('/:id', checarAdmin, async (req, res) => {
  try {
    await db.run('DELETE FROM forum_comentarios WHERE post_id = ?', [req.params.id]);
    const result = await db.run('DELETE FROM forum_posts WHERE id = ?', [req.params.id]);
    if (result.changes === 0) return res.status(404).json({ erro: 'Post não encontrado' });
    res.json({ ok: true, mensagem: 'Post apagado' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno: ' + err.message });
  }
});

// ─── DELETE /api/forum/:id/comentarios/:comentarioId ───────────
// Apaga um comentário de um post (admin — moderação)
router.delete('/:id/comentarios/:comentarioId', checarAdmin, async (req, res) => {
  try {
    const result = await db.run('DELETE FROM forum_comentarios WHERE id = ? AND post_id = ?', [req.params.comentarioId, req.params.id]);
    if (result.changes === 0) return res.status(404).json({ erro: 'Comentário não encontrado' });
    res.json({ ok: true, mensagem: 'Comentário apagado' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno: ' + err.message });
  }
});

module.exports = router;
