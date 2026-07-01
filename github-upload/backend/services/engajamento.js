// ─────────────────────────────────────────────────────────────
//  ENGAJAMENTO DA COMUNIDADE → BÔNUS NO IRR
//
//  Vitória tem ~400 mil habitantes. Uma pessoa sozinha não pode
//  mover muito o IRR — mas multidões devem mover.
//
//  Pressão (pontos por interação):
//    post no fórum ligado à denúncia = 3
//    foto nova adicionada           = 3
//    comentário                     = 2
//    like (👍)                      = 1
//    dislike (👎)                   = -1
//
//  Bônus no IRR: curva definida por pontos-âncora, com
//  interpolação entre eles:
//    pressão     1-10 → +1
//    pressão      100 → +3
//    pressão    1.000 → +8
//    pressão   10.000 → +20
//    pressão  100.000 → +25 (teto)
//
//  IRR exibido = irr_base (nota técnica original) + bônus, teto 99.
// ─────────────────────────────────────────────────────────────

const db = require('../db/database');

function bonusComunidade(pressao) {
  const p = Math.max(0, pressao);
  if (p === 0) return 0;
  // Pontos-âncora: [log10(pressão), bônus]
  const pontos = [[0, 1], [1, 1], [2, 3], [3, 8], [4, 20], [5, 25]];
  const x = Math.log10(p);
  if (x >= 5) return 25;
  for (let i = 0; i < pontos.length - 1; i++) {
    const [x1, y1] = pontos[i], [x2, y2] = pontos[i + 1];
    if (x <= x2) return Math.round(y1 + (y2 - y1) * (x - x1) / (x2 - x1));
  }
  return 25;
}

// Recalcula o IRR de uma denúncia somando a pressão da comunidade.
// Chamado sempre que alguém vota, comenta, posta ou adiciona foto.
async function recalcularIRR(denunciaId) {
  const den = await db.get('SELECT id, irr, irr_base, irr_motivo, foto_path FROM denuncias WHERE id = ?', [denunciaId]);
  if (!den) return null;

  const posts = Number((await db.get('SELECT COUNT(*) AS n FROM forum_posts WHERE denuncia_id = ?', [denunciaId])).n);
  const comentarios = Number((await db.get('SELECT COUNT(*) AS n FROM denuncia_comentarios WHERE denuncia_id = ?', [denunciaId])).n);
  const totalFotos = Number((await db.get('SELECT COUNT(*) AS n FROM denuncia_fotos WHERE denuncia_id = ?', [denunciaId])).n);
  // A foto original não conta como "interação da comunidade"
  const fotosExtras = Math.max(0, totalFotos - (den.foto_path ? 1 : 0));
  const votos = await db.get(`
    SELECT COALESCE(SUM(CASE WHEN voto = 1 THEN 1 ELSE 0 END), 0) AS likes,
           COALESCE(SUM(CASE WHEN voto = -1 THEN 1 ELSE 0 END), 0) AS dislikes
    FROM denuncia_votos WHERE denuncia_id = ?
  `, [denunciaId]);
  const likes = Number(votos.likes), dislikes = Number(votos.dislikes);

  const pressao = posts * 3 + fotosExtras * 3 + comentarios * 2 + likes - dislikes;
  const bonus = bonusComunidade(pressao);
  const base = den.irr_base != null ? Number(den.irr_base) : Number(den.irr);
  const novoIrr = Math.min(99, Math.max(1, base + bonus));

  // Atualiza o "motivo" sem acumular texto repetido
  const motivoBase = (den.irr_motivo || '')
    .replace(/\s*·\s*(Fórum|Comunidade):[^·]*/g, '').trim();
  const interacoes = posts + fotosExtras + comentarios + likes + dislikes;
  const motivo = interacoes > 0
    ? `${motivoBase} · Comunidade: ${interacoes} interaç${interacoes > 1 ? 'ões' : 'ão'} (+${bonus} no IRR)`
    : motivoBase;

  await db.run('UPDATE denuncias SET irr = ?, irr_motivo = ? WHERE id = ?', [novoIrr, motivo, denunciaId]);
  return { irr: novoIrr, bonus, pressao, likes, dislikes };
}

module.exports = { bonusComunidade, recalcularIRR };
