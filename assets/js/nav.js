/* ColBolívar · dock de navegación + menú rápido (se inyecta solo en cada página) */
(function(){
'use strict';
var path=decodeURIComponent((location.pathname.split('/').pop()||'index.html'));
var isHome=/^(index\.html)?$/.test(path);
function ic(c,r,k){return '<i class="uix '+(k||'')+'" style="--c:'+c+';--r:'+r+'" aria-hidden="true"></i>'}
function el(h){var d=document.createElement('div');d.innerHTML=h.trim();return d.firstChild}
var hasQ=!!document.getElementById('q');
var sameRef=false;try{sameRef=!!document.referrer&&new URL(document.referrer).origin===location.origin}catch(e){}
var dock=el('<nav class="cbd" aria-label="Navegación rápida">'+
 (isHome?'<button type="button" data-a="top" aria-label="Ir al inicio de la portada">'+ic(0,0)+'<span>Inicio</span></button>':'<a href="./" aria-label="Ir a la portada">'+ic(0,0)+'<span>Inicio</span></a>')+
 (!isHome&&sameRef?'<button type="button" data-a="back" aria-label="Volver a la página anterior">'+ic(1,0)+'<span>Atrás</span></button>':'')+
 (hasQ?'<button type="button" data-a="q" aria-label="Buscar">'+ic(2,1)+'<span>Buscar</span></button>':'')+
 '<button type="button" class="up" data-a="up" aria-label="Subir al comienzo" hidden>'+ic(3,0)+'<span>Arriba</span></button>'+
 '<button type="button" data-a="menu" aria-haspopup="dialog" aria-label="Abrir menú rápido">'+ic(0,1)+'<span>Menú</span></button></nav>');
var items=[
 ['./','Portada','Todas las secciones',ic(0,0),'index.html'],
 ['DOCUMENTOS%20INSTITUCIONALES.html','Documentos institucionales','PEI, SIEE, convivencia…',ic(1,2,'d'),'DOCUMENTOS INSTITUCIONALES.html'],
 ['CALIDAD.html','Calidad','Gestión de calidad',ic(3,2,'d'),'CALIDAD.html'],
 ['ORIENTACION_ESCOLAR.html','Orientación escolar','Apoyo psicosocial',ic(0,3,'d'),'ORIENTACION_ESCOLAR.html'],
 ['PROYECTOS_TRANSVERSALES.html','Proyectos transversales','Proyectos del año',ic(1,3,'d'),'PROYECTOS_TRANSVERSALES.html'],
 ['cartelera.html','Cartelera','Avisos y videos',ic(3,3,'d'),'cartelera.html'],
 ['cumpleanos.html','Cumpleaños','Celebramos contigo',ic(1,1,'o'),'cumpleanos.html'],
 ['colbolivar-radio/','ColBolívar Radio','Música y podcast',ic(0,2,'o'),'']];
var sheet=el('<div class="cbm" id="cbm" hidden><div class="cbs" role="dialog" aria-modal="true" aria-labelledby="cbt"><div class="cbh"><b id="cbt">¿A dónde vamos?</b><button type="button" data-a="close" aria-label="Cerrar menú">'+ic(1,1)+'</button></div><div class="cbg">'+
 items.map(function(i){return '<a href="'+i[0]+'"'+(i[4]===path||(i[4]==='index.html'&&isHome)?' aria-current="page"':'')+'>'+i[3]+'<span>'+i[1]+'<small>'+i[2]+'</small></span></a>'}).join('')+
 '</div><div class="cbf"><button type="button" data-a="share">Compartir esta página</button></div></div></div>');
var lastFocus=null,toastT;
function toast(t){var o=document.querySelector('.cbt');if(o)o.remove();var d=el('<div class="cbt" role="status">'+t+'</div>');document.body.appendChild(d);clearTimeout(toastT);toastT=setTimeout(function(){d.remove()},2200)}
function open(){lastFocus=document.activeElement;sheet.hidden=false;requestAnimationFrame(function(){sheet.classList.add('on')});document.documentElement.style.overflow='hidden';var f=sheet.querySelector('a,button');f&&f.focus()}
function close(){sheet.classList.remove('on');document.documentElement.style.overflow='';setTimeout(function(){sheet.hidden=true},260);lastFocus&&lastFocus.focus&&lastFocus.focus()}
function share(){var u=location.href.split('#')[0],t=document.title;
 if(navigator.share){navigator.share({title:t,url:u}).catch(function(){})}
 else if(navigator.clipboard){navigator.clipboard.writeText(u).then(function(){toast('Enlace copiado')},function(){toast(u)})}
 else toast(u)}
function act(a){
 if(a==='top'||a==='up')scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});
 else if(a==='back')history.back();
 else if(a==='q'){var q=document.getElementById('q');q.scrollIntoView({block:'center',behavior:'smooth'});setTimeout(function(){q.focus({preventScroll:true})},350)}
 else if(a==='menu')open();else if(a==='close')close();else if(a==='share')share()}
document.addEventListener('click',function(e){var b=e.target.closest('[data-a]');if(b&&(dock.contains(b)||sheet.contains(b))){act(b.dataset.a);return}
 if(e.target===sheet)close();var l=e.target.closest('.cbg a');if(l&&l.getAttribute('aria-current')==='page'){e.preventDefault();close()}});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!sheet.hidden)close();
 if(e.key==='Tab'&&!sheet.hidden){var f=sheet.querySelectorAll('a,button'),a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}}});
var up=dock.querySelector('.up'),tick=false;
function onScroll(){if(tick)return;tick=true;requestAnimationFrame(function(){up.hidden=scrollY<600;tick=false})}
addEventListener('scroll',onScroll,{passive:true});onScroll();
function mount(){document.body.appendChild(dock);document.body.appendChild(sheet)}
document.body?mount():document.addEventListener('DOMContentLoaded',mount);
/* En los enlaces "Volver a la portada" usa ruta relativa (sirve con cualquier dominio) */
document.querySelectorAll('a.back').forEach(function(a){a.setAttribute('href','./')});
})();
