// ARIA Documentos v2: entrega el enlace directo del documento pedido y responde de forma puntual con la frase exacta del texto.
(function(){
var URL_=window.ARIA_DOCS_URL||'indice-docs.json',D=null,DOCS=[],df={},cargando=null;
var SW='de la las los el un una unos unas y o a en que se por con para es al del lo como mas pero sus le ya mi tu su si no hay donde cual cuales quien esta este esto son ser fue sobre entre me te nos hola aria dime quiero necesito favor puedes dice dicen establece habla informacion'.split(' ');
var GEN='dame envia envio pasame muestrame comparte descargar descarga enlace link archivo documento documentos pdf busca buscar abrir quisiera necesitaria'.split(' ');
function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function tok(s,g){return norm(s).split(/[^a-z0-9]+/).filter(function(w){return w.length>1&&SW.indexOf(w)<0&&(!g||GEN.indexOf(w)<0)&&(w.length>2||/^[a-z]{2}$/.test(w)&&0)}).map(function(w){return w.length>4?w.replace(/(es|s)$/,''):w})}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function cargar(){if(D)return Promise.resolve();if(cargando)return cargando;
 return cargando=fetch(URL_).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(a){var seen={};D=a.map(function(c){var tf={},t=tok(c.x+' '+c.t);t.forEach(function(w){tf[w]=(tf[w]||0)+1});Object.keys(tf).forEach(function(w){df[w]=(df[w]||0)+1});c._tf=tf;c._t=tok(c.t);var b=c.u.split('#')[0];if(!seen[b]){seen[b]=1;DOCS.push({u:b,t:c.t,tt:c._t})}return c});VOC=Object.keys(df)}).catch(function(){D=[]})}
function porTitulo(qt){if(!qt.length)return[];return DOCS.map(function(d){var m=0;qt.forEach(function(w){if(d.tt.indexOf(w)>=0)m++});var cov=m/qt.length;return{d:d,cov:cov,s:cov*10-d.tt.length*.05}}).filter(function(x){return x.cov>=.67}).sort(function(a,b){return b.s-a.s}).slice(0,3)}
var VOC=[];function exp(w){if(w.length<5)return[w];var p=w.slice(0,-1);return VOC.filter(function(k){return k.indexOf(p)===0}).concat([w])}
function buscar(q){var qt=tok(q,1);if(!qt.length||!D.length)return[];var N=D.length,best={},X=qt.map(exp),rare=[];
 qt.forEach(function(w,i){if((df[w]||0)/N<.4)rare.push(i)});if(!rare.length)rare=qt.map(function(_,i){return i});var need=Math.max(1,Math.ceil(rare.length*.6));
 D.forEach(function(c){var s=0,m=0,mr=0;X.forEach(function(vs,i){var f=0,d=0;vs.forEach(function(v){if(c._tf[v]){f+=c._tf[v];d=Math.max(d,df[v]||1)}});if(f){m++;if(rare.indexOf(i)>=0)mr++;s+=Math.log(1+N/d)*(1+Math.log(f))*(vs.some(function(v){return c._t.indexOf(v)>=0})?1.8:1)}});
  if(mr<need)return;s*=m/qt.length;var b=c.u.split('#')[0];if(!best[b]||best[b].s<s)best[b]={c:c,s:s}});
 return Object.keys(best).map(function(k){return best[k]}).sort(function(a,b){return b.s-a.s}).slice(0,3)}
function frase(x,qt){var fr=x.replace(/([.;:!?])\s+/g,'$1|').split('|'),b=0,bi=0,X=qt.map(exp);fr.forEach(function(f,i){var tf=tok(f),sc=0;X.forEach(function(vs){if(vs.some(function(v){return tf.indexOf(v)>=0}))sc++});if(sc>b){b=sc;bi=i}});var o=fr[bi]||x;if(o.length<80&&fr[bi+1])o+=' '+fr[bi+1];return o.length>320?o.slice(0,320).replace(/\s\S*$/,'')+'…':o}
function lk(u,t){return '<a href="'+esc(u)+'" target="_blank" rel="noopener">'+esc(t)+' ↗</a>'}
var VERBO=/(dame|env[ií]a|p[aá]sa|mu[eé]stra|descarg|enlace|link|archivo|document|pdf|d[oó]nde|necesito|quiero|busca|abrir|comparte|quisiera)/i;
var TEMA=/(manual|plan|pei|sie[sn]?|reglamento|horario|circular|formato|gu[ií]a|calendario|cronograma|protocolo|resoluci[oó]n|acta|informe|cartilla|proyecto)/i;
window.ARIA_DOCS={
 pideDoc:function(q){return VERBO.test(q)||TEMA.test(q)},
 responder:function(q){return cargar().then(function(){var doc=VERBO.test(q);
  if(!D.length)return doc?'El índice de documentos aún no está disponible. Por favor, intente de nuevo en unos minutos.':null;
  var qd=tok(q,1),T=porTitulo(qd),pregunta=/\b(que|cual|cuales|cuanto|cuantos|como|cuando|quien|por que)\b/.test(norm(q));
  if(T.length&&(doc||(qd.length<=3&&T[0].cov===1&&!pregunta))){var h='📄 <b>'+esc(T[0].d.t)+'</b><br>'+lk(T[0].d.u,'Abrir documento');
   var o=T.slice(1).filter(function(x){return x.s>=T[0].s*.6});if(o.length)h+='<br><small>También relacionado: '+o.map(function(x){return lk(x.d.u,x.d.t)}).join(' · ')+'</small>';return h}
  var r=buscar(q);if(!r.length||r[0].s<1.5)return doc?'No encontré ese documento en el repositorio. Puede indicarme su nombre completo o consultar la sección «Documentos institucionales».':null;
  var x=r[0].c;return 'Según <b>'+esc(x.t)+'</b>'+(x.p?' (pág. '+x.p+')':'')+':<br>«'+esc(frase(x.x,qd))+'»<br>'+lk(x.u,'Abrir documento')})}};
cargar();
})();
