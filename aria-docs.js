// ARIA Documentos: busca en indice-docs.json (generado automáticamente desde todo el repositorio). Sin servidores ni costo.
(function(){
var URL_=window.ARIA_DOCS_URL||'indice-docs.json',D=null,df={},cargando=null;
var SW='de la las los el un una unos unas y o a en que se por con para es al del lo como mas pero sus le ya mi tu su si no hay donde cual cuales quien esta este esto son ser fue sobre entre me te nos hola aria dime quiero necesito favor puedes'.split(' ');
function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function tok(s){return norm(s).split(/[^a-z0-9]+/).filter(function(w){return w.length>2&&SW.indexOf(w)<0}).map(function(w){return w.length>4?w.replace(/(es|s)$/,''):w})}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function cargar(){if(D)return Promise.resolve();if(cargando)return cargando;
 return cargando=fetch(URL_).then(function(r){return r.json()}).then(function(a){D=a.map(function(c){var tf={},t=tok(c.x+' '+c.t);t.forEach(function(w){tf[w]=(tf[w]||0)+1});Object.keys(tf).forEach(function(w){df[w]=(df[w]||0)+1});c._tf=tf;c._t=tok(c.t);return c})}).catch(function(){D=[]})}
function buscar(q){var qt=tok(q);if(!qt.length||!D.length)return[];var N=D.length,mejor={};
 D.forEach(function(c){var s=0,m=0;qt.forEach(function(w){var f=c._tf[w];if(f){m++;s+=Math.log(1+N/(df[w]||1))*(1+Math.log(f))*(c._t.indexOf(w)>=0?1.8:1)}});
  if(m<Math.min(2,qt.length))return;s*=m/qt.length;if(!mejor[c.u.split('#')[0]]||mejor[c.u.split('#')[0]].s<s)mejor[c.u.split('#')[0]]={c:c,s:s}});
 return Object.keys(mejor).map(function(k){return mejor[k]}).sort(function(a,b){return b.s-a.s}).slice(0,3)}
window.ARIA_DOCS={
 pideDoc:function(q){return /(document|pdf|manual|plan de|planes|formato|enlace|link|circular|horario|gu[ií]a|d[oó]nde (est[aá]|encuentro|puedo)|pagina|p[aá]gina|reglamento|pei|sie[sn]?|calendario)/i.test(q)},
 responder:function(q){return cargar().then(function(){var r=buscar(q);if(!r.length||r[0].s<6)return null;
  var h='Encontré esto en los documentos del colegio 📄<br>';
  r.forEach(function(x){var t=x.c.x,sn=t.length>200?t.slice(0,200).replace(/\s\S*$/,'')+'…':t;h+='<br><a href="'+esc(x.c.u)+'" target="_blank" rel="noopener"><b>'+esc(x.c.t)+(x.c.p?' (pág. '+x.c.p+')':'')+'</b></a><br><small>'+esc(sn)+'</small><br>'});
  return h})}};
cargar();
})();
