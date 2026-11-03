// ARIA · Base de conocimiento del colegio (v1)
// Lee aria-conocimiento/base-colegio.json y responde al instante las preguntas sobre el colegio
// (sedes, horarios, SIEE, faltas, convivencia, contacto, documentos...) sin salir a internet.
// API:  ARIA_KB.consultar(texto) -> Promise<{html, texto, score, fuerte, id} | null>
//       ARIA_KB.contexto(texto)  -> string con las entradas más relevantes (para dárselas a la IA)
(function(root){
var URL_=root.ARIA_KB_URL||'aria-conocimiento/base-colegio.json',E=null,cargando=null;
var SW=('de la las los el un una unos unas y o a en que se por con para es al del lo como mas pero sus le ya mi tu su si no hay '+
 'cual cuales quien esta este esto son ser fue sobre entre me te nos hola aria dime quiero necesito favor puedes dice dicen '+
 'saber quisiera podria porfa gracias buenas buenos dias tardes noches colegio institucion').split(' ');
function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function toks(s){return norm(s).split(/[^a-z0-9]+/).filter(Boolean)}
function stem(w){return w.length>3?w.replace(/(es|s)$/,''):w}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function cargar(){
 if(E)return Promise.resolve();if(cargando)return cargando;
 return cargando=fetch(URL_).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(j){
  E=(j.entradas||[]).map(function(e){
   var seen={},K=[];
   (e.claves||[]).forEach(function(c){var t=toks(c).map(stem),k=t.join(' ');if(k&&!seen[k]){seen[k]=1;K.push({k:k,n:t.length})}});
   e._K=K;return e});
 }).catch(function(){E=[]});
}
function puntuar(q){
 var t=toks(q),st=t.map(stem),pad=' '+st.join(' ')+' ';
 var contenido=t.filter(function(w){return SW.indexOf(w)<0}).length;
 var res=E.map(function(e){
  var s=0;
  e._K.forEach(function(c){if(pad.indexOf(' '+c.k+' ')>=0)s+=1+0.8*(c.n-1)});
  return{e:e,s:s}
 }).filter(function(x){return x.s>0}).sort(function(a,b){return b.s-a.s});
 return{r:res,contenido:contenido};
}
function lk(u,t){return '<a href="'+esc(u)+'" target="_blank" rel="noopener">'+esc(t)+' ↗</a>'}
function aHtml(e){
 var h=esc(e.respuesta);
 if(e.enlaces&&e.enlaces.length)h+='<br>'+e.enlaces.map(function(l){return lk(l.u,l.t)}).join(' · ');
 return h;
}
root.ARIA_KB={
 consultar:function(q){
  return cargar().then(function(){
   if(!E.length)return null;
   var p=puntuar(q),b=p.r[0];
   if(!b)return null;
   if(!(b.s>=1.6||(b.s>=1&&p.contenido<=2)))return null;
   return{html:aHtml(b.e),texto:b.e.respuesta,score:b.s,fuerte:b.s>=1.8,id:b.e.id};
  });
 },
 contexto:function(q){
  if(!E||!E.length)return '';
  var p=puntuar(q);
  return p.r.slice(0,3).filter(function(x){return x.s>=1}).map(function(x){return '- '+x.e.tema+': '+x.e.respuesta}).join('\n');
 },
 _puntuar:function(q){return cargar().then(function(){return puntuar(q).r.slice(0,3).map(function(x){return[x.e.id,x.s]})})}
};
cargar();
})(typeof window!=='undefined'?window:globalThis);
