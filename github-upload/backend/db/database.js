// ─────────────────────────────────────────────────────────────
//  BANCO DE DADOS DO VIGIA — agora com dois modos:
//
//  1. LOCAL (padrão): arquivo vigia.db neste computador/servidor.
//     Zero configuração. No Render gratuito, é apagado quando o
//     servidor dorme.
//
//  2. TURSO (nuvem): os dados moram no serviço Turso (turso.tech)
//     e NUNCA são apagados, mesmo com o servidor dormindo.
//     Para ligar, basta definir duas variáveis de ambiente:
//       TURSO_DATABASE_URL  → endereço do banco (libsql://...)
//       TURSO_AUTH_TOKEN    → senha de acesso
//
//  Este arquivo é um "adaptador": o resto do código não precisa
//  saber qual modo está ativo. Funções:
//    db.all(sql, params)  → várias linhas
//    db.get(sql, params)  → uma linha
//    db.run(sql, params)  → insere/atualiza (devolve lastInsertRowid)
//    db.exec(sql)         → vários comandos de uma vez (criação de tabelas)
//    db.init()            → prepara tabelas e dados (chamado pelo server.js)
// ─────────────────────────────────────────────────────────────

const path = require('path');

const usaTurso = !!process.env.TURSO_DATABASE_URL;
let sqliteDb = null;
let turso = null;

if (usaTurso) {
  const { createClient } = require('@libsql/client');
  turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });
  console.log('☁️  Banco de dados: TURSO (nuvem, permanente)');
} else {
  const Database = require('better-sqlite3');
  sqliteDb = new Database(path.join(__dirname, 'vigia.db'));
  sqliteDb.pragma('journal_mode = WAL');
  console.log('💾 Banco de dados: arquivo local (vigia.db)');
}

// ── FUNÇÕES UNIVERSAIS ──
async function all(sql, params = []) {
  if (usaTurso) {
    const r = await turso.execute({ sql, args: params });
    return r.rows;
  }
  return sqliteDb.prepare(sql).all(...params);
}

async function get(sql, params = []) {
  if (usaTurso) {
    const r = await turso.execute({ sql, args: params });
    return r.rows[0];
  }
  return sqliteDb.prepare(sql).get(...params);
}

async function run(sql, params = []) {
  if (usaTurso) {
    const r = await turso.execute({ sql, args: params });
    return { lastInsertRowid: Number(r.lastInsertRowid), changes: r.rowsAffected };
  }
  const r = sqliteDb.prepare(sql).run(...params);
  return { lastInsertRowid: Number(r.lastInsertRowid), changes: r.changes };
}

async function exec(sql) {
  if (usaTurso) { await turso.executeMultiple(sql); return; }
  sqliteDb.exec(sql);
}

// Tenta adicionar uma coluna; se ela já existe, ignora o erro.
// (jeito seguro de fazer "migração" nos dois modos)
async function tentarAlter(sql, aviso) {
  try { await exec(sql); if (aviso) console.log(aviso); } catch (e) { /* coluna já existe */ }
}

// ── CRIAÇÃO DE TABELAS + DADOS ──
async function init() {
  await exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      nome        TEXT NOT NULL,
      sobrenome   TEXT NOT NULL,
      email       TEXT UNIQUE NOT NULL,
      tel         TEXT,
      cpf         TEXT UNIQUE NOT NULL,
      cep         TEXT NOT NULL,
      nascimento  TEXT,
      genero      TEXT,
      verificado  INTEGER DEFAULT 0,
      codigo_verif TEXT,
      criado_em   DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS denuncias (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      lat         REAL NOT NULL,
      lng         REAL NOT NULL,
      tipo        TEXT NOT NULL,
      descricao   TEXT,
      foto_path   TEXT,
      irr         INTEGER NOT NULL,
      irr_base    INTEGER,
      irr_motivo  TEXT,
      anonima     INTEGER DEFAULT 0,
      usuario_id  INTEGER,
      nome_exibir TEXT,
      localizacao TEXT,
      status      TEXT DEFAULT 'aberta',
      criado_em   DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS forum_posts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id  INTEGER,
      autor       TEXT NOT NULL,
      tag         TEXT DEFAULT 'forum',
      texto       TEXT NOT NULL,
      curtidas    INTEGER DEFAULT 0,
      denuncia_id INTEGER,
      criado_em   DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS denuncia_fotos (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      denuncia_id INTEGER NOT NULL,
      foto_path   TEXT NOT NULL,
      autor       TEXT,
      criado_em   DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS denuncia_comentarios (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      denuncia_id INTEGER NOT NULL,
      usuario_id  INTEGER,
      autor       TEXT NOT NULL,
      texto       TEXT NOT NULL,
      criado_em   DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS denuncia_votos (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      denuncia_id INTEGER NOT NULL,
      chave       TEXT NOT NULL,
      voto        INTEGER NOT NULL,
      criado_em   DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(denuncia_id, chave)
    );
    CREATE TABLE IF NOT EXISTS forum_comentarios (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id     INTEGER NOT NULL,
      usuario_id  INTEGER,
      autor       TEXT NOT NULL,
      texto       TEXT NOT NULL,
      criado_em   DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrações para bancos antigos (ignoradas se a coluna já existe)
  await tentarAlter('ALTER TABLE forum_posts ADD COLUMN denuncia_id INTEGER');
  await tentarAlter('ALTER TABLE denuncias ADD COLUMN irr_base INTEGER');
  await tentarAlter('ALTER TABLE usuarios ADD COLUMN verificado INTEGER DEFAULT 0');
  await tentarAlter('ALTER TABLE usuarios ADD COLUMN codigo_verif TEXT');
  await run('UPDATE denuncias SET irr_base = irr WHERE irr_base IS NULL');
  // Contas criadas antes da verificação existir ficam ativas
  await run('UPDATE usuarios SET verificado = 1 WHERE verificado = 0 AND codigo_verif IS NULL');

  // Copia a foto original de cada denúncia para a galeria (uma vez)
  await exec(`
    INSERT INTO denuncia_fotos (denuncia_id, foto_path, autor)
    SELECT id, foto_path, COALESCE(nome_exibir, 'Anônimo') FROM denuncias
    WHERE foto_path IS NOT NULL
      AND id NOT IN (SELECT DISTINCT denuncia_id FROM denuncia_fotos)
  `);

  // ── DADOS DE EXEMPLO ──
  // EXEMPLOS=nao nas variáveis de ambiente → app nasce vazio
  const seedLigado = !['nao', 'não', 'false', '0'].includes(String(process.env.EXEMPLOS || '').toLowerCase());
  if (!seedLigado) {
    console.log('🔇 EXEMPLOS=nao — removendo dados de demonstração se existirem...');
    // Apaga as 7 denúncias de exemplo pelo texto exato (dados reais de usuários são preservados)
    const descExemplo = [
      'Vazamento de esgoto na Praia de Camburi — cheiro forte, risco de contaminação. Crianças brincando perto.',
      'Buraco enorme na Av. Beira Mar, próximo ao hospital. Risco de vida para motociclistas.',
      'Poste de luz apagado há 3 semanas. Rua escura e perigosa à noite.',
      'Fiação elétrica exposta após chuva, próximo à escola municipal.',
      'Lixo acumulado há dias no bairro.',
      'Vazamento de água na calçada — desperdício e acúmulo.',
      'Calçada destruída em frente ao ponto de ônibus, idosos em risco.'
    ];
    for (const desc of descExemplo) {
      await run('DELETE FROM denuncias WHERE descricao = ?', [desc]);
    }
    // Apaga os 4 posts de exemplo pelo texto exato
    const textosExemplo = [
      'O esgoto na Praia de Camburi está absurdo. Já fiz a denúncia pelo VIGIA (IRR 87%). Vamos pressionar a CESAN!',
      'Buraco na Beira Mar há 3 meses. IRR 91% e nada. Alguém tem contato da Secretaria de Infraestrutura?',
      'Minha rua sem iluminação há 2 semanas. EDP disse que não tem prazo.',
      'Vamos organizar uma reunião com o vereador. Tenho 15 denúncias do VIGIA para apresentar. Quem topa?'
    ];
    for (const texto of textosExemplo) {
      await run('DELETE FROM forum_posts WHERE texto = ?', [texto]);
    }
    console.log('🧹 Dados de demonstração removidos (dados reais preservados).');
  }

  const totalDen = await get('SELECT COUNT(*) as n FROM denuncias');
  if (seedLigado && Number(totalDen.n) === 0) {
    const sqlIns = 'INSERT INTO denuncias (lat, lng, tipo, descricao, irr, irr_base, irr_motivo, anonima, nome_exibir, localizacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const exemplos = [
      [-20.2720, -40.2820, 'esgoto', 'Vazamento de esgoto na Praia de Camburi — cheiro forte, risco de contaminação. Crianças brincando perto.', 87, 87, 'Área costeira (IBGE) · "crianças" detectado · Impacto ambiental', 0, 'Gabriel M.', 'Praia de Camburi'],
      [-20.3165, -40.3340, 'buraco', 'Buraco enorme na Av. Beira Mar, próximo ao hospital. Risco de vida para motociclistas.', 91, 91, 'Via pública (IBGE) · "hospital" detectado · "risco de vida" detectado', 0, 'Ana C.', 'Av. Beira Mar'],
      [-20.2570, -40.2670, 'poste', 'Poste de luz apagado há 3 semanas. Rua escura e perigosa à noite.', 54, 54, 'Área residencial (IBGE)', 1, null, 'Jardim Camburi'],
      [-20.2990, -40.3210, 'fiacao', 'Fiação elétrica exposta após chuva, próximo à escola municipal.', 78, 78, 'Risco elétrico imediato · "escola" detectado', 0, 'Carlos S.', 'Maruípe'],
      [-20.2700, -40.3000, 'lixo', 'Lixo acumulado há dias no bairro.', 32, 32, 'Área urbana (IBGE)', 1, null, 'Goiabeiras'],
      [-20.3190, -40.3380, 'vazamento', 'Vazamento de água na calçada — desperdício e acúmulo.', 41, 41, 'Recurso público · área residencial', 0, 'Mariana T.', 'Centro'],
      [-20.2940, -40.2920, 'calcada', 'Calçada destruída em frente ao ponto de ônibus, idosos em risco.', 65, 65, 'Via de pedestres · "idosos" detectado', 0, 'Pedro A.', 'Praia do Canto']
    ];
    for (const e of exemplos) await run(sqlIns, e);
    console.log('🌱 7 denúncias de exemplo plantadas.');
  }

  const totalPosts = await get('SELECT COUNT(*) as n FROM forum_posts');
  if (seedLigado && Number(totalPosts.n) === 0) {
    const sqlPost = 'INSERT INTO forum_posts (autor, tag, texto, curtidas, denuncia_id) VALUES (?, ?, ?, ?, ?)';
    await run(sqlPost, ['Gabriel M.', 'esgoto', 'O esgoto na Praia de Camburi está absurdo. Já fiz a denúncia pelo VIGIA (IRR 87%). Vamos pressionar a CESAN!', 34, 1]);
    await run(sqlPost, ['Cidadã Vitória', 'buraco', 'Buraco na Beira Mar há 3 meses. IRR 91% e nada. Alguém tem contato da Secretaria de Infraestrutura?', 47, 2]);
    await run(sqlPost, ['Anônimo', 'luz', 'Minha rua sem iluminação há 2 semanas. EDP disse que não tem prazo.', 21, 3]);
    await run(sqlPost, ['Pedro A.', 'forum', 'Vamos organizar uma reunião com o vereador. Tenho 15 denúncias do VIGIA para apresentar. Quem topa?', 89, null]);
    console.log('🌱 4 posts de exemplo plantados no fórum.');
  }

  // CONSERTO: corrige coordenadas erradas de bancos antigos (uma vez)
  const fixCoords = [
    { de: [-20.3198, -40.3372], para: [-20.2720, -40.2820] },
    { de: [-20.3284, -40.3441], para: [-20.3165, -40.3340] },
    { de: [-20.3155, -40.3310], para: [-20.2570, -40.2670] },
    { de: [-20.3320, -40.3500], para: [-20.2990, -40.3210] },
    { de: [-20.3080, -40.3270], para: [-20.2700, -40.3000] },
    { de: [-20.3245, -40.3405], para: [-20.3190, -40.3380] },
    { de: [-20.3350, -40.3350], para: [-20.2940, -40.2920] }
  ];
  for (const f of fixCoords) {
    await run('UPDATE denuncias SET lat = ?, lng = ? WHERE lat = ? AND lng = ?', [f.para[0], f.para[1], f.de[0], f.de[1]]);
  }

  console.log('✅ Banco de dados pronto.');
}

module.exports = { all, get, run, exec, init, usaTurso };
