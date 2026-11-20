// ARIA · Resultados de la Autoevaluación 2026 (aria-autoeval.js)
// Responde preguntas como "¿cómo va la autoevaluación?", "¿cuál es el proceso más débil?" o "¿cómo le fue a la gestión académica?"
// usando SOLO resultados agregados (promedios y conteos). Nunca muestra comentarios ni respuestas individuales.
// Lee: datos/autoevaluacion-config.json (url de la hoja de Google) + datos/autoevaluacion-guia34.json (nombres de procesos/componentes).
// Si el tablero está protegido con clave (pedirClaveVer) o hay pocas respuestas, ARIA lo dice y no muestra cifras.
// API: ARIA_AUTO.consultar(texto) -> Promise<{html, texto, fuerte:true}|null>   (null = no es una pregunta sobre la autoevaluación)
(function(root){'use strict';
var CFG_URL='datos/autoevaluacion-config.json',INS_URL='datos/autoevaluacion-guia34.json',PAGE='autoevaluacion.html';
var INS=null,CFG=null,base=null,cache=null,cacheT=0,TTL=60000;
var NIV=['Existencia','Pertinencia','Apropiación','Mejoramiento continuo'];
function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function f1(v){return v==null||isNaN(v)?'–':Number(v).toLocaleString('es-CO',{minimumFractionDigits:1,maximumFractionDigits:1})}
function nivelDe(m){return m==null?0:m<1.5?1:m<2.5?2:m<3.5?3:4}
function nv(m){var n=nivelDe(m);return n?NIV[n-1]:'sin datos'}
function gCorto(n){var s=String(n).replace('Gestión ','');return s.charAt(0).toUpperCase()+s.slice(1)}
function min(){return (CFG&&CFG.minimoPersonas)||3}
var LINK='<a href="'+PAGE+'#resultados" target="_blank" rel="noopener">Ver el tablero completo ↗</a>';
var LINK_EV='<a href="'+PAGE+'#evaluar" target="_blank" rel="noopener">Hacer la autoevaluación ↗</a>';

/* ---------- ¿es una pregunta sobre la autoevaluación? ---------- */
var RX={
 A:/autoevalu|evaluacion institucional|guia 34|guia34/,
 R:/como va|como vamos|como esta|como nos fue|como nos va|como le fue|como les fue|resultado|avance|balance|resumen|participa|cuantos|cuantas|nivel|promedio|estado|informe|tablero|puntaje|calificacion/,
 W:/debil|bajo|bajos|flojo|flojos|peor|peores|critico|criticos|atrasad|mejorar|oportunidad|falla|fallas|prioridad|prioritario/,
 Wstrict:/debil|debiles|flojo|flojos|peor|peores|critico|criticos|oportunidades? de mejora|puntos? debiles|prioritario|mas bajo|mas bajos|menos valorad|menor valoracion|peor valorad/,
 Rres:/cuantos|cuantas|han participado|participaron|resultado|como va|como vamos|nivel|promedio|avance|balance|resumen|tablero|puntaje/,
 S:/fuerte|fuertes|alto|altos|mejor|mejores|fortaleza|fortalezas|destaca|sobresale/,
 P:/proceso|procesos|gestion|gestiones|componente|componentes/,
 IR:/donde|como (hago|hacer|participo|participar|ingreso|entro|accedo|contesto|respondo|evaluo)|enlace|link|quiero (hacer|participar|evaluar)|evaluar|participar|responder/
};
var GEST=[['GD',/directiv/],['GA',/academic|pedagog/],['GF',/administrativ|financier/],['GC',/comunidad/]];
function intencion(q){
 var a=RX.A.test(q),p=RX.P.test(q),g=null;
 GEST.forEach(function(x){if(!g&&x[1].test(q))g=x[0]});
 if(a&&RX.IR.test(q)&&!RX.Rres.test(q)&&!RX.W.test(q)&&!RX.S.test(q))return{t:'ir'};
 var w=a?RX.W.test(q):(p&&RX.Wstrict.test(q)),s=(a||p)&&RX.S.test(q)&&(a||/proceso|procesos|componente|componentes/.test(q));
 if(g&&(a||p)&&(RX.R.test(q)||w||s))return{t:'gestion',g:g};
 if(w&&(a||p))return{t:'debil'};
 if(s)return{t:'fuerte'};
 if(a&&RX.R.test(q))return{t:'estado'};
 if(p&&/participa|cuantos|cuantas/.test(q)&&/autoevalu|evaluacion|evaluaron|evaluado/.test(q))return{t:'estado'};
 return null;
}

/* ---------- carga y cálculo ---------- */
function cargarBase(){
 return base||(base=Promise.all([fetch(INS_URL).then(function(r){return r.json()}),fetch(CFG_URL,{cache:'no-cache'}).then(function(r){return r.json()}).catch(function(){return{}})]).then(function(a){INS=a[0];CFG=a[1]||{}}).catch(function(e){base=null;throw e}));
}
function consolidar(rows){
 var o=rows.slice().sort(function(a,b){return String(a.t).localeCompare(String(b.t))}),m={},out=[];
 o.forEach(function(x){if(!x.p){out.push(x);return}var q=m[x.p];if(!q){q=m[x.p]={p:x.p,r:{}};out.push(q)}for(var k in (x.r||{}))q.r[k]=x.r[k]});
 return out;
}
function datos(){
 if(cache&&Date.now()-cacheT<TTL)return Promise.resolve(cache);
 return cargarBase().then(function(){
  if(!CFG.url)return{estado:'local'};
  return fetch(CFG.url+(CFG.url.indexOf('?')>=0?'&':'?')+'accion=resultados').then(function(r){return r.json()}).then(function(j){
   if(!j.ok)return{estado:j.error==='clave'?'clave':'error'};
   return{estado:'ok',rows:consolidar(j.respuestas||[])};
  }).catch(function(){return{estado:'error'}});
 }).then(function(d){cache=d;cacheT=Date.now();return d}).catch(function(){return{estado:'error'}});
}
function calcular(rows){
 var comp={},proc={},gest={},pers={},all={n:0,s:0};
 INS.gestiones.forEach(function(g){pers[g.id]=0;gest[g.id]={n:0,s:0};g.procesos.forEach(function(p){proc[p.id]={n:0,s:0,g:g.id,nombre:p.nombre};p.componentes.forEach(function(c){comp[c.id]={n:0,s:0,g:g.id,p:p.id,nombre:c.nombre}})})});
 rows.forEach(function(x){var vio={};for(var k in (x.r||{})){var v=+x.r[k],c=comp[k];if(!c||!(v>=1&&v<=4))continue;c.n++;c.s+=v;proc[c.p].n++;proc[c.p].s+=v;gest[c.g].n++;gest[c.g].s+=v;all.n++;all.s+=v;vio[c.g]=1}for(var g in vio)pers[g]++});
 function m(o){o.m=o.n?o.s/o.n:null;return o}
 Object.keys(comp).forEach(function(k){m(comp[k])});Object.keys(proc).forEach(function(k){m(proc[k])});Object.keys(gest).forEach(function(k){m(gest[k])});m(all);
 return{n:rows.length,pers:pers,comp:comp,proc:proc,gest:gest,all:all};
}
function ordenar(obj,minN){return Object.keys(obj).map(function(k){var o=obj[k];o.id=k;return o}).filter(function(o){return o.n>=minN&&o.m!=null}).sort(function(a,b){return a.m-b.m})}
function gNombre(id){var g=INS.gestiones.filter(function(x){return x.id===id})[0];return g?gCorto(g.nombre):id}

/* ---------- respuestas ---------- */
function res(html){html=html.replace(/<br>/g,' <br>');return{html:html,texto:html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(),fuerte:true}}
function sinDatos(d){
 if(d.estado==='local')return res('📊 La conexión de la autoevaluación con Google todavía no está activada, así que aún no puedo ver los resultados del colegio. Quien administra el portal debe terminarla.');
 if(d.estado==='clave')return res('🔐 Los resultados de la autoevaluación están protegidos con clave, así que no puedo mostrarlos aquí. Pídesela a coordinación y entra al tablero.<br>'+LINK);
 return res('📡 Ahora mismo no logré leer los resultados de la autoevaluación. Intenta de nuevo en un momento.<br>'+LINK);
}
function pocos(n){return res('📊 Ya hay <b>'+n+'</b> '+(n===1?'respuesta':'respuestas')+' en la autoevaluación, pero muestro los resultados desde <b>'+min()+' personas</b> para cuidar el anonimato. ¡Anímate a participar!<br>'+LINK_EV)}
function lista(arr,n){return arr.slice(0,n).map(function(o){return '• <b>'+esc(o.nombre)+'</b> — '+f1(o.m)+' ('+nv(o.m)+') · <small>'+esc(gNombre(o.g))+'</small>'}).join('<br>')}
function responder(it,d){
 if(it.t==='ir')return Promise.resolve(res('✍️ La autoevaluación 2026 es anónima y se responde por gestiones: eliges una, respondes una pregunta a la vez y la envías. Puedes evaluar solo la que conoces.<br>'+LINK_EV));
 if(d.estado!=='ok')return Promise.resolve(sinDatos(d));
 var n=d.rows.length;if(!n)return Promise.resolve(res('📭 Todavía no hay respuestas en la autoevaluación. ¡Puedes ser la primera persona!<br>'+LINK_EV));
 if(n<min())return Promise.resolve(pocos(n));
 var a=calcular(d.rows),mn=min();
 if(it.t==='estado'){
  var gs=INS.gestiones.map(function(g){var p=a.pers[g.id];return '• '+esc(gCorto(g.nombre))+': '+(p>=mn?'<b>'+f1(a.gest[g.id].m)+'</b> ('+nv(a.gest[g.id].m)+') · '+p+' personas':'<small>pocas respuestas todavía ('+p+')</small>')}).join('<br>');
  var pr=ordenar(a.proc,mn),extra=pr.length>=2?'<br>🌟 Más fuerte: <b>'+esc(pr[pr.length-1].nombre)+'</b> ('+f1(pr[pr.length-1].m)+') · 🔧 Más débil: <b>'+esc(pr[0].nombre)+'</b> ('+f1(pr[0].m)+')':'';
  return Promise.resolve(res('📊 <b>Autoevaluación 2026 · así va</b><br>Han participado <b>'+a.n+' personas</b> con '+a.all.n+' valoraciones. Nivel global: <b>'+nv(a.all.m)+' ('+f1(a.all.m)+' de 4)</b>.<br>'+gs+extra+'<br><small>Los resultados cambian a medida que más personas responden.</small><br>'+LINK));
 }
 if(it.t==='debil'){
  var pd=ordenar(a.proc,mn),cd=ordenar(a.comp,mn);
  if(!pd.length)return Promise.resolve(pocos(n));
  return Promise.resolve(res('🔧 <b>Procesos con menor valoración</b> (escala 1 a 4)<br>'+lista(pd,3)+(cd.length?'<br><br>Y el componente más bajo es <b>'+esc(cd[0].nombre)+'</b> ('+f1(cd[0].m)+', '+nv(cd[0].m)+').':'')+'<br><small>Son el punto de partida sugerido para el plan de mejoramiento.</small><br>'+LINK));
 }
 if(it.t==='fuerte'){
  var pf=ordenar(a.proc,mn).reverse();
  if(!pf.length)return Promise.resolve(pocos(n));
  return Promise.resolve(res('🌟 <b>Procesos mejor valorados</b> (escala 1 a 4)<br>'+lista(pf,3)+'<br>'+LINK));
 }
 if(it.t==='gestion'){
  var g=INS.gestiones.filter(function(x){return x.id===it.g})[0],p=a.pers[it.g];
  if(p<mn)return Promise.resolve(res('📊 La <b>'+esc(g.nombre)+'</b> la han evaluado '+p+' '+(p===1?'persona':'personas')+'; muestro resultados desde '+mn+' para cuidar el anonimato.<br>'+LINK_EV));
  var ps={};g.procesos.forEach(function(x){ps[x.id]=a.proc[x.id]});var po=ordenar(ps,mn);
  return Promise.resolve(res('📊 <b>'+esc(g.nombre)+'</b><br>La evaluaron <b>'+p+' personas</b>. Nivel: <b>'+nv(a.gest[it.g].m)+' ('+f1(a.gest[it.g].m)+' de 4)</b>.'+(po.length?'<br>🌟 Más fuerte: <b>'+esc(po[po.length-1].nombre)+'</b> ('+f1(po[po.length-1].m)+')<br>🔧 Más débil: <b>'+esc(po[0].nombre)+'</b> ('+f1(po[0].m)+')':'')+'<br>'+LINK));
 }
 return Promise.resolve(null);
}
root.ARIA_AUTO={
 consultar:function(texto){
  var it=intencion(norm(texto));if(!it)return Promise.resolve(null);
  if(it.t==='ir')return cargarBase().then(function(){return responder(it,{})}).catch(function(){return responder(it,{})});
  return datos().then(function(d){return responder(it,d)});
 },
 intencion:function(t){return intencion(norm(t))}
};
})(typeof window!=='undefined'?window:this);
