// ColBolívar Radio · service worker: red primero (siempre lo más nuevo), caché solo como respaldo sin conexión. No toca los audios.
const C='cbradio-v1',SHELL=['./','index.html','radio.css','logo-banner.webp','logo-banner-movil.webp','icon-192.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>Promise.allSettled(SHELL.map(u=>c.add(u)))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);
  if(r.method!=='GET'||u.origin!==location.origin||u.pathname.includes('/audio/')||r.headers.has('range'))return;
  const k=u.origin+u.pathname;
  e.respondWith(fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(k,cp))}return res}).catch(()=>caches.match(k).then(m=>m||caches.match('./'))))});
