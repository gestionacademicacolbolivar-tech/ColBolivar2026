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
      return p.then(function (r) { return r.json(); }, function () { throw { codigo: 'red', message: 'No hay conexión con la plataforma. Revisa tu internet.' }; })
        .then(function (j) { if (!j.ok) throw { codigo: j.error, message: j.mensaje || j.error }; return j; });
    });
  }
  function E(t) { return String(t === undefined || t === null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function LS(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function linkPrueba(c) { return new URL('prueba.html?c=' + encodeURIComponent(c), location.href).href; }
  function linkResultados(c) { return new URL('resultados.html?c=' + encodeURIComponent(c), location.href).href; }
  function qr(url, celda) { var q = qrcode(0, 'M'); q.addData(url); q.make(); return q.createSvgTag({ cellSize: celda || 5, margin: 2, scalable: true }); }
  function mezclar(a, rnd) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor((rnd ? rnd() : Math.random()) * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function semilla(s) { return function () { s |= 0; s = s + 0x6D2B79F5 | 0; var t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
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
  function desdeTexto(txt) {
    var lineas = String(txt).replace(/\r/g, '').split('\n'), meta = {}, preguntas = [], problemas = [], cur = null, ult = null;
    var RXQ = /^\s*(\d{1,3})\s*[.)\-:]\s+(.*)$/, RXO = /^\s*(\*|✓|✔)?\s*\(?([A-Fa-f])[).:\-]\s+(.*?)\s*$/, RXH = /^\s*(Tema|T[ií]tulo|[ÁA]rea|Grado|Docente)\s*:\s*(.+)$/i;
    var RXX = /^\s*(Explicaci[oó]n|Justificaci[oó]n|Retroalimentaci[oó]n)\s*:\s*(.*)$/i, RXR = /^\s*(Respuesta|Correcta|Clave)\s*:\s*\(?([A-Fa-f])\)?\s*$/i, RXM = /^\s*(Competencia|Componente|Nivel)\s*:\s*(.+)$/i;
    function cerrar() { if (!cur) return; var correctaIdx = cur.marca >= 0 ? cur.marca : (cur.resp ? cur.letras.indexOf(cur.resp) : -1);
      if (cur.ops.length < 2) problemas.push('Pregunta ' + cur.n + ': necesita al menos 2 opciones (A, B, C…).');
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
  function nota(n) { return (Math.round(n * 10) / 10).toFixed(1).replace('.', ','); }
  function colorNota(n) { return n >= 4 ? '#2fa84f' : n >= 3 ? '#e0a100' : '#d92d3a'; }
  return { api: api, cfg: cfg, E: E, LS: LS, linkPrueba: linkPrueba, linkResultados: linkResultados, qr: qr, mezclar: mezclar, semilla: semilla, misPruebas: misPruebas, guardarPrueba: guardarPrueba, quitarPrueba: quitarPrueba,
    desdeExam: desdeExam, desdeTexto: desdeTexto, nota: nota, colorNota: colorNota };
})();
if (typeof module !== 'undefined') module.exports = PR;
