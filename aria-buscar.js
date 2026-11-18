// ARIA · Buscador por párrafos (aria-buscar.js). Lee indice-parrafos.json (documento, página, título de sección, texto)
// y devuelve los pasajes más relevantes con su página exacta. BM25 + peso al título + sinónimos + frases. Sin servidor, funciona sin internet.
(function(){'use strict';
var U=window.ARIA_PARRAFOS_URL||'indice-parrafos.json',D=null,P=null,IX=null;
var STOP=/^(que|como|de|del|la|el|los|las|un|una|unos|unas|para|por|se|en|y|o|a|al|es|son|hay|puede|pueden|cuando|cual|cuales|quien|quienes|mi|mis|su|sus|si|con|sin|lo|le|les|me|ya|muy|mas|tiene|tienen|hace|hacen|hacer|debe|deben|ser|esta|estan|este|esto|estos|donde|cuanto|cuantos|cuantas|cuanta|segun|sobre|entre|ante|desde|hasta|e|u|hacia|otro|otra|todo|toda|dice|dicen|manual|documento)$/;
var SYN={celu:'celular',celus:'celular',alumno:'estudiante',alumna:'estudiante',alumnos:'estudiante',alumnas:'estudiante',educando:'estudiante',educandos:'estudiante',muchacho:'estudiante',muchachos:'estudiante',nino:'estudiante',ninos:'estudiante',hijo:'estudiante',hija:'estudiante',chicos:'estudiante',vestido:'uniforme',uniformado:'uniforme',profe:'docente',profesor:'docente',profesores:'docente',profesora:'docente',maestro:'docente',maestros:'docente',maestra:'docente',acudiente:'padre',acudientes:'padre',papa:'padre',papas:'padre',mama:'padre',madre:'padre',madres:'padre',escuela:'colegio',institucion:'colegio',nota:'valoracion',notas:'valoracion',calificar:'valoracion',califico:'valoracion',calificacion:'valoracion',calificaciones:'valoracion',puntaje:'valoracion',materia:'area',materias:'area',asignatura:'area',asignaturas:'area',pasar:'promocion',aprobar:'promocion',aprobado:'promocion',reprobar:'promocion',reprobo:'promocion',recuperacion:'superacion',recuperar:'superacion',recuperaciones:'superacion',nivelacion:'superacion',salir:'salida',retirar:'salida',falta:'inasistencia',faltas:'inasistencia',faltar:'inasistencia',faltan:'inasistencia',ausencia:'inasistencia',ausencias:'inasistencia',tarde:'retardo',hora:'horario',pelea:'agresion',peleas:'agresion',pegar:'agresion',pegan:'agresion',golpes:'agresion',golpear:'agresion',matoneo:'acoso',bullying:'acoso',burla:'acoso',reclamar:'reclamacion',reclamo:'reclamacion',queja:'reclamacion',apelar:'reclamacion',boletin:'informe',boletines:'informe',graduarse:'graduacion',bachiller:'graduacion',premio:'reconocimiento',premios:'reconocimiento',distincion:'reconocimiento',diploma:'reconocimiento',vape:'cigarrillo',vaper:'cigarrillo',vapers:'cigarrillo',vapeador:'cigarrillo',alcohol:'licor',embriagante:'licor',embriagantes:'licor',droga:'psicoactiva',drogas:'psicoactiva',marihuana:'psicoactiva',sustancias:'psicoactiva',robo:'hurto',robar:'hurto',roba:'hurto',copiar:'fraude',copia:'fraude',trampa:'fraude',plagio:'fraude',arma:'arma',armas:'arma',cuchillo:'arma',navaja:'arma',coordinadora:'coordinador',rectora:'rector',rectoria:'rector',directivo:'rector'};
function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function tok(s){return norm(s).replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(function(w){return w&&!STOP.test(w)}).map(function(w){w=SYN[w]||w;if(w.length>4){w=w.replace(/ciones$/,'cion').replace(/(es|s)$/,'');w=w.replace(/[aeo]$/,'')}return w})}
function esc(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function PRM(){var p=window.ARIA_BM||{};return {k1:p.k1||2,b:p.b==null?.4:p.b,hw:p.hw==null?6:p.hw,pr:p.pr==null?1.3:p.pr}}
function indexar(){var N=D.length,df={},post={},tot=0,i;IX={toks:new Array(N),len:new Array(N),N:N};
 for(i=0;i<N;i++){var c=D[i],tx=tok(c.x),th=tok((c.s||'')+' '+c.t);IX.toks[i]=tx;IX.len[i]=tx.length;tot+=tx.length;var m={};tx.forEach(function(w){m[w]=(m[w]||0)+1});var hs={};th.forEach(function(w){hs[w]=(hs[w]||0)+1});Object.keys(hs).forEach(function(w){var hv=PRM().hw*hs[w];m[w]=(m[w]||0)+(m[w]?hv:Math.min(1.5,hv))});
  Object.keys(m).forEach(function(w){(post[w]||(post[w]=[])).push([i,m[w]]);df[w]=(df[w]||0)+1})}
 IX.post=post;IX.df=df;IX.avg=tot/N}
function idf(w){var n=IX.df[w]||0;return Math.log(1+(IX.N-n+.5)/(n+.5))}
function buscar(q,k){if(!IX)return null;var qt=[],seen={},allq=[],sa={};tok(q).forEach(function(w){if(!sa[w]){sa[w]=1;allq.push(w)}if(!seen[w]&&IX.df[w]){seen[w]=1;qt.push(w)}});if(!qt.length)return null;
 var PM=PRM(),k1=PM.k1,b=PM.b,sc={},mx=0;
 qt.forEach(function(w){var id=idf(w);mx+=id*(k1+1);IX.post[w].forEach(function(p){var i=p[0],t=p[1];sc[i]=(sc[i]||0)+id*t*(k1+1)/(t+k1*(1-b+b*IX.len[i]/IX.avg))})});
 var ids=Object.keys(sc).map(Number).sort(function(a,b){return sc[b]-sc[a]}).slice(0,40);
 // bonificación por frases: pares de términos de la pregunta que aparecen seguidos en el pasaje
 var all=tok(q).filter(function(w){return IX.df[w]});
 ids.forEach(function(i){var T=IX.toks[i];for(var a=0;a+1<all.length;a++){for(var j=0;j+1<T.length;j++){if(T[j]===all[a]&&T[j+1]===all[a+1]){sc[i]+=.6*(idf(all[a])+idf(all[a+1]));break}}}
  if(D[i].k==='tabla')sc[i]*=1.04;if(/\.pdf/i.test(D[i].u))sc[i]*=PM.pr});
 ids.sort(function(a,b){return sc[b]-sc[a]});
 var res=[],vistos={};ids.forEach(function(i){var c=D[i],key=c.u;if(vistos[key]||res.length>=(k||3))return;vistos[key]=1;res.push({c:c,s:sc[i],i:i})});
 var iM=Math.log(1+IX.N),wq=function(w){return IX.df[w]?idf(w):iM},tw=0;allq.forEach(function(w){tw+=wq(w)});
 res.forEach(function(x){var S={};IX.toks[x.i].forEach(function(w){S[w]=1});tok((x.c.s||'')+' '+x.c.t).forEach(function(w){S[w]=1});var cv=0,nm=0;allq.forEach(function(w){if(S[w]){cv+=wq(w);nm++}});x.cov=tw?cv/tw:0;x.nm=nm});
 return {res:res,mx:mx,qt:qt,conf:res.length?res[0].s/mx:0,cov:res.length?res[0].cov:0,nm:res.length?res[0].nm:0,nq:allq.length}}
function mejorFrase(c,qt){var ss=c.x.split(/(?<=[.;:?!])\s+/),best=0,bi=0,qs={};qt.forEach(function(w){qs[w]=1});
 ss.forEach(function(s,i){var sc=0;tok(s).forEach(function(w){if(qs[w])sc++});if(sc>best){best=sc;bi=i}});
 var out=ss.slice(bi,bi+2).join(' ');if(out.length>420)out=out.slice(0,417)+'…';return (bi>0?'… ':'')+out}
function enlace(c,p){var m=c.u.split('ColBolivar2026/')[1]||'',rel;try{rel=decodeURIComponent(m.split('#')[0].split('?')[0])}catch(e){rel=m}
 if(/\.pdf$/i.test(rel))return 'visor.html?'+new URLSearchParams({f:rel,t:c.t,p:p||1});return c.u.split('#')[0]}
function html(r){var c=r.res[0].c,qt=r.qt,pg=c.p?'pág. '+c.p:'',sec=c.s&&!/^Tabla:/.test(c.s)?c.s:'';
 var h='<b>'+esc(c.t)+'</b>'+(pg?' ('+pg+(sec?' · '+esc(sec.toLowerCase().replace(/^./,function(x){return x.toUpperCase()})):'')+')':sec?' ('+esc(sec)+')':'')+':<br>«'+esc(mejorFrase(c,qt))+'»<br><a href="'+esc(enlace(c,c.p))+'" target="_blank" rel="noopener">Ver '+(c.p?'en la página '+c.p:'el documento')+' ↗</a>';
 var o=r.res.slice(1).filter(function(x){return x.c.p||x.c.u!==c.u});
 if(o.length)h+='<br><small>También puede servir: '+o.map(function(x){return '<a href="'+esc(enlace(x.c,x.c.p))+'" target="_blank" rel="noopener">'+esc(x.c.t.length>34?x.c.t.slice(0,32)+'…':x.c.t)+(x.c.p?' pág. '+x.c.p:'')+' ↗</a>'}).join(' · ')+'</small>';
 return h+'<br><small>Pasaje hallado en el documento (no es una respuesta verificada).</small>'}
function cargar(){return P||(P=fetch(U).then(function(r){return r.json()}).then(function(j){D=j;indexar();return D}).catch(function(){D=[];IX=null;return D}))}
window.ARIA_BUSCAR={reindexar:function(){if(D)indexar()},cargar:cargar,buscar:buscar,html:html,tok:tok,listo:function(){return !!IX},umbral:function(){return window.ARIA_BUSCAR_TH||.6},
 mejor:function(q){var r=buscar(q,3);return r&&r.cov>=this.umbral()&&(r.nq<2||r.nm>=2)?r:null}};
cargar();
})();
