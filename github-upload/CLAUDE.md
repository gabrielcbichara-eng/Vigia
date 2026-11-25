# VIGIA — Contexto Completo do Projeto

## Quem sou eu
Fred Bichara, estudante do ensino médio no Centro Educacional Leonardo da Vinci, Vitória-ES, Brasil.
Candidato a faculdades nos EUA. **100% leigo em programação** — todas as explicações devem ser simples.
Idioma preferido: Português (BR).

---

## O que é o VIGIA

App de monitoramento de infraestrutura urbana de **Vitória, ES**, similar ao Waze.
Usuários reportam problemas urbanos (buracos, esgoto, postes apagados, etc.) e o app mostra no mapa com um score chamado **IRR**.

### IRR — Índice de Revolta e Relevância
- Score de **1 a 99%** calculado pela IA (Claude Haiku)
- Quanto maior, mais urgente o problema
- Fatores: pessoas afetadas (dados IBGE), palavras-chave críticas ("hospital", "risco de vida", "criança", "praia"), impacto ambiental, tipo do problema
- Se não houver chave da API, cai para cálculo local (heurístico)
- Resposta esperada da IA: `{"irr": 75, "motivo": "..."}`

### Funcionalidades já construídas
1. **Mapa satélite** de Vitória (Esri World Imagery, gratuito, sem API key)
   - Zoom 18, maxBounds restrito a Vitória-ES
   - Nomes de ruas sobrepostos (como Apple Maps)
   - Splash de permissão de localização ao abrir
   - Ponto azul "você está aqui" após permitir GPS
2. **Fazer denúncia** (botão + no mapa)
   - 3 formas de localização: GPS, clicar no mapa, digitar endereço
   - Auto-preenchimento se usuário tem conta
   - Upload de foto (câmera ou galeria)
   - Toggle de denúncia anônima
3. **IRR pins** no mapa, filtrados por zoom
4. **Fórum** de usuários por denúncia
5. **Aba Perfil** — criar conta, login (email + CPF)
6. **Email automático** ao usuário com: órgão responsável, telefone, email, nome do responsável, número de protocolo

### Órgãos responsáveis (já mapeados)
| Tipo | Órgão | Contato |
|------|-------|---------|
| esgoto/vazamento | CESAN | 0800 722 0195 · Alessandro Donadello |
| buraco/calcada | SEINFRA | (27) 3382-5500 |
| poste/fiacao | EDP Espírito Santo | 0800 721 0707 · Miguel Setas |
| lixo | LIMPAC | (27) 3382-6300 |
| arvore | SEMMAM | — |
| outro | Prefeitura 156 | Lorenzo Pazolini |

---

## Propósito e estratégia (decidido em nov/2026)

### Para que serve o VIGIA
- **Manifestação civil pacífica e digital.** O VIGIA **não tem fins lucrativos** nem função comercial, pelo menos nas primeiras etapas.
- Objetivo: **juntar dados** sobre problemas de infraestrutura e **pressionar a prefeitura pela opinião pública**.
- Se a prefeitura não resolver, os dados acumulados viram **prova para uma ação civil pública**.

### Como a pressão aumenta, passo a passo
Registro do cidadão → protocolo oficial na prefeitura → pressão pública (mapa, fórum, rankings) → dossiê → ação judicial

### Caminho jurídico (os dois em paralelo)
1. **Criar já uma associação civil** (ex.: "Associação VIGIA"). Pela Lei 7.347/85, art. 5º, V, uma associação só pode propor ação civil pública depois de **1 ano de existência**, e o estatuto precisa citar a defesa da ordem urbanística ou da infraestrutura. Então quanto antes criar, antes o prazo começa a contar.
2. **Enquanto isso**, entregar dossiês ao **Ministério Público do ES** e à **Defensoria Pública**, que podem propor a ação desde já.
- Atenção: o VIGIA, uma pessoa sozinha ou um app **não podem** propor ação civil pública.

### O protocolo oficial é a prova
- O "protocolo #ID" que o VIGIA gera hoje é **interno**. Para valer na Justiça, a denúncia precisa de um **protocolo oficial** da prefeitura (156, ouvidoria) ou do órgão responsável. É ele que prova que a prefeitura foi avisada e não resolveu.
- Depois de denunciar no VIGIA, o cidadão recebe uma **recomendação para fazer a denúncia no canal oficial** e **informar o número do protocolo** no app.
- Quem não informar o protocolo recebe **lembretes por e-mail** (e push no PWA), por exemplo no dia seguinte, em 3 dias e em 7 dias. Os lembretes **param sozinhos** quando o protocolo é informado. O e-mail traz um link direto para o canal oficial. É preciso o consentimento do cidadão (LGPD).
- O fórum mostra **dois números separados**: denúncias "registradas" e "protocoladas".

### Os 4 status da denúncia
| Status | O que significa | Para que serve |
|---|---|---|
| Registrada | Tem foto e local no VIGIA, sem protocolo oficial | Pressão pública |
| Protocolada | O cidadão informou o nº do protocolo oficial | Prova: o prazo de omissão começa a contar |
| Vencida | Passou do prazo razoável sem solução | Entra no dossiê para o MP, a Defensoria ou a associação |
| Resolvida | O cidadão confirma com uma foto nova | Ranking dos órgãos |

### Regras da foto (anti-fraude)
- **Foto obrigatória** em toda denúncia.
- **Só a câmera ao vivo do app**, sem galeria. O VIGIA é um **PWA**, um site adicionado à tela inicial do celular. O `<input type="file" capture>` comum **não basta**, porque alguns celulares ainda deixam escolher da galeria. É preciso abrir a câmera dentro da página (`getUserMedia`) e capturar a imagem direto. Exige HTTPS.
- **GPS e horário gravados pelo app no momento da foto.** O navegador costuma apagar esses dados do arquivo. A denúncia é recusada se a precisão estiver ruim (pior que ~50 m) ou se o ponto estiver longe do local marcado (mais de ~100 m).
- **Impressão digital da foto (hash SHA-256)** salva no envio, para provar que a imagem não foi alterada depois.
- **Sem sinal:** a denúncia fica guardada no celular (IndexedDB) e é enviada depois, com o horário original. No iPhone, o envio acontece quando o app é aberto de novo.
- **A IA não prova que uma foto é real.** Ela checa coerência ("é mesmo um buraco?") e marca o que parecer suspeito. Os casos marcados vão para **revisão humana**.
- **LGPD:** borrar rostos e placas antes de publicar.

### O que o código atual ainda não faz (pendências)
- [ ] Foto obrigatória (hoje é opcional no `POST /api/denuncias`)
- [ ] Câmera ao vivo com `getUserMedia` (hoje `app/vigia-app.html` usa `<input type="file" capture>`, que permite galeria)
- [ ] GPS e horário da captura + limite de distância e de precisão
- [ ] Hash SHA-256 da foto
- [ ] Campo "nº do protocolo oficial" + os 4 status (hoje: aberta/em_andamento/resolvida)
- [ ] Lembretes por e-mail e push até o protocolo ser informado
- [ ] Contadores "registradas x protocoladas" no fórum
- [ ] Fila de moderação humana para fotos marcadas pela IA
- [ ] Borrar rostos e placas
- [ ] Exportar dossiê (por órgão, por bairro, por período) para o MP e a Defensoria

### Perguntas em aberto
- O canal oficial de Vitória dá o número de protocolo na hora? Dá para consultar o status pelo número?
- Quem faz a moderação humana (Gabriel, voluntários, Gerando Falcões em Piranema)?
- Que prazo vale como "razoável": um prazo fixo por tipo de problema ou o prazo que cada órgão divulga?

---

## Estrutura de arquivos

```
projetos/vigia/
├── CLAUDE.md                    ← Este arquivo
├── app/
│   └── vigia-app.html           ← App completo (abrir no navegador)
├── site/
│   └── index.html               ← Landing page do VIGIA
└── backend/
    ├── server.js                ← Servidor Express, porta 3000
    ├── package.json             ← Dependências
    ├── .env.example             ← Modelo de configuração
    ├── COMO-RODAR.md            ← Guia em português para não-técnico
    ├── db/
    │   └── database.js          ← SQLite (better-sqlite3), tabelas: usuarios, denuncias, forum_posts
    ├── routes/
    │   ├── denuncias.js         ← POST /api/denuncias, GET /api/denuncias, GET /api/denuncias/stats/resumo
    │   ├── usuarios.js          ← POST /api/usuarios, POST /api/usuarios/login, GET /api/usuarios/:id
    │   └── forum.js             ← GET/POST /api/forum, POST /api/forum/:id/curtir
    └── services/
        ├── irr.js               ← Calcula IRR via Claude Haiku; fallback local
        ├── forum-ia.js          ← IA do fórum: liga posts a denúncias
        ├── engajamento.js       ← Pressão da comunidade → bônus no IRR (log, teto +20)
        ├── verificacao.js       ← IA: denúncia duplicada + veracidade de foto (visão)
        ├── email.js             ← Nodemailer, email HTML com IRR badge e órgão
        └── orgaos.js            ← Mapeia tipo → órgão responsável
```

### Feed de denúncias + pressão da comunidade (junho 2026)
- **IRR = irr_base (nota técnica) + bônus da comunidade.** Curva por pontos-âncora com interpolação log-linear: 1-10 interações → +1; 100 → +3; 1.000 → +8; 10.000 → +20; 100.000 → +25 (teto). IRR final teto 99
- Pressão: post no fórum vinculado = 3, foto nova = 3, comentário = 2, like = 1, dislike = -1
- Tabelas novas: `denuncia_fotos`, `denuncia_comentarios`, `denuncia_votos` (1 voto por chave: conta ou aparelho)
- **Aba "📋 Denúncias" no fórum** (estilo Instagram): tipo + IRR, foto(s) com navegação, descrição, local, órgão responsável, autor pequeno ("Anônimo" se anônima), 👍 👎 💬 e "📷 Adicionar foto"
- **Anti-duplicada:** antes de criar denúncia, POST /api/denuncias/verificar checa se já existe o mesmo problema perto (Claude; fallback local = mesmo tipo ≤200m, raio de busca 500m). Se sim, app pergunta "É o mesmo problema?" → se sim, foto do usuário vai para a denúncia existente + sugestão de comentar; se não, cria com forcar_nova=true (POST normal devolve 409 como rede de segurança)
- **Veracidade de foto:** Claude (visão) confere se a imagem parece fotografia real e coerente com o problema; recusa → 422 erro_foto. Sem API key ou erro: aprova (nunca bloquear por falha técnica). Não é garantia 100% contra fakes
- Endpoints novos: GET /api/denuncias/feed · POST /api/denuncias/verificar · POST /api/denuncias/:id/votar · GET/POST /api/denuncias/:id/comentarios · POST /api/denuncias/:id/fotos

Obs: `github-upload/` na raiz é a cópia limpa do projeto para subir no GitHub (deploy no Render). Sempre re-sincronizar após mudanças no código.

### Fórum inteligente (junho 2026)
- Posts salvos no servidor (tabela `forum_posts`, nova coluna `denuncia_id`)
- Ao postar, a IA (Claude Haiku) identifica se o post fala de uma denúncia aberta → vincula o post e aumenta o IRR da denúncia
- Aumento decrescente (anti-spam): +6, +5, +4... mínimo +1, teto 99
- Sem API key: detector local exige tipo + localização no texto para vincular
- Ordenação do fórum: IRR da denúncia ligada (x10) + curtidas (x2) + recência (até 100 pts, decai em ~4 dias)
- App mostra selo "🔗 Denúncia #N · IRR X%" nos posts vinculados e toast quando o IRR sobe
- App permanece 100% funcional sem backend (fórum local de exemplo)

---

## Stack técnica

- **Frontend:** HTML/CSS/JS puro, Leaflet.js (mapas), sem frameworks
- **Backend:** Node.js + Express
- **Banco:** adaptador duplo em db/database.js (API async: all/get/run/exec/init) — SQLite local via better-sqlite3 (padrão, zero config) OU Turso na nuvem (permanente) se TURSO_DATABASE_URL + TURSO_AUTH_TOKEN estiverem definidas. server.js espera db.init() antes de abrir as portas. Plano gratuito Turso: 5GB, 500M leituras/mês
- **IA:** @anthropic-ai/sdk → claude-haiku-4-5-20251001
- **Email:** services/email.js com 2 canais — Brevo API HTTP (BREVO_API_KEY + EMAIL_USER; obrigatório no Render free, que bloqueia SMTP desde set/2025) ou Nodemailer/Gmail (EMAIL_USER + EMAIL_PASS; só local). Brevo free: 300 emails/dia
- **Upload:** Multer (fotos até 10MB) → services/fotos.js: com CLOUDINARY_URL definida, a foto sobe pro Cloudinary (permanente, URL https salva em foto_path); sem ela, fica no disco local. App aceita os dois formatos. Plano gratuito Cloudinary: 25 créditos/mês (~25GB)
- **Geocoding:** Nominatim (OpenStreetMap, gratuito)
- **Env:** dotenv

### Dependências (package.json)
```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "*",
    "better-sqlite3": "*",
    "cors": "*",
    "dotenv": "*",
    "express": "*",
    "multer": "*",
    "nodemailer": "*"
  },
  "scripts": { "start": "node server.js" }
}
```

---

## API Endpoints

```
GET  /                              → status do servidor
GET  /api/denuncias                 → lista todas as denúncias
POST /api/denuncias                 → cria denúncia (multipart/form-data com foto opcional)
GET  /api/denuncias/:id             → detalhes de uma denúncia
GET  /api/denuncias/stats/resumo    → estatísticas gerais
POST /api/usuarios                  → criar conta
POST /api/usuarios/login            → login (email + CPF)
GET  /api/usuarios/:id              → dados do usuário
```

### POST /api/denuncias — campos esperados
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| lat | number | ✅ |
| lng | number | ✅ |
| tipo | string | ✅ |
| descricao | string | — |
| foto | file (image) | — |
| anonima | boolean | — |
| usuario_id | number | — |
| nome_exibir | string | — |
| localizacao | string | — |

---

## Banco de dados — tabelas

### usuarios
`id, nome, sobrenome, email, tel, cpf, cep, nascimento, genero, criado_em`

### denuncias
`id, lat, lng, tipo, descricao, foto_path, irr, irr_motivo, anonima, usuario_id, nome_exibir, localizacao, status (aberta/resolvida/em_andamento), criado_em`

### forum_posts
`id, denuncia_id, usuario_id, nome_autor, mensagem, criado_em`

---

## Como rodar (comandos)

```bash
# Na pasta backend/:
npm install      # só precisa rodar uma vez
npm start        # inicia o servidor na porta 3000
```

Arquivo `.env` (criar copiando de `.env.example`):
```
ANTHROPIC_API_KEY=sk-ant-...
EMAIL_USER=seuemail@gmail.com
EMAIL_PASS=senha_de_app_16_letras
PORT=3000
```

O app (`vigia-app.html`) detecta automaticamente se o backend está rodando em `http://localhost:3000`.
Sem backend: funciona com dados locais de exemplo.
Com backend: dados reais persistidos no SQLite.

---

## Outros projetos do Fred

### Go Lead Forward
Organização que ajuda crianças a desenvolverem comportamentos de liderança.
Parceiros pesquisados na Grande Vitória: Escola São Domingos, Salesiano, SEME, Rotary Club Praia do Canto (Interact), Escoteiros Ilha de Vitória, Bem Brasil, Ativa 027 (parceiro UNICEF), SESC-ES.
Arquivos em: `projetos/go-lead-forward/`

### Indigo Research
Literature review científica sobre Predictive Maintenance on Aircraft.
Mentor: Houman Hakima (PhD Space Eng, UofT; GNC Engineer MDA Space).

### Essays (college applications USA)
Personal essay e supplementals para faculdades americanas. Em desenvolvimento.

---

## Status atual (Junho 2026)

✅ Site do VIGIA (`site/index.html`)
✅ App protótipo completo (`app/vigia-app.html`)
   - Mapa satélite Vitória, zoom 18, bounds restritos
   - Splash de permissão de localização
   - Ponto "você está aqui"
   - Denúncias com GPS / clique no mapa / endereço
   - Perfil de usuário + auto-preenchimento
   - IRR pins filtrados por zoom
✅ Backend Node.js/Express completo
✅ Banco SQLite com seed de dados de exemplo
✅ Cálculo IRR (Claude API + fallback local)
✅ Email automático com órgão responsável
✅ Parceiros Go Lead Forward pesquisados

⏳ Próximas etapas sugeridas:
- Deploy do backend em servidor real (Railway, Render, etc.)
- Notificações push quando IRR sobe
- Dashboard para órgãos públicos
- App mobile nativo (React Native)
- Mais detalhes sobre Go Lead Forward
- Essays para faculdades

---

## Regras importantes

1. Fred é **leigo em computação** — use sempre analogias simples, nunca assuma conhecimento técnico
2. Explique TUDO em português (BR)
3. Ao modificar arquivos, sempre mostre o antes e depois
4. Não começar do zero — todo o código já existe nos arquivos acima
5. O app funciona standalone (sem backend) — nunca quebre isso
