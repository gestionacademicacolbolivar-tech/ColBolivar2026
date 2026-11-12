// Encabezado ColBolívar: parallax suave con el puntero + destellos dorados en el panel del título
(function(){var h=document.getElementById('hero');if(!h||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
var L=[].slice.call(h.querySelectorAll('[data-d]')),tx=0,ty=0,x=0,y=0,on=false;
if(matchMedia('(hover:hover)').matches){h.addEventListener('pointermove',function(e){var r=h.getBoundingClientRect();tx=(e.clientX-r.left)/r.width-.5;ty=(e.clientY-r.top)/r.height-.5;if(!on){on=true;requestAnimationFrame(f)}});
h.addEventListener('pointerleave',function(){tx=ty=0;if(!on){on=true;requestAnimationFrame(f)}})}
function f(){x+=(tx-x)*.1;y+=(ty-y)*.1;L.forEach(function(l){var d=+l.dataset.d;l.style.translate=(-x*d)+'px '+(-y*d*.5)+'px'});
if(Math.abs(tx-x)<.001&&Math.abs(ty-y)<.001){on=false;return}requestAnimationFrame(f)}
var t=h.querySelector('.pan');if(t)setInterval(function(){if(document.hidden)return;var s=document.createElement('i');s.className='chis';
s.style.left=(8+Math.random()*84)+'%';s.style.top=(12+Math.random()*76)+'%';t.appendChild(s);setTimeout(function(){s.remove()},1300)},1100)})();
