// ─────────────────────────────────────────────────────────────
//  ROTAS DE DENÚNCIAS
//  /api/denuncias — listar, criar, feed, votar, comentar, fotos
// ─────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../db/database');
const { calcularIRR } = require('../services/irr');
const { enviarEmailDenuncia } = require('../services/email');
const { getOrgao } = require('../services/orgaos');
const { encontrarDuplicada, verificarFoto } = require('../services/verificacao');
const { recalcularIRR } = require('../services/engajamento');
const { guardarFoto } = require('../services/fotos');

// Configuração do upload de fotos
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const ts = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `denuncia-${ts}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // máx 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Apenas imagens são permitidas'));
  }
});

// ─── GET /api/denuncias ───────────────────────────────────────
// Lista todas as denúncias (para mostrar no mapa)
router.get('/', async (req, res) => {
  try {
    const denuncias = await db.all(`
      SELECT id, lat, lng, tipo, descricao, irr, irr_motivo,
             anonima, nome_exibir, localizacao, status, criado_em
      FROM denuncias
      ORDER BY criado_em DESC
    `);
    res.json(denuncias);
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno: ' + err.message });
  }
});

// ─── GET /api/denuncias/feed ──────────────────────────────────
// Feed estilo rede social: cada denúncia com fotos, comentários,
// likes e dislikes. Ordenado por IRR (urgência).
// IMPORTANTE: precisa vir ANTES de '/:id' para não ser confundida.
router.get('/feed', async (req, res) => {
  try {
    const denuncias = await db.all(`
      SELECT id, lat, lng, tipo, descricao, irr, irr_motivo,
             anonima, nome_exibir, localizacao, status, criado_em
      FROM denuncias ORDER BY irr DESC, criado_em DESC
    `);

    const feed = [];
    for (const d of denuncias) {
      const fotos = await db.all('SELECT foto_path, autor FROM denuncia_fotos WHERE denuncia_id = ? ORDER BY criado_em', [d.id]);
      const com = await db.get('SELECT COUNT(*) AS n FROM denuncia_comentarios WHERE denuncia_id = ?', [d.id]);
      const votos = await db.get(`
        SELECT COALESCE(SUM(CASE WHEN voto = 1 THEN 1 ELSE 0 END), 0) AS likes,
               COALESCE(SUM(CASE WHEN voto = -1 THEN 1 ELSE 0 END), 0) AS dislikes
        FROM denuncia_votos WHERE denuncia_id = ?
      `, [d.id]);
      feed.push({
        ...d,
        orgao: getOrgao(d.tipo),
        fotos,
        comentarios: Number(com.n),
        likes: Number(votos.likes),
        dislikes: Number(votos.dislikes)
      });
    }
    res.json(feed);
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno: ' + err.message });
  }
});

// ─── POST /api/denuncias/verificar ────────────────────────────
// Checagem prévia: "já existe uma denúncia desse problema aqui?"
router.post('/verificar', async (req, res) => {
  try {
    const { lat, lng, tipo, descricao } = req.body;
    if (!lat || !lng || !tipo) return res.json({ duplicada: null });
    const abertas = await db.all(
      "SELECT id, lat, lng, tipo, descricao, localizacao, irr, foto_path, nome_exibir, anonima FROM denuncias WHERE status = 'aberta'"
    );
    const duplicada = await encontrarDuplicada({
      lat: parseFloat(lat), lng: parseFloat(lng), tipo, descricao, denuncias: abertas
    });
    res.json({ duplicada });
  } catch (err) {
    res.json({ duplicada: null }); // na dúvida, não atrapalha o usuário
  }
});

// ─── POST /api/denuncias ──────────────────────────────────────
// Cria uma nova denúncia
router.post('/', upload.single('foto'), async (req, res) => {
  try {
    const { lat, lng, tipo, descricao, anonima, usuario_id, nome_exibir, localizacao, forcar_nova } = req.body;

    if (!lat || !lng || !tipo) {
      return res.status(400).json({ erro: 'lat, lng e tipo são obrigatórios' });
    }

    // Rede de segurança contra duplicadas
    if (forcar_nova !== 'true' && forcar_nova !== true) {
      const abertas = await db.all(
        "SELECT id, lat, lng, tipo, descricao, localizacao, irr, foto_path, nome_exibir, anonima FROM denuncias WHERE status = 'aberta'"
      );
      const duplicada = await encontrarDuplicada({
        lat: parseFloat(lat), lng: parseFloat(lng), tipo, descricao, denuncias: abertas
      });
      if (duplicada) {
        return res.status(409).json({ erro: 'Possível denúncia duplicada', duplicada });
      }
    }

    // Verificação de veracidade da foto (Claude com visão)
    // e envio para a nuvem permanente (Cloudinary, se configurado)
    let fotoRef = null;
    if (req.file) {
      const check = await verificarFoto({ fotoPath: req.file.path, tipo, descricao });
      if (!check.aprovada) {
        return res.status(422).json({ erro_foto: check.motivo || 'A foto não parece corresponder ao problema denunciado.' });
      }
      fotoRef = await guardarFoto(req.file.path, req.file.filename);
    }

    // Calcular IRR com IA
    console.log('🤖 Calculando IRR...');
    const { irr, motivo } = await calcularIRR({ tipo, descricao, localizacao });
    console.log(`   IRR calculado: ${irr}% — ${motivo}`);

    // Salvar no banco (irr_base = nota técnica original)
    const result = await db.run(`
      INSERT INTO denuncias (lat, lng, tipo, descricao, foto_path, irr, irr_base, irr_motivo, anonima, usuario_id, nome_exibir, localizacao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      parseFloat(lat), parseFloat(lng), tipo,
      descricao || null,
      fotoRef,
      irr, irr, motivo,
      anonima === 'true' || anonima === true ? 1 : 0,
      usuario_id || null,
      nome_exibir || null,
      localizacao || null
    ]);

    // Registra a foto original também na galeria da denúncia
    if (fotoRef) {
      await db.run('INSERT INTO denuncia_fotos (denuncia_id, foto_path, autor) VALUES (?, ?, ?)', [
        result.lastInsertRowid, fotoRef,
        (anonima === 'true' || anonima === true) ? 'Anônimo' : (nome_exibir || 'Anônimo')
      ]);
    }

    const denuncia = await db.get('SELECT * FROM denuncias WHERE id = ?', [result.lastInsertRowid]);
    const orgao = getOrgao(tipo);

    // Enviar e-mail se usuário tem conta
    if (usuario_id && anonima !== 'true') {
      const usuario = await db.get('SELECT * FROM usuarios WHERE id = ?', [usuario_id]);
      if (usuario?.email) {
        enviarEmailDenuncia({
          destinatario: usuario.email,
          nome: usuario.nome,
          denuncia,
          orgao
        }).catch(err => console.error('Erro ao enviar e-mail:', err.message));
      }
    }

    console.log(`🚨 Denúncia #${denuncia.id} registrada: ${tipo} | IRR ${irr}% | ${localizacao || 'Vitória'}`);
    res.status(201).json({ mensagem: 'Denúncia registrada!', denuncia, orgao });

  } catch (err) {
    console.error('Erro ao criar denúncia:', err);
    res.status(500).json({ erro: 'Erro interno: ' + err.message });
  }
});

// ─── POST /api/denuncias/:id/votar ────────────────────────────
// Like (voto: 1) ou dislike (voto: -1). "chave" identifica quem
// votou (1 voto por pessoa). Votar de novo no mesmo = remove o voto.
router.post('/:id/votar', async (req, res) => {
  try {
    const den = await db.get('SELECT id FROM denuncias WHERE id = ?', [req.params.id]);
    if (!den) return res.status(404).json({ erro: 'Denúncia não encontrada' });

    const voto = req.body.voto === -1 || req.body.voto === '-1' ? -1 : 1;
    const chave = String(req.body.chave || '').slice(0, 80);
    if (!chave) return res.status(400).json({ erro: 'chave é obrigatória' });

    const existente = await db.get('SELECT id, voto FROM denuncia_votos WHERE denuncia_id = ? AND chave = ?', [den.id, chave]);
    if (existente && Number(existente.voto) === voto) {
      await db.run('DELETE FROM denuncia_votos WHERE id = ?', [existente.id]);
    } else if (existente) {
      await db.run('UPDATE denuncia_votos SET voto = ? WHERE id = ?', [voto, existente.id]);
    } else {
      await db.run('INSERT INTO denuncia_votos (denuncia_id, chave, voto) VALUES (?, ?, ?)', [den.id, chave, voto]);
    }

    const r = await recalcularIRR(den.id);
    res.json({ likes: r.likes, dislikes: r.dislikes, irr: r.irr });
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno: ' + err.message });
  }
});

// ─── GET/POST /api/denuncias/:id/comentarios ──────────────────
router.get('/:id/comentarios', async (req, res) => {
  try {
    res.json(await db.all('SELECT id, autor, texto, criado_em FROM denuncia_comentarios WHERE denuncia_id = ? ORDER BY criado_em DESC', [req.params.id]));
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno: ' + err.message });
  }
});

router.post('/:id/comentarios', async (req, res) => {
  try {
    const den = await db.get('SELECT id FROM denuncias WHERE id = ?', [req.params.id]);
    if (!den) return res.status(404).json({ erro: 'Denúncia não encontrada' });
    const { autor, texto, usuario_id } = req.body;
    if (!texto || !texto.trim()) return res.status(400).json({ erro: 'O texto é obrigatório' });

    const result = await db.run('INSERT INTO denuncia_comentarios (denuncia_id, usuario_id, autor, texto) VALUES (?, ?, ?, ?)', [
      den.id, usuario_id || null, (autor || 'Anônimo').slice(0, 60), texto.trim().slice(0, 500)
    ]);
    const r = await recalcularIRR(den.id);
    res.status(201).json({
      comentario: await db.get('SELECT * FROM denuncia_comentarios WHERE id = ?', [result.lastInsertRowid]),
      irr: r.irr
    });
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno: ' + err.message });
  }
});

// ─── POST /api/denuncias/:id/fotos ────────────────────────────
// Cidadão adiciona uma foto nova a uma denúncia existente
router.post('/:id/fotos', upload.single('foto'), async (req, res) => {
  try {
    const den = await db.get('SELECT id, tipo, descricao FROM denuncias WHERE id = ?', [req.params.id]);
    if (!den) return res.status(404).json({ erro: 'Denúncia não encontrada' });
    if (!req.file) return res.status(400).json({ erro: 'Envie uma imagem' });

    const check = await verificarFoto({ fotoPath: req.file.path, tipo: den.tipo, descricao: den.descricao });
    if (!check.aprovada) {
      return res.status(422).json({ erro_foto: check.motivo || 'A foto não parece corresponder ao problema.' });
    }

    const fotoRef = await guardarFoto(req.file.path, req.file.filename);
    await db.run('INSERT INTO denuncia_fotos (denuncia_id, foto_path, autor) VALUES (?, ?, ?)', [
      den.id, fotoRef, (req.body.autor || 'Anônimo').slice(0, 60)
    ]);
    const r = await recalcularIRR(den.id);
    res.status(201).json({ mensagem: 'Foto adicionada!', foto_path: fotoRef, irr: r.irr });
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno: ' + err.message });
  }
});

// ─── GET /api/denuncias/stats/resumo ─────────────────────────
// Estatísticas gerais (para dashboard)
router.get('/stats/resumo', async (req, res) => {
  try {
    const total = Number((await db.get('SELECT COUNT(*) as n FROM denuncias')).n);
    const abertas = Number((await db.get("SELECT COUNT(*) as n FROM denuncias WHERE status='aberta'")).n);
    const resolvidas = Number((await db.get("SELECT COUNT(*) as n FROM denuncias WHERE status='resolvida'")).n);
    const porTipo = await db.all('SELECT tipo, COUNT(*) as total FROM denuncias GROUP BY tipo ORDER BY total DESC');
    const irrMedio = (await db.get('SELECT AVG(irr) as media FROM denuncias')).media;
    res.json({ total, abertas, resolvidas, irrMedio: Math.round(Number(irrMedio) || 0), porTipo });
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno: ' + err.message });
  }
});

// ─── GET /api/denuncias/:id ───────────────────────────────────
// Detalhes de uma denúncia específica
router.get('/:id', async (req, res) => {
  try {
    const denuncia = await db.get('SELECT * FROM denuncias WHERE id = ?', [req.params.id]);
    if (!denuncia) return res.status(404).json({ erro: 'Denúncia não encontrada' });
    res.json({ denuncia, orgao: getOrgao(denuncia.tipo) });
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno: ' + err.message });
  }
});

module.exports = router;
