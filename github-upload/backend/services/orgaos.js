// ─────────────────────────────────────────────────────────────
//  ÓRGÃOS PÚBLICOS RESPONSÁVEIS
//  Cada tipo de problema tem um órgão diferente responsável — e o
//  órgão também muda conforme o local (Vitória ou Piranema/Cariacica).
//  CESAN (água/esgoto) e EDP (energia) são estaduais e atendem os
//  dois locais.
// ─────────────────────────────────────────────────────────────

const orgaosVitoria = {
  esgoto: {
    nome: 'CESAN — Companhia Espírito Santense de Saneamento',
    tel: '0800 722 0195',
    email: 'atendimento@cesan.com.br',
    responsavel: 'Alessandro Donadello (Diretor-Geral)',
    site: 'www.cesan.com.br'
  },
  buraco: {
    nome: 'SEINFRA — Secretaria de Infraestrutura de Vitória',
    tel: '(27) 3382-5500',
    email: 'seinfra@vitoria.es.gov.br',
    responsavel: 'Secretário Municipal de Obras',
    site: 'www.vitoria.es.gov.br'
  },
  poste: {
    nome: 'EDP Espírito Santo',
    tel: '0800 721 0707',
    email: 'atendimento@edp.com.br',
    responsavel: 'Miguel Setas (Presidente EDP Brasil)',
    site: 'www.edp.com.br'
  },
  fiacao: {
    nome: 'EDP Espírito Santo',
    tel: '0800 721 0707',
    email: 'atendimento@edp.com.br',
    responsavel: 'Miguel Setas (Presidente EDP Brasil)',
    site: 'www.edp.com.br'
  },
  vazamento: {
    nome: 'CESAN — Companhia Espírito Santense de Saneamento',
    tel: '0800 722 0195',
    email: 'atendimento@cesan.com.br',
    responsavel: 'Alessandro Donadello (Diretor-Geral)',
    site: 'www.cesan.com.br'
  },
  lixo: {
    nome: 'LIMPAC — Limpeza Pública de Vitória',
    tel: '(27) 3382-6300',
    email: 'limpac@vitoria.es.gov.br',
    responsavel: 'Gerência de Limpeza Urbana',
    site: 'www.vitoria.es.gov.br'
  },
  calcada: {
    nome: 'SEINFRA — Secretaria de Infraestrutura de Vitória',
    tel: '(27) 3382-5500',
    email: 'seinfra@vitoria.es.gov.br',
    responsavel: 'Secretário Municipal de Obras',
    site: 'www.vitoria.es.gov.br'
  },
  arvore: {
    nome: 'SEMMAM — Secretaria de Meio Ambiente de Vitória',
    tel: '(27) 3382-6500',
    email: 'semmam@vitoria.es.gov.br',
    responsavel: 'Secretária Municipal de Meio Ambiente',
    site: 'www.vitoria.es.gov.br'
  },
  outro: {
    nome: 'Prefeitura de Vitória — Central 156',
    tel: '156',
    email: 'faleconosco@vitoria.es.gov.br',
    responsavel: 'Lorenzo Pazolini (Prefeito de Vitória)',
    site: 'www.vitoria.es.gov.br'
  }
};

// CESAN e EDP são estaduais — mesmo órgão nos dois locais.
const _CESAN = orgaosVitoria.esgoto;
const _EDP = orgaosVitoria.poste;

const orgaosPiranema = {
  esgoto: _CESAN,
  vazamento: _CESAN,
  poste: _EDP,
  fiacao: _EDP,
  buraco: {
    nome: 'Secretaria de Obras de Cariacica',
    tel: '(27) 3354-5316',
    email: '',
    responsavel: 'Secretaria Municipal de Obras de Cariacica',
    site: 'www.cariacica.es.gov.br'
  },
  calcada: {
    nome: 'Secretaria de Obras de Cariacica',
    tel: '(27) 3354-5316',
    email: '',
    responsavel: 'Secretaria Municipal de Obras de Cariacica',
    site: 'www.cariacica.es.gov.br'
  },
  lixo: {
    nome: 'Secretaria de Serviços e Trânsito de Cariacica',
    tel: '(27) 3354-5900',
    email: '',
    responsavel: 'Secretaria de Serviços e Trânsito de Cariacica',
    site: 'www.cariacica.es.gov.br'
  },
  arvore: {
    nome: 'SEMDEC — Meio Ambiente (Cariacica)',
    tel: '(27) 3354-5113',
    email: '',
    responsavel: 'Subsecretaria de Meio Ambiente de Cariacica',
    site: 'www.cariacica.es.gov.br'
  },
  outro: {
    nome: 'Prefeitura de Cariacica — Ouvidoria',
    tel: '162',
    email: '',
    responsavel: 'Ouvidoria Municipal de Cariacica',
    site: 'www.cariacica.es.gov.br'
  }
};

const orgaosPorLocal = { vitoria: orgaosVitoria, piranema: orgaosPiranema };

function getOrgao(tipo, local) {
  const conjunto = orgaosPorLocal[local] || orgaosVitoria;
  return conjunto[tipo] || conjunto.outro;
}

module.exports = { getOrgao };
