// ─────────────────────────────────────────────────────────────
//  ARMAZENAMENTO DE FOTOS
//
//  Modo local (padrão): a foto fica no disco do servidor.
//  No Render gratuito, esse disco é apagado quando ele dorme.
//
//  Modo nuvem: com a variável CLOUDINARY_URL definida, cada foto
//  é enviada ao Cloudinary (plano gratuito) e ganha um endereço
//  permanente (https://res.cloudinary.com/...). Aí ela nunca some.
//
//  guardarFoto() devolve o que deve ser salvo no banco:
//  ou o nome do arquivo local, ou a URL permanente.
// ─────────────────────────────────────────────────────────────

const fs = require('fs');

function nuvemConfigurada() {
  return !!process.env.CLOUDINARY_URL;
}

async function guardarFoto(caminhoLocal, nomeArquivo) {
  // Sem Cloudinary configurado → comportamento de sempre (arquivo local)
  if (!nuvemConfigurada()) return nomeArquivo;

  try {
    const cloudinary = require('cloudinary').v2; // lê CLOUDINARY_URL sozinho
    const r = await cloudinary.uploader.upload(caminhoLocal, {
      folder: 'vigia',
      resource_type: 'image'
    });
    // Apaga a cópia local — a foto agora mora na nuvem
    try { fs.unlinkSync(caminhoLocal); } catch (e) {}
    console.log('☁️  Foto enviada ao Cloudinary');
    return r.secure_url;
  } catch (err) {
    // Falha técnica não pode bloquear a denúncia: usa a cópia local
    console.error('⚠️  Erro ao enviar foto à nuvem (usando local):', err.message);
    return nomeArquivo;
  }
}

module.exports = { guardarFoto, nuvemConfigurada };
