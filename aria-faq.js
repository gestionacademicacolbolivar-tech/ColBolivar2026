// ARIA · Respuestas verificadas (aria-faq.js). Se carga DESPUÉS de aria-docs.js.
// Revisa primero datos/respuestas-docentes.json (respuestas cortas con página exacta) y, si no hay coincidencia, deja actuar al buscador normal.
(function(){'use strict';
var U=window.ARIA_FAQ_URL||'datos/respuestas-docentes.json',F=null,P=null;
function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function esc(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function cargar(){return P||(P=fetch(U).then(function(r){return r.json()}).then(function(j){F=(j.faq||[]).map(function(f){f._r=f.k.map(function(k){return new RegExp(k)});return f});return F}).catch(function(){F=[];return F}))}
function mejor(q){if(!F)return null;var n=norm(q),b=null,s=0;F.forEach(function(f){var c=0;f._r.forEach(function(r){if(r.test(n))c++});if(c>s){s=c;b=f}});return b}
function link(f,p,t){return '<a href="visor.html?'+new URLSearchParams({f:f.f,t:f.d,p:p})+'" target="_blank" rel="noopener">'+t+'</a>'}
function html(f){var p=f.p,pg=p.length>1?'págs. '+p[0]+'–'+p[p.length-1]:'pág. '+p[0];
 return 'Según <b>'+esc(f.d)+'</b> ('+pg+'):<br>'+esc(f.r).replace(/\n/g,'<br>')+'<br>'+link(f,p[0],'Ver en la página '+p[0]+' ↗')+(p.length>1?'<br><small>Otras páginas: '+p.slice(1).map(function(n){return link(f,n,'pág. '+n+' ↗')}).join(' · ')+'</small>':'')}
function envolver(){var D=window.ARIA_DOCS;if(!D)return setTimeout(envolver,300);if(D._faq)return;D._faq=1;var pd=D.pideDoc,rs=D.responder;
 D.pideDoc=function(q){return mejor(q)?true:pd.call(D,q)};
 D.responder=function(q){return cargar().then(function(){var f=mejor(q);return f?html(f):rs.call(D,q)})};
 D.faq=function(q){return mejor(q)};cargar()}
envolver();
})();
