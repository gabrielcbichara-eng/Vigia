// ─────────────────────────────────────────────────────────────
//  IA DE VERIFICAÇÃO
//  1. Denúncia duplicada: antes de criar uma denúncia, confere se
//     já existe outra do MESMO problema no MESMO lugar.
//  2. Veracidade da foto: o Claude olha a imagem e confere se
//     parece uma fotografia real E se mostra o problema descrito.
//     (Honestidade: nenhuma IA detecta 100% das fotos falsas —
//     isto é um filtro forte, não uma garantia.)
//
//  Sem chave da API: a checagem de duplicada usa só distância+tipo,
//  e a checagem de foto é pulada (aprova tudo).
// ─────────────────────────────────────────────────────────────

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const tiposLabels = {
  esgoto: 'Esgoto / Vazamento de esgoto',
  buraco: 'Buraco na pista/calçada',
  poste: 'Poste de luz apagado',
  fiacao: 'Fiação elétrica solta/perigosa',
  vazamento: 'Vazamento de água',
  lixo: 'Lixo acumulado',
  calcada: 'Calçada danificada',
  arvore: 'Árvore caída ou em risco',
  outro: 'Outro problema'
};

function temChaveAPI() {
  return process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'sua_chave_aqui';
}

// Distância em metros entre dois pontos do mapa (fórmula de Haversine)
function distanciaMetros(lat1, lng1, lat2, lng2) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ── 1. DUPLICADA? ──
// Recebe a denúncia nova e a lista de denúncias abertas.
// Devolve a denúncia existente que parece ser o mesmo problema, ou null.
async function encontrarDuplicada({ lat, lng, tipo, descricao, denuncias }) {
  // Só interessam denúncias num raio de 500 m
  const candidatas = denuncias
    .map(d => ({ ...d, dist: Math.round(distanciaMetros(lat, lng, d.lat, d.lng)) }))
    .filter(d => d.dist <= 500)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 10);
  if (candidatas.length === 0) return null;

  // Sem IA: mesmo tipo a menos de 200 m = provável duplicada
  if (!temChaveAPI()) {
    const local = candidatas.find(d => d.tipo === tipo && d.dist <= 200);
    return local || null;
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const lista = candidatas.map(d =>
      `#${d.id} — ${tiposLabels[d.tipo] || d.tipo} a ${d.dist}m de distância, em ${d.localizacao || 'Vitória'}: "${(d.descricao || '').slice(0, 120)}"`
    ).join('\n');

    const prompt = `Você é o sistema de IA do VIGIA, app de monitoramento urbano de Vitória, ES.

Um cidadão está criando uma NOVA denúncia. Decida se ela é o MESMO problema de alguma denúncia já aberta (mesmo tipo de problema, mesmo local — distâncias pequenas como até ~150m podem ser o mesmo problema).

NOVA DENÚNCIA:
- Tipo: ${tiposLabels[tipo] || tipo}
- Descrição: "${(descricao || '(sem descrição)').slice(0, 300)}"

DENÚNCIAS JÁ ABERTAS (perto do local):
${lista}

Em caso de dúvida, responda null. Responda APENAS com JSON:
{"denuncia_id": 2} ou {"denuncia_id": null}`;

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 50,
      messages: [{ role: 'user', content: prompt }]
    });
    const match = msg.content[0].text.trim().match(/\{[\s\S]*\}/);
    if (!match) return null;
    const r = JSON.parse(match[0]);
    return candidatas.find(d => d.id === r.denuncia_id) || null;
  } catch (err) {
    console.error('⚠️  Erro na IA de duplicadas, usando checagem local:', err.message);
    const local = candidatas.find(d => d.tipo === tipo && d.dist <= 200);
    return local || null;
  }
}

// ── 2. FOTO CONFERE? ──
// O Claude olha a foto e responde: parece fotografia real?
// Mostra o problema descrito? Devolve {aprovada, motivo}.
// Qualquer erro técnico → aprova (nunca bloquear o cidadão por falha nossa).
async function verificarFoto({ fotoPath, tipo, descricao }) {
  if (!fotoPath || !temChaveAPI()) return { aprovada: true, motivo: 'Sem verificação de imagem' };

  try {
    const ext = path.extname(fotoPath).toLowerCase();
    const mediaType = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' }[ext];
    if (!mediaType) return { aprovada: true, motivo: 'Formato não verificável' };

    const data = fs.readFileSync(fotoPath).toString('base64');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
          { type: 'text', text: `Você é o verificador de imagens do VIGIA, app de denúncias urbanas de Vitória, ES.

Denúncia: ${tiposLabels[tipo] || tipo}. Descrição: "${(descricao || '(sem descrição)').slice(0, 200)}"

Avalie a imagem acima:
1. Parece uma FOTOGRAFIA REAL de rua/ambiente urbano (não desenho, print de tela, meme ou imagem claramente gerada por IA)?
2. É COERENTE com o problema denunciado (mostra algo relacionado)?

Seja tolerante: fotos escuras, tremidas ou de ângulo ruim são normais. Reprove apenas casos claros de imagem falsa ou totalmente sem relação.

Responda APENAS com JSON:
{"aprovada": true, "motivo": "explicação curta em português"}` }
        ]
      }]
    });

    const match = msg.content[0].text.trim().match(/\{[\s\S]*\}/);
    if (!match) return { aprovada: true, motivo: 'Verificação inconclusiva' };
    const r = JSON.parse(match[0]);
    return { aprovada: !!r.aprovada, motivo: r.motivo || '' };
  } catch (err) {
    console.error('⚠️  Erro na verificação de foto (aprovando):', err.message);
    return { aprovada: true, motivo: 'Verificação indisponível' };
  }
}

module.exports = { encontrarDuplicada, verificarFoto, distanciaMetros };
