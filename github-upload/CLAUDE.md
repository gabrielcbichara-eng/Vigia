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
