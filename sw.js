const C='colbolivar-v9';
const CORE=['./','./index.html','./datos/hoy-data.js','./datos/cumpleanos-data.js','./favicon.ico','./assets/img/escudo.webp','./assets/icons/icon-192.png','./assets/css/ui.css','./assets/js/nav.js','./PROCESOS.html','./procesos/procesos.json','./aria-kb.js','./aria-conocimiento/base-colegio.json','./assets/img/ui-nav.webp','./assets/img/ui-docs.webp','./assets/img/46b47eb28f.webp'];
const CACHEABLE=/\.(html|js|css|webp|png|jpe?g|svg|json|webmanifest)$|\/$/i;
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(CORE).catch(()=>{})))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==C).map(n=>caches.delete(n)))).then(()=>clients.claim())));
self.addEventListener('fetch',e=>{
 const r=e.request,u=new URL(r.url);
 if(r.method!=='GET'||u.origin!==location.origin||r.headers.has('range'))return;
 if(/\/assets\/img\//.test(u.pathname)){ // imágenes: primero caché (nunca cambian: el nombre es su huella)
  e.respondWith(caches.match(r).then(h=>h||fetch(r).then(x=>{if(x.ok){const k=x.clone();caches.open(C).then(c=>c.put(r,k))}return x})));return}
 if(/(^|\/)indice-docs\.json$/.test(u.pathname)){ // índice de ARIA: lo guardado al instante y se actualiza en segundo plano
  e.respondWith(caches.open(C).then(c=>c.match(r).then(h=>{const n=fetch(r).then(x=>{if(x.ok)c.put(r,x.clone());return x}).catch(()=>h||Response.error());return h||n})));return}
 if(!CACHEABLE.test(u.pathname))return; // PDF y audio no se guardan: pesan mucho
 e.respondWith(fetch(r).then(x=>{if(x.ok){const k=x.clone();caches.open(C).then(c=>c.put(r,k))}return x}).catch(()=>caches.match(r).then(h=>h||(r.mode==='navigate'?caches.match('./index.html'):Response.error()))));
});
