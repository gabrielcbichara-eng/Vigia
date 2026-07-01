# Como usar o Claude Code no projeto VIGIA

## Passo 1 — Instalar o Claude Code (só uma vez)

1. Abra o **Terminal** (Cmd + Espaço → digita "Terminal" → Enter)
2. Cole este comando e aperte Enter:
   ```
   npm install -g @anthropic-ai/claude-code
   ```
3. Depois: `claude --version` — deve aparecer um número de versão.

---

## Passo 2 — Abrir o Claude Code na pasta do projeto

No Terminal, cole exatamente este comando e aperte Enter:

```bash
cd "/Users/gb7/Library/Application Support/Claude/local-agent-mode-sessions/5b489445-8bc5-433e-a0c3-c25cee62ad55/c627d2fa-fd1b-4f3e-8036-c877c663b79d/local_44d73081-bfd5-4520-ad3c-5fece656efc1/outputs/projetos/vigia" && claude
```

O Claude Code vai abrir e **ler automaticamente o arquivo CLAUDE.md** desta pasta, que contém TODO o contexto do projeto.

---

## Passo 3 — Primeira mensagem para colar no Claude Code

Quando o Claude Code abrir, cole esta mensagem como primeiro prompt:

---

```
Leia o CLAUDE.md desta pasta. Ele contém todo o contexto do projeto VIGIA que já foi desenvolvido.

Depois de ler, faça o seguinte:
1. Entre na pasta backend/
2. Rode npm install para instalar as dependências
3. Rode npm start para iniciar o servidor
4. Me diga se está tudo funcionando

Se der algum erro, me explica em português simples o que aconteceu.
```

---

## Alternativa mais simples — só rodar o backend

Se quiser apenas iniciar o servidor sem usar o Claude Code, dê duplo clique no arquivo:

```
iniciar-backend.command
```

(está na mesma pasta que este arquivo)

---

## Para continuar o desenvolvimento

Depois que o Claude Code ler o CLAUDE.md, você pode pedir qualquer coisa diretamente, por exemplo:

- *"Adiciona um botão para ver o histórico de denúncias do usuário"*
- *"Faz o mapa mostrar um raio de calor (heatmap) nas áreas com mais problemas"*
- *"Cria uma tela de dashboard para a prefeitura ver todas as denúncias"*
- *"Adiciona login com Google"*

O Claude Code já sabe tudo que foi feito e vai continuar de onde paramos.
