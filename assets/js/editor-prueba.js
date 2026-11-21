/* ColBolívar · Editor gráfico de pruebas
   Trabaja sobre el «borrador» (ver pruebas-comun.js). Uso: var ctrl = EditorPrueba.montar(div, borrador, { onChange, global: () => ({piensa, limite}) }) */
var EditorPrueba = (function () {
  var E = PR.E, L = 'ABCDEF';
  function montar(cont, B, opt) {
    opt = opt || {}; var ui = { abiertas: {}, solo: false, clave: false, textos: false, todo: null };
    cont.classList.add('ed');
    var tmr = null; function cambio() { clearTimeout(tmr); tmr = setTimeout(function () { opt.onChange && opt.onChange(B); }, 400); }
    function estado(q) {
      if (q.tipo === 'abierta') return { c: 'ab', t: '✍️ Abierta · la calificas tú', ok: true };
      if (q.correcta >= 0 && String(q.opciones[q.correcta] || '').trim() || (q.correcta >= 0 && q.opImg[q.correcta])) return { c: 'ok', t: '✓ Correcta: ' + L[q.correcta] + (q.auto ? ' · ' + q.auto : ''), ok: true };
      return { c: 'mal', t: '⚠ Falta la respuesta', ok: false };
    }
    function resumen() {
      var m = B.preguntas.filter(function (q) { return q.tipo === 'multiple'; }), ok = m.filter(function (q) { return estado(q).ok; }).length;
      return { n: B.preguntas.length, m: m.length, ok: ok, falta: m.length - ok, ab: B.preguntas.length - m.length };
    }
    function snippet(q) { var t = String(q.pregunta || '').replace(/\s+/g, ' ').trim(); return t ? (t.length > 90 ? t.slice(0, 90) + '…' : t) : '(sin enunciado)'; }
    /* ---------- piezas ---------- */
    function media(q, i) {
      var h = '<div class="media">';
      if (q.img) h += '<div><img class="m" src="' + q.img + '" alt="Imagen de la pregunta"><div class="row" style="margin-top:4px"><button class="ib" data-a="img" data-i="' + i + '">🔄 Cambiar</button><button class="ib r" data-a="quitarimg" data-i="' + i + '">✕ Quitar</button></div></div><div class="cap"><label class="lab">Pie de la imagen (opcional)</label><input class="t" data-f="leyenda" data-i="' + i + '" value="' + E(q.leyenda || '') + '"></div>';
      else h += '<button class="ib" data-a="img" data-i="' + i + '">🖼️ Agregar imagen</button><small style="color:var(--mut)">o pégala con Ctrl+V dentro del enunciado</small>';
      if (q.vis && q.vis.t === 'tabla') h += '<div><table class="vt"><tr>' + q.vis.headers.map(function (x) { return '<th>' + E(x) + '</th>'; }).join('') + '</tr>' + q.vis.rows.slice(0, 4).map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + E(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table><button class="ib r" data-a="quitarvis" data-i="' + i + '" style="margin-top:4px">✕ Quitar tabla</button></div>';
      if (q.vis && q.vis.t === 'texto') h += '<div class="aviso" style="max-width:260px"><b>' + E(q.vis.titulo || 'Recuadro') + '</b> ' + E(q.vis.texto.slice(0, 110)) + '<br><button class="ib r" data-a="quitarvis" data-i="' + i + '">✕ Quitar</button></div>';
      return h + '</div>';
    }
    function opciones(q, i) {
      return q.opciones.map(function (t, k) {
        return '<div class="op"><button class="ck' + (q.correcta === k ? ' on' : '') + '" data-a="ok" data-i="' + i + '" data-k="' + k + '" title="Marcar como respuesta correcta" aria-label="Marcar la opción ' + L[k] + ' como correcta">✓</button><span class="lt">' + L[k] + '</span>'
          + '<div><textarea class="t" rows="1" data-f="op" data-i="' + i + '" data-k="' + k + '" placeholder="Opción ' + L[k] + '">' + E(t) + '</textarea>' + (q.opImg[k] ? '<img class="opi" src="' + q.opImg[k] + '" alt="">' : '') + '</div>'
          + '<button class="ib im" data-a="opimg" data-i="' + i + '" data-k="' + k + '" title="Imagen en esta opción">🖼️</button><button class="ib r" data-a="delop" data-i="' + i + '" data-k="' + k + '" title="Quitar opción">✕</button></div>';
      }).join('') + (q.opciones.length < 6 ? '<button class="ib" data-a="addop" data-i="' + i + '">＋ Agregar opción</button>' : '');
    }
    function tarjeta(q, i) {
      var s = estado(q), ab = !!ui.abiertas[q.id], g = (opt.global && opt.global()) || {}, sel = '<option value="">— Ninguno —</option>' + B.estimulos.map(function (e) { return '<option value="' + E(e.id) + '"' + (q.estimulo === e.id ? ' selected' : '') + '>' + E((e.titulo || 'Texto ' + e.id.replace('t', '')).slice(0, 40)) + '</option>'; }).join('');
      var avisos = (q.aviso || []).filter(function (a) { return !(/respuesta correcta/i.test(a) && q.correcta >= 0); }).map(function (a) { return '<div class="aviso">⚠️ ' + E(a) + '</div>'; }).join('');
      var cuerpo = '<div class="barra"><div class="chips" data-tipo="' + i + '"><button class="chip' + (q.tipo === 'multiple' ? ' on' : '') + '" data-a="tipo" data-i="' + i + '" data-v="multiple">🔘 Opción múltiple</button><button class="chip' + (q.tipo === 'abierta' ? ' on' : '') + '" data-a="tipo" data-i="' + i + '" data-v="abierta">✍️ Abierta</button></div><span class="sp"></span>'
        + '<button class="ib" data-a="sube" data-i="' + i + '" title="Subir">↑</button><button class="ib" data-a="baja" data-i="' + i + '" title="Bajar">↓</button><button class="ib" data-a="dup" data-i="' + i + '" title="Duplicar">⧉</button><button class="ib r" data-a="del" data-i="' + i + '" title="Eliminar pregunta">🗑</button></div>' + avisos
        + (B.estimulos.length ? '<label class="lab">Texto compartido</label><select class="t" data-f="estimulo" data-i="' + i + '">' + sel + '</select>' : '')
        + '<label class="lab">Enunciado de la pregunta</label><textarea class="t" rows="2" data-f="pregunta" data-i="' + i + '" placeholder="Escribe la pregunta…">' + E(q.pregunta) + '</textarea>' + media(q, i);
      if (q.tipo === 'multiple') {
        cuerpo += '<label class="lab">Opciones <small style="text-transform:none;letter-spacing:0;font-weight:600">— toca el ✓ de la correcta</small></label>' + opciones(q, i)
          + '<details class="mas"><summary>⚙️ Más opciones (explicación, tiempos…)</summary><label class="lab">Explicación de la respuesta (la ve el estudiante si tú lo permites)</label><textarea class="t" rows="2" data-f="just" data-i="' + i + '">' + E(q.just || '') + '</textarea>'
          + (q.err && q.err.some(Boolean) ? '<label class="lab">Qué error revela cada opción incorrecta</label>' + q.opciones.map(function (t, k) { return k === q.correcta ? '' : '<div class="op" style="grid-template-columns:28px 1fr"><span class="lt">' + L[k] + '</span><input class="t" data-f="err" data-i="' + i + '" data-k="' + k + '" value="' + E(q.err[k] || '') + '"></div>'; }).join('') : '')
          + '<label class="lab" style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-f="fijo" data-i="' + i + '"' + (q.fijo ? ' checked' : '') + '> No mezclar el orden de las opciones (úsalo con «todas las anteriores» o números ordenados)</label>'
          + '<div class="g2"><div><label class="lab">🧠 Tiempo para pensar (segundos)</label><input class="t" type="number" min="0" max="600" data-f="piensa" data-i="' + i + '" value="' + (q.piensa === null || q.piensa === undefined ? '' : q.piensa) + '" placeholder="' + (g.piensa ? 'general: ' + g.piensa + ' s' : 'sin espera') + '"></div><div><label class="lab">⏱ Tiempo máximo para responder (segundos)</label><input class="t" type="number" min="0" max="900" data-f="limite" data-i="' + i + '" value="' + (q.limite === null || q.limite === undefined ? '' : q.limite) + '" placeholder="' + (g.limite ? 'general: ' + g.limite + ' s' : 'sin límite') + '"></div></div>'
          + '<div class="g3"><div><label class="lab">Competencia</label><input class="t" data-f="competencia" data-i="' + i + '" value="' + E(q.competencia || '') + '"></div><div><label class="lab">Componente</label><input class="t" data-f="componente" data-i="' + i + '" value="' + E(q.componente || '') + '"></div><div><label class="lab">Nivel</label><input class="t" data-f="nivel" data-i="' + i + '" value="' + E(q.nivel || '') + '"></div></div></details>';
      } else {
        cuerpo += '<div class="g2"><div><label class="lab">Puntos que vale</label><input class="t" type="number" min="0.5" step="0.5" data-f="puntos" data-i="' + i + '" value="' + (q.puntos || 1) + '"></div><div><label class="lab">🧠 Tiempo para pensar (s) · ⏱ máximo (s)</label><div class="g2"><input class="t" type="number" min="0" data-f="piensa" data-i="' + i + '" value="' + (q.piensa === null || q.piensa === undefined ? '' : q.piensa) + '" placeholder="pensar"><input class="t" type="number" min="0" data-f="limite" data-i="' + i + '" value="' + (q.limite === null || q.limite === undefined ? '' : q.limite) + '" placeholder="máximo"></div></div></div>'
          + '<label class="lab">Respuesta modelo (solo la ves tú al calificar)</label><textarea class="t" rows="2" data-f="modelo" data-i="' + i + '">' + E(q.modelo || '') + '</textarea>';
      }
      return '<div class="qc ' + (s.ok ? 'okc' : 'falta') + '" id="qc-' + i + '" data-i="' + i + '"><div class="qh" data-a="toggle" data-i="' + i + '"><span class="qn">' + (i + 1) + '</span><div class="qt">' + E(snippet(q)) + '</div><span class="est ' + s.c + '">' + E(s.t) + '</span><button class="chev" aria-label="Abrir o cerrar">' + (ab ? '▾' : '▸') + '</button></div>' + (ab ? '<div class="qb">' + cuerpo + '</div>' : '') + '</div>';
    }
    function panelClave() {
      var rows = B.preguntas.map(function (q, i) { if (q.tipo !== 'multiple') return ''; return '<div class="kr"><span class="n">' + (i + 1) + '</span><small>' + E(snippet(q)) + '</small><div class="ls">' + q.opciones.map(function (_, k) { return String(q.opciones[k]).trim() || q.opImg[k] ? '<button class="' + (q.correcta === k ? 'on' : '') + '" data-a="kk" data-i="' + i + '" data-k="' + k + '">' + L[k] + '</button>' : ''; }).join('') + '</div></div>'; }).join('');
      return '<div class="panel"><div class="barra"><b style="color:var(--gd)">🔑 Clave rápida</b><span class="sp"></span><button class="ib" data-a="cerrarpanel">✕ Cerrar</button></div><p class="sub" style="margin:0 0 6px">Toca la letra correcta de cada pregunta, o escribe la clave de una vez (ej.: <code>1-B 2-C 3-A</code>).</p>'
        + '<div class="row" style="margin-bottom:6px"><input class="t" id="claveTxt" placeholder="1-B 2-C 3-A 4-D…" style="flex:1;width:auto"><button class="btn sm p" data-a="aplicarclave">Aplicar</button></div>' + rows + '</div>';
    }
    function panelTextos() {
      return '<div class="panel"><div class="barra"><b style="color:var(--gd)">📖 Textos compartidos</b><span class="sp"></span><button class="ib" data-a="cerrarpanel">✕ Cerrar</button></div><p class="sub" style="margin:0 0 6px">Para lecturas o gráficos que sirven a varias preguntas. Luego eliges a qué preguntas pertenece dentro de cada una.</p>'
        + B.estimulos.map(function (e, j) { return '<div style="border:1px solid var(--line);border-radius:12px;padding:8px 10px;margin-bottom:8px"><div class="barra"><b>' + E(e.id.toUpperCase()) + '</b><input class="t" style="flex:1;width:auto" data-f="e-titulo" data-j="' + j + '" placeholder="Título (opcional)" value="' + E(e.titulo || '') + '"><button class="ib r" data-a="delest" data-j="' + j + '">🗑</button></div><textarea class="t" rows="3" data-f="e-texto" data-j="' + j + '" placeholder="Texto…">' + E(e.texto || '') + '</textarea><div class="media">' + (e.img ? '<div><img class="m" src="' + e.img + '" alt=""><div class="row" style="margin-top:4px"><button class="ib" data-a="estimg" data-j="' + j + '">🔄 Cambiar</button><button class="ib r" data-a="quitarestimg" data-j="' + j + '">✕ Quitar</button></div></div>' : '<button class="ib" data-a="estimg" data-j="' + j + '">🖼️ Agregar imagen</button>') + '</div></div>'; }).join('')
        + '<button class="btn sm" data-a="addest">＋ Agregar texto compartido</button></div>';
    }
    function render() {
      var r = resumen(), pct = r.m ? Math.round(r.ok / r.m * 100) : 100, lista = B.preguntas.map(function (q, i) { return { q: q, i: i }; }).filter(function (x) { return !ui.solo || !estado(x.q).ok; });
      cont.innerHTML = '<div class="tb"><div class="res"><span class="pill gris">📝 ' + r.n + ' pregunta' + (r.n === 1 ? '' : 's') + '</span><span class="pill verde">✓ ' + r.ok + ' con respuesta</span>' + (r.falta ? '<span class="pill rojo">⚠ ' + r.falta + ' sin respuesta</span>' : '') + (r.ab ? '<span class="pill gris">✍️ ' + r.ab + ' abierta' + (r.ab > 1 ? 's' : '') + '</span>' : '') + '</div><div class="prog"><i style="width:' + pct + '%"></i></div>'
        + '<div class="acc"><button class="btn sm p" data-a="addq">＋ Pregunta</button><button class="btn sm" data-a="addab">＋ Abierta</button><button class="btn sm' + (ui.clave ? ' p' : '') + '" data-a="panelclave">🔑 Clave rápida</button><button class="btn sm' + (ui.textos ? ' p' : '') + '" data-a="paneltextos">📖 Textos compartidos' + (B.estimulos.length ? ' (' + B.estimulos.length + ')' : '') + '</button>'
        + '<button class="btn sm" data-a="solo">' + (ui.solo ? 'Ver todas' : 'Ver solo las que faltan') + '</button><button class="btn sm" data-a="todo">' + (ui.todo === false ? 'Abrir todas' : 'Cerrar todas') + '</button></div></div>'
        + (ui.clave ? panelClave() : '') + (ui.textos ? panelTextos() : '')
        + (lista.length ? lista.map(function (x) { return tarjeta(x.q, x.i); }).join('') : '<div class="vacio">' + (ui.solo ? '🎉 No falta ninguna respuesta.' : 'No hay preguntas. Agrega una con «＋ Pregunta».') + '</div>');
      cont.querySelectorAll('textarea.t').forEach(autoAlto);
    }
    function autoAlto(t) { t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; }
    function actualizarCabecera(i) {
      var q = B.preguntas[i], c = cont.querySelector('#qc-' + i); if (!c) return; var s = estado(q);
      c.querySelector('.qt').textContent = snippet(q); var e = c.querySelector('.est'); e.className = 'est ' + s.c; e.textContent = s.t; c.className = 'qc ' + (s.ok ? 'okc' : 'falta') + (c.classList.contains('foco') ? ' foco' : '');
    }
    function actualizarResumen() {
      var r = resumen(), pct = r.m ? Math.round(r.ok / r.m * 100) : 100, res = cont.querySelector('.res'); if (!res) return;
      res.innerHTML = '<span class="pill gris">📝 ' + r.n + ' pregunta' + (r.n === 1 ? '' : 's') + '</span><span class="pill verde">✓ ' + r.ok + ' con respuesta</span>' + (r.falta ? '<span class="pill rojo">⚠ ' + r.falta + ' sin respuesta</span>' : '') + (r.ab ? '<span class="pill gris">✍️ ' + r.ab + ' abierta' + (r.ab > 1 ? 's' : '') + '</span>' : '');
      cont.querySelector('.prog i').style.width = pct + '%';
    }
    function elegirImagen(cb) { var f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*'; f.onchange = function () { if (f.files[0]) PR.optimizarImagen(f.files[0]).then(cb).catch(function () { alert('No se pudo leer esa imagen.'); }); }; f.click(); }
    function mover(i, d) { var j = i + d; if (j < 0 || j >= B.preguntas.length) return; var t = B.preguntas[i]; B.preguntas[i] = B.preguntas[j]; B.preguntas[j] = t; PR.renumerar(B); }
    /* ---------- acciones ---------- */
    cont.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return; var a = b.dataset.a, i = +b.dataset.i, k = +b.dataset.k, j = +b.dataset.j, q = B.preguntas[i];
      if (a === 'toggle') { if (e.target.closest('textarea,input,select')) return; ui.abiertas[q.id] = !ui.abiertas[q.id]; var c = cont.querySelector('#qc-' + i); c.outerHTML = tarjeta(q, i); cont.querySelectorAll('#qc-' + i + ' textarea.t').forEach(autoAlto); return; }
      if (a === 'ok') { q.correcta = q.correcta === k ? -1 : k; q.auto = ''; q.aviso = (q.aviso || []).filter(function (x) { return !/respuesta correcta/i.test(x); }); }
      else if (a === 'kk') { q.correcta = k; q.auto = ''; }
      else if (a === 'tipo') { if (q.tipo === b.dataset.v) return; var n = PR.preguntaNueva(b.dataset.v); n.id = q.id; n.pregunta = q.pregunta; n.img = q.img; n.leyenda = q.leyenda; n.vis = q.vis; n.estimulo = q.estimulo; n.aviso = q.aviso; B.preguntas[i] = n; }
      else if (a === 'addop') { q.opciones.push(''); q.opImg.push(''); q.err.push(''); }
      else if (a === 'delop') { if (q.opciones.length <= 2) { alert('Una pregunta necesita al menos 2 opciones.'); return; } q.opciones.splice(k, 1); q.opImg.splice(k, 1); q.err.splice(k, 1); if (q.correcta === k) q.correcta = -1; else if (q.correcta > k) q.correcta--; }
      else if (a === 'img') { elegirImagen(function (u) { q.img = u; q.aviso = (q.aviso || []).filter(function (x) { return !/imagen|gráfico/i.test(x); }); render(); cambio(); }); return; }
      else if (a === 'quitarimg') { q.img = ''; q.leyenda = ''; }
      else if (a === 'quitarvis') { q.vis = null; }
      else if (a === 'opimg') { elegirImagen(function (u) { q.opImg[k] = u; render(); cambio(); }); return; }
      else if (a === 'sube') mover(i, -1); else if (a === 'baja') mover(i, 1);
      else if (a === 'dup') { var cp = JSON.parse(JSON.stringify(q)); cp.aviso = []; B.preguntas.splice(i + 1, 0, cp); PR.renumerar(B); ui.abiertas[cp.id] = true; }
      else if (a === 'del') { if (!confirm('¿Eliminar la pregunta ' + (i + 1) + '?')) return; B.preguntas.splice(i, 1); PR.renumerar(B); }
      else if (a === 'addq' || a === 'addab') { var nq = PR.preguntaNueva(a === 'addab' ? 'abierta' : 'multiple'); B.preguntas.push(nq); PR.renumerar(B); ui.abiertas[nq.id] = true; ui.solo = false; render(); cambio(); var c2 = cont.querySelector('#qc-' + (B.preguntas.length - 1)); if (c2) { c2.scrollIntoView({ behavior: 'smooth', block: 'center' }); var ta = c2.querySelector('textarea'); if (ta) ta.focus(); } return; }
      else if (a === 'panelclave') { ui.clave = !ui.clave; if (ui.clave) ui.textos = false; }
      else if (a === 'paneltextos') { ui.textos = !ui.textos; if (ui.textos) ui.clave = false; }
      else if (a === 'cerrarpanel') { ui.clave = false; ui.textos = false; }
      else if (a === 'solo') { ui.solo = !ui.solo; if (ui.solo) B.preguntas.forEach(function (x) { if (!estado(x).ok) ui.abiertas[x.id] = true; }); }
      else if (a === 'todo') { ui.todo = ui.todo === false ? true : false; B.preguntas.forEach(function (x) { ui.abiertas[x.id] = ui.todo; }); }
      else if (a === 'aplicarclave') { var m = PR.parseClaveTexto(cont.querySelector('#claveTxt').value), c3 = 0; B.preguntas.forEach(function (x, n) { var v = m[String(n + 1)]; if (v !== undefined && x.tipo === 'multiple' && v < x.opciones.length) { x.correcta = v; x.auto = 'de la clave que escribiste'; c3++; } }); alert(c3 ? 'Listo: se marcaron ' + c3 + ' respuesta' + (c3 > 1 ? 's' : '') + '.' : 'No encontré respuestas en ese texto. Escribe algo como: 1-B 2-C 3-A'); }
      else if (a === 'addest') { B.estimulos.push({ id: 't' + (Math.max.apply(null, [0].concat(B.estimulos.map(function (x) { return Number(x.id.replace('t', '')) || 0; }))) + 1), titulo: '', texto: '', img: '', fuente: '' }); }
      else if (a === 'delest') { var id = B.estimulos[j].id; B.estimulos.splice(j, 1); B.preguntas.forEach(function (x) { if (x.estimulo === id) x.estimulo = ''; }); }
      else if (a === 'estimg') { elegirImagen(function (u) { B.estimulos[j].img = u; render(); cambio(); }); return; }
      else if (a === 'quitarestimg') { B.estimulos[j].img = ''; }
      else return;
      render(); cambio();
    });
    cont.addEventListener('input', function (e) {
      var t = e.target, f = t.dataset.f; if (!f) return; var i = +t.dataset.i, k = +t.dataset.k, j = +t.dataset.j, q = B.preguntas[i];
      if (t.tagName === 'TEXTAREA') autoAlto(t);
      if (f === 'pregunta') q.pregunta = t.value; else if (f === 'op') q.opciones[k] = t.value; else if (f === 'leyenda') q.leyenda = t.value; else if (f === 'just') q.just = t.value; else if (f === 'err') q.err[k] = t.value;
      else if (f === 'modelo') q.modelo = t.value; else if (f === 'competencia' || f === 'componente' || f === 'nivel') q[f] = t.value;
      else if (f === 'puntos') q.puntos = Number(t.value) || 1;
      else if (f === 'piensa' || f === 'limite') q[f] = t.value === '' ? null : Math.max(0, Number(t.value) || 0);
      else if (f === 'e-titulo') B.estimulos[j].titulo = t.value; else if (f === 'e-texto') B.estimulos[j].texto = t.value;
      else return;
      if (!isNaN(i)) actualizarCabecera(i); actualizarResumen(); cambio();
    });
    cont.addEventListener('change', function (e) {
      var t = e.target, f = t.dataset.f, i = +t.dataset.i; if (f === 'estimulo') { B.preguntas[i].estimulo = t.value; cambio(); } else if (f === 'fijo') { B.preguntas[i].fijo = t.checked; cambio(); }
    });
    cont.addEventListener('focusin', function (e) { var c = e.target.closest('.qc'); cont.querySelectorAll('.qc.foco').forEach(function (x) { x.classList.remove('foco'); }); if (c) c.classList.add('foco'); });
    cont.addEventListener('paste', function (e) {
      var f = e.clipboardData && [].filter.call(e.clipboardData.files || [], function (x) { return /^image\//.test(x.type); })[0]; if (!f) return;
      var t = e.target.closest('[data-f]'); if (!t) return; var i = +t.dataset.i, k = +t.dataset.k, q = B.preguntas[i]; if (!q) return; e.preventDefault();
      PR.optimizarImagen(f).then(function (u) { if (t.dataset.f === 'op') q.opImg[k] = u; else q.img = u; render(); cambio(); });
    });
    render();
    return {
      get: function () { return B; }, set: function (nb) { B = nb; ui.abiertas = {}; var n = B.preguntas.length; B.preguntas.forEach(function (q) { ui.abiertas[q.id] = n <= 8 || !estado(q).ok; }); ui.todo = null; render(); },
      refrescar: render, resumen: resumen, irAPrimeraFalta: function () { var i = B.preguntas.findIndex(function (q) { return !estado(q).ok; }); if (i < 0) return; ui.abiertas[B.preguntas[i].id] = true; render(); var c = cont.querySelector('#qc-' + i); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    };
  }
  return { montar: montar };
})();
