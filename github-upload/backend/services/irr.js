// ─────────────────────────────────────────────────────────────
//  SERVIÇO DE IRR — Índice de Revolta e Relevância
//  Usa a API do Claude (Anthropic) para calcular o IRR.
//  O Claude analisa a denúncia e retorna uma pontuação de 1-99%.
// ─────────────────────────────────────────────────────────────

const Anthropic = require('@anthropic-ai/sdk');

// Tipos de problema em português para o prompt
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

async function calcularIRR({ tipo, descricao, localizacao }) {
  // Se não houver chave da API, usa cálculo local de fallback
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'sua_chave_aqui') {
    return calcularIRRLocal({ tipo, descricao });
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const prompt = `Você é o sistema de IA do VIGIA, um aplicativo de monitoramento de infraestrutura urbana de Vitória, ES, Brasil.

Sua tarefa é calcular o IRR (Índice de Revolta e Relevância) para uma denúncia de problema urbano.

O IRR é um número inteiro entre 1 e 99 que representa o quanto aquele problema é urgente e relevante para a cidade. Quanto maior, mais urgente.

CRITÉRIOS para calcular o IRR:
- Impacto em pessoas: quantas pessoas provavelmente são afetadas (use conhecimento de densidade populacional de Vitória/ES)
- Risco à saúde ou segurança: problemas próximos a hospitais, escolas, com risco de vida valem mais
- Palavras-chave críticas: "hospital", "escola", "criança", "risco de vida", "contaminação", "emergência", "idoso", "praia"
- Impacto ambiental: esgoto em praias ou rios, lixo em áreas de preservação
- Tipo de problema: fiação elétrica solta e vazamento de esgoto são mais urgentes que calçada danificada
- Localização: áreas de alto tráfego ou zonas turísticas têm mais impacto

DENÚNCIA:
- Tipo: ${tiposLabels[tipo] || tipo}
- Localização: ${localizacao || 'Vitória, ES'}
- Descrição: "${descricao || '(sem descrição)'}"

Responda APENAS com um JSON neste formato exato:
{
  "irr": 75,
  "motivo": "Área de alto tráfego (IBGE) · palavra-chave 'hospital' detectada · risco imediato de acidentes"
}

Nada mais além do JSON.`;

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }]
    });

    const texto = msg.content[0].text.trim();
    // Extrai o JSON da resposta
    const match = texto.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Resposta inválida da IA');
    const resultado = JSON.parse(match[0]);
    return {
      irr: Math.min(99, Math.max(1, Math.round(resultado.irr))),
      motivo: resultado.motivo || 'Calculado pela IA'
    };
  } catch (err) {
    console.error('⚠️  Erro ao chamar Claude API, usando cálculo local:', err.message);
    return calcularIRRLocal({ tipo, descricao });
  }
}

// Cálculo de fallback (sem API) — usado se a chave não estiver configurada
function calcularIRRLocal({ tipo, descricao }) {
  const bases = { esgoto:55, buraco:50, poste:40, fiacao:60, vazamento:38, lixo:28, calcada:42, arvore:45, outro:30 };
  let base = bases[tipo] || 35;
  const d = (descricao || '').toLowerCase();
  const kw = { hospital:20, 'risco de vida':20, praia:12, escola:14, criança:15, crianças:15,
    'vida marinha':10, contaminação:12, risco:8, idoso:10, idosos:10, perigo:8, emergência:15 };
  let bonus = 0;
  for (const [k, v] of Object.entries(kw)) if (d.includes(k)) bonus += v;
  const partes = [`Tipo: ${tiposLabels[tipo] || tipo}`];
  for (const [k] of Object.entries(kw)) if (d.includes(k)) partes.push(`"${k}" detectado`);
  return {
    irr: Math.min(99, Math.max(1, base + bonus + Math.floor(Math.random() * 8))),
    motivo: partes.join(' · ')
  };
}

module.exports = { calcularIRR };
