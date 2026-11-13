// Tablero "Hoy en Bolívar": novedades, insignias NUEVO y avisos al celular (PWA).
(function(){
var LS=window.localStorage;function g(k){try{return LS.getItem(k)}catch(e){return null}}function s(k,v){try{LS.setItem(k,v)}catch(e){}}
var $=function(q,r){return (r||document).querySelector(q)},E=function(t){return String(t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
var hoyISO=new Date().toISOString().slice(0,10);
function hace(f){var d=Math.round((new Date(hoyISO)-new Date(f))/864e5);return d<=0?'hoy':d===1?'ayer':'hace '+d+' días'}
function pushOK(){return 'Notification' in window&&'serviceWorker' in navigator}
fetch('datos/hoy-auto.json',{cache:'no-cache'}).then(function(r){return r.ok?r.json():null}).then(function(D){if(!D)return;
 /* 1) Insignias NUEVO en los servicios */
 var sv=D.servicios||{};
 [].forEach.call(document.querySelectorAll('.svc'),function(a){var b=$('b',a);if(!b)return;var t=b.textContent.trim(),x=sv[t];
  if(x&&(g('cb_visto_'+t)||'')<x.f){var m=document.createElement('span');m.className='nuevo';m.textContent='NUEVO';m.title=x.n+' novedad'+(x.n>1?'es':'')+' desde '+x.f;a.appendChild(m);
   a.addEventListener('click',function(){s('cb_visto_'+t,hoyISO);m.remove()},{once:true})}});
 /* 2) Franja de novedades dentro de "Hoy en Bolívar" */
 var hoy=$('#hoy'),nota=$('#hav');if(!hoy)return;
 var nv=(D.novedades||[]).slice(0,3),cuerpo='';
 if(nv.length)cuerpo=nv.map(function(n){return '<a class="chn" href="'+E(n.u)+'" target="_blank" rel="noopener"><b>🆕 '+E(n.t)+'</b><small>'+hace(n.f)+'</small></a>'}).join('');
 var prox=(D.cumples&&D.cumples.proximos)||[];
 if(!nv.length)cuerpo='<span class="nn">Sin novedades nuevas por ahora.</span>';
 var bar=document.createElement('div');bar.className='nov';bar.id='hnov';
 bar.innerHTML='<span class="nt">Novedades</span><div class="ncs">'+cuerpo+'</div>'+(pushOK()?'<button type="button" class="bell" id="hbell"></button>':'');
 hoy.insertBefore(bar,nota||null);
 var bell=$('#hbell');if(bell){pinta();bell.addEventListener('click',activar)}
 function pinta(){var p=Notification.permission;bell.textContent=p==='granted'?'🔔 Avisos activados':p==='denied'?'🔕 Avisos bloqueados':'🔔 Activar avisos';bell.classList.toggle('on',p==='granted');bell.disabled=p==='denied';bell.title=p==='denied'?'Actívalos en los permisos del navegador para este sitio':'Recibe un aviso cuando haya novedades o se acerque una fecha'}
 function activar(){if(Notification.permission==='granted'){revisar();return}
  fetch('datos/notificaciones-config.json',{cache:'no-cache'}).then(function(r){return r.ok?r.json():{}}).catch(function(){return{}}).then(function(c){
   if(c.onesignal_app_id){var sc=document.createElement('script');sc.src='https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';sc.defer=true;document.head.appendChild(sc);
    window.OneSignalDeferred=window.OneSignalDeferred||[];window.OneSignalDeferred.push(function(O){return O.init({appId:c.onesignal_app_id,serviceWorkerPath:'sw.js',serviceWorkerParam:{scope:'./'},notifyButton:{enable:false}}).then(function(){return O.Notifications.requestPermission()}).then(pinta)});return}
   Notification.requestPermission().then(function(p){pinta();if(p==='granted')iniciarLocal(true)})})}
 /* 3) Avisos locales (sin servidor): el service worker compara las novedades y avisa solo de las nuevas */
 function revisar(){navigator.serviceWorker.ready.then(function(r){if(r.active)r.active.postMessage({tipo:'revisar'})})}
 function iniciarLocal(primera){navigator.serviceWorker.ready.then(function(r){
  if(r.periodicSync)navigator.permissions.query({name:'periodic-background-sync'}).then(function(q){if(q.state==='granted')r.periodicSync.register('cb-novedades',{minInterval:12*36e5})}).catch(function(){});
  if(primera)r.showNotification('Avisos activados ✔',{body:'Te avisaremos de las novedades y fechas importantes del colegio.',icon:'assets/icons/icon-192.png',tag:'cb-ok'});
  revisar()})}
 if(pushOK()&&Notification.permission==='granted')iniciarLocal(false);
}).catch(function(){});
})();
