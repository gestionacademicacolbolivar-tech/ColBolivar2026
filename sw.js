const C='colbolivar-v3';
const CORE=['./','./index.html','./hoy-data.js','./cumpleanos-data.js','./favicon.ico','./assets/img/escudo.webp','./assets/icons/icon-192.png','./assets/css/ui.css','./assets/js/nav.js','./assets/img/ui-nav.webp','./assets/img/ui-docs.webp','./assets/img/iconos-clasicos.webp'];
const CACHEABLE=/\.(html|js|css|webp|png|jpe?g|svg|json|webmanifest)$|\/$/i;
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(CORE).catch(()=>{})))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==C).map(n=>caches.delete(n)))).then(()=>clients.claim())));
self.addEventListener('fetch',e=>{
 const r=e.request,u=new URL(r.url);
 if(r.method!=='GET'||u.origin!==location.origin||r.headers.has('range'))return;
 if(/\/assets\/img\//.test(u.pathname)){ // imágenes: primero caché (nunca cambian: el nombre es su huella)
  e.respondWith(caches.match(r).then(h=>h||fetch(r).then(x=>{if(x.ok){const k=x.clone();caches.open(C).then(c=>c.put(r,k))}return x})));return}
 if(!CACHEABLE.test(u.pathname))return; // PDF y audio no se guardan: pesan mucho
 e.respondWith(fetch(r).then(x=>{if(x.ok){const k=x.clone();caches.open(C).then(c=>c.put(r,k))}return x}).catch(()=>caches.match(r).then(h=>h||caches.match('./index.html'))));
});
