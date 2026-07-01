# 🚀 Como rodar o backend do VIGIA

Guia completo passo a passo — sem precisar saber programação.

---

## O que você vai precisar instalar (só uma vez)

### 1. Node.js
Node.js é o programa que faz o servidor funcionar. É como instalar um aplicativo normal.

1. Acesse: **https://nodejs.org**
2. Clique no botão verde grande (versão LTS)
3. Baixe e instale normalmente (Next, Next, Finish)
4. Para confirmar que instalou: abra o Terminal e digite:
   ```
   node --version
   ```
   Deve aparecer algo como `v20.x.x`

---

## Configurar o projeto

### 2. Abrir a pasta do backend no Terminal

**No Mac:**
1. Abra o **Finder**
2. Navegue até a pasta `projetos/vigia/backend`
3. Clique com botão direito na pasta → "Abrir no Terminal"

**No Windows:**
1. Abra a pasta `projetos/vigia/backend` no Explorador
2. Clique na barra de endereço, digite `cmd` e pressione Enter

### 3. Instalar as dependências
No Terminal, digite exatamente:
```
npm install
```
Aguarde. Vai aparecer muito texto — isso é normal. Quando parar, está pronto.

### 4. Configurar as chaves secretas
1. Na pasta `backend`, você verá o arquivo `.env.example`
2. Copie ele e renomeie a cópia para `.env` (sem o ".example")
3. Abra o arquivo `.env` com qualquer editor de texto
4. Preencha:

```
ANTHROPIC_API_KEY=sua_chave_do_claude_aqui
EMAIL_USER=seuemail@gmail.com
EMAIL_PASS=sua_senha_de_app_aqui
```

**Como obter a chave do Claude:**
1. Acesse https://console.anthropic.com
2. Crie uma conta (gratuito para começar)
3. Vá em "API Keys" → "Create Key"
4. Copie e cole no `.env`

**Como criar senha de app do Gmail:**
1. Acesse sua conta Google → Segurança
2. Ative "Verificação em duas etapas" (se não tiver)
3. Procure "Senhas de app" → Gerar
4. Copie a senha de 16 letras e cole no `.env`

> ⚠️ **Sem as chaves:** O app funciona normalmente, mas o IRR será calculado localmente (sem IA) e os e-mails não serão enviados.

---

## Rodar o servidor

No Terminal, dentro da pasta `backend`:

```
npm start
```

Você verá:
```
╔═══════════════════════════════════════╗
║        🗺️  VIGIA BACKEND               ║
╠═══════════════════════════════════════╣
║  ✅ Rodando em http://localhost:3000   ║
╚═══════════════════════════════════════╝
```

**Pronto!** O servidor está rodando.

Para testar, abra o navegador e acesse:
**http://localhost:3000**

Você verá uma lista de todos os endpoints disponíveis.

---

## Conectar o app ao backend

Com o servidor rodando, abra o arquivo `vigia-app.html` normalmente no navegador.
O app detecta automaticamente se o servidor está ativo e usa os dados reais do banco.

---

## Parar o servidor

No Terminal: pressione **Ctrl + C**

---

## Estrutura dos arquivos

```
backend/
├── server.js          ← Ponto de entrada (inicia tudo)
├── package.json       ← Lista de dependências
├── .env               ← Suas chaves secretas (NÃO compartilhe!)
├── .env.example       ← Modelo do .env
├── db/
│   ├── database.js    ← Configura o banco de dados
│   └── vigia.db       ← Arquivo do banco (criado automaticamente)
├── routes/
│   ├── denuncias.js   ← Rotas: criar/listar denúncias
│   └── usuarios.js    ← Rotas: criar conta/login
├── services/
│   ├── irr.js         ← Cálculo do IRR com Claude
│   ├── email.js       ← Envio de e-mails
│   └── orgaos.js      ← Lista de órgãos públicos
└── uploads/           ← Fotos das denúncias (criada automaticamente)
```

---

## Dúvidas comuns

**"npm: command not found"**
→ O Node.js não foi instalado corretamente. Reinstale pelo site nodejs.org.

**"Error: Cannot find module"**
→ Você esqueceu de rodar `npm install`. Rode e tente novamente.

**O e-mail não está chegando**
→ Verifique se o arquivo `.env` está na pasta `backend` e se a senha de app está correta.

**O IRR não está usando IA**
→ Verifique se `ANTHROPIC_API_KEY` no `.env` está preenchido com a chave real.
