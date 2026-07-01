# VIGIA 🗺️

> Plataforma de monitoramento de infraestrutura urbana de Vitória, ES — com urgência calculada por IA e pressão da comunidade.
>
> *Civic-tech platform for monitoring urban infrastructure in Vitória, Brazil — featuring AI-scored urgency and community-driven pressure.*

**🔗 App ao vivo: https://gabrielcbichara-eng.github.io/Vigia/**

## O que é

O VIGIA permite que qualquer cidadão denuncie problemas urbanos — buracos, esgoto, postes apagados, fiação exposta — direto no mapa por satélite da cidade, como um "Waze dos problemas urbanos".

Cada denúncia recebe um **IRR (Índice de Revolta e Relevância)**: uma nota de urgência de 1 a 99% calculada por IA (Claude Haiku), considerando pessoas afetadas, risco à saúde, palavras-chave críticas e impacto ambiental.

## Funcionalidades

- 🗺️ **Mapa por satélite** de Vitória com pins coloridos por urgência
- 🚨 **Denúncias** por GPS, toque duplo no mapa ou endereço — com foto
- 🤖 **IA em quatro frentes:** cálculo do IRR, vínculo automático de posts do fórum a denúncias, detecção de denúncias duplicadas e verificação de veracidade das fotos
- 📋 **Feed estilo rede social:** likes, dislikes, comentários e fotos adicionais por denúncia
- 📈 **Pressão da comunidade:** interações elevam o IRR numa curva logarítmica — uma pessoa sozinha quase não move; milhares movem de verdade
- 📬 **Órgão responsável automático** (CESAN, EDP, SEINFRA, prefeitura) com e-mail de protocolo ao denunciante
- 👤 **Contas com verificação por e-mail** (código de 6 dígitos + boas-vindas)
- 💬 **Fórum da cidade** com ordenação por urgência

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | HTML/CSS/JS puro + Leaflet.js (GitHub Pages) |
| Backend | Node.js + Express (Render) |
| Banco | SQLite local ou Turso (nuvem, permanente) |
| Fotos | Cloudinary |
| IA | Claude Haiku (Anthropic API) |
| E-mail | Nodemailer (Gmail) |

O app funciona mesmo sem o backend (modo demonstração com dados locais) — e o backend funciona mesmo sem as chaves de IA (cálculos locais de fallback).

## Como rodar localmente

```bash
cd github-upload/backend
npm install
npm start
# depois, abra github-upload/app/vigia-app.html no navegador
```

Configurações opcionais (IA, e-mail, banco na nuvem, fotos na nuvem): veja `backend/.env.example`.

## Autor

**Fred Bichara** — estudante do Centro Educacional Leonardo da Vinci, Vitória, ES, Brasil.
Projeto pessoal de tecnologia cívica. Feedback é muito bem-vindo: fredbichara@gmail.com
