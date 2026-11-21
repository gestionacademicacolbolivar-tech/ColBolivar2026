/* ColBolívar · Pruebas en línea — funciones comunes (conexión, conversión de preguntas, QR, utilidades) */
var PR = (function () {
  var cfgP = null;
  function cfg() { return cfgP || (cfgP = fetch('datos/pruebas-config.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).catch(function () { return {}; })); }
  function api(accion, datos, metodo) {
    return cfg().then(function (c) {
      if (!c.url) throw { codigo: 'sin_config', message: 'La plataforma de pruebas todavía no está conectada.' };
      var p = metodo === 'GET'
        ? fetch(c.url + (c.url.indexOf('?') < 0 ? '?' : '&') + new URLSearchParams(Object.assign({ accion: accion }, datos)).toString())
        : fetch(c.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ accion: accion }, datos)) });
      return p.then(function (r) { return r.json(); }, function () { return diagnostico(c.url).then(function (m) { throw { codigo: 'red', message: m }; }); })
        .then(function (j) { if (!j.ok) throw { codigo: j.error, message: j.mensaje || j.error }; return j; });
    });
  }
  // Cuando falla la conexión, averigua la causa probable.
  // Si «no-cors» llega pero la lectura normal no: Google respondió con una página de inicio de sesión o de autorización (acceso mal configurado).
  function sondear(url) {
    var u = url + (url.indexOf('?') < 0 ? '?' : '&') + 'accion=ping';
    return fetch(u).then(function (r) { return r.json(); }).then(function (j) { return { estado: j && j.ok ? 'ok' : 'raro', version: j && j.version }; }, function () {
      return fetch(u, { mode: 'no-cors' }).then(function () { return { estado: 'sin_permiso' }; }, function () { return { estado: 'sin_ruta' }; });
    });
  }
  function diagnostico(url) {
    if (navigator.onLine === false) return Promise.resolve('No hay internet en este dispositivo. Revisa tu conexión e intenta de nuevo.');
    return sondear(url).then(function (r) {
      if (r.estado === 'ok') return 'La plataforma está conectada, pero no aceptó este envío (¿la prueba pesa mucho?). Intenta otra vez o usa menos imágenes.';
      if (r.estado === 'sin_permiso') return 'La dirección de Google responde, pero no permite leer la respuesta: la aplicación web no está publicada con acceso «Cualquier persona», o falta autorizar el script. Quien administra el portal puede ver la causa exacta en la página de diagnóstico.';
      if (r.estado === 'sin_ruta') return 'No se pudo llegar a la dirección de Google: puede estar mal escrita en datos/pruebas-config.json, o algo en este navegador la bloquea (extensión, red del colegio). Quien administra el portal puede ver la causa exacta en la página de diagnóstico.';
      return 'La plataforma respondió algo inesperado. Avisa a quien administra el portal.';
    });
  }
  function E(t) { return String(t === undefined || t === null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function LS(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function linkPrueba(c) { return new URL('prueba.html?c=' + encodeURIComponent(c), location.href).href; }
  function linkResultados(c) { return new URL('resultados.html?c=' + encodeURIComponent(c), location.href).href; }
  function qr(url, celda) { var q = qrcode(0, 'M'); q.addData(url); q.make(); return q.createSvgTag({ cellSize: celda || 5, margin: 2, scalable: true }); }
  function mezclar(a, rnd) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor((rnd ? rnd() : Math.random()) * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function semilla(s) { return function () { s |= 0; s = s + 0x6D2B79F5 | 0; var t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function codigoDocente(v) { return v === undefined ? (LS('cb_docente_codigo') || '') : LS('cb_docente_codigo', String(v).trim().toUpperCase()); }
  function misPruebas() { return LS('cb_pruebas') || []; }
  function guardarPrueba(p) { var l = misPruebas().filter(function (x) { return x.codigo !== p.codigo; }); l.unshift(p); LS('cb_pruebas', l.slice(0, 60)); }
  function quitarPrueba(c) { LS('cb_pruebas', misPruebas().filter(function (x) { return x.codigo !== c; })); }

  /* ---------- conversión exam.json (repositorio de creación de pruebas) -> prueba en línea ---------- */
  var RX_NUM = /^[\$\s]*[-+]?\d+([.,]\d+)?(\s*\/\s*\d+)?\s*(%|[A-Za-zµ²³°\/ ]{0,10})?$/, RX_ULT = /(todas|ninguna|ambas)\s+(las\s+)?(anteriores|opciones)|^[a-d]\s+y\s+[a-d]\b/i;
  function numDe(s) { var t = String(s).replace(/[\$\s%]/g, '').replace(',', '.'), m = t.match(/^([-+]?\d+(?:\.\d+)?)(?:\/(\d+))?/); if (!m) return NaN; return m[2] ? parseFloat(m[1]) / parseFloat(m[2]) : parseFloat(m[1]); }
  var RX_IMG = /^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+\/=]+$/;
  function imgOk(u) { return typeof u === 'string' && RX_IMG.test(u) ? u : ''; }
  // ¿necesita una imagen que el generador dibuja (figura tipo 1/3, ilustración)? Las tablas (tipo 2) y los cuadros de texto (tipo 4) se dibujan solas en la web.
  function necesitaImagen(o) { return !!(o && ((o.visual && (o.visual.tipo === 1 || o.visual.tipo === 3)) || o.imagenPrompt || o.imagen || o.imagenes)); }
  function visDe(o) { var v = o && o.visual; if (!v) return null;
    if (v.tipo === 2 && v.headers && v.rows) return { t: 'tabla', titulo: v.titulo || '', headers: v.headers.map(String), rows: v.rows.map(function (r) { return r.map(String); }) };
    if (v.tipo === 4 && v.texto) return { t: 'texto', titulo: v.titulo || '', texto: String(v.texto), fuente: v.fuente || '' }; return null; }
  function desdeExam(ex, op) {
    op = op || {}; var avisos = [], omitE = {}, estim = [], pregs = [], clave = { m: {}, a: {} }, n = 0, IM = ex.imagenes || { preguntas: {}, estimulos: {} }, conImg = 0;
    (ex.estimulos || []).forEach(function (e) {
      var im = imgOk((IM.estimulos || {})[e.id]); if (im) conImg++;
      if (necesitaImagen(e) && !im) omitE[e.id] = true;
      estim.push({ id: e.id, titulo: e.titulo || '', texto: e.texto || '', fuente: e.fuente || '', numerar: !!e.numerarParrafos, instruccion: e.instruccion || '', img: im, vis: visDe(e) });
    });
    (ex.preguntas || []).forEach(function (p, i) {
      var id = 'p' + (i + 1), im = imgOk((IM.preguntas || {})[i]), conGrafico = (necesitaImagen(p) && !im) || (p.estimulo && omitE[p.estimulo]), etiqueta = 'Pregunta ' + (i + 1);
      if (conGrafico) { avisos.push(etiqueta + ' usa un gráfico o imagen y no se incluyó. Genera el archivo «prueba-en-linea.json» con el generador de pruebas actualizado (trae las imágenes) y súbelo.'); return; }
      if (im) conImg++;
      var base = { img: im, vis: visDe(p), leyenda: (p.visual && p.visual.leyenda) || '', id: id, estimulo: p.estimulo || '', enunciado: p.enunciado || '', pregunta: p.pregunta || '', competencia: p.competencia || '', componente: p.componente || '', nivel: p.nivel || '', dba: p.dba || '', origen: i + 1 };
      if (p.tipo === 'abierta') {
        pregs.push(Object.assign(base, { tipo: 'abierta', puntos: Number(p.puntos) || 1, lineas: p.lineas || 4 }));
        clave.a[id] = { modelo: p.respuestaModelo || '', criterios: p.criterios || [] };
      } else {
        var correcta = p.correcta, distr = (p.distractores || []).slice(), errs = (p.errores || []).slice();
        if (correcta === undefined || distr.length < 1) { avisos.push(etiqueta + ' no tiene respuesta correcta u opciones: se omitió.'); return; }
        var items = [{ t: String(correcta), ok: true, e: '' }].concat(distr.map(function (d, k) { return { t: String(d), ok: false, e: errs[k] || '' }; }));
        var fijo = false, ult = items.filter(function (x) { return RX_ULT.test(x.t); }), resto = items.filter(function (x) { return !RX_ULT.test(x.t); });
        if (items.every(function (x) { return RX_NUM.test(x.t) && !isNaN(numDe(x.t)); })) { items.sort(function (a, b) { return numDe(a.t) - numDe(b.t); }); fijo = true; }
        else if (ult.length) { items = mezclar(resto).concat(ult); fijo = true; }
        else items = mezclar(items);
        var ci = items.findIndex(function (x) { return x.ok; });
        pregs.push(Object.assign(base, { tipo: 'multiple', opciones: items.map(function (x) { return x.t; }), fijo: fijo }));
        clave.m[id] = { ci: ci, just: p.justificacion || '', err: items.map(function (x) { return x.e; }) };
        n++;
      }
    });
    var usadas = {}; pregs.forEach(function (q) { if (q.estimulo) usadas[q.estimulo] = 1; });
    var meta = ex.meta || {};
    return { publico: { estimulos: estim.filter(function (e) { return usadas[e.id]; }), preguntas: pregs }, clave: clave, avisos: avisos, nMultiple: n, nImagenes: conImg,
      meta: { titulo: meta.tema || meta.titulo || meta.nombre || '', area: meta.area || '', grado: String(meta.grado || ''), docente: meta.docente || '' } };
  }

  /* ---------- texto simple (pegado desde Word) -> forma exam.json ---------- */
  function desdeTexto(txt, conservar) {
    var lineas = String(txt).replace(/\r/g, '').split('\n'), meta = {}, preguntas = [], problemas = [], cur = null, ult = null;
    var RXQ = /^\s*(\d{1,3})\s*[.)\-:]\s+(.*)$/, RXO = /^\s*(\*|✓|✔)?\s*\(?([A-Fa-f])[).:\-]\s+(.*?)\s*$/, RXH = /^\s*(Tema|T[ií]tulo|[ÁA]rea|Grado|Docente)\s*:\s*(.+)$/i;
    var RXX = /^\s*(Explicaci[oó]n|Justificaci[oó]n|Retroalimentaci[oó]n)\s*:\s*(.*)$/i, RXR = /^\s*(Respuesta|Correcta|Clave)\s*:\s*\(?([A-Fa-f])\)?\s*$/i, RXM = /^\s*(Competencia|Componente|Nivel)\s*:\s*(.+)$/i;
    function cerrar() { if (!cur) return; var correctaIdx = cur.marca >= 0 ? cur.marca : (cur.resp ? cur.letras.indexOf(cur.resp) : -1);
      if (conservar && cur.ops.length >= 1) { preguntas.push({ pregunta: cur.q.join(' ').trim(), opciones: cur.ops.slice(), correcta: correctaIdx, justificacion: cur.just, competencia: cur.comp, componente: cur.compo, nivel: cur.nivel }); }
      else if (cur.ops.length < 2) problemas.push('Pregunta ' + cur.n + ': necesita al menos 2 opciones (A, B, C…).');
      else if (correctaIdx < 0) problemas.push('Pregunta ' + cur.n + ': no se marcó la respuesta correcta (usa * antes de la letra o una línea «Respuesta: B»).');
      else { var c = cur.ops[correctaIdx]; preguntas.push({ pregunta: cur.q.join(' ').trim(), correcta: c, distractores: cur.ops.filter(function (_, i) { return i !== correctaIdx; }), errores: [], justificacion: cur.just, competencia: cur.comp, componente: cur.compo, nivel: cur.nivel }); }
      cur = null; ult = null; }
    lineas.forEach(function (l) {
      if (!l.trim()) return;
      var h = !cur && l.match(RXH); if (h) { var k = h[1].toLowerCase().replace('í', 'i').replace('á', 'a'); meta[k === 'tema' || k === 'titulo' ? 'tema' : k] = h[2].trim(); return; }
      var q = l.match(RXQ); if (q && (!cur || cur.ops.length >= 2 || !RXO.test(l))) { cerrar(); cur = { n: Number(q[1]), q: [q[2]], ops: [], letras: [], marca: -1, resp: '', just: '', comp: '', compo: '', nivel: '' }; ult = 'q'; return; }
      if (!cur) return;
      var x = l.match(RXX); if (x) { cur.just = x[2].trim(); ult = 'j'; return; }
      var r = l.match(RXR); if (r) { cur.resp = r[2].toUpperCase(); return; }
      var m = l.match(RXM); if (m) { var kk = m[1].toLowerCase(); if (kk === 'competencia') cur.comp = m[2].trim(); else if (kk === 'componente') cur.compo = m[2].trim(); else cur.nivel = m[2].trim(); return; }
      var o = l.match(RXO); if (o) { var texto = o[3], marcada = !!o[1]; var fin = texto.match(/^(.*?)\s*(\(correcta\)|✓|✔|\*)$/i); if (fin) { texto = fin[1]; marcada = true; }
        cur.ops.push(texto.trim()); cur.letras.push(o[2].toUpperCase()); if (marcada) cur.marca = cur.ops.length - 1; ult = 'o'; return; }
      if (ult === 'o') cur.ops[cur.ops.length - 1] += ' ' + l.trim(); else if (ult === 'j') cur.just += ' ' + l.trim(); else cur.q.push(l.trim());
    });
    cerrar();
    return { meta: { tema: meta.tema || '', area: meta['area'] || '', grado: meta.grado || '', docente: meta.docente || '' }, preguntas: preguntas, problemas: problemas };
  }

  /* =====================================================================================
     BORRADOR (modelo del editor): lo que el docente ve y corrige antes de publicar.
     { meta:{titulo,area,grado}, estimulos:[{id,titulo,texto,img,vis}], preguntas:[{ id,tipo,pregunta,enunciado,img,leyenda,vis,estimulo,
        opciones[],opImg[],correcta,just,err[],fijo,piensa,limite,competencia,componente,nivel,  (múltiple)
        puntos,modelo,criterios[]  (abierta),  aviso[],auto }] }
     ===================================================================================== */
  function preguntaNueva(tipo) {
    var b = { id: '', tipo: tipo || 'multiple', enunciado: '', pregunta: '', img: '', leyenda: '', vis: null, estimulo: '', piensa: null, limite: null, aviso: [] };
    if (b.tipo === 'abierta') return Object.assign(b, { puntos: 1, modelo: '', criterios: [] });
    return Object.assign(b, { opciones: ['', '', '', ''], opImg: ['', '', '', ''], correcta: -1, auto: '', just: '', err: ['', '', '', ''], fijo: false, competencia: '', componente: '', nivel: '' });
  }
  function borradorVacio() { var b = { meta: { titulo: '', area: '', grado: '' }, estimulos: [], preguntas: [preguntaNueva(), preguntaNueva(), preguntaNueva()] }; renumerar(b); return b; }
  function renumerar(b) { b.preguntas.forEach(function (q, i) { q.id = 'p' + (i + 1); }); return b; }
  function esNumerica(ops) { return ops.length > 1 && ops.every(function (t) { return RX_NUM.test(String(t).trim()) && !isNaN(numDe(t)); }); }

  /* exam.json / prueba-en-linea.json del generador de pruebas → borrador (con imágenes, tablas y recuadros) */
  function borradorDesdeExam(ex) {
    var IM = ex.imagenes || { preguntas: {}, estimulos: {} }, b = { meta: { titulo: '', area: '', grado: '' }, estimulos: [], preguntas: [] }, m = ex.meta || {};
    b.meta = { titulo: m.tema || m.titulo || m.nombre || '', area: m.area || '', grado: String(m.grado || '') };
    (ex.estimulos || []).forEach(function (e) {
      var im = imgOk((IM.estimulos || {})[e.id]), aviso = !im && necesitaImagen(e);
      b.estimulos.push({ id: e.id, titulo: e.titulo || '', texto: e.texto || '', fuente: e.fuente || '', img: im, vis: visDe(e), aviso: aviso ? 'Este texto usaba una imagen que no viene en el archivo: agrégala.' : '' });
    });
    (ex.preguntas || []).forEach(function (p, i) {
      var q = preguntaNueva(p.tipo === 'abierta' ? 'abierta' : 'multiple'), im = imgOk((IM.preguntas || {})[i]);
      q.pregunta = p.pregunta || ''; q.enunciado = p.enunciado || ''; q.estimulo = p.estimulo || ''; q.img = im; q.vis = visDe(p); q.leyenda = (p.visual && p.visual.leyenda) || '';
      if (necesitaImagen(p) && !im) q.aviso.push('Esta pregunta usaba un gráfico que no viene en el archivo: agrega la imagen (o genera «prueba-en-linea.json» con el generador actualizado).');
      if (q.tipo === 'abierta') { q.puntos = Number(p.puntos) || 1; q.modelo = p.respuestaModelo || ''; q.criterios = p.criterios || []; }
      else {
        var items = [{ t: String(p.correcta), ok: true, e: '' }].concat((p.distractores || []).map(function (d, k) { return { t: String(d), ok: false, e: (p.errores || [])[k] || '' }; }));
        if (p.correcta === undefined || items.length < 2) q.aviso.push('Falta la respuesta correcta o las opciones: complétalas.');
        var ult = items.filter(function (x) { return RX_ULT.test(x.t); }), resto = items.filter(function (x) { return !RX_ULT.test(x.t); });
        if (esNumerica(items.map(function (x) { return x.t; }))) { items.sort(function (a, c) { return numDe(a.t) - numDe(c.t); }); q.fijo = true; }
        else if (ult.length) { items = mezclar(resto).concat(ult); q.fijo = true; }
        else items = mezclar(items);
        q.opciones = items.map(function (x) { return x.t; }); q.opImg = items.map(function () { return ''; }); q.err = items.map(function (x) { return x.e; });
        q.correcta = items.findIndex(function (x) { return x.ok; }); q.just = p.justificacion || ''; q.competencia = p.competencia || ''; q.componente = p.componente || ''; q.nivel = p.nivel || '';
      }
      b.preguntas.push(q);
    });
    return renumerar(b);
  }

  /* texto simple pegado → borrador (las preguntas sin respuesta marcada se conservan para marcarlas en el editor) */
  function textoABorrador(txt) {
    var r = desdeTexto(txt, true), b = { meta: { titulo: r.meta.tema || '', area: r.meta.area || '', grado: r.meta.grado || '' }, estimulos: [], preguntas: [] };
    r.preguntas.forEach(function (p) {
      var q = preguntaNueva('multiple'); q.pregunta = p.pregunta; q.opciones = p.opciones; q.opImg = p.opciones.map(function () { return ''; }); q.err = p.opciones.map(function () { return ''; });
      q.correcta = p.correcta; q.auto = p.correcta >= 0 ? 'marcada en el texto' : ''; q.just = p.justificacion || ''; q.competencia = p.competencia || ''; q.componente = p.componente || ''; q.nivel = p.nivel || '';
      if (p.correcta < 0) q.aviso.push('No se marcó la respuesta correcta: márcala tú.');
      if (p.opciones.length < 2) q.aviso.push('Tiene menos de 2 opciones: revísala.');
      q.fijo = p.opciones.some(function (o) { return RX_ULT.test(o); }); b.preguntas.push(q);
    });
    return renumerar(b);
  }
  /* «1-B 2-C 3-A» o «1.b 2.c» → { numeroDePregunta: indiceDeLetra } */
  function parseClaveTexto(str) {
    var m = {}, rx = /(\d{1,3})\s*[-–.:)=\s]\s*([A-Fa-f])(?![A-Za-zÁ-úñ])/g, r; while ((r = rx.exec(String(str)))) m[r[1]] = r[2].toUpperCase().charCodeAt(0) - 65; return m;
  }

  /* problemas que impiden publicar (y avisos que no la impiden) */
  function validarBorrador(b) {
    var errores = [], avisos = [], n = b.preguntas.length;
    if (!n) errores.push({ q: 0, m: 'La prueba no tiene preguntas.' });
    b.preguntas.forEach(function (q, i) {
      var num = i + 1; if (!String(q.pregunta || '').trim() && !q.img && !q.vis) errores.push({ q: num, m: 'La pregunta ' + num + ' no tiene enunciado.' });
      if (q.tipo === 'multiple') {
        var llenas = q.opciones.map(function (t, k) { return String(t).trim() || q.opImg[k] ? k : -1; }).filter(function (k) { return k >= 0; });
        if (llenas.length < 2) errores.push({ q: num, m: 'La pregunta ' + num + ' necesita al menos 2 opciones con texto o imagen.' });
        else if (q.correcta < 0 || llenas.indexOf(q.correcta) < 0) errores.push({ q: num, m: 'La pregunta ' + num + ' no tiene marcada la respuesta correcta.' });
        var ts = q.opciones.map(function (t) { return String(t).trim().toLowerCase(); }).filter(String);
        if (ts.length !== ts.filter(function (t, k) { return ts.indexOf(t) === k; }).length) avisos.push({ q: num, m: 'La pregunta ' + num + ' tiene opciones repetidas.' });
      }
      if (q.aviso && q.aviso.some(function (a) { return /imagen|gráfico/i.test(a); }) && !q.img) avisos.push({ q: num, m: 'La pregunta ' + num + ' parece necesitar una imagen que falta.' });
    });
    return { errores: errores, avisos: avisos, listo: errores.length === 0 };
  }

  /* borrador → lo que se publica: { publico, clave }. Las opciones se reordenan al azar (la clave solo la conoce el servidor) salvo las «fijas». */
  function publicacionDesdeBorrador(b) {
    var clave = { m: {}, a: {} }, usadas = {}, pregs = [];
    b.preguntas.forEach(function (q, i) {
      var id = 'p' + (i + 1), base = { id: id, estimulo: q.estimulo || '', enunciado: q.enunciado || '', pregunta: String(q.pregunta || '').trim(), img: imgOk(q.img), leyenda: q.leyenda || '', vis: q.vis || null,
        piensa: q.piensa === '' || q.piensa === undefined ? null : q.piensa, limite: q.limite === '' || q.limite === undefined ? null : q.limite, competencia: q.competencia || '', componente: q.componente || '', nivel: q.nivel || '', dba: q.dba || '' };
      if (q.estimulo) usadas[q.estimulo] = 1;
      if (q.tipo === 'abierta') { pregs.push(Object.assign(base, { tipo: 'abierta', puntos: Number(q.puntos) || 1, lineas: 4 })); clave.a[id] = { modelo: q.modelo || '', criterios: q.criterios || [] }; return; }
      var items = q.opciones.map(function (t, k) { return { t: String(t).trim(), img: imgOk(q.opImg[k]), ok: k === q.correcta, e: (q.err || [])[k] || '' }; }).filter(function (x) { return x.t || x.img; });
      var fijo = q.fijo || esNumerica(items.map(function (x) { return x.t; })) || items.some(function (x) { return RX_ULT.test(x.t); });
      if (!fijo) items = mezclar(items);
      pregs.push(Object.assign(base, { tipo: 'multiple', opciones: items.map(function (x) { return x.t || '(imagen)'; }), opImg: items.some(function (x) { return x.img; }) ? items.map(function (x) { return x.img; }) : undefined, fijo: fijo }));
      clave.m[id] = { ci: items.findIndex(function (x) { return x.ok; }), just: q.just || '', err: items.map(function (x) { return x.e; }) };
    });
    return { publico: { estimulos: (b.estimulos || []).filter(function (e) { return usadas[e.id]; }).map(function (e) { return { id: e.id, titulo: e.titulo || '', texto: e.texto || '', fuente: e.fuente || '', numerar: false, img: imgOk(e.img), vis: e.vis || null }; }), preguntas: pregs }, clave: clave };
  }

  /* imagen → WebP reducido (≤ 900 px). Acepta un File/Blob o un dataURL. */
  function optimizarImagen(src, maxW) {
    maxW = maxW || 900;
    return new Promise(function (ok, mal) {
      function cargar(url) {
        var im = new Image(); im.onload = function () {
          var k = Math.min(1, maxW / Math.max(im.width, im.height)), w = Math.max(1, Math.round(im.width * k)), h = Math.max(1, Math.round(im.height * k)), c = document.createElement('canvas'); c.width = w; c.height = h;
          c.getContext('2d').drawImage(im, 0, 0, w, h); var out = c.toDataURL('image/webp', 0.84); if (out.indexOf('data:image/webp') !== 0) out = c.toDataURL('image/png');
          if (out.length > 450000) out = c.toDataURL('image/jpeg', 0.7); ok(out);
        }; im.onerror = function () { mal(new Error('No se pudo leer la imagen.')); }; im.src = url;
      }
      if (typeof src === 'string') cargar(src); else { var fr = new FileReader(); fr.onload = function () { cargar(fr.result); }; fr.onerror = mal; fr.readAsDataURL(src); }
    });
  }
    function nota(n) { return (Math.round(n * 10) / 10).toFixed(1).replace('.', ','); }
  function colorNota(n) { return n >= 4 ? '#2fa84f' : n >= 3 ? '#e0a100' : '#d92d3a'; }
  return { preguntaNueva: preguntaNueva, borradorVacio: borradorVacio, renumerar: renumerar, borradorDesdeExam: borradorDesdeExam, textoABorrador: textoABorrador, parseClaveTexto: parseClaveTexto, validarBorrador: validarBorrador, publicacionDesdeBorrador: publicacionDesdeBorrador, optimizarImagen: optimizarImagen, esNumerica: esNumerica, codigoDocente: codigoDocente, api: api, cfg: cfg, sondear: sondear, E: E, LS: LS, linkPrueba: linkPrueba, linkResultados: linkResultados, qr: qr, mezclar: mezclar, semilla: semilla, misPruebas: misPruebas, guardarPrueba: guardarPrueba, quitarPrueba: quitarPrueba,
    desdeExam: desdeExam, desdeTexto: desdeTexto, nota: nota, colorNota: colorNota };
})();
if (typeof module !== 'undefined') module.exports = PR;
