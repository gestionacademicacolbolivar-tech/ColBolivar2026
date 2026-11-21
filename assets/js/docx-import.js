/* ColBolívar · Importador de pruebas desde Word (.docx)
   Lee el documento, detecta preguntas, opciones, textos compartidos, tablas e imágenes, y la respuesta correcta
   (por marca ←/✓/*, resaltado, sombreado, subrayado, negrita, color, «Respuesta: B» o la clave al final).
   Devuelve un «borrador» que el docente revisa en el editor gráfico. Requiere JSZip y DOMParser. */
var DocxImport = (function () {
  var RX_Q = /^\s*(?:pregunta\s*)?(\d{1,3})\s*[.)\-–:]\s*(\S.*)$/i;
  var RX_OP1 = /^\s*[\(\[]?([A-Fa-f])[\)\]\.:\-–]\s*/;
  var RX_MARCA = /\s*(←|<[-=]+|✓|✔|☑|\(\s*correcta\s*\)|\(\s*x\s*\))\s*$/i;
  var RX_SECCION = /^\s*(parte|secci[oó]n|bloque)\s+[ivx\d]+\b/i;
  var RX_INSTR = /^\s*(instrucciones?|lee con atenci[oó]n|responde|selecciona|marca|escoge|nota:|recuerda|observaciones?)/i;
  var RX_HOJA = /^\s*(hoja de respuestas|clave(s)?( de respuestas?)?|respuestas?( correctas?)?|soluciones?|plantilla de calificaci[oó]n|solucionario)\b/i;
  var MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp', svg: 'image/svg+xml' };

  function hijos(n, nombre) { var o = []; for (var c = n.firstChild; c; c = c.nextSibling) if (c.nodeType === 1 && (!nombre || c.nodeName === nombre)) o.push(c); return o; }
  function prim(n, nombre) { for (var c = n.firstChild; c; c = c.nextSibling) if (c.nodeType === 1 && c.nodeName === nombre) return c; return null; }
  function desc(n, nombre, out) { out = out || []; for (var c = n.firstChild; c; c = c.nextSibling) { if (c.nodeType !== 1) continue; if (c.nodeName === nombre) out.push(c); desc(c, nombre, out); } return out; }
  function attr(n, a) { return n && n.getAttribute ? n.getAttribute(a) : null; }
  function activo(n) { if (!n) return false; var v = attr(n, 'w:val'); return !(v === '0' || v === 'false' || v === 'off' || v === 'none'); }

  /* ---------- fórmulas de Word (OMML) → texto ---------- */
  var SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', 'n': 'ⁿ' };
  function omml(n) {
    var s = '', c, t;
    for (c = n.firstChild; c; c = c.nextSibling) {
      if (c.nodeType !== 1) continue;
      switch (c.nodeName) {
        case 'm:t': s += c.textContent; break;
        case 'm:f': var nu = omml(prim(c, 'm:num') || c), de = omml(prim(c, 'm:den') || c); s += (/^\w+$/.test(nu) ? nu : '(' + nu + ')') + '/' + (/^\w+$/.test(de) ? de : '(' + de + ')'); break;
        case 'm:sSup': t = omml(prim(c, 'm:sup') || c); s += omml(prim(c, 'm:e') || c) + (/^[0-9n]$/.test(t) ? SUP[t] : '^' + (t.length > 1 ? '(' + t + ')' : t)); break;
        case 'm:sSub': t = omml(prim(c, 'm:sub') || c); s += omml(prim(c, 'm:e') || c) + '_' + (t.length > 1 ? '(' + t + ')' : t); break;
        case 'm:rad': var gr = prim(c, 'm:deg'), g = gr ? omml(gr) : ''; s += (g && g !== '2' ? (g === '3' ? '∛' : '√[' + g + ']') : '√') + '(' + omml(prim(c, 'm:e') || c) + ')'; break;
        case 'm:d': s += '(' + hijos(c, 'm:e').map(omml).join(', ') + ')'; break;
        case 'm:nary': var ch = prim(prim(c, 'm:naryPr') || c, 'm:chr'); s += (ch ? attr(ch, 'm:val') : '∫') + omml(prim(c, 'm:e') || c); break;
        case 'm:r': case 'm:e': case 'm:num': case 'm:den': case 'm:oMath': case 'm:oMathPara': case 'm:func': case 'm:fName': case 'm:limLow': case 'm:limUpp': case 'm:bar': case 'm:acc': case 'm:box': case 'm:phant': s += omml(c); break;
        default: if (!/Pr$/.test(c.nodeName)) s += omml(c);
      }
    }
    return s;
  }

  /* ---------- numeración automática de Word (a), b), 1., …) ---------- */
  function leerNumeracion(doc) {
    var abs = {}, nums = {};
    if (!doc) return { abs: abs, nums: nums };
    desc(doc, 'w:abstractNum').forEach(function (a) {
      var id = attr(a, 'w:abstractNumId'); abs[id] = {};
      hijos(a, 'w:lvl').forEach(function (l) { abs[id][attr(l, 'w:ilvl')] = { fmt: attr(prim(l, 'w:numFmt'), 'w:val') || 'decimal', txt: attr(prim(l, 'w:lvlText'), 'w:val') || '', ini: Number(attr(prim(l, 'w:start'), 'w:val') || 1) }; });
    });
    desc(doc, 'w:num').forEach(function (n) { nums[attr(n, 'w:numId')] = attr(prim(n, 'w:abstractNumId'), 'w:val'); });
    return { abs: abs, nums: nums };
  }
  function formatoNum(v, fmt) {
    if (fmt === 'lowerLetter') return String.fromCharCode(96 + ((v - 1) % 26) + 1);
    if (fmt === 'upperLetter') return String.fromCharCode(64 + ((v - 1) % 26) + 1);
    if (fmt === 'lowerRoman' || fmt === 'upperRoman') { var r = ['', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'][v] || String(v); return fmt === 'upperRoman' ? r.toUpperCase() : r; }
    return String(v);
  }

  /* ---------- lectura de párrafos ---------- */
  function fmtRun(rPr, pFmt) {
    var f = { b: false, u: false, i: false, hl: false, shd: false, color: '', strike: false };
    if (rPr) {
      f.b = activo(prim(rPr, 'w:b')); f.u = activo(prim(rPr, 'w:u')); f.i = activo(prim(rPr, 'w:i')); f.strike = activo(prim(rPr, 'w:strike'));
      f.hl = activo(prim(rPr, 'w:highlight'));
      var sh = prim(rPr, 'w:shd'); if (sh) { var fi = (attr(sh, 'w:fill') || '').toUpperCase(); f.shd = !!fi && fi !== 'AUTO' && fi !== 'FFFFFF' && attr(sh, 'w:val') !== 'nil'; }
      var co = prim(rPr, 'w:color'); if (co) { var v = (attr(co, 'w:val') || '').toUpperCase(); f.color = (v === 'AUTO' || v === '000000' || v === '') ? '' : v; }
    }
    return f;
  }
  function Lector(ctx) {
    this.ctx = ctx;
  }
  Lector.prototype.imagen = function (rid) {
    var t = this.ctx.rels[rid]; if (!t) return null;
    var ext = (t.split('.').pop() || '').toLowerCase();
    var ruta = t.replace(/^\.\//, '').replace(/^\//, ''); ruta = ruta.indexOf('word/') === 0 ? ruta : 'word/' + ruta;
    if (!MIME[ext]) { this.ctx.avisos.push('Una imagen está en un formato que el navegador no puede mostrar (.' + ext + '). Cámbiala por PNG o JPG en Word o súbela de nuevo en el editor.'); return null; }
    return { ruta: ruta, mime: MIME[ext] };
  };
  Lector.prototype.parrafo = function (p, enTabla) {
    var self = this, runs = [], imgs = [], ppr = prim(p, 'w:pPr'), pshd = false;
    var estilo = ppr && prim(ppr, 'w:pStyle') ? attr(prim(ppr, 'w:pStyle'), 'w:val') : '';
    if (ppr) { var s0 = prim(ppr, 'w:shd'); if (s0) { var f0 = (attr(s0, 'w:fill') || '').toUpperCase(); pshd = !!f0 && f0 !== 'AUTO' && f0 !== 'FFFFFF'; } }
    function add(t, f) { if (!t) return; var u = runs[runs.length - 1]; if (u && JSON.stringify(u.f) === JSON.stringify(f)) u.t += t; else runs.push({ t: t, f: f }); }
    function rec(n, fmtHeredado) {
      for (var c = n.firstChild; c; c = c.nextSibling) {
        if (c.nodeType !== 1) continue;
        var nm = c.nodeName;
        if (nm === 'w:r') {
          var f = fmtRun(prim(c, 'w:rPr')), k;
          for (k = c.firstChild; k; k = k.nextSibling) {
            if (k.nodeType !== 1) continue;
            if (k.nodeName === 'w:t') add(k.textContent, f);
            else if (k.nodeName === 'w:tab') add('\t', f);
            else if (k.nodeName === 'w:br' || k.nodeName === 'w:cr') add('\n', f);
            else if (k.nodeName === 'w:noBreakHyphen') add('-', f);
            else if (k.nodeName === 'w:drawing' || k.nodeName === 'w:pict' || k.nodeName === 'w:object') {
              if (desc(k, 'w:txbxContent').length) self.ctx.avisos.push('El documento tiene cuadros de texto o formas que no se pudieron leer; revisa las preguntas.');
              var bl = desc(k, 'a:blip')[0], rid = bl ? attr(bl, 'r:embed') : null;
              if (!rid) { var vd = desc(k, 'v:imagedata')[0]; rid = vd ? attr(vd, 'r:id') : null; }
              var im = rid ? self.imagen(rid) : null; if (im) imgs.push(im);
            }
            else if (k.nodeName === 'mc:AlternateContent') { var ch = prim(k, 'mc:Choice'); if (ch) rec(ch, f); }
          }
        } else if (nm === 'w:hyperlink' || nm === 'w:smartTag' || nm === 'w:sdt' || nm === 'w:sdtContent' || nm === 'w:ins' || nm === 'w:fldSimple') rec(c);
        else if (nm === 'm:oMath' || nm === 'm:oMathPara') add(omml(c), { b: false, u: false, i: false, hl: false, shd: false, color: '', strike: false, math: true });
        else if (nm === 'mc:AlternateContent') { var cc = prim(c, 'mc:Choice'); if (cc) rec(cc); }
      }
    }
    rec(p);
    var texto = runs.map(function (r) { return r.t; }).join('');
    // etiqueta de la numeración automática
    var label = '', np = ppr ? prim(ppr, 'w:numPr') : null;
    if (np) {
      var nid = attr(prim(np, 'w:numId'), 'w:val'), lvl = attr(prim(np, 'w:ilvl'), 'w:val') || '0', N = this.ctx.num;
      if (nid && nid !== '0' && N.nums[nid] !== undefined && N.abs[N.nums[nid]] && N.abs[N.nums[nid]][lvl]) {
        var cont = this.ctx.cont[nid] = this.ctx.cont[nid] || {}, def = N.abs[N.nums[nid]][lvl];
        cont[lvl] = (cont[lvl] === undefined ? def.ini : cont[lvl] + 1);
        Object.keys(cont).forEach(function (l) { if (Number(l) > Number(lvl)) delete cont[l]; });
        if (def.fmt !== 'bullet') label = def.txt.replace(/%(\d)/g, function (_, d) { var l2 = String(Number(d) - 1), df = N.abs[N.nums[nid]][l2] || def; return formatoNum(cont[l2] === undefined ? df.ini : cont[l2], df.fmt); });
      }
    }
    return { runs: runs, texto: texto, imgs: imgs, estilo: estilo, label: label, pshd: pshd, enTabla: !!enTabla };
  };

  /* ---------- cuerpo del documento → bloques ---------- */
  function bloques(body, L) {
    var out = [];
    hijos(body).forEach(function (n) {
      if (n.nodeName === 'w:p') out.push({ tipo: 'p', p: L.parrafo(n, false) });
      else if (n.nodeName === 'w:tbl') {
        var filas = [], paras = [];
        hijos(n, 'w:tr').forEach(function (tr) {
          var fila = [];
          hijos(tr, 'w:tc').forEach(function (tc) { var ps = hijos(tc, 'w:p').map(function (p) { return L.parrafo(p, true); }); paras = paras.concat(ps); fila.push(ps.map(function (x) { return x.texto; }).join(' ').replace(/\s+/g, ' ').trim()); });
          filas.push(fila);
        });
        out.push({ tipo: 't', filas: filas, paras: paras });
      } else if (n.nodeName === 'w:sdt') { var c = prim(n, 'w:sdtContent'); if (c) out = out.concat(bloques(c, L)); }
    });
    return out;
  }

  /* ---------- opciones: una o varias por línea ---------- */
  function partirOpciones(par, siguiente) {
    // Busca marcadores A) B) C)… en la línea, en orden alfabético, y devuelve [{letra, ini, fin}] con posiciones sobre par.texto
    var t = par.texto, res = [], esp = siguiente, rx = /(^|[\s\t])[\(\[]?([A-Fa-f])[\)\]\.:\-–]/g, m;
    while ((m = rx.exec(t))) {
      var letra = m[2].toUpperCase(); if (letra !== esp) continue;
      var ini = m.index + m[1].length;
      if (res.length === 0 && t.slice(0, ini).replace(/\s/g, '') !== '') { if (!par.label) continue; }
      res.push({ letra: letra, ini: ini, marca: m[0].length - m[1].length }); esp = String.fromCharCode(esp.charCodeAt(0) + 1);
    }
    res.forEach(function (o, i) { o.fin = i + 1 < res.length ? res[i + 1].ini : t.length; });
    return res;
  }
  function fmtRango(par, a, b) {
    var pos = 0, tot = { n: 0, b: 0, u: 0, hl: 0, shd: 0, color: {}, i: 0 };
    par.runs.forEach(function (r) {
      var ini = pos, fin = pos + r.t.length; pos = fin;
      var s = Math.max(ini, a), e = Math.min(fin, b); if (e <= s) return;
      var txt = r.t.slice(s - ini, e - ini).replace(/[\s\t←✓✔\u00a0]/g, ''); if (!txt) return;
      tot.n += txt.length; if (r.f.b) tot.b += txt.length; if (r.f.u) tot.u += txt.length; if (r.f.hl) tot.hl += txt.length; if (r.f.shd) tot.shd += txt.length; if (r.f.color) tot.color[r.f.color] = 1;
    });
    var n = tot.n || 1;
    return { b: tot.b / n > .8, u: tot.u / n > .5, hl: tot.hl > 0, shd: tot.shd > 0 || (par.pshd && false), color: Object.keys(tot.color)[0] || '' };
  }
  function limpiarOpcion(txt) {
    var marcada = false, t = txt.replace(/\s+/g, ' ').trim();
    if (/^\*\s*/.test(t)) { marcada = true; t = t.replace(/^\*\s*/, ''); }
    var m = t.match(RX_MARCA); if (m) { marcada = true; t = t.replace(RX_MARCA, ''); }
    if (/\s\*$/.test(t) || /^\S.*\*$/.test(t) && !/\*\*/.test(t) && t.length > 1) { if (/\*$/.test(t)) { marcada = true; t = t.replace(/\s*\*$/, ''); } }
    return { t: t.trim(), marcada: marcada };
  }

  /* ---------- clave de respuestas ---------- */
  function parseClave(txt, min) {
    var m = {}, rx = /(?:^|[^\d])(\d{1,3})\s*[-–.:)=\s]\s*([A-Fa-f])(?![A-Za-zÁ-úñ])/g, r, n = 0;
    while ((r = rx.exec(txt))) { if (m[r[1]] === undefined) { m[r[1]] = r[2].toUpperCase().charCodeAt(0) - 65; n++; } }
    return n >= (min || 3) ? m : null;
  }

  /* ---------- análisis: bloques → borrador ---------- */
  function analizar(bl, info) {
    var avisos = info.avisos, estimulos = [], preguntas = [], meta = { titulo: '', area: '', grado: '' };
    var cur = null, pend = { lineas: [], imgs: [], vis: [] }, ultNum = 0, enClave = false, claveTxt = '', claveTabla = null, vacioDesdeUlt = 0, abiertaSeccion = false, estActual = null, estRestantes = 0, estRango = null, seccionTxt = '';
    function nuevoEst(texto, titulo, imgs) {
      var e = { id: 't' + (estimulos.length + 1), titulo: titulo || '', texto: texto, img: imgs && imgs[0] || '' }; estimulos.push(e); return e;
    }
    function cerrarPregunta() {
      if (!cur) return;
      var q = cur; cur = null;
      q.pregunta = q.stem.join('\n').trim();
      if (q.imgs.length > 1) { avisos.push('Pregunta ' + q.n + ': tiene ' + q.imgs.length + ' imágenes; solo se usó la primera (puedes agregar la otra en el editor).'); }
      q.img = q.imgs[0] || '';
      if (!q.opciones.length) {
        var larga = q.pregunta.length >= 25;
        if (!larga && !/\?/.test(q.pregunta)) return;   // ruido (título suelto)
        q.tipo = 'abierta';
        var pm = q.pregunta.match(/\(\s*(?:valor[:\s]*)?(\d+(?:[.,]\d+)?)\s*(?:puntos?|pts?\.?)?\s*\)/i); q.puntos = pm ? Number(pm[1].replace(',', '.')) : 1;
        q.pregunta = q.pregunta.replace(/\n?_{3,}.*$/s, '').trim();
      } else if (q.opciones.length < 2) { q.aviso.push('Solo se encontró una opción: revísala.'); q.tipo = 'multiple'; }
      else q.tipo = 'multiple';
      preguntas.push(q);
    }
    function nuevaPregunta(n, texto, par) {
      cerrarPregunta();
      var q = { n: n, tipo: 'multiple', stem: [], imgs: [], vis: null, opciones: [], opImg: [], fm: [], marcas: [], correcta: -1, aviso: [], estimulo: '', respLinea: -1, ultimoEraImg: false };
      // texto compartido pendiente
      var txt = pend.lineas.join('\n').trim();
      if (txt || pend.imgs.length) {
        var instr = RX_INSTR.test(txt) && txt.length < 320 && !pend.imgs.length, sec = RX_SECCION.test(txt) && txt.length < 140;
        if (!instr && !sec && (txt.length >= 150 || pend.imgs.length || /^(lee|observa|texto|fragmento|lectura|gr[aá]fica|tabla)/i.test(txt))) {
          var ls = txt.split('\n'), tit = ls.length > 1 && ls[0].length < 90 && !/[.:;]$/.test(ls[0]) ? ls.shift() : '';
          var rg = txt.match(/preguntas?\s+(\d{1,3})\s*(?:a|al|y|-|–)\s*(\d{1,3})/i);
          estActual = nuevoEst(ls.join('\n').trim(), tit, pend.imgs); estRango = rg ? [Number(rg[1]), Number(rg[2])] : null; estRestantes = rg ? 99 : 5;
        }
      }
      if (estActual && (estRango ? (n >= estRango[0] && n <= estRango[1]) : estRestantes > 0)) { q.estimulo = estActual.id; if (!estRango) estRestantes--; }
      if (pend.vis.length) q.vis = pend.vis[0];
      pend = { lineas: [], imgs: [], vis: [] };
      cur = q; q.stem.push(texto); if (par && par.imgs.length) q.imgs = q.imgs.concat(par.imgs); ultNum = n; return q;
    }
    function agregarOpciones(par, ops) {
      ops.forEach(function (o) {
        var txt = par.texto.slice(o.ini + o.marca, o.fin), lm = limpiarOpcion(txt.replace(/\t+/g, ' '));
        cur.opciones.push(lm.t); cur.marcas.push(lm.marcada); cur.fm.push(fmtRango(par, o.ini, o.fin)); cur.opImg.push('');
      });
      if (par.imgs.length && ops.length === 1) cur.opImg[cur.opImg.length - 1] = par.imgs[0];
    }
    function proc(par) {
      var t = par.texto.replace(/\u00a0/g, ' '), tl = ((par.label ? par.label + ' ' : '') + t).replace(/^\s+/, '');
      var vacio = !t.trim() && !par.imgs.length;
      if (vacio) { vacioDesdeUlt++; return; }
      var tt = tl.trim();
      // «Respuesta: B» dentro de una pregunta con opciones
      var rl0 = tt.match(/^\s*(respuesta|resp\.?|correcta|clave)\s*[:\-]\s*\(?([A-Fa-f])\)?\s*$/i);
      if (cur && cur.opciones.length && rl0) { cur.respLinea = rl0[2].toUpperCase().charCodeAt(0) - 65; vacioDesdeUlt = 0; return; }
      // sección de claves al final
      if (RX_HOJA.test(tt) && tt.length < 260 && preguntas.length + (cur ? 1 : 0) >= 2) {
        var resto = tt.replace(RX_HOJA, ''); var pc = parseClave(resto, 1);
        if (pc || tt.length < 60) { enClave = true; cerrarPregunta(); claveTxt += ' ' + resto; return; }
      }
      if (enClave) { claveTxt += '\n' + tt; return; }
      if (/^_{3,}\s*$|^\.{5,}\s*$/.test(tt)) return;                            // líneas para escribir
      if (RX_SECCION.test(tt) && tt.length < 160) { cerrarPregunta(); abiertaSeccion = /abiert|argument|desarroll|ensayo|explica/i.test(tt); seccionTxt = tt; ultNum = -1; estActual = null; pend = { lineas: [], imgs: [], vis: [] }; vacioDesdeUlt = 0; return; }
      // ¿opciones?
      var sig = cur ? String.fromCharCode(65 + cur.opciones.length) : 'A';
      if (cur) {
        var ops = partirOpciones(Object.assign({}, par, { texto: tl }), sig);
        if (ops.length) {
          // el texto etiquetado (tl) difiere en el prefijo de la etiqueta automática: recalcular rangos sobre el texto original
          var off = tl.length - t.length - (t.length - t.replace(/^\s+/, '').length) + 0;
          var parE = { texto: tl, runs: par.runs, pshd: par.pshd, label: par.label, imgs: par.imgs };
          // reconstruye runs con la etiqueta delante para que los rangos coincidan
          if (par.label) parE.runs = [{ t: par.label + ' ', f: { b: false, u: false, i: false, hl: false, shd: false, color: '', strike: false } }].concat(par.runs);
          else if (t.length !== tl.length) parE.runs = [{ t: tl.slice(0, tl.length - t.replace(/^\s+/, '').length), f: { b: false, u: false, i: false, hl: false, shd: false, color: '', strike: false } }].concat(par.runs.map(function (r, i) { return i === 0 ? { t: r.t.replace(/^\s+/, ''), f: r.f } : r; }));
          if (parE.runs.map(function (r) { return r.t; }).join('') !== tl) parE.runs = par.runs;
          var texto0 = tl.slice(0, ops[0].ini).trim(); if (texto0 && !cur.opciones.length) cur.stem.push(texto0);
          agregarOpciones(parE, ops); vacioDesdeUlt = 0; return;
        }
      }
      // ¿pregunta nueva?
      var mq = tt.match(RX_Q);
      if (mq && (ultNum < 0 || Number(mq[1]) === ultNum + 1 || (ultNum === 0 && Number(mq[1]) <= 2) || Number(mq[1]) === 1)) {
        // evita confundir «1. Opción» dentro de una pregunta con opciones numeradas: si hay una pregunta abierta con opciones numeradas no se cubre aquí
        nuevaPregunta(Number(mq[1]), mq[2], par); vacioDesdeUlt = 0;
        // opciones en la misma línea de la pregunta (poco común)
        return;
      }
      // texto libre
      if (cur) {
        if (!cur.opciones.length) {           // aún enunciado
          if (t.trim()) {
            if (cur.ultimoEraImg && t.trim().length < 90 && !/\?\s*$/.test(t.trim())) cur.leyenda = t.trim(); else cur.stem.push(t.trim());
          }
          cur.ultimoEraImg = par.imgs.length > 0 && !t.trim();
          if (par.imgs.length) cur.imgs = cur.imgs.concat(par.imgs);
        } else {
          var rl = tt.match(/^\s*(respuesta|resp\.?|correcta|clave)\s*[:\-]\s*\(?([A-Fa-f])\)?\s*$/i);
          if (rl) { cur.respLinea = rl[2].toUpperCase().charCodeAt(0) - 65; vacioDesdeUlt = 0; return; }
          if (vacioDesdeUlt === 0 && t.trim().length <= 160 && !par.imgs.length) { cur.opciones[cur.opciones.length - 1] += ' ' + limpiarOpcion(t).t; }   // continuación de la última opción
          else if (par.imgs.length && !t.trim()) { cur.opImg[cur.opImg.length - 1] = par.imgs[0]; }
          else { pend.lineas.push(t.trim()); cerrarPregunta(); }
        }
      } else {
        if (!meta.titulo && !preguntas.length && /(evaluaci|prueba|examen|taller|quiz|simulacro|bimestral|parcial)/i.test(t) && t.trim().length < 140) { meta.titulo = t.trim().replace(/\s*[—–-]\s*claves?.*$/i, ''); return; }
        var encab = /^\s*(nombre|fecha|curso|grado|docente|profesor[a]?|estudiante|asignatura|periodo|per[ií]odo|puntaje|nota)\b[^\n]{0,80}(:|_{3,})/i.test(t) || /_{4,}/.test(t) && t.trim().length < 90;
        if (t.trim() && !encab) pend.lineas.push(t.trim());
        if (par.imgs.length) pend.imgs = pend.imgs.concat(par.imgs);
      }
      vacioDesdeUlt = 0;
    }
    function procTabla(b) {
      if (enClave) { var pc2 = parseClave(b.filas.map(function (f) { return f.join(' '); }).join(' '), 1); if (pc2) claveTabla = Object.assign(claveTabla || {}, pc2); return; }
      var plano = b.filas.map(function (f) { return f.join(' '); }).join(' ');
      if (/(asignatura|estudiante|docente|nombre|grado|fecha)\s*:/i.test(plano) && b.filas.length <= 6 && !cur) {
        var a = plano.match(/asignatura\s*:\s*([^\s_][^_]*?)(?=\s+(docente|per[ií]odo|valoraci|estudiante|grado|fecha|tiempo|curso|puntaje)\b|$)/i); if (a && !meta.area) meta.area = a[1].trim();
        var g = plano.match(/grado\s*:\s*(\S+)/i); if (g && !meta.grado) meta.grado = g[1].replace(/[_,.]+$/, '');
        return;
      }
      var cuentaOp = b.paras.filter(function (p) { return RX_OP1.test(p.texto.trim()) && p.texto.trim().length > 2; }).length;
      if (cur && cuentaOp >= 2) { b.paras.forEach(proc); return; }                               // opciones en celdas
      var celdas = [].concat.apply([], b.filas).filter(function (c) { return c.trim(); });
      if (celdas.length >= 4 && celdas.filter(function (c) { return /^(\d{1,3}|[A-Da-d]\)?)$/.test(c.trim()); }).length / celdas.length >= 0.7 && !parseClave(plano)) return;   // hoja de respuestas en blanco
      var pc = parseClave(plano); if (pc && Object.keys(pc).length >= 5 && b.filas.length <= 40 && preguntas.length + (cur ? 1 : 0) >= 2) { cerrarPregunta(); claveTabla = Object.assign(claveTabla || {}, pc); return; }
      var allImgs = b.paras.reduce(function (a, p) { return a.concat(p.imgs); }, []);
      if (b.filas.length >= 2 && b.filas[0].length >= 2 && b.filas.every(function (f) { return f.length === b.filas[0].length; })) {
        var vis = { t: 'tabla', titulo: '', headers: b.filas[0], rows: b.filas.slice(1) };
        if (cur && !cur.opciones.length) cur.vis = vis; else pend.vis.push(vis);
        return;
      }
      b.paras.forEach(proc);
    }
    bl.forEach(function (b) { if (b.tipo === 'p') proc(b.p); else procTabla(b); });
    cerrarPregunta();
    // ----- respuestas correctas -----
    var claveGlobal = parseClave(claveTxt, 1) || claveTabla;
    var fuentesCont = {};
    preguntas.forEach(function (q) {
      if (q.tipo !== 'multiple') return;
      var n = q.opciones.length, idx = -1, como = '';
      function unico(fn) { var c = []; for (var i = 0; i < n; i++) if (fn(i)) c.push(i); return c.length === 1 ? c[0] : -1; }
      var vv;
      if ((vv = unico(function (i) { return q.marcas[i]; })) >= 0) { idx = vv; como = 'marcada con ← / ✓ / *'; }
      else if ((vv = unico(function (i) { return q.fm[i].hl; })) >= 0) { idx = vv; como = 'resaltada en el documento'; }
      else if ((vv = unico(function (i) { return q.fm[i].shd; })) >= 0) { idx = vv; como = 'sombreada en el documento'; }
      else if ((vv = unico(function (i) { return q.fm[i].u; })) >= 0) { idx = vv; como = 'subrayada'; }
      else if ((vv = unico(function (i) { return q.fm[i].b; })) >= 0) { idx = vv; como = 'en negrita'; }
      else if ((vv = unico(function (i) { return q.fm[i].color; })) >= 0) { idx = vv; como = 'de otro color'; }
      if (idx < 0 && q.respLinea >= 0 && q.respLinea < n) { idx = q.respLinea; como = 'indicada en «Respuesta»'; }
      if (idx < 0 && claveGlobal && claveGlobal[String(q.n)] !== undefined && claveGlobal[String(q.n)] < n) { idx = claveGlobal[String(q.n)]; como = 'tomada de la clave del documento'; }
      q.correcta = idx; q.auto = idx >= 0 ? como : '';
      if (idx >= 0) fuentesCont[como] = (fuentesCont[como] || 0) + 1;
      if (idx < 0) q.aviso.push('No se encontró cuál es la respuesta correcta: márcala tú.');
    });
    if (!meta.titulo && info.nombre) meta.titulo = info.nombre.replace(/\.docx$/i, '').replace(/[_-]+/g, ' ');
    var s = 0; estimulos.forEach(function (e) { if (!e.texto && !e.img) s++; });
    return { meta: meta, estimulos: estimulos, preguntas: preguntas, fuentes: fuentesCont, claveGlobal: !!claveGlobal };
  }

  /* ---------- API ---------- */
  function leer(buffer, opts) {
    opts = opts || {}; var info = { avisos: [], nombre: opts.nombre || '' };
    return JSZip.loadAsync(buffer).then(function (zip) {
      var f = zip.file('word/document.xml'); if (!f) throw new Error('Ese archivo no parece un documento de Word (.docx).');
      var pend = [f.async('string'), zip.file('word/_rels/document.xml.rels') ? zip.file('word/_rels/document.xml.rels').async('string') : Promise.resolve(''), zip.file('word/numbering.xml') ? zip.file('word/numbering.xml').async('string') : Promise.resolve('')];
      return Promise.all(pend).then(function (x) {
        var P = new DOMParser(), doc = P.parseFromString(x[0], 'application/xml'), rels = {};
        if (x[1]) desc(P.parseFromString(x[1], 'application/xml'), 'Relationship').forEach(function (r) { rels[attr(r, 'Id')] = attr(r, 'Target'); });
        var ctx = { rels: rels, num: leerNumeracion(x[2] ? P.parseFromString(x[2], 'application/xml') : null), cont: {}, avisos: info.avisos };
        var L = new Lector(ctx), body = desc(doc, 'w:body')[0];
        var bl = bloques(body, L), res = analizar(bl, info);
        // imágenes: cargar los datos de cada archivo usado
        var usadas = {}; function reg(im) { if (im && !usadas[im.ruta]) usadas[im.ruta] = im; }
        bl.forEach(function (b) { (b.tipo === 'p' ? [b.p] : b.paras).forEach(function (p) { p.imgs.forEach(reg); }); });
        var rutas = Object.keys(usadas);
        return Promise.all(rutas.map(function (r) { return zip.file(r) ? zip.file(r).async('base64') : Promise.resolve(''); })).then(function (b64s) {
          var mapa = {}; rutas.forEach(function (r, i) { if (b64s[i]) mapa[r] = 'data:' + usadas[r].mime + ';base64,' + b64s[i]; });
          var proc = opts.procesarImagen || function (u) { return Promise.resolve(u); }, cache = {};
          function dato(im) { if (!im) return Promise.resolve(''); if (!cache[im.ruta]) cache[im.ruta] = mapa[im.ruta] ? proc(mapa[im.ruta]).catch(function () { return mapa[im.ruta]; }) : Promise.resolve(''); return cache[im.ruta]; }
          var trabajos = [];
          res.estimulos.forEach(function (e) { if (e.img) trabajos.push(dato(e.img).then(function (u) { e.img = u; })); });
          res.preguntas.forEach(function (q) {
            if (q.img) trabajos.push(dato(q.img).then(function (u) { q.img = u; }));
            q.opImg = q.opImg.map(function (im, i) { if (im) trabajos.push(dato(im).then(function (u) { q.opImg[i] = u; })); return im; });
          });
          return Promise.all(trabajos).then(function () {
            res.preguntas.forEach(function (q) { q.opImg = q.opImg.map(function (x) { return typeof x === 'string' ? x : ''; }); });
            return { borrador: aBorrador(res), avisos: info.avisos.filter(function (a, i, arr) { return arr.indexOf(a) === i; }), fuentes: res.fuentes, claveGlobal: res.claveGlobal };
          });
        });
      });
    });
  }
  function aBorrador(r) {
    return {
      meta: r.meta,
      estimulos: r.estimulos.map(function (e) { return { id: e.id, titulo: e.titulo, texto: e.texto, img: e.img || '', fuente: '' }; }),
      preguntas: r.preguntas.map(function (q, i) {
        var base = { id: 'p' + (i + 1), tipo: q.tipo, enunciado: '', pregunta: q.pregunta, img: q.img || '', leyenda: q.leyenda || '', vis: q.vis || null, estimulo: q.estimulo || '', piensa: null, limite: null, aviso: q.aviso || [] };
        if (q.tipo === 'abierta') return Object.assign(base, { puntos: q.puntos || 1, modelo: '', criterios: [] });
        return Object.assign(base, { opciones: q.opciones, opImg: q.opImg, correcta: q.correcta, auto: q.auto || '', just: '', err: q.opciones.map(function () { return ''; }), fijo: q.opciones.some(function (o) { return /(todas|ninguna|ambas)\s+(las\s+)?(anteriores|opciones)/i.test(o); }), competencia: '', componente: '', nivel: '' });
      })
    };
  }
  return { leer: leer, _omml: omml, _parseClave: parseClave };
})();
if (typeof module !== 'undefined') module.exports = DocxImport;
