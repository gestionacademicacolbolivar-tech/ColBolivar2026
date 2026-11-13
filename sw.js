const C='colbolivar-v15';
const CORE=['./','./index.html','./datos/hoy-data.js','./datos/cumpleanos-data.js','./favicon.ico','./assets/img/escudo.webp','./assets/icons/icon-192.png','./assets/css/ui.css','./assets/js/nav.js','./assets/js/tablero.js','./datos/hoy-auto.json','./PROCESOS.html','./procesos/procesos.json','./aria-kb.js','./aria-conocimiento/base-colegio.json','./assets/img/ui-nav.webp','./assets/img/ui-docs.webp','./assets/img/46b47eb28f.webp'];
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

/* ---- Avisos al celular (PWA) ---- */
// Para avisos push reales con OneSignal (ver datos/AVISOS-LEEME.md) cambia a true:
const PUSH_ONESIGNAL=false;
if(PUSH_ONESIGNAL){try{importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js')}catch(e){}}
async function revisarNovedades(){
 try{
  const d=await (await fetch('./datos/hoy-auto.json',{cache:'no-store'})).json(),c=await caches.open('cb-avisos'),prev=await c.match('vistos');
  const ids=(d.novedades||[]).map(n=>n.id);
  if(prev){const vistos=await prev.json();
   for(const n of (d.novedades||[]).filter(n=>!vistos.includes(n.id)).slice(0,3))
    await self.registration.showNotification('Nuevo en ColBolívar',{body:n.t,icon:'assets/icons/icon-192.png',tag:n.id,data:{u:n.u}});
   for(const f of (d.fechas||[]).filter(f=>f.dias<=1)){const k='fecha:'+f.t+':'+f.f+':'+f.dias;
    if(!vistos.includes(k)){ids.push(k);await self.registration.showNotification('Fecha importante',{body:f.t+(f.dias?' es mañana':' es hoy'),icon:'assets/icons/icon-192.png',tag:k,data:{u:'./'}})}else ids.push(k)}}
  await c.put('vistos',new Response(JSON.stringify(ids)));
 }catch(e){}
}
self.addEventListener('message',e=>{if(e.data&&e.data.tipo==='revisar')e.waitUntil(revisarNovedades())});
self.addEventListener('periodicsync',e=>{if(e.tag==='cb-novedades')e.waitUntil(revisarNovedades())});
self.addEventListener('notificationclick',e=>{e.notification.close();const u=new URL((e.notification.data&&e.notification.data.u)||'./',self.registration.scope).href;
 e.waitUntil(clients.matchAll({type:'window'}).then(l=>{for(const w of l){if(w.url===u&&'focus' in w)return w.focus()}return clients.openWindow(u)}))});
