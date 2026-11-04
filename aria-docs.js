// ARIA Documentos v3 — conoce TODO el repositorio (indice-docs.json) y responde con precisión:
// enlace directo, página exacta (#page=N), "qué documentos hay", "cuántas páginas", resúmenes, preguntas
// dentro de un documento, preguntas de seguimiento ("¿y en qué página?") y sinónimos (PEI, SIEE, PIAR…).
// API pública: ARIA_DOCS.pideDoc(q) · responder(q) · contexto(q) · buscarFragmentos(q,{n,doc}) · catalogo() · ready()
(function(){
'use strict';
var URL_=window.ARIA_DOCS_URL||'indice-docs.json',D=null,DOCS=[],df={},VOC=[],cargando=null,CTX={doc:null,q:'',res:[],i:0};
var SW=('de la las los el un una unos unas y o a en que se por con para es al del lo como mas pero sus le ya mi tu su si no hay donde cual cuales quien esta este esto son ser fue sobre entre me te nos hola aria dime quiero necesito favor puedes dice dicen establece habla informacion cuanto cuantos cuando segun tiene tienen puede pueden debe deben tambien muy sin cada todo toda todos todas'.split(' '));
var GEN=('dame envia envio pasame muestrame comparte descargar descarga enlace link archivo documento documentos pdf busca buscar abrir quisiera necesitaria pagina paginas resumen resume trata lista'.split(' '));
// Secciones con clave (solo docentes): ARIA no las abre ni cita su contenido
var PRIV=/(^|\/)(PLANES_DE_AREA|DRIVE_PLANEACION_DOCENTE)\.html$/i;
var OCULTO=/(^|\/)(aria-widget|404|admin|aria_avatar[^\/]*|visor)\.html$|aria-conocimiento\/|tarjetas_cumpleanos\/|colbolivar-radio\/(?!index\.html)/i;
// Sinónimos / siglas → palabras que sí aparecen en los textos
var SYN={pei:'proyecto educativo institucional resignificacion',siee:'sistema institucional evaluacion estudiante promocion',piar:'plan individual ajustes razonables inclusion discapacidad',dua:'diseno universal aprendizaje inclusion',pegrd:'gestion riesgo desastres emergencia evacuacion simulacro',recuperacion:'nivelacion apoyo superar valoracion',nivelacion:'recuperacion apoyo',reprobar:'promocion reprobacion perder ano',perder:'promocion reprobacion',uniforme:'presentacion personal porte',acoso:'bullying matoneo ciberacoso hostigamiento',bullying:'acoso matoneo',matoneo:'acoso bullying',falta:'sancion infraccion',sancion:'falta correctivo',faltas:'sancion tipificacion',inasistencia:'ausencia asistencia excusa',ausencia:'inasistencia asistencia',celular:'dispositivo electronico movil',horario:'jornada hora',nota:'calificacion valoracion desempeno',notas:'calificacion valoracion desempeno',calificacion:'valoracion desempeno escala',escala:'valoracion desempeno superior alto basico bajo'};
var ALIAS=[[/\bpei\b|proyecto educativo|resignificacion/,'RESIGNIFICACION'],[/\bsiee\b|sistema institucional de evaluacion|manual siee/,'SIEE'],[/manual de convivencia|\bconvivencia\b/,'Manual de convivencia'],[/\bpegrd\b|gestion del riesgo|riesgo de desastres/,'PEGRD'],[/\bpiar\b|\bdua\b|inclusion/,'INCLUSION'],[/proyecto de vida|socio ?ocupacional/,'PROYECTO DE VIDA'],[/servicio social/,'SERVICIO SOCIAL'],[/modelo pedagogico/,'Modelo_Pedagogico']];
var DOCSTRICT={'Manual de convivencia':1}; // "convivencia" suelta no limita la búsqueda a un documento
function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function tok(s,g){return norm(s).split(/[^a-z0-9]+/).filter(function(w){return w.length>2&&SW.indexOf(w)<0&&(!g||GEN.indexOf(w)<0)}).map(function(w){return w.length>4?w.replace(/(es|s)$/,''):w})}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function dec(u){try{return decodeURIComponent(u)}catch(e){return u}}
function baseDe(u){return String(u).split('#')[0]}
function titulo(t){return String(t||'').replace(/\s*\|\s*Col\S*$/i,'').replace(/\s+/g,' ').trim()}
function visible(u){var b=dec(baseDe(u));return !PRIV.test(b)&&!OCULTO.test(b)}
function esPdf(u){return /\.pdf$/i.test(baseDe(u))}
function cargar(){if(D)return Promise.resolve();if(cargando)return cargando;
 return cargando=fetch(URL_).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(a){var seen={},maxp={};
  D=a.filter(function(c){return visible(c.u)}).map(function(c){var tf={},t=tok(c.x+' '+c.t);t.forEach(function(w){tf[w]=(tf[w]||0)+1});Object.keys(tf).forEach(function(w){df[w]=(df[w]||0)+1});
   c._tf=tf;c._t=tok(c.t);c._s=' '+t.join(' ')+' ';c._b=baseDe(c.u);c._pdf=esPdf(c._b);c._toc=/\.{6,}|(\. ){6,}/.test(c.x);c._def=/\b(es un|es una|son los|son las|se entiende|se define|consiste|corresponde|hace referencia|se denomina|significa)\b/.test(norm(c.x));if(c.p)maxp[c._b]=Math.max(maxp[c._b]||0,c.p);
   if(!seen[c._b]){seen[c._b]=1;DOCS.push({u:c._b,t:titulo(c.t),tt:c._t,pdf:esPdf(c._b),pag:0})}return c});
  DOCS.forEach(function(d){d.pag=maxp[d.u]||0});VOC=Object.keys(df)}).catch(function(){D=[]})}
// ---- búsqueda ----
function exp(w){var v=[w];if(w.length>=5){var p=w.slice(0,-1);VOC.forEach(function(k){if(k.indexOf(p)===0&&v.indexOf(k)<0)v.push(k)})}(tok(SYN[w]||'')).forEach(function(s){if(v.indexOf(s)<0)v.push(s)});return v}
function buscar(q,o){o=o||{};var qt=tok(q,1);if(!qt.length||!D||!D.length)return[];var N=D.length,best={},X=qt.map(exp),rare=[],ph=' '+qt.join(' ')+' ';
 qt.forEach(function(w,i){if((df[w]||0)/N<.4)rare.push(i)});if(!rare.length)rare=qt.map(function(_,i){return i});var need=Math.max(1,Math.ceil(rare.length*.6));
 D.forEach(function(c){if(o.doc&&c._b!==o.doc)return;if(o.pdfOnly&&!c._pdf)return;var s=0,m=0,mr=0;
  X.forEach(function(vs,i){var f=0,d=0;vs.forEach(function(v){if(c._tf[v]){f+=c._tf[v];d=Math.max(d,df[v]||1)}});if(f){m++;if(rare.indexOf(i)>=0)mr++;s+=Math.log(1+N/d)*(1+Math.log(f))*(vs.some(function(v){return c._t.indexOf(v)>=0})?1.8:1)}});
  if(mr<need)return;s*=m/qt.length;if(c._toc)s*=.2;if(c._pdf)s*=1.2;if(o.def&&c._def)s*=1.5;
  if(qt.length>1){if(c._s.indexOf(ph)>=0)s*=1.8;else for(var i=0;i<qt.length-1;i++)if(c._s.indexOf(' '+qt[i]+' '+qt[i+1]+' ')>=0)s*=1.15}
  var k=o.per==='doc'?c._b:c.u;if(!best[k]||best[k].s<s)best[k]={c:c,s:s}});
 return Object.keys(best).map(function(k){return best[k]}).sort(function(a,b){return b.s-a.s}).slice(0,o.n||3)}
function resaltar(txt,X){var hit={};X.forEach(function(vs){vs.forEach(function(v){hit[v]=1})});
 return String(txt).split(/([^A-Za-z0-9\u00C0-\u00FF]+)/).map(function(p,i){if(i%2)return esc(p);var t=tok(p);return t.length&&hit[t[0]]?'<mark>'+esc(p)+'</mark>':esc(p)}).join('')}
function frase(x,qt){var fr=x.replace(/([.;:!?])\s+/g,'$1|').split('|'),b=0,bi=0,X=qt.map(exp);
 fr.forEach(function(f,i){var tf=tok(f),sc=0;X.forEach(function(vs){if(vs.some(function(v){return tf.indexOf(v)>=0}))sc++});if(sc>b){b=sc;bi=i}});
 var o=fr[bi]||x;if(o.length<90&&fr[bi+1])o+=' '+fr[bi+1];if(o.length>340)o=o.slice(0,340).replace(/\s\S*$/,'')+'…';return resaltar(o,X)}
// ---- documentos ----
function docPorBase(u){for(var i=0;i<DOCS.length;i++)if(DOCS[i].u===u)return DOCS[i];return null}
function porTitulo(qt){if(!qt.length)return[];return DOCS.map(function(d){var m=0;qt.forEach(function(w){if(d.tt.indexOf(w)>=0)m++});var cov=m/qt.length;return{d:d,cov:cov,s:cov*10-d.tt.length*.05+(d.pdf?.5:0)}}).filter(function(x){return x.cov>=.67}).sort(function(a,b){return b.s-a.s}).slice(0,3)}
function detectarDoc(nq){for(var i=0;i<ALIAS.length;i++){var a=ALIAS[i];if(a[0].test(nq)){var k=a[1].toLowerCase();for(var j=0;j<DOCS.length;j++)if(DOCS[j].pdf&&norm(dec(DOCS[j].u)).indexOf(norm(k))>=0)return{d:DOCS[j],fuerte:!DOCSTRICT[a[1]]||/manual/.test(nq)}}}return null}
function relPath(u){var b=baseDe(u),root='';try{root=new URL('.',location.href).href}catch(e){}if(root&&b.indexOf(root)===0)return dec(b.slice(root.length));var m=b.match(/\/ColBolivar2026\/(.+)$/);return dec(m?m[1]:b.split('/').pop())}
function visorUrl(u,p,t,q){var a={f:relPath(u),t:t||''};if(p)a.p=p;if(q)a.q=q;return 'visor.html?'+new URLSearchParams(a).toString()}
function lk(u,t,m){m=m||{};var h=esPdf(u)?visorUrl(u,m.p,m.t,m.q):u;return '<a href="'+esc(h)+'" target="_blank" rel="noopener">'+t+' ↗</a>'}
function lkd(d,t){return lk(d.u,t||'Ver documento',{t:d.t})}
function lkc(c,t,q){return lk(c.u,t,{p:c.p,t:titulo(c.t),q:q})}
function dl(d){return d.pdf?' · <a href="'+esc(d.u)+'" download>Descargar</a>':''}
function resumen(d){var cs=D.filter(function(c){return c._b===d.u&&(!c.p||c.p<=6)&&c.x.length>180});
 for(var i=0;i<cs.length;i++){var x=cs[i].x;if(/\.{4,}/.test(x))continue;var letras=(x.match(/[A-Za-zÁÉÍÓÚáéíóúñÑ]/g)||[]).length;if(letras/x.length<.72)continue;
  var fr=x.replace(/([.!?])\s+/g,'$1|').split('|').filter(function(f){return f.length>50}).slice(0,2).join(' ');if(fr.length>60)return{t:fr.length>420?fr.slice(0,420).replace(/\s\S*$/,'')+'…':fr,p:cs[i].p||1}}return null}
// ---- intenciones ----
var VERBO=/(dame|env[i]a|p[a]sa|mu[e]stra|descarg|enlace|link|archivo|document|pdf|d[o]nde|necesito|quiero|busca|abrir|comparte|quisiera)/i;
var TEMA=/(manual|plan|pei|sie[sn]?|reglamento|horario|circular|formato|gu[i]a|calendario|cronograma|protocolo|resoluci[o]n|acta|informe|cartilla|proyecto|convivencia|pegrd|piar|\bdua\b|inclusi[o]n|evaluaci[o]n|servicio social|modelo pedag)/i;
var R_LISTA=/\b(que|cuales)\s+(documentos|archivos|pdf)\b|\blista(r|me)?\b.*\bdocumentos\b|\bdocumentos\s+(hay|tienen|tienes|disponibles|institucionales)\b|\bcatalogo\b|\btodos los documentos\b/;
var R_PAG=/(en que pagina|que pagina|numero de pagina|pagina exacta|donde (dice|esta|habla|aparece|se menciona|puedo leer))/;
var R_CUANT=/(cuantas paginas|numero de paginas|cuanto (pesa|dura|mide)|extension del)/;
var R_RES=/(de que trata|resumen|resume|resumeme|en que consiste|que contiene|que trae|de que se trata|para que sirve)/;
var R_ABRIR=/^(abre(lo)?|abrir(lo)?|abrelo|el enlace|enlace|link|dame el enlace|pasame el enlace|ese documento|dame ese)\b/;
var R_MAS=/^(y )?(mas|otra|otro|siguiente|sigue|algo mas|que mas|otro resultado)\b/;
var R_PRIV=/(planes? de area|planeacion docente|documentos docentes|drive docente|planeadores)/;
function respDoc(d,extra){CTX.doc=d;var h='📄 <b>'+esc(d.t)+'</b>'+(d.pag?' <small>('+d.pag+' páginas)</small>':'')+'<br>'+lkd(d)+dl(d);
 if(extra&&extra.length)h+='<br><small>También relacionado: '+extra.map(function(x){return lkd(x.d,esc(x.d.t))}).join(' · ')+'</small>';
 if(d.pdf)h+='<br><small>Pregúntame lo que necesites dentro de este documento, por ejemplo: «¿en qué página habla de…?»</small>';return h}
function respContenido(r,qd,qh){CTX.res=r;CTX.i=0;var x=r[0].c;CTX.doc=docPorBase(x._b)||CTX.doc;CTX.q=(qh||qd).join(' ');
 var qs_=CTX.q,h='Según <b>'+esc(titulo(x.t))+'</b>'+(x.p?' (pág. '+x.p+')':'')+':<br>«'+frase(x.x,qd)+'»<br>'+lkc(x,x.p?'Ver en la página '+x.p:'Ver documento',qs_);
 var o=r.slice(1,4).filter(function(y){return y.s>=r[0].s*.45});
 if(o.length)h+='<br><small>También en: '+o.map(function(y){var c=y.c,mismo=c._b===x._b;return lkc(c,(mismo?'':esc(titulo(c.t))+' ')+(c.p?'pág. '+c.p:'ver'),qs_)}).join(' · ')+'</small>';return h}
function respuesta(q){var nq=norm(q),qd=tok(q,1);
 if(R_PRIV.test(nq)&&(VERBO.test(q)||/planes? de area|planeadores/.test(nq)))return '🔒 Esa sección es <b>solo para docentes</b>. Entra desde la portada, en la tarjeta «Planes de área 2026» o «Documentos docentes», con la clave que te dio la institución.';
 if(R_LISTA.test(nq)){var ps=DOCS.filter(function(d){return d.pdf}).sort(function(a,b){return a.t<b.t?-1:1});if(ps.length)return '📚 Tengo <b>'+ps.length+' documentos institucionales</b>:<br>'+ps.map(function(d){return '• '+lkd(d,esc(d.t))+(d.pag?' <small>('+d.pag+' pág.)</small>':'')}).join('<br>')+'<br><small>Dime cuál necesitas, o pregúntame algo que esté dentro de ellos.</small>'}
 var det=detectarDoc(nq),pt=porTitulo(qd),dq=det&&det.fuerte?det.d:null;
 if(R_CUANT.test(nq)){var d=dq||(pt[0]&&pt[0].d)||CTX.doc;if(d)return '📄 <b>'+esc(d.t)+'</b> tiene '+(d.pag?'<b>'+d.pag+' páginas</b>':'un número de páginas que no pude calcular')+'.<br>'+lkd(d)+dl(d)}
 if(R_RES.test(nq)){var d2=dq||(pt[0]&&pt[0].d)||CTX.doc;if(d2){CTX.doc=d2;var rs=resumen(d2);return '📄 <b>'+esc(d2.t)+'</b>'+(d2.pag?' <small>('+d2.pag+' páginas)</small>':'')+(rs?'<br>Así empieza: «'+esc(rs.t)+'»':'')+'<br>'+lkd(d2)+dl(d2)+'<br><small>Es un extracto del inicio, no un resumen completo. Pregúntame por un tema concreto y te digo la página exacta.</small>'}}
 if(CTX.doc&&R_ABRIR.test(nq)&&nq.split(' ').length<=5)return respDoc(CTX.doc);
 if(CTX.res.length&&R_MAS.test(nq)){CTX.i++;var y=CTX.res[CTX.i];if(!y)return 'Esos fueron todos los resultados que encontré. Prueba con otras palabras o dime el nombre del documento.';var c=y.c;return 'Otra coincidencia en <b>'+esc(titulo(c.t))+'</b>'+(c.p?' (pág. '+c.p+')':'')+':<br>«'+frase(c.x,tok(CTX.q))+'»<br>'+lkc(c,c.p?'Ver en la página '+c.p:'Ver documento',CTX.q)}
 var pregunta=/\b(que|cual|cuales|cuanto|cuantos|como|cuando|quien|por que|donde|en que)\b/.test(nq),pidePag=R_PAG.test(nq),doc=VERBO.test(q),def=/^(que es|que son|a que se refiere|que significa|define|definicion)\b/.test(nq);
 var BASE=' pei siee piar dua pegrd manual convivencia social servicio proyecto vida modelo pedagogico inclusion socio ocupacional resignificacion ';
 var dt=(dq||(pt[0]&&pt[0].d)||{tt:[]}).tt,extra=qd.filter(function(w){return dt.indexOf(w)<0&&BASE.indexOf(' '+w+' ')<0});
 if(!qd.length&&pidePag&&CTX.res.length){var z=CTX.res[0].c;return 'Eso aparece en <b>'+esc(titulo(z.t))+'</b>, '+(z.p?'<b>página '+z.p+'</b>':'al inicio')+'.<br>'+lkc(z,z.p?'Ver en la página '+z.p:'Ver documento',CTX.q)}
 var tema=det||(pt.length&&pt[0].cov===1&&qd.length<=3&&!pregunta&&!pidePag);
 if(doc&&!pidePag&&(dq||pt.length)&&!(pregunta&&qd.length>3)){var d3=dq||pt[0].d;var otros=pt.filter(function(x){return x.d!==d3&&x.s>=(pt[0]?pt[0].s*.6:0)});return respDoc(d3,otros)}
 if(!doc&&!pregunta&&!pidePag&&tema&&qd.length<=3&&!extra.length&&(dq||pt.length)){var d4=dq||pt[0].d;return respDoc(d4,[])}
 var ambito=dq?dq.u:(!qd.length&&CTX.doc?CTX.doc.u:null);
 var op={per:'pag',n:4,doc:ambito,def:def,pdfOnly:pidePag},r=buscar(q,op);if(!r.length&&pidePag){op.pdfOnly=false;r=buscar(q,op)}if(!r.length&&ambito){op.doc=null;r=buscar(q,op)}
 if(!r.length||r[0].s<1.5)return (doc||pidePag)?'No encontré eso en los documentos. Prueba con otras palabras, dime el nombre del documento o escribe «qué documentos hay».':null;
 return respContenido(r,qd.length?qd:tok(q),extra.length?extra:null)}
window.ARIA_DOCS={
 pideDoc:function(q){var n=norm(q);return VERBO.test(q)||TEMA.test(q)||R_LISTA.test(n)||R_PAG.test(n)||R_CUANT.test(n)||R_RES.test(n)||!!(CTX.doc&&(R_ABRIR.test(n)||R_MAS.test(n)))},
 contexto:function(q){if(!D||!D.length)return'';var r=buscar(q,{per:'pag',n:3}).filter(function(x){return x.s>=1.5});return r.map(function(x){return'- ['+titulo(x.c.t)+(x.c.p?', pg. '+x.c.p:'')+'] '+String(x.c.x).slice(0,900)}).join('\n')},
 responder:function(q){return cargar().then(function(){if(!D.length)return VERBO.test(q)?'El índice de documentos aún no está disponible. Por favor, intenta de nuevo en unos minutos.':null;return respuesta(q)})},
 // para la página de Documentos institucionales: resultados estructurados
 buscarFragmentos:function(q,o){return cargar().then(function(){o=o||{};var qd=tok(q,1),r=buscar(q,{per:'pag',n:o.n||8,doc:o.doc||null,pdfOnly:!!o.pdfOnly});
  return r.map(function(x){var c=x.c;return{u:c.u,base:c._b,rel:relPath(c._b),t:titulo(c.t),p:c.p||0,pdf:esPdf(c._b),s:x.s,html:frase(c.x,qd.length?qd:tok(q))}})})},
 catalogo:function(){return cargar().then(function(){return DOCS.map(function(d){return{u:d.u,t:d.t,pdf:d.pdf,pag:d.pag}})})},
 ready:cargar
};
cargar();
})();
