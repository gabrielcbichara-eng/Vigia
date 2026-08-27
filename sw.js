// ─────────────────────────────────────────────────────────────
//  SERVICE WORKER DO VIGIA
//  Cacheia só o "esqueleto" do app (a própria página, o manifest e
//  os ícones) pra abrir rápido e funcionar mesmo sem sinal.
//
//  REGRA MAIS IMPORTANTE: chamadas pro backend (denúncias, fórum,
//  perfil, admin — qualquer coisa em /api/, seja localhost:3000 ou
//  vigia-idj3.onrender.com) NUNCA passam pelo cache. Vão sempre
//  direto pra internet, exatamente como se este arquivo não
//  existisse. Se isso for quebrado, a sincronização de dados do
//  app para de funcionar — por isso essa checagem vem antes de
//  qualquer outra coisa na função de fetch, e sai (return) sem
//  nem tocar no cache.
// ─────────────────────────────────────────────────────────────

const CACHE_NAME = 'vigia-shell-v2';

// Hosts que são sempre o backend de verdade — nunca cachear.
const HOSTS_API = ['localhost:3000', 'vigia-idj3.onrender.com'];

function ehChamadaDeApi(url) {
  if (url.pathname.includes('/api/')) return true;
  return HOSTS_API.includes(url.host);
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // ── REGRA DE OURO: nunca intercepta chamada de API ──
  if (ehChamadaDeApi(url)) return;

  // Só GET pode ser cacheado — POST/PATCH/DELETE sempre direto também
  // (denúncias, comentários, votos, etc. são todos não-GET e já
  // ficariam de fora pela regra acima, mas isso é uma segunda trava).
  if (req.method !== 'GET') return;

  // Só cuida do esqueleto: a própria página do app (navegação) e os
  // arquivos do PWA que moram no mesmo endereço (manifest, ícones,
  // este próprio arquivo). Mapa, bibliotecas externas (Leaflet),
  // geocoding (Nominatim) — tudo isso passa direto, sem cache.
  const mesmaOrigem = url.origin === self.location.origin;
  const ehNavegacao = req.mode === 'navigate';
  const ehArquivoDoEsqueleto = mesmaOrigem && /\.(html|json|png|ico|css|js)$/i.test(url.pathname);

  if (!ehNavegacao && !ehArquivoDoEsqueleto) return;

  // Network-first: tenta a internet primeiro (dado sempre fresco);
  // só usa o cache se estiver genuinamente sem conexão.
  event.respondWith(
    fetch(req)
      .then((resposta) => {
        const copia = resposta.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copia));
        return resposta;
      })
      .catch(() => caches.match(req).then((cacheado) => cacheado || caches.match('./')))
  );
});

// ── NOTIFICAÇÕES PUSH ──
// O servidor manda um aviso (ex.: "sua denúncia foi resolvida") e o
// navegador mostra a notificação mesmo com o app fechado.
self.addEventListener('push', (event) => {
  let dados = {};
  try { dados = event.data ? event.data.json() : {}; } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(dados.titulo || 'VIGIA', {
      body: dados.corpo || '',
      icon: './icon-192.png',
      badge: './icon-192.png',
      data: { url: dados.url || './' }
    })
  );
});

// Toque na notificação → abre (ou foca) o app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((abas) => {
      for (const aba of abas) {
        if ('focus' in aba) return aba.focus();
      }
      return clients.openWindow(event.notification.data && event.notification.data.url || './');
    })
  );
});
