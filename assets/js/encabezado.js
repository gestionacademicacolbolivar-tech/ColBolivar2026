// Encabezado ColBolívar: parallax suave con el puntero + destellos dorados en el panel del título
(function(){var h=document.getElementById('hero');if(!h)return;var RM=matchMedia('(prefers-reduced-motion:reduce)').matches;
var L=[].slice.call(h.querySelectorAll('[data-d]')),tx=0,ty=0,x=0,y=0,on=false;
if(!RM&&matchMedia('(hover:hover)').matches){h.addEventListener('pointermove',function(e){var r=h.getBoundingClientRect();tx=(e.clientX-r.left)/r.width-.5;ty=(e.clientY-r.top)/r.height-.5;if(!on){on=true;requestAnimationFrame(f)}});
h.addEventListener('pointerleave',function(){tx=ty=0;if(!on){on=true;requestAnimationFrame(f)}})}
function f(){x+=(tx-x)*.1;y+=(ty-y)*.1;L.forEach(function(l){var d=+l.dataset.d;l.style.translate=(-x*d)+'px '+(-y*d*.5)+'px'});
if(Math.abs(tx-x)<.001&&Math.abs(ty-y)<.001){on=false;return}requestAnimationFrame(f)}
function est(host,n){var s=document.createElement('b');s.className='est';var z=10+Math.random()*14;s.style.cssText='width:'+z+'px;height:'+z+'px;left:'+(4+Math.random()*90)+'%;top:'+(4+Math.random()*86)+'%';host.appendChild(s);setTimeout(function(){s.remove()},1600)}
var lg=h.querySelector('.logo'),es=h.querySelector('.escw');
setInterval(function(){if(document.hidden)return;if(lg){est(lg);if(Math.random()<.6)est(lg)}},550);
setInterval(function(){if(document.hidden)return;if(es)est(es)},1300)})();
