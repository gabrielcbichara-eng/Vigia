// ─────────────────────────────────────────────────────────────
//  IA DO FÓRUM
//  Quando alguém posta no fórum, este serviço descobre se o post
//  fala de alguma denúncia que já existe no mapa. Se sim, o IRR
//  daquela denúncia sobe — afinal, mais gente reclamando = mais
//  "revolta" = mais urgência.
//
//  Com chave da API: o Claude lê o post e decide.
//  Sem chave: um detector simples por palavras-chave faz o papel.
// ─────────────────────────────────────────────────────────────

const Anthropic = require('@anthropic-ai/sdk');

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

// ── PARTE 1: descobrir de qual denúncia o post fala ──
// Recebe o texto do post e a lista de denúncias abertas.
// Devolve o id da denúncia correspondente, ou null se não houver.
async function ligarPostADenuncia({ texto, denuncias }) {
  if (!denuncias || denuncias.length === 0) return null;

  // Sem chave da API → usa o detector local
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'sua_chave_aqui') {
    return ligarLocal({ texto, denuncias });
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const lista = denuncias.map(d =>
      `#${d.id} — ${tiposLabels[d.tipo] || d.tipo} em ${d.localizacao || 'Vitória, ES'}: "${(d.descricao || '').slice(0, 120)}"`
    ).join('\n');

    const prompt = `Você é o sistema de IA do VIGIA, app de monitoramento urbano de Vitória, ES, Brasil.

Um cidadão acabou de postar no fórum. Sua tarefa: decidir se o post se refere a alguma das denúncias abertas abaixo.

DENÚNCIAS ABERTAS:
${lista}

POST DO CIDADÃO:
"${texto.slice(0, 400)}"

Regras:
- Só vincule se o post claramente falar do MESMO problema no MESMO lugar (tipo parecido + localização parecida).
- Em caso de dúvida, NÃO vincule.

Responda APENAS com um JSON neste formato exato:
{"denuncia_id": 2}
ou, se não corresponder a nenhuma:
{"denuncia_id": null}

Nada mais além do JSON.`;

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 50,
      messages: [{ role: 'user', content: prompt }]
    });

    const match = msg.content[0].text.trim().match(/\{[\s\S]*\}/);
    if (!match) return null;
    const r = JSON.parse(match[0]);
    if (!r.denuncia_id) return null;
    // Confere se o id devolvido realmente existe na lista
    const existe = denuncias.some(d => d.id === r.denuncia_id);
    return existe ? r.denuncia_id : null;
  } catch (err) {
    console.error('⚠️  Erro na IA do fórum, usando detector local:', err.message);
    return ligarLocal({ texto, denuncias });
  }
}

// Detector local (sem IA): procura o tipo do problema E a localização
// no texto do post. Só vincula quando encontra os dois — para não
// ligar posts à denúncia errada.
function ligarLocal({ texto, denuncias }) {
  const t = (texto || '').toLowerCase();
  const sinonimos = {
    esgoto: ['esgoto'],
    buraco: ['buraco', 'cratera'],
    poste: ['poste', 'iluminação', 'iluminacao', 'luz apagad', 'sem luz'],
    fiacao: ['fiação', 'fiacao', 'fio solto', 'fios soltos'],
    vazamento: ['vazamento', 'vazando'],
    lixo: ['lixo', 'entulho'],
    calcada: ['calçada', 'calcada'],
    arvore: ['árvore', 'arvore', 'galho']
  };

  let melhor = null, melhorPontos = 0;
  for (const d of denuncias) {
    let pontos = 0;
    // O post menciona o tipo do problema?
    for (const palavra of (sinonimos[d.tipo] || [])) {
      if (t.includes(palavra)) { pontos += 2; break; }
    }
    // O post menciona o lugar?
    const lugar = (d.localizacao || '').toLowerCase();
    for (const parte of lugar.split(/[\s,—-]+/)) {
      if (parte.length >= 4 && parte !== 'bairro' && parte !== 'praia' && t.includes(parte)) { pontos += 2; break; }
    }
    if (pontos > melhorPontos) { melhorPontos = pontos; melhor = d.id; }
  }
  // Exige tipo + lugar (4 pontos) para vincular
  return melhorPontos >= 4 ? melhor : null;
}

// ── PARTE 2: calcular o aumento do IRR ──
// Cada novo relato vale menos que o anterior (6, 5, 4, 3, 2, 1, 1...).
// Isso impede que alguém "hackeie" o índice postando 50 vezes.
// O IRR nunca passa de 99.
function calcularAumentoIRR({ irrAtual, relatosAnteriores }) {
  const incremento = Math.max(1, 6 - relatosAnteriores);
  const novoIrr = Math.min(99, irrAtual + incremento);
  return { novoIrr, incremento: novoIrr - irrAtual };
}

// Atualiza o "motivo" do IRR para registrar a pressão do fórum.
// Remove o registro antigo do fórum (se houver) e escreve o novo,
// para não acumular texto repetido.
function atualizarMotivo(motivoAtual, totalRelatos) {
  const semForum = (motivoAtual || '').replace(/\s*·\s*Fórum: \d+ relato(s)? de cidadãos/g, '');
  return `${semForum} · Fórum: ${totalRelatos} relato${totalRelatos > 1 ? 's' : ''} de cidadãos`;
}

module.exports = { ligarPostADenuncia, calcularAumentoIRR, atualizarMotivo };
