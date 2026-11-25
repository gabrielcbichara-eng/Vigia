# Como montar o projeto VIGIA no seu computador

Guia passo a passo, sem precisar saber programação. Serve para Mac e Windows.
Você só faz a **Parte 1** uma vez. Depois disso, o dia a dia é a **Parte 5**.

> **Analogia:** o GitHub é a "nuvem oficial" do VIGIA. Você vai baixar uma cópia para o seu computador, trabalhar nela com o Claude Code e, no fim, mandar as mudanças de volta para o Gabriel revisar.

---

## Parte 1 — Instalar os programas (só uma vez)

| Programa | Para que serve | Onde baixar |
|---|---|---|
| **Node.js (versão LTS, 20 ou mais nova)** | Faz o servidor do VIGIA funcionar | https://nodejs.org |
| **Git** | Baixa e envia o código para o GitHub | Mac: já vem instalado (se pedir, aceite instalar as "ferramentas de linha de comando"). Windows: https://git-scm.com |
| **GitHub Desktop** (opcional, mais fácil) | Faz o mesmo que o Git, mas com botões | https://desktop.github.com |
| **Claude Code** | O assistente que lê o projeto e programa com você | Instale pelo Terminal (passo abaixo) |

**Instalar o Claude Code:** abra o Terminal (Mac: `Cmd + Espaço` → "Terminal"; Windows: menu Iniciar → "PowerShell") e cole:

```bash
npm install -g @anthropic-ai/claude-code
```

Confira se deu certo:

```bash
node --version     # deve mostrar v20 ou maior
git --version      # deve mostrar um número de versão
claude --version   # deve mostrar um número de versão
```

---

## Parte 2 — Ter acesso ao repositório

O código fica em: **https://github.com/gabrielcbichara-eng/Vigia**

1. Crie uma conta no GitHub, se ainda não tiver: https://github.com
2. Peça ao Gabriel para te adicionar como colaborador:
   GitHub → repositório Vigia → **Settings → Collaborators → Add people** → seu usuário.
3. Aceite o convite que chega por e-mail.

Sem esse passo você consegue **baixar** o projeto, mas não consegue **enviar** mudanças.

---

## Parte 3 — Baixar o projeto (clonar)

Escolha **uma** das opções.

**Opção A — GitHub Desktop (mais fácil)**
1. Abra o GitHub Desktop e entre com sua conta.
2. `File → Clone repository` → aba **URL** → cole `https://github.com/gabrielcbichara-eng/Vigia`
3. Escolha a pasta, por exemplo `Documentos/Projetos/vigia`, e clique **Clone**.

**Opção B — Terminal**
```bash
mkdir -p ~/Projetos
cd ~/Projetos
git clone https://github.com/gabrielcbichara-eng/Vigia.git vigia
cd vigia
```

---

## Parte 4 — Configurar e testar o VIGIA

### 4.1 Instalar as peças do servidor
```bash
cd ~/Projetos/vigia/backend
npm install
```
Aparece muito texto, e isso é normal. Espere terminar.

### 4.2 Criar o arquivo de chaves secretas (`.env`)
1. Dentro de `backend/`, copie o arquivo `.env.example` e renomeie a cópia para `.env`.
   - Mac/Linux: `cp .env.example .env`
   - Windows: `copy .env.example .env`
2. Abra o `.env` num editor de texto e preencha o que tiver. Peça as chaves ao Gabriel, **nunca por grupo nem e-mail aberto**:
   - `ANTHROPIC_API_KEY`: a IA que calcula o IRR e verifica as fotos
   - `EMAIL_USER` + `EMAIL_PASS` (Gmail, só funciona no computador) ou `BREVO_API_KEY`
   - `EXEMPLOS=sim`, se quiser ver denúncias de exemplo no mapa
3. **O `.env` nunca vai para o GitHub.** O projeto já está configurado para ignorá-lo.

> Sem as chaves o VIGIA funciona do mesmo jeito: o IRR é calculado sem IA e os e-mails não são enviados.

### 4.3 Rodar
```bash
npm start
```
Depois abra o arquivo `app/vigia-app.html` no navegador. O app encontra sozinho o servidor em `http://localhost:3000`.
Para parar o servidor: `Ctrl + C` no Terminal.

**Atalho no Mac:** dê dois cliques em `iniciar-backend.command` na pasta do projeto.

---

## Parte 5 — Trabalhar no projeto com o Claude Code (dia a dia)

### 5.1 Sempre comece atualizando a sua cópia
```bash
cd ~/Projetos/vigia
git checkout main
git pull
```
(No GitHub Desktop: botão **Fetch origin** → **Pull origin**.)

### 5.2 Abra o Claude Code na pasta do projeto
```bash
cd ~/Projetos/vigia
claude
```
O Claude Code lê sozinho o `CLAUDE.md`, que tem todo o contexto, incluindo a seção **"Propósito e estratégia"** e a lista de **pendências**.

### 5.3 Primeira mensagem sugerida
```
Leia o CLAUDE.md. Quero implementar as pendências da seção
"Propósito e estratégia", começando pela foto obrigatória tirada
pela câmera ao vivo (getUserMedia), sem galeria.
Crie uma branch nova, explique cada mudança em português simples
e mostre o antes e o depois. Não quebre o app sem backend.
```

### 5.4 Regra de ouro: nunca direto na `main`
Cada melhoria vai numa **branch** (uma "cópia de rascunho") e chega à `main` por **pull request**, para o Gabriel revisar antes. Você pode simplesmente pedir ao Claude Code:

> "Crie uma branch, faça commit das mudanças e abra um pull request."

Pelo Terminal, o caminho é:
```bash
git checkout -b nome-da-melhoria
# ... mudanças feitas ...
git add .
git commit -m "Descrição curta da mudança"
git push -u origin nome-da-melhoria
```
Depois abra o link que aparece no Terminal para criar o pull request no GitHub.

### 5.5 Lembrete da pasta `github-upload/`
O `CLAUDE.md` diz que `github-upload/` é a cópia usada no deploy do Render. **Depois de mudar o código, peça ao Claude Code para re-sincronizar essa pasta.**

---

## Problemas comuns

| Sintoma | O que fazer |
|---|---|
| `command not found: node` ou `npm` | Node.js não instalado ou Terminal aberto antes da instalação. Feche e abra o Terminal. |
| `permission denied` no `npm install -g` (Mac) | Rode `sudo npm install -g @anthropic-ai/claude-code` e digite a senha do Mac. |
| `Permission denied` ao fazer `git push` | Você ainda não é colaborador (Parte 2) ou não fez login no GitHub. |
| Erro ao instalar `better-sqlite3` | Atualize o Node.js para a versão LTS mais recente e rode `npm install` de novo. |
| App abre mas não mostra denúncias | Confira se o servidor está rodando (`npm start`) ou use `EXEMPLOS=sim` no `.env`. |
| Porta 3000 ocupada | Feche o outro Terminal que está rodando o servidor ou mude `PORT=3001` no `.env`. |
