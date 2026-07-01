// ─────────────────────────────────────────────────────────────
//  ÓRGÃOS PÚBLICOS RESPONSÁVEIS — VITÓRIA/ES
//  Cada tipo de problema tem um órgão diferente responsável.
// ─────────────────────────────────────────────────────────────

const orgaos = {
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

function getOrgao(tipo) {
  return orgaos[tipo] || orgaos.outro;
}

module.exports = { getOrgao };
