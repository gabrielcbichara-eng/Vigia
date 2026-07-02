// ─────────────────────────────────────────────────────────────
//  SERVIÇO DE E-MAIL — dois canais de envio:
//
//  1. BREVO (API HTTP) — funciona no Render gratuito!
//     O Render bloqueia o canal SMTP em servidores gratuitos, mas
//     não bloqueia chamadas HTTP. Com BREVO_API_KEY definida, os
//     e-mails saem pela API do Brevo (plano grátis: 300/dia).
//     O remetente é o EMAIL_USER (precisa estar validado no Brevo).
//
//  2. GMAIL (SMTP via Nodemailer) — funciona no seu computador.
//     Usado quando só EMAIL_USER + EMAIL_PASS estão definidos.
//
//  E-mails enviados: código de verificação, boas-vindas e
//  confirmação de denúncia (com IRR e órgão responsável).
// ─────────────────────────────────────────────────────────────

const nodemailer = require('nodemailer');

function temBrevo() {
  return !!(process.env.BREVO_API_KEY && process.env.EMAIL_USER && process.env.EMAIL_USER !== 'seuemail@gmail.com');
}

function temSMTP() {
  return !!(process.env.EMAIL_USER && process.env.EMAIL_USER !== 'seuemail@gmail.com' && process.env.EMAIL_PASS);
}

function emailConfigurado() {
  return temBrevo() || temSMTP();
}

// ── ENVIO UNIVERSAL ──
// Decide o canal sozinho: Brevo (HTTP) primeiro, senão Gmail (SMTP)
async function enviar({ destinatario, assunto, html }) {
  if (temBrevo()) {
    const resposta = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'VIGIA App', email: process.env.EMAIL_USER },
        to: [{ email: destinatario }],
        subject: assunto,
        htmlContent: html
      })
    });
    if (!resposta.ok) {
      const erro = await resposta.text();
      throw new Error('Brevo recusou: ' + erro.slice(0, 200));
    }
    return true;
  }

  if (temSMTP()) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
    await transporter.sendMail({
      from: `"VIGIA App" <${process.env.EMAIL_USER}>`,
      to: destinatario,
      subject: assunto,
      html
    });
    return true;
  }

  console.log('📧 E-mail não configurado. Defina BREVO_API_KEY (+EMAIL_USER) ou EMAIL_USER+EMAIL_PASS.');
  return false;
}

// ── MOLDURA PADRÃO DOS E-MAILS ──
function molduraVigia(conteudo) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:580px;margin:30px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1);">
    <div style="background:#1a1a2e;padding:28px 32px;text-align:center;">
      <div style="font-size:2rem;font-weight:900;color:#1DB954;letter-spacing:3px;">VIGIA</div>
      <div style="color:#8892a4;font-size:.85rem;margin-top:4px;">Monitoramento de Infraestrutura Urbana — Vitória, ES</div>
    </div>
    <div style="padding:28px 32px;">${conteudo}</div>
    <div style="background:#f7fafc;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0;">
      <div style="font-size:.75rem;color:#a0aec0;">VIGIA — Vitória, ES, Brasil · Este é um e-mail automático</div>
    </div>
  </div>
</body>
</html>`;
}

// ── E-MAIL 1: código de verificação (ao criar a conta) ──
async function enviarEmailCodigo({ destinatario, nome, codigo }) {
  const html = molduraVigia(`
      <p style="font-size:1rem;color:#2d3748;margin-bottom:6px;">Olá, <strong>${nome}</strong>!</p>
      <p style="font-size:.93rem;color:#4a5568;line-height:1.6;margin-bottom:24px;">
        Falta só um passo para ativar sua conta no VIGIA. Digite este código no aplicativo:
      </p>
      <div style="background:#f0fff4;border:2px dashed #1DB954;border-radius:12px;padding:22px;text-align:center;margin-bottom:24px;">
        <div style="font-size:2.4rem;font-weight:900;letter-spacing:10px;color:#148f3e;">${codigo}</div>
      </div>
      <p style="font-size:.82rem;color:#718096;text-align:center;line-height:1.6;">
        Se você não criou uma conta no VIGIA, pode ignorar este e-mail.
      </p>`);
  try {
    const ok = await enviar({ destinatario, assunto: `🔑 Seu código VIGIA: ${codigo}`, html });
    if (ok) console.log(`📧 Código de verificação enviado para ${destinatario}`);
    return ok;
  } catch (err) {
    console.error('❌ Erro ao enviar código:', err.message);
    return false;
  }
}

// ── E-MAIL 2: boas-vindas (após verificar) ──
async function enviarEmailBoasVindas({ destinatario, nome }) {
  const html = molduraVigia(`
      <p style="font-size:1rem;color:#2d3748;margin-bottom:6px;">Bem-vindo(a), <strong>${nome}</strong>! 🎉</p>
      <p style="font-size:.93rem;color:#4a5568;line-height:1.6;margin-bottom:20px;">
        Sua conta no VIGIA está ativa. Agora você faz parte da comunidade que monitora
        e melhora a infraestrutura de Vitória.
      </p>
      <div style="background:#f7fafc;border-radius:10px;padding:16px;margin-bottom:20px;">
        <div style="font-size:.85rem;color:#4a5568;line-height:1.9;">
          🗺️ <strong>Denuncie</strong> problemas urbanos direto no mapa<br/>
          📊 <strong>Acompanhe</strong> o IRR — quanto maior, mais urgente<br/>
          💬 <strong>Pressione</strong> com likes, comentários e fotos<br/>
          📧 <strong>Receba</strong> o órgão responsável e o protocolo de cada denúncia
        </div>
      </div>
      <p style="font-size:.82rem;color:#718096;text-align:center;line-height:1.6;">
        Obrigado por ajudar a melhorar Vitória! 🏙️
      </p>`);
  try {
    const ok = await enviar({ destinatario, assunto: '🎉 Conta ativada — bem-vindo ao VIGIA!', html });
    if (ok) console.log(`📧 Boas-vindas enviadas para ${destinatario}`);
    return ok;
  } catch (err) {
    console.error('❌ Erro ao enviar boas-vindas:', err.message);
    return false;
  }
}

// ── E-MAIL 3: confirmação de denúncia (com IRR e órgão) ──
async function enviarEmailDenuncia({ destinatario, nome, denuncia, orgao }) {
  const irrCor = denuncia.irr >= 70 ? '#e74c3c' : denuncia.irr >= 45 ? '#f39c12' : '#27ae60';
  const html = molduraVigia(`
      <p style="font-size:1rem;color:#2d3748;margin-bottom:6px;">Olá, <strong>${nome}</strong>!</p>
      <p style="font-size:.93rem;color:#4a5568;line-height:1.6;margin-bottom:24px;">
        Sua denúncia foi registrada com sucesso no VIGIA e já está visível no mapa para todos os cidadãos de Vitória.
      </p>
      <div style="background:#fff5f5;border:1px solid #fed7d7;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
        <div style="font-size:.72rem;font-weight:700;color:#718096;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">
          IRR — Índice de Revolta e Relevância
        </div>
        <div style="font-size:3rem;font-weight:900;color:${irrCor};line-height:1;">${denuncia.irr}%</div>
        <div style="font-size:.8rem;color:#718096;margin-top:8px;line-height:1.5;">${denuncia.irr_motivo || ''}</div>
      </div>
      <div style="background:#f7fafc;border-radius:10px;padding:16px;margin-bottom:20px;">
        <div style="font-size:.7rem;font-weight:700;color:#a0aec0;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Detalhes da denúncia</div>
        <table style="width:100%;border-collapse:collapse;font-size:.88rem;">
          <tr><td style="padding:4px 0;color:#718096;width:120px;">Tipo:</td><td style="color:#2d3748;font-weight:600;">${denuncia.tipo}</td></tr>
          <tr><td style="padding:4px 0;color:#718096;">Localização:</td><td style="color:#2d3748;">${denuncia.localizacao || 'Vitória, ES'}</td></tr>
          <tr><td style="padding:4px 0;color:#718096;">Status:</td><td style="color:#1DB954;font-weight:600;">🟢 Registrada — aguardando resolução</td></tr>
          <tr><td style="padding:4px 0;color:#718096;">Protocolo:</td><td style="color:#2d3748;">#${denuncia.id}</td></tr>
        </table>
      </div>
      <div style="background:#f0fff4;border:1px solid #c6f6d5;border-radius:12px;padding:20px;margin-bottom:24px;">
        <div style="font-size:.7rem;font-weight:700;color:#276749;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">
          📬 Órgão responsável pela resolução
        </div>
        <div style="font-size:1rem;font-weight:700;color:#2d3748;margin-bottom:10px;">${orgao.nome}</div>
        <table style="font-size:.87rem;border-collapse:collapse;">
          <tr><td style="padding:3px 12px 3px 0;color:#4a5568;">📞 Telefone:</td><td style="color:#2d3748;font-weight:600;">${orgao.tel}</td></tr>
          <tr><td style="padding:3px 12px 3px 0;color:#4a5568;">✉️ E-mail:</td><td style="color:#2d3748;">${orgao.email}</td></tr>
          <tr><td style="padding:3px 12px 3px 0;color:#4a5568;">👤 Responsável:</td><td style="color:#2d3748;">${orgao.responsavel}</td></tr>
        </table>
        <p style="font-size:.82rem;color:#4a5568;margin-top:12px;line-height:1.5;">
          💡 <strong>Dica:</strong> Você pode entrar em contato diretamente com este órgão citando o protocolo <strong>#${denuncia.id}</strong> para agilizar a resolução.
        </p>
      </div>
      <p style="font-size:.82rem;color:#718096;text-align:center;line-height:1.6;">
        Obrigado por ajudar a melhorar Vitória! 🏙️<br/>
        Acompanhe sua denúncia pelo app VIGIA.
      </p>`);
  try {
    const ok = await enviar({ destinatario, assunto: `✅ Denúncia #${denuncia.id} registrada — IRR ${denuncia.irr}% | VIGIA`, html });
    if (ok) console.log(`📧 E-mail de denúncia enviado para ${destinatario}`);
    return ok;
  } catch (err) {
    console.error('❌ Erro ao enviar e-mail de denúncia:', err.message);
    return false;
  }
}

// ── E-MAIL 4: confirmação de inscrição na lista de novidades (site) ──
async function enviarEmailListaEspera({ destinatario }) {
  const html = molduraVigia(`
      <p style="font-size:1rem;color:#2d3748;margin-bottom:6px;">Você entrou! 🎉</p>
      <p style="font-size:.93rem;color:#4a5568;line-height:1.6;margin-bottom:24px;">
        A partir de agora você recebe novidades do VIGIA por e-mail. E o melhor: o app já está no ar — não precisa esperar nada para começar a usar.
      </p>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="https://gabrielcbichara-eng.github.io/Vigia/" style="display:inline-block;background:#1DB954;color:#ffffff;text-decoration:none;font-weight:700;font-size:.95rem;padding:14px 32px;border-radius:30px;">📱 Abrir o VIGIA</a>
      </div>
      <p style="font-size:.82rem;color:#718096;text-align:center;line-height:1.6;">
        Obrigado por fazer parte da comunidade que ajuda a melhorar Vitória! 🏙️
      </p>`);
  try {
    const ok = await enviar({ destinatario, assunto: '🎉 Você está na lista VIGIA!', html });
    if (ok) console.log(`📧 Confirmação de lista de espera enviada para ${destinatario}`);
    return ok;
  } catch (err) {
    console.error('❌ Erro ao enviar confirmação de lista de espera:', err.message);
    return false;
  }
}

module.exports = { enviarEmailDenuncia, enviarEmailCodigo, enviarEmailBoasVindas, enviarEmailListaEspera, emailConfigurado };
