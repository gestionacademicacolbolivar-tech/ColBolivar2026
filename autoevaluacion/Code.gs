/**
 * ColBolívar · Autoevaluación institucional 2026 (Guía 34 MEN) — recolección ANÓNIMA + menú de administración
 * Versión 1.2 — cada gestión se puede enviar por separado; una misma persona (código aleatorio del dispositivo) cuenta una sola vez.
 *
 * CÓMO USARLO (resumen): pega este código en  Extensiones → Apps Script,  guarda, recarga la hoja y usa el menú
 * «🎓 Autoevaluación 2026» que aparece arriba. Guía completa: autoevaluacion/LEEME-INSTALACION.md
 *
 * No se guarda nombre, correo ni IP. Solo: fecha, un código aleatorio del envío (evita duplicados por reintento),
 * el rol (opcional), las valoraciones 1-4 y los comentarios por proceso.
 */
var VERSION = '1.2';
var HOJA = 'Respuestas', HOJA_RES = 'Resumen', HOJA_AYUDA = 'Instrucciones';
var SITIO = 'https://gestionacademicacolbolivar-tech.github.io/ColBolivar2026/';   // si cambias de dominio, cámbialo aquí
var ENCABEZADO = ['fecha', 'codigo_envio', 'rol', 'valoraciones_json', 'comentarios_json', 'componentes_valorados', 'participante'];
var COLORES = ['#d92d3a', '#f2a33a', '#6bb34a', '#1c7a3e'];
var NIVELES = ['Existencia', 'Pertinencia', 'Apropiación', 'Mejoramiento continuo'];

/* ============================ utilidades ============================ */
function resp_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function props_() { return PropertiesService.getScriptProperties(); }
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function ui_() { return SpreadsheetApp.getUi(); }
function abierta_() { return props_().getProperty('CERRADA') !== '1'; }
function claveEnviar_() { return props_().getProperty('CLAVE_ENVIAR') || ''; }
function claveVer_() { return props_().getProperty('CLAVE_VER') || ''; }
function nivelDe_(m) { return m == null ? 0 : m < 1.5 ? 1 : m < 2.5 ? 2 : m < 3.5 ? 3 : 4; }
function fmt_(d) { return Utilities.formatDate(d, ss_().getSpreadsheetTimeZone(), 'dd/MM/yyyy HH:mm'); }

function hoja_() {
  var ss = ss_(), h = ss.getSheetByName(HOJA);
  if (!h) { h = ss.insertSheet(HOJA); }
  if (h.getLastRow() === 0) { h.appendRow(ENCABEZADO); }
  h.setFrozenRows(1);
  h.getRange(1, 1, 1, ENCABEZADO.length).setFontWeight('bold').setBackground('#12306e').setFontColor('#ffffff');
  return h;
}
function datos_() {   // filas de datos (sin encabezado)
  var h = hoja_(), n = h.getLastRow() - 1;
  return n > 0 ? h.getRange(2, 1, n, ENCABEZADO.length).getValues() : [];
}
function reescribir_(filas) {   // deja solo estas filas (seguro, no borra filas de la hoja)
  var h = hoja_(), n = h.getLastRow() - 1;
  if (n > 0) h.getRange(2, 1, n, ENCABEZADO.length).clearContent();
  if (filas.length) h.getRange(2, 1, filas.length, ENCABEZADO.length).setValues(filas);
}
function respaldo_() {
  var ss = ss_(), nombre = 'Respaldo ' + Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd HH.mm.ss');
  var c = hoja_().copyTo(ss); c.setName(nombre); return nombre;
}

/* ============================ guardar una respuesta ============================ */
function guardar_(d) {
  if (!abierta_()) return { ok: false, error: 'cerrada', mensaje: 'La recepción de autoevaluaciones está cerrada.' };
  var ce = claveEnviar_();
  if (ce && d.clave !== ce) return { ok: false, error: 'clave', mensaje: 'La clave de participación no es correcta.' };
  var r = {}, n = 0;
  for (var k in (d.r || {})) { if (/^G[DAFC]P\d+C\d+$/.test(k)) { var x = Number(d.r[k]); if (x >= 0 && x <= 4) { r[k] = x; if (x > 0) n++; } } }
  if (!n) return { ok: false, error: 'vacio', mensaje: 'No hay valoraciones para guardar.' };
  var c = {};
  for (var p in (d.c || {})) { if (/^G[DAFC]P\d+$/.test(p)) c[p] = String(d.c[p]).slice(0, 1200); }
  var id = String(d.id || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
  var h = hoja_(), last = h.getLastRow();
  if (id && last > 1) {
    var ids = h.getRange(2, 2, last - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) if (ids[i][0] === id) return { ok: true, duplicado: true };
  }
  var rol = String(d.rol || '').replace(/[^\wáéíóúñÁÉÍÓÚÑ ,.\-]/g, '').slice(0, 60);
  var pa = String(d.p || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
  h.appendRow([new Date(), id, rol, JSON.stringify(r), JSON.stringify(c), n, pa]);
  return { ok: true };
}

/* ============================ aplicación web (lo que usa el sitio) ============================ */
function doGet(e) {
  var a = (e && e.parameter && e.parameter.accion) || 'ping';
  if (a === 'ping') return resp_({ ok: true, version: VERSION, abierta: abierta_(), pedirClaveEnviar: !!claveEnviar_(), pedirClaveVer: !!claveVer_() });
  if (a === 'resultados') {
    var cv = claveVer_();
    if (cv && e.parameter.clave !== cv) return resp_({ ok: false, error: 'clave', mensaje: 'La clave no es correcta.' });
    var v = datos_(), out = [];
    for (var i = 0; i < v.length; i++) {
      try { out.push({ t: (v[i][0] instanceof Date) ? v[i][0].toISOString() : String(v[i][0]), rol: String(v[i][2] || ''), p: String(v[i][6] || ''), r: JSON.parse(v[i][3]), c: JSON.parse(v[i][4] || '{}') }); } catch (x) {}
    }
    return resp_({ ok: true, n: out.length, respuestas: out });
  }
  return resp_({ ok: false, error: 'accion' });
}
function doPost(e) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.accion !== 'enviar') return resp_({ ok: false, error: 'accion' });
    return resp_(guardar_(d));
  } catch (err) {
    return resp_({ ok: false, error: 'servidor', mensaje: String(err) });
  } finally { lock.releaseLock(); }
}

/* ============================ menú ============================ */
function onOpen() {
  var ui = ui_();
  ui.createMenu('🎓 Autoevaluación 2026')
    .addItem('🛠️ 1. Preparar la hoja (primera vez)', 'preparar')
    .addItem('🔗 2. Ver la dirección para pegar en el sitio', 'verDireccion')
    .addItem('🧪 3. Probar que todo funciona', 'probar')
    .addSeparator()
    .addItem('📊 Actualizar la hoja «Resumen»', 'actualizarResumen')
    .addItem('ℹ️ Estado actual', 'estado')
    .addItem('🚪 Abrir / cerrar la recepción', 'alternarRecepcion')
    .addSeparator()
    .addSubMenu(ui.createMenu('🔑 Claves')
      .addItem('Poner o cambiar la clave para ENVIAR', 'claveEnviar')
      .addItem('Quitar la clave para ENVIAR', 'quitarClaveEnviar')
      .addItem('Poner o cambiar la clave para VER resultados', 'claveVer')
      .addItem('Quitar la clave para VER resultados', 'quitarClaveVer'))
    .addSubMenu(ui.createMenu('🧹 Borrar datos')
      .addItem('Borrar las respuestas de PRUEBA', 'borrarPrueba')
      .addItem('Borrar las filas que tengo seleccionadas', 'borrarSeleccion')
      .addItem('Restablecer: borrar TODAS (con respaldo)', 'restablecer'))
    .addItem('💾 Crear un respaldo ahora', 'respaldo')
    .addItem('📖 Ayuda', 'ayuda')
    .addToUi();
}

/* ---- 1. preparar ---- */
function preparar() {
  var ss = ss_(), h = hoja_();
  var anchos = [150, 280, 190, 380, 380, 130];
  for (var i = 0; i < anchos.length; i++) h.setColumnWidth(i + 1, anchos[i]);
  h.getRange(2, 1, Math.max(h.getMaxRows() - 1, 1), 1).setNumberFormat('dd/MM/yyyy HH:mm');
  var a = ss.getSheetByName(HOJA_AYUDA) || ss.insertSheet(HOJA_AYUDA);
  a.clear(); a.setColumnWidth(1, 760);
  var t = [
    ['🎓 AUTOEVALUACIÓN INSTITUCIONAL 2026 · I.E. Colegio Integrado Simón Bolívar'],
    ['Hoja que recibe, de forma ANÓNIMA, las respuestas del sitio (Guía 34 actualizada, MEN 2026).'],
    [''],
    ['PASOS DE INSTALACIÓN'],
    ['1. Ya hiciste: menú 🎓 Autoevaluación 2026 → 🛠️ Preparar la hoja.'],
    ['2. En Apps Script: Implementar → Nueva implementación → ⚙️ Aplicación web → Ejecutar como «Yo» y Quién tiene acceso «Cualquier persona» → Implementar.'],
    ['3. Copia la URL que termina en /exec y pégala en datos/autoevaluacion-config.json del repositorio (campo "url").'],
    ['4. Menú → 🧪 Probar que todo funciona.'],
    [''],
    ['HOJAS'],
    ['• Respuestas: una fila por persona (sin nombre). No la edites a mano salvo para borrar filas raras.'],
    ['• Resumen: tabla por componente (menú → 📊 Actualizar la hoja «Resumen»).'],
    ['• Respaldo …: copias de seguridad que crea el menú antes de borrar.'],
    [''],
    ['MENÚ ÚTIL'],
    ['• Abrir / cerrar la recepción: cuando termine el plazo, ciérrala para que nadie más envíe.'],
    ['• Claves: opcionales. Si pones clave para ENVIAR, en datos/autoevaluacion-config.json pon "pedirClaveEnviar": true (igual con VER).'],
    ['• Borrar datos: respuestas de PRUEBA, filas seleccionadas, o restablecer todo (con respaldo automático).'],
    [''],
    ['Privacidad: no se guarda nombre, correo ni IP. Pide a los docentes no escribir nombres de personas en los comentarios.']
  ];
  a.getRange(1, 1, t.length, 1).setValues(t).setWrap(true).setVerticalAlignment('top');
  a.getRange('A1').setFontSize(14).setFontWeight('bold').setFontColor('#12306e');
  ['A4', 'A10', 'A15'].forEach(function (r) { a.getRange(r).setFontWeight('bold').setBackground('#eaf1e9'); });
  ss.setActiveSheet(h);
  ui_().alert('✅ Hoja preparada', 'Se crearon las hojas «Respuestas» e «Instrucciones».\n\nSiguiente paso: en esta misma pantalla de Apps Script publica la aplicación web (Implementar → Nueva implementación → Aplicación web, acceso «Cualquier persona») y luego usa el menú «2. Ver la dirección…».', ui_().ButtonSet.OK);
}

/* ---- 2. dirección ---- */
function verDireccion() {
  var u = ''; try { u = ScriptApp.getService().getUrl() || ''; } catch (e) {}
  var ok = /\/exec$/.test(u);
  var msg = ok ? 'Pega esta dirección en datos/autoevaluacion-config.json, en el campo "url":\n\n' + u
    : (u ? 'Google muestra esta dirección, pero NO termina en /exec:\n' + u + '\n\nCopia la correcta desde Implementar → Administrar implementaciones (la URL de la aplicación web).'
         : 'Todavía no hay una aplicación web publicada.\n\nVe a Implementar → Nueva implementación → ⚙️ Aplicación web → Ejecutar como «Yo», acceso «Cualquier persona» → Implementar. Luego vuelve a este menú.');
  ui_().alert('🔗 Dirección de la aplicación web', msg, ui_().ButtonSet.OK);
}

/* ---- 3. probar ---- */
function probar() {
  var lineas = [];
  try {
    var lock = LockService.getScriptLock(); lock.waitLock(20000);
    var cEnv = claveEnviar_(), cerrada = !abierta_();
    props_().deleteProperty('CERRADA'); props_().deleteProperty('CLAVE_ENVIAR');
    var res = guardar_({ id: 'PRUEBA-' + Date.now(), rol: 'PRUEBA', r: { GDP1C1: 3, GAP1C1: 4, GFP1C1: 2, GCP1C1: 1 }, c: {}, p: 'PRUEBA' });
    if (cEnv) props_().setProperty('CLAVE_ENVIAR', cEnv); if (cerrada) props_().setProperty('CERRADA', '1');
    lock.releaseLock();
    lineas.push(res.ok ? '✅ Se pudo guardar una respuesta de prueba (se borrará sola).' : '❌ No se pudo guardar: ' + res.mensaje);
    var h = hoja_(), l = h.getLastRow();
    if (res.ok && l > 1 && h.getRange(l, 3).getValue() === 'PRUEBA') { h.getRange(l, 1, 1, ENCABEZADO.length).clearContent(); lineas.push('✅ La fila de prueba fue eliminada.'); }
  } catch (e) { lineas.push('❌ Error al guardar: ' + e); }
  var u = ''; try { u = ScriptApp.getService().getUrl() || ''; } catch (e) {}
  if (!/\/exec$/.test(u)) { lineas.push('⚠️ Aún no hay aplicación web publicada (o su dirección no termina en /exec).'); }
  else {
    try { var j = JSON.parse(UrlFetchApp.fetch(u + '?accion=ping', { muteHttpExceptions: true }).getContentText()); lineas.push(j.ok ? '✅ La aplicación web responde (versión ' + j.version + ').' : '⚠️ La aplicación web respondió algo inesperado.'); }
    catch (e) { lineas.push('⚠️ Desde aquí no se pudo comprobar la aplicación web. Ábrela en una ventana de incógnito: ' + u + '?accion=ping  (debe mostrar {"ok":true,...}).'); }
  }
  var s = instrumento_(); lineas.push(s ? '✅ El sitio responde y el instrumento de la Guía 34 se pudo leer.' : '⚠️ No se pudo leer el instrumento desde el sitio (' + SITIO + '). El Resumen mostrará códigos en vez de nombres.');
  ui_().alert('🧪 Resultado de la prueba', lineas.join('\n\n'), ui_().ButtonSet.OK);
}

/* ---- resumen ---- */
function instrumento_() {
  try { var r = UrlFetchApp.fetch(SITIO + 'datos/autoevaluacion-guia34.json?v=' + Date.now(), { muteHttpExceptions: true }); if (r.getResponseCode() === 200) return JSON.parse(r.getContentText()); } catch (e) {}
  return null;
}
function actualizarResumen() {
  var filas = datos_(), ins = instrumento_(), comps = [];
  if (ins) { ins.gestiones.forEach(function (g) { g.procesos.forEach(function (p) { p.componentes.forEach(function (c) { comps.push({ id: c.id, g: g.id, gn: g.nombre, pn: p.nombre, cn: c.nombre }); }); }); }); }
  else {
    var vistos = {}; filas.forEach(function (f) { try { for (var k in JSON.parse(f[3])) vistos[k] = 1; } catch (e) {} });
    Object.keys(vistos).sort().forEach(function (k) { comps.push({ id: k, g: k.slice(0, 2), gn: k.slice(0, 2), pn: k.split('C')[0], cn: k }); });
  }
  var agg = {}, roles = {}, nResp = 0, personas = {}, orden = [];
  comps.forEach(function (c) { agg[c.id] = [0, 0, 0, 0, 0]; });
  filas.forEach(function (f, i) {   // une los envíos de la misma persona (cada gestión puede llegar por separado)
    var r; try { r = JSON.parse(f[3]); } catch (e) { return; }
    var key = f[6] ? 'p' + f[6] : 'f' + i;
    if (!personas[key]) { personas[key] = { rol: '', r: {} }; orden.push(key); }
    if (f[2]) personas[key].rol = f[2];
    for (var k in r) personas[key].r[k] = r[k];
  });
  var porGestion = {};
  orden.forEach(function (key) {
    var pe = personas[key], ro = pe.rol || 'Prefirió no decirlo', vio = {};
    nResp++; roles[ro] = (roles[ro] || 0) + 1;
    for (var k in pe.r) { if (agg[k]) { var v = Number(pe.r[k]); if (v >= 0 && v <= 4) { agg[k][v]++; if (v > 0) vio[k.slice(0, 2)] = 1; } } }
    for (var g in vio) porGestion[g] = (porGestion[g] || 0) + 1;
  });
  function sum(ids) { var a = [0, 0, 0, 0, 0]; ids.forEach(function (id) { for (var i = 0; i < 5; i++) a[i] += agg[id][i]; }); var n = a[1] + a[2] + a[3] + a[4], s = a[1] + 2 * a[2] + 3 * a[3] + 4 * a[4]; return { c: a, n: n, m: n ? s / n : null }; }
  var ss = ss_(), h = ss.getSheetByName(HOJA_RES) || ss.insertSheet(HOJA_RES);
  h.clear(); h.clearFormats();
  var todos = sum(comps.map(function (c) { return c.id; }));
  var out = [['RESUMEN DE LA AUTOEVALUACIÓN 2026', '', '', '', '', '', '', '', '', '', ''],
    ['Personas que participaron', nResp, '', 'Valoraciones', todos.n, '', 'Promedio global (1-4)', todos.m == null ? '' : Math.round(todos.m * 100) / 100, '', 'Actualizado', fmt_(new Date())],
    ['Participación por rol: ' + (Object.keys(roles).map(function (k) { return k + ' (' + roles[k] + ')'; }).join(' · ') || 'sin datos'), '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', ''],
    ['POR GESTIÓN', 'Valoraciones', 'Promedio', 'Nivel', 'Personas que la evaluaron', '', '', '', '', '', '']];
  var gestiones = []; comps.forEach(function (c) { if (gestiones.indexOf(c.g) < 0) gestiones.push(c.g); });
  var colorFilas = [];
  gestiones.forEach(function (g) {
    var cs = comps.filter(function (c) { return c.g === g; }), s = sum(cs.map(function (c) { return c.id; })), nv = nivelDe_(s.m);
    out.push([cs[0].gn, s.n, s.m == null ? '' : Math.round(s.m * 100) / 100, nv ? nv + ' · ' + NIVELES[nv - 1] : '', porGestion[g] || 0, '', '', '', '', '', '']);
    colorFilas.push([out.length, 4, nv]);
  });
  out.push(['', '', '', '', '', '', '', '', '', '', '']);
  var iniTabla = out.length + 1;
  out.push(['Gestión', 'Proceso', 'Componente', 'Valoraciones', '1 Existencia', '2 Pertinencia', '3 Apropiación', '4 Mejoramiento', 'Sin información', 'Promedio', 'Nivel']);
  comps.forEach(function (c) {
    var a = agg[c.id], s = sum([c.id]), nv = nivelDe_(s.m);
    out.push([c.gn, c.pn, c.cn, s.n, a[1], a[2], a[3], a[4], a[0], s.m == null ? '' : Math.round(s.m * 100) / 100, nv ? nv + ' · ' + NIVELES[nv - 1] : '']);
    colorFilas.push([out.length, 11, nv]);
  });
  h.getRange(1, 1, out.length, 11).setValues(out);
  h.getRange('A1').setFontSize(14).setFontWeight('bold').setFontColor('#12306e');
  h.getRange('A5:E5').setFontWeight('bold').setBackground('#eaf1e9');
  h.getRange(iniTabla, 1, 1, 11).setFontWeight('bold').setBackground('#12306e').setFontColor('#ffffff').setWrap(true);
  colorFilas.forEach(function (f) { if (f[2]) { var cel = h.getRange(f[0], f[1]); cel.setBackground(COLORES[f[2] - 1]).setFontColor(f[2] === 2 || f[2] === 3 ? '#222222' : '#ffffff').setFontWeight('bold'); } });
  var anchos = [230, 260, 380, 95, 90, 95, 100, 110, 100, 85, 170];
  for (var i = 0; i < anchos.length; i++) h.setColumnWidth(i + 1, anchos[i]);
  h.setFrozenRows(0); ss.setActiveSheet(h);
  ui_().alert('📊 Resumen actualizado', 'Participaron ' + nResp + ' personas con ' + todos.n + ' valoraciones.' + (ins ? '' : '\n\n⚠️ No se pudo leer el instrumento del sitio; se muestran códigos en lugar de nombres.'), ui_().ButtonSet.OK);
}

/* ---- estado ---- */
function estado() {
  var f = datos_(), ult = f.length ? f[f.length - 1][0] : null, ce = claveEnviar_(), cv = claveVer_();
  var u = ''; try { u = ScriptApp.getService().getUrl() || ''; } catch (e) {}
  ui_().alert('ℹ️ Estado actual',
    '• Respuestas recibidas: ' + f.length + '\n• Última respuesta: ' + (ult instanceof Date ? fmt_(ult) : 'ninguna') +
    '\n• Recepción: ' + (abierta_() ? '🟢 ABIERTA' : '🔴 CERRADA') +
    '\n• Clave para enviar: ' + (ce ? 'sí (pon "pedirClaveEnviar": true en el config)' : 'no') +
    '\n• Clave para ver resultados: ' + (cv ? 'sí (pon "pedirClaveVer": true en el config)' : 'no') +
    '\n• Aplicación web: ' + (/\/exec$/.test(u) ? 'publicada' : 'sin publicar') + '\n• Versión del script: ' + VERSION, ui_().ButtonSet.OK);
}

/* ---- abrir / cerrar ---- */
function alternarRecepcion() {
  var ui = ui_();
  if (abierta_()) {
    if (ui.alert('🚪 Cerrar la recepción', 'Nadie más podrá enviar su autoevaluación (el tablero y el informe siguen funcionando).\n\n¿Cerrar ahora?', ui.ButtonSet.YES_NO) === ui.Button.YES) { props_().setProperty('CERRADA', '1'); ui.alert('🔴 Recepción cerrada.'); }
  } else {
    if (ui.alert('🚪 Abrir la recepción', 'La recepción está cerrada. ¿Volver a abrirla?', ui.ButtonSet.YES_NO) === ui.Button.YES) { props_().deleteProperty('CERRADA'); ui.alert('🟢 Recepción abierta.'); }
  }
}

/* ---- claves ---- */
function poner_(prop, titulo, flag) {
  var ui = ui_(), r = ui.prompt(titulo, 'Escribe la clave (mínimo 4 caracteres, sin espacios). Se la darás tú al personal.', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var k = r.getResponseText().trim();
  if (k.length < 4 || /\s/.test(k)) { ui.alert('La clave debe tener al menos 4 caracteres y no llevar espacios.'); return; }
  props_().setProperty(prop, k);
  ui.alert('🔑 Clave guardada', 'Ahora abre datos/autoevaluacion-config.json en el repositorio y pon  "' + flag + '": true  para que el sitio la pida.\n\nLa clave no se escribe en el sitio: cada persona la digita.', ui.ButtonSet.OK);
}
function quitar_(prop, flag) { props_().deleteProperty(prop); ui_().alert('Clave quitada', 'Pon  "' + flag + '": false  en datos/autoevaluacion-config.json.', ui_().ButtonSet.OK); }
function claveEnviar() { poner_('CLAVE_ENVIAR', '🔑 Clave para ENVIAR autoevaluaciones', 'pedirClaveEnviar'); }
function quitarClaveEnviar() { quitar_('CLAVE_ENVIAR', 'pedirClaveEnviar'); }
function claveVer() { poner_('CLAVE_VER', '🔑 Clave para VER resultados', 'pedirClaveVer'); }
function quitarClaveVer() { quitar_('CLAVE_VER', 'pedirClaveVer'); }

/* ---- borrar datos ---- */
function borrarPrueba() {
  var f = datos_(), quedan = f.filter(function (x) { return String(x[2]) !== 'PRUEBA' && String(x[1]).indexOf('PRUEBA') !== 0; });
  var n = f.length - quedan.length;
  if (!n) { ui_().alert('No hay respuestas de PRUEBA para borrar.'); return; }
  if (ui_().alert('🧹 Borrar respuestas de PRUEBA', 'Se borrarán ' + n + ' fila(s) marcadas como PRUEBA. Las reales no se tocan.\n\n¿Continuar?', ui_().ButtonSet.YES_NO) !== ui_().Button.YES) return;
  reescribir_(quedan); ui_().alert('✅ Listo: ' + n + ' fila(s) de prueba borradas.');
}
function borrarSeleccion() {
  var h = ss_().getActiveSheet();
  if (h.getName() !== HOJA) { ui_().alert('Ve a la hoja «' + HOJA + '», selecciona las filas que quieres borrar y vuelve a usar esta opción.'); return; }
  var rg = h.getActiveRange(), ini = Math.max(rg.getRow(), 2), fin = rg.getLastRow();
  if (fin < 2) { ui_().alert('Selecciona primero una o varias filas de datos (no el encabezado).'); return; }
  var n = fin - ini + 1;
  if (ui_().alert('🧹 Borrar filas seleccionadas', 'Se borrarán ' + n + ' fila(s) (de la ' + ini + ' a la ' + fin + '). Se crea un respaldo antes.\n\n¿Continuar?', ui_().ButtonSet.YES_NO) !== ui_().Button.YES) return;
  var nom = respaldo_(), f = datos_(); f.splice(ini - 2, n); reescribir_(f);
  ui_().alert('✅ Listo', n + ' fila(s) borradas.\nRespaldo: «' + nom + '».', ui_().ButtonSet.OK);
}
function restablecer() {
  var ui = ui_(), f = datos_();
  if (!f.length) { ui.alert('La hoja «Respuestas» ya está vacía.'); return; }
  var r = ui.prompt('⚠️ Restablecer: borrar TODAS las respuestas', 'Hay ' + f.length + ' respuesta(s). Se hará un respaldo y luego se borrarán todas.\n\nPara confirmar escribe BORRAR (en mayúsculas):', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  if (r.getResponseText().trim() !== 'BORRAR') { ui.alert('No se borró nada: no escribiste BORRAR.'); return; }
  var nom = respaldo_(); reescribir_([]);
  ui.alert('✅ Hoja restablecida', 'Se borraron ' + f.length + ' respuestas.\nRespaldo guardado en la hoja «' + nom + '».\n\nNota: en los celulares donde ya se envió, el sitio muestra «Gracias»; basta pulsar «Otra persona usa este dispositivo».', ui.ButtonSet.OK);
}
function respaldo() { var n = respaldo_(); ui_().alert('💾 Respaldo creado', 'Quedó en la hoja «' + n + '» (abajo, en las pestañas).', ui_().ButtonSet.OK); }

/* ---- ayuda ---- */
function ayuda() {
  ui_().alert('📖 Ayuda rápida',
    '1) Preparar la hoja (solo la primera vez).\n2) Publicar: Implementar → Nueva implementación → Aplicación web (Yo / Cualquier persona).\n3) Ver la dirección y pegarla en datos/autoevaluacion-config.json ("url").\n4) Probar.\n\nDespués:\n• Actualizar «Resumen» cuando quieras una tabla.\n• Cerrar la recepción al terminar el plazo.\n• Borrar datos de PRUEBA antes de abrirla a los docentes.\n\nMás detalle: hoja «Instrucciones» y autoevaluacion/LEEME-INSTALACION.md.', ui_().ButtonSet.OK);
}
