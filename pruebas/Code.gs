/**
 * ColBolívar · Pruebas en línea — Google Apps Script (aplicación web)
 * ------------------------------------------------------------------
 * Esta hoja de cálculo es la base de datos. Hojas que se crean solas:
 *   Docentes    -> cada docente que se registra (nombre, sede y su CÓDIGO personal). Para bloquear a alguien: cambia su estado a «bloqueado»
 *   Pruebas     -> una fila por prueba publicada (la clave de cada prueba NO está aquí)
 *   Respuestas  -> una fila por estudiante que entrega
 *   _datos      -> (oculta) preguntas y claves de cada prueba, en trozos
 *
 * La CLAVE (respuestas correctas) vive solo en el servidor: el celular del estudiante nunca la recibe.
 * Instalación paso a paso: ver LEEME-INSTALACION.md. Resumen:
 *   1) Pegar este archivo en Extensiones > Apps Script   2) Ejecutar «instalar» una vez
 *   3) Implementar > Nueva implementación > Aplicación web (ejecutar como: yo · acceso: cualquier persona)
 */
var VERSION = '1.4';
var HOJAS = { pruebas: 'Pruebas', resp: 'Respuestas', datos: '_datos', docentes: 'Docentes' };
var COL = {
  pruebas: ['codigo', 'titulo', 'area', 'grado', 'docente', 'cursos', 'modo', 'minutos', 'abre', 'cierra', 'mostrar', 'intentos', 'mezclar', 'estado', 'creada', 'n_multiple', 'n_abiertas', 'pin_hash', 'docente_cod', 'opciones'],
  resp: ['id', 'fecha', 'codigo', 'nombre', 'curso', 'intento', 'aciertos', 'total', 'segundos', 'salidas', 'respuestas', 'abiertas', 'pts_abiertas', 'fraude', 'tq', 'forzada'],
  datos: ['codigo', 'tipo', 'idx', 'trozo'],
  docentes: ['codigo', 'nombre', 'sede', 'area', 'fecha', 'estado']
};
var TROZO = 40000;            // caracteres por celda (el límite de Sheets es 50 000)
var TROZO_CACHE = 30000;      // la caché admite ~100 KB por valor
var RX_IMG = /^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+\/=]+$/;   // solo se aceptan imágenes incrustadas (WebP/PNG/JPEG)
var ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // sin 0/O/1/I para evitar confusiones

/** Opciones de la prueba (tiempos y anti-fraude). Todo lo que llegue se sanea: números dentro de rangos, textos de una lista cerrada. */
function opcionesPorDefecto_() { return { piensa: 0, limite: 0, volver: true, mezclarOpc: true, fraude: { modo: 'alerta', maxSalidas: 3, segundos: 15, pantallaCompleta: false, bloquearCopiar: true }, confeti: true }; }
function entero_(v, min, max, def) { v = Math.round(Number(v)); return isNaN(v) ? def : Math.max(min, Math.min(max, v)); }
function sanearOpciones_(o) {
  var d = opcionesPorDefecto_(); o = o || {}; var f = o.fraude || {};
  return { piensa: entero_(o.piensa, 0, 600, d.piensa), limite: entero_(o.limite, 0, 900, d.limite), volver: o.volver === false ? false : true, mezclarOpc: o.mezclarOpc === false ? false : true,
    fraude: { modo: ['off', 'registrar', 'alerta', 'estricto'].indexOf(f.modo) >= 0 ? f.modo : d.fraude.modo, maxSalidas: entero_(f.maxSalidas, 1, 10, d.fraude.maxSalidas),
      segundos: entero_(f.segundos, 5, 60, d.fraude.segundos), pantallaCompleta: !!f.pantallaCompleta, bloquearCopiar: f.bloquearCopiar === false ? false : true },
    confeti: o.confeti === false ? false : true };
}

/* ===================== INSTALACIÓN ===================== */
function instalar() {
  hoja_('pruebas'); hoja_('resp'); hoja_('datos'); hoja_('docentes'); asegurarEncabezados_();
  var p = PropertiesService.getScriptProperties(), v = p.getProperties();
  if (!v.CODIGO_DOCENTES) p.setProperty('CODIGO_DOCENTES', 'cambia-este-codigo');
  if (!v.CLAVE_MAESTRA) p.setProperty('CLAVE_MAESTRA', aleatorio_(8, '0123456789'));
  if (!v.SAL) p.setProperty('SAL', aleatorio_(24, ALFABETO));
  if (!v.DIAS_RETENCION) p.setProperty('DIAS_RETENCION', '180');
  if (!v.REGISTRO_ABIERTO) p.setProperty('REGISTRO_ABIERTO', 'si');
  v = p.getProperties();
  Logger.log('✔ Instalado (v' + VERSION + ').');
  Logger.log('CÓDIGO DEL COLEGIO (los profes lo usan UNA vez para registrarse): ' + v.CODIGO_DOCENTES + '   → cámbialo en Configuración del proyecto > Propiedades de la secuencia de comandos (CODIGO_DOCENTES)');
  Logger.log('Cada docente recibe un CÓDIGO PERSONAL al registrarse (hoja «Docentes»). Para cerrar el registro: REGISTRO_ABIERTO = no');
  Logger.log('CLAVE MAESTRA (rectoría, abre cualquier reporte): ' + v.CLAVE_MAESTRA);
  Logger.log('Ahora: Implementar > Nueva implementación > Aplicación web.');
}
/** Opcional: borra cada noche las pruebas con más de DIAS_RETENCION días (privacidad). Ejecútala una vez. */
function crearDisparadorLimpieza() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'limpiarAntiguas') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('limpiarAntiguas').timeBased().everyDays(1).atHour(3).create();
}
function limpiarAntiguas() { borrarVencidas_(Number(PropertiesService.getScriptProperties().getProperty('DIAS_RETENCION') || 180)); }
/** Borra las pruebas (con sus respuestas) creadas hace más de «dias» días. Devuelve cuántas borró. */
function borrarVencidas_(dias) {
  var limite = Date.now() - dias * 864e5, n = 0;
  tabla_('pruebas').forEach(function (p) { if (Date.parse(p.creada) < limite) { eliminar_(p.codigo); n++; } });
  return n;
}

/* ===================== MENÚ DE ADMINISTRACIÓN (en la barra de la hoja de cálculo) ===================== */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('📝 ColBolívar')
    .addItem('🔎 Ver claves y estado', 'menuEstado')
    .addSeparator()
    .addSubMenu(ui.createMenu('👩‍🏫 Docentes')
      .addItem('Cambiar el código del colegio…', 'menuCambiarCodigoColegio')
      .addItem('Abrir / cerrar el registro de docentes', 'menuAlternarRegistro')
      .addSeparator()
      .addItem('Bloquear al docente de la fila seleccionada', 'menuBloquearDocente')
      .addItem('Desbloquear al docente de la fila seleccionada', 'menuDesbloquearDocente')
      .addItem('Dar un código nuevo al docente de la fila seleccionada', 'menuCodigoNuevoDocente')
      .addItem('Eliminar al docente de la fila seleccionada', 'menuEliminarDocente'))
    .addSubMenu(ui.createMenu('📝 Pruebas')
      .addItem('Cerrar la prueba de la fila seleccionada', 'menuCerrarPrueba')
      .addItem('Reabrir la prueba de la fila seleccionada', 'menuReabrirPrueba')
      .addItem('Borrar las respuestas de la prueba seleccionada', 'menuBorrarRespuestas')
      .addItem('Eliminar la prueba seleccionada (y sus respuestas)', 'menuEliminarPrueba')
      .addSeparator()
      .addItem('Borrar las pruebas que no tienen ninguna entrega', 'menuBorrarVacias')
      .addItem('Borrar las pruebas con más de N días…', 'menuBorrarViejas'))
    .addSubMenu(ui.createMenu('🔐 Seguridad y privacidad')
      .addItem('Generar una clave maestra nueva', 'menuClaveMaestra')
      .addItem('Cambiar cuántos días se guardan las pruebas…', 'menuRetencion')
      .addItem('Activar el borrado automático nocturno', 'menuActivarLimpieza'))
    .addToUi();
}
function ui_() { return SpreadsheetApp.getUi(); }
function aviso_(t, m) { var u = ui_(); u.alert(t, m, u.ButtonSet.OK); }
function si_(t, m) { var u = ui_(); return u.alert(t, m, u.ButtonSet.YES_NO) === u.Button.YES; }
function pedir_(t, m) { var u = ui_(), r = u.prompt(t, m, u.ButtonSet.OK_CANCEL); return r.getSelectedButton() === u.Button.OK ? String(r.getResponseText()).trim() : null; }
function seguro_(f) { try { f(); } catch (e) { aviso_('No se pudo hacer', (e && e.message) || String(e)); } }
function props_() { return PropertiesService.getScriptProperties(); }
/** La fila que tiene seleccionada el usuario en la hoja indicada («Docentes» o «Pruebas»). */
function filaActiva_(clave) {
  var h = SpreadsheetApp.getActiveSheet();
  if (h.getName() !== HOJAS[clave]) throw new Error('Primero ve a la hoja «' + HOJAS[clave] + '» y haz clic en cualquier celda de la fila que quieres usar.');
  var r = h.getActiveRange().getRow();
  if (r < 2) throw new Error('Selecciona una fila de datos, no el encabezado.');
  var o = tabla_(clave).filter(function (x) { return x._fila === r; })[0];
  if (!o) throw new Error('La fila seleccionada está vacía.');
  return o;
}
function ponerCelda_(clave, fila, campo, valor) { hoja_(clave).getRange(fila, COL[clave].indexOf(campo) + 1).setValue(valor); }

function menuEstado() {
  seguro_(function () {
    var p = props_().getProperties(), docs = tabla_('docentes'), pr = tabla_('pruebas'), url = '';
    try { url = ScriptApp.getService().getUrl() || ''; } catch (e) { }
    var activos = docs.filter(function (d) { return d.estado === 'activo'; }).length;
    var trig = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'limpiarAntiguas'; });
    aviso_('Estado de Pruebas en línea (v' + VERSION + ')',
      'CÓDIGO DEL COLEGIO (para registrarse): ' + (p.CODIGO_DOCENTES || '—') + '\n' +
      'CLAVE MAESTRA (abre cualquier prueba; no la compartas): ' + (p.CLAVE_MAESTRA || '—') + '\n' +
      'Registro de docentes: ' + (p.REGISTRO_ABIERTO === 'no' ? 'CERRADO' : 'abierto') + '\n\n' +
      'Docentes: ' + activos + ' activos, ' + (docs.length - activos) + ' bloqueados\n' +
      'Pruebas: ' + pr.length + ' · Entregas: ' + tabla_('resp').length + '\n' +
      'Se guardan ' + (p.DIAS_RETENCION || 180) + ' días · Borrado automático: ' + (trig ? 'ACTIVADO' : 'desactivado') + '\n\n' +
      'URL de la aplicación web:\n' + (url || '(aún no implementada)') + '\n(debe ser la misma de datos/pruebas-config.json)');
  });
}
function menuCambiarCodigoColegio() {
  seguro_(function () {
    var n = pedir_('Código del colegio', 'Escribe el nuevo código (sin espacios, mínimo 6 caracteres). Los docentes ya registrados no necesitan hacer nada.\nActual: ' + (props_().getProperty('CODIGO_DOCENTES') || '—'));
    if (n === null) return;
    if (!/^\S{6,30}$/.test(n)) throw new Error('El código debe tener entre 6 y 30 caracteres y no llevar espacios.');
    props_().setProperty('CODIGO_DOCENTES', n); aviso_('Listo', 'El nuevo código del colegio es:\n\n' + n);
  });
}
function menuAlternarRegistro() {
  seguro_(function () {
    var cerrado = props_().getProperty('REGISTRO_ABIERTO') === 'no';
    if (!si_(cerrado ? 'Abrir el registro' : 'Cerrar el registro', cerrado ? 'Los docentes podrán volver a registrarse. ¿Abrirlo?' : 'Nadie más podrá registrarse (los ya inscritos siguen igual). ¿Cerrarlo?')) return;
    props_().setProperty('REGISTRO_ABIERTO', cerrado ? 'si' : 'no'); aviso_('Listo', 'El registro de docentes ahora está ' + (cerrado ? 'ABIERTO.' : 'CERRADO.'));
  });
}
function cambiarEstadoDocente_(estado) {
  var d = filaActiva_('docentes');
  if (!si_(estado === 'bloqueado' ? 'Bloquear docente' : 'Desbloquear docente', (estado === 'bloqueado' ? 'No podrá publicar pruebas ni abrir resultados.\n\n' : 'Volverá a poder usar sus pruebas.\n\n') + d.nombre + ' · ' + d.sede + ' · ' + d.codigo + '\n\n¿Continuar?')) return;
  ponerCelda_('docentes', d._fila, 'estado', estado); aviso_('Listo', d.nombre + ': ' + estado + '.');
}
function menuBloquearDocente() { seguro_(function () { cambiarEstadoDocente_('bloqueado'); }); }
function menuDesbloquearDocente() { seguro_(function () { cambiarEstadoDocente_('activo'); }); }
function menuCodigoNuevoDocente() {
  seguro_(function () {
    var d = filaActiva_('docentes');
    if (!si_('Código nuevo', 'Se le dará un código nuevo a ' + d.nombre + ' y el actual (' + d.codigo + ') dejará de servir. Sus pruebas pasan al código nuevo.\n\n¿Continuar?')) return;
    var usados = tabla_('docentes').map(function (r) { return r.codigo; }), c;
    do { c = 'D-' + aleatorio_(6, ALFABETO); } while (usados.indexOf(c) >= 0);
    ponerCelda_('docentes', d._fila, 'codigo', c);
    tabla_('pruebas').forEach(function (p) { if (p.docente_cod === d.codigo) ponerCelda_('pruebas', p._fila, 'docente_cod', c); });
    aviso_('Listo', 'Nuevo código de ' + d.nombre + ':\n\n' + c + '\n\nEntrégaselo (el anterior ya no funciona).');
  });
}
function menuEliminarDocente() {
  seguro_(function () {
    var d = filaActiva_('docentes');
    if (!si_('Eliminar docente', 'Se borra a ' + d.nombre + ' (' + d.codigo + ') de la lista. Sus pruebas NO se borran, pero él ya no podrá abrirlas con su código.\n\n¿Eliminarlo?')) return;
    hoja_('docentes').deleteRow(d._fila); aviso_('Listo', 'Docente eliminado.');
  });
}
function cambiarEstadoPrueba_(estado) {
  var p = filaActiva_('pruebas');
  if (!si_(estado === 'cerrada' ? 'Cerrar prueba' : 'Reabrir prueba', '«' + p.titulo + '» (' + p.codigo + ')\n\n¿' + (estado === 'cerrada' ? 'Cerrarla? Los estudiantes ya no podrán entregar.' : 'Reabrirla?'))) return;
  ponerCelda_('pruebas', p._fila, 'estado', estado); aviso_('Listo', 'La prueba quedó ' + (estado === 'cerrada' ? 'CERRADA.' : 'ABIERTA.'));
}
function menuCerrarPrueba() { seguro_(function () { cambiarEstadoPrueba_('cerrada'); }); }
function menuReabrirPrueba() { seguro_(function () { cambiarEstadoPrueba_('activa'); }); }
function borrarRespuestas_(codigo) {
  var h = hoja_('resp'), t = tabla_('resp').filter(function (r) { return r.codigo === codigo; });
  for (var i = t.length - 1; i >= 0; i--) h.deleteRow(t[i]._fila);
  return t.length;
}
function menuBorrarRespuestas() {
  seguro_(function () {
    var p = filaActiva_('pruebas'), n = tabla_('resp').filter(function (r) { return r.codigo === p.codigo; }).length;
    if (!n) { aviso_('Sin respuestas', 'Esa prueba aún no tiene entregas.'); return; }
    if (!si_('Borrar respuestas', 'Se borrarán las ' + n + ' entregas de «' + p.titulo + '». La prueba se conserva (útil para dejarla limpia después de un ensayo).\n\nEsto no se puede deshacer. ¿Continuar?')) return;
    aviso_('Listo', borrarRespuestas_(p.codigo) + ' entregas borradas.');
  });
}
function menuEliminarPrueba() {
  seguro_(function () {
    var p = filaActiva_('pruebas'), n = tabla_('resp').filter(function (r) { return r.codigo === p.codigo; }).length;
    if (!si_('Eliminar prueba', 'Se borrará «' + p.titulo + '» (' + p.codigo + ') junto con sus ' + n + ' entregas.\n\nEsto no se puede deshacer. ¿Eliminarla?')) return;
    eliminar_(p.codigo); aviso_('Listo', 'Prueba eliminada.');
  });
}
function menuBorrarVacias() {
  seguro_(function () {
    var conteo = {}; tabla_('resp').forEach(function (r) { conteo[r.codigo] = 1; });
    var v = tabla_('pruebas').filter(function (p) { return !conteo[p.codigo]; });
    if (!v.length) { aviso_('Nada que borrar', 'Todas las pruebas tienen al menos una entrega.'); return; }
    if (!si_('Borrar pruebas sin entregas', 'Hay ' + v.length + ' prueba(s) sin ninguna entrega:\n' + v.slice(0, 8).map(function (p) { return '• ' + p.titulo + ' (' + p.codigo + ')'; }).join('\n') + (v.length > 8 ? '\n…' : '') + '\n\n¿Borrarlas?')) return;
    v.forEach(function (p) { eliminar_(p.codigo); }); aviso_('Listo', v.length + ' prueba(s) borradas.');
  });
}
function menuBorrarViejas() {
  seguro_(function () {
    var t = pedir_('Borrar pruebas antiguas', 'Se borrarán las pruebas (y sus respuestas) creadas hace MÁS de cuántos días?');
    if (t === null) return;
    var dias = Number(t); if (!(dias >= 1 && dias <= 3650)) throw new Error('Escribe un número de días entre 1 y 3650.');
    var limite = Date.now() - dias * 864e5, v = tabla_('pruebas').filter(function (p) { return Date.parse(p.creada) < limite; });
    if (!v.length) { aviso_('Nada que borrar', 'No hay pruebas con más de ' + dias + ' días.'); return; }
    if (!si_('Confirmar', 'Se borrarán ' + v.length + ' prueba(s) con más de ' + dias + ' días y todas sus respuestas.\n\nNo se puede deshacer. ¿Continuar?')) return;
    aviso_('Listo', borrarVencidas_(dias) + ' prueba(s) borradas.');
  });
}
function menuClaveMaestra() {
  seguro_(function () {
    if (!si_('Clave maestra nueva', 'La clave actual dejará de funcionar. Úsala si crees que se filtró.\n\n¿Generar una nueva?')) return;
    var k = aleatorio_(8, '0123456789'); props_().setProperty('CLAVE_MAESTRA', k); aviso_('Listo', 'Nueva CLAVE MAESTRA:\n\n' + k + '\n\nGuárdala en un lugar seguro.');
  });
}
function menuRetencion() {
  seguro_(function () {
    var t = pedir_('Días que se guardan las pruebas', 'Pasado ese tiempo el borrado automático las elimina (privacidad). Actual: ' + (props_().getProperty('DIAS_RETENCION') || 180) + ' días. Escribe un número entre 7 y 3650.');
    if (t === null) return;
    var d = Number(t); if (!(d >= 7 && d <= 3650)) throw new Error('Escribe un número entre 7 y 3650.');
    props_().setProperty('DIAS_RETENCION', String(Math.round(d))); aviso_('Listo', 'Ahora se guardan ' + Math.round(d) + ' días. Recuerda activar el borrado automático si aún no lo hiciste.');
  });
}
function menuActivarLimpieza() {
  seguro_(function () { crearDisparadorLimpieza(); aviso_('Listo', 'Cada noche se borrarán las pruebas con más de ' + (props_().getProperty('DIAS_RETENCION') || 180) + ' días.'); });
}

/* ===================== PUNTOS DE ENTRADA ===================== */
function doGet(e) {
  try {
    var a = (e && e.parameter && e.parameter.accion) || 'ping';
    if (a === 'ping') return salida_({ ok: true, version: VERSION });
    if (a === 'prueba') return salida_(prueba_(String(e.parameter.codigo || '')));
    return salida_({ ok: false, error: 'accion' });
  } catch (err) { return salida_(fallo_(err)); }
}
function doPost(e) {
  try {
    var d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var acciones = { registrar: registrar_, misPruebas: misPruebas_, publicar: publicar_, entregar: entregar_, resultados: resultados_, estado: estado_, calificar: calificar_abierta_, eliminar: eliminar_pin_ };
    if (!acciones[d.accion]) return salida_({ ok: false, error: 'accion' });
    return salida_(acciones[d.accion](d));
  } catch (err) { return salida_(fallo_(err)); }
}
function salida_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function fallo_(err) {
  if (err && err.codigo) return { ok: false, error: err.codigo, mensaje: err.message };
  Logger.log('ERROR: ' + (err && err.stack || err)); return { ok: false, error: 'interno', mensaje: 'Ocurrió un error. Intenta de nuevo.' };
}
function error_(codigo, mensaje) { var e = new Error(mensaje || codigo); e.codigo = codigo; return e; }

/* ===================== ACCIONES ===================== */
function publicar_(d) {
  var doc = docenteDe_(d.codigoDocente);
  var pub = d.publico || {}, clave = d.clave || { m: {}, a: {} }, ps = pub.preguntas || [];
  if (!ps.length || ps.length > 100) throw error_('prueba_invalida', 'La prueba debe tener entre 1 y 100 preguntas.');
  asegurarEncabezados_();
  (ps).concat(pub.estimulos || []).forEach(function (o) { if (o && o.img && !RX_IMG.test(String(o.img))) delete o.img; });
  ps.forEach(function (q) {
    if (q.opImg) q.opImg = (q.opImg || []).map(function (u) { return RX_IMG.test(String(u || '')) ? u : ''; });
    q.piensa = q.piensa === undefined || q.piensa === null || q.piensa === '' ? null : entero_(q.piensa, 0, 600, 0);   // null = usa el valor general de la prueba
    q.limite = q.limite === undefined || q.limite === null || q.limite === '' ? null : entero_(q.limite, 0, 900, 0);
  });
  var nM = 0, nA = 0;
  ps.forEach(function (q) {
    if (!q.id) throw error_('prueba_invalida', 'Falta el identificador de una pregunta.');
    if (q.tipo === 'abierta') { nA++; return; }
    var k = clave.m && clave.m[q.id];
    if (!q.opciones || q.opciones.length < 2 || !k || !(k.ci >= 0 && k.ci < q.opciones.length)) throw error_('prueba_invalida', 'La pregunta ' + q.id + ' no tiene opciones o clave válidas.');
    nM++;
  });
  var raw = JSON.stringify(pub).length + JSON.stringify(clave).length;
  if (raw > 6000000) throw error_('prueba_muy_grande', 'La prueba pesa demasiado (usa imágenes más pequeñas).');
  var m = d.meta || {}, c = d.config || {};
  var lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    var codigo = codigoNuevo_(), pin = aleatorio_(6, '0123456789');
    var fila = {
      codigo: codigo, titulo: limpio_(m.titulo, 120) || 'Prueba', area: limpio_(m.area, 60), grado: limpio_(m.grado, 20), docente: doc.nombre, docente_cod: doc.codigo,
      cursos: (m.cursos || []).map(function (x) { return limpio_(x, 20); }).filter(String).slice(0, 12).join(','),
      modo: c.modo === 'repaso' ? 'repaso' : 'evaluacion', minutos: Math.max(0, Math.min(300, Number(c.minutos) || 0)),
      abre: validaFecha_(c.abre), cierra: validaFecha_(c.cierra),
      mostrar: ['completo', 'nota', 'nada'].indexOf(c.mostrar) >= 0 ? c.mostrar : 'nota',
      intentos: Math.max(1, Math.min(99, Number(c.intentos) || 1)), mezclar: c.mezclar ? 'si' : 'no',
      estado: 'activa', creada: new Date().toISOString(), n_multiple: nM, n_abiertas: nA, pin_hash: hash_(pin, codigo), opciones: JSON.stringify(sanearOpciones_(c.opciones))
    };
    anexar_('pruebas', fila);
    guardarGrande_(codigo, 'publico', pub); guardarGrande_(codigo, 'clave', clave);
    return { ok: true, codigo: codigo, pin: pin, docente: doc.nombre };
  } finally { lock.releaseLock(); }
}

function prueba_(codigo) {
  var p = filaPrueba_(codigo);
  if (!p || p.estado === 'eliminada') throw error_('no_existe', 'No encontramos esa prueba. Revisa el código.');
  var pub = leerGrande_(codigo, 'publico');
  return { ok: true, meta: metaPublica_(p), publico: pub, abierta: abierta_(p) };
}
function metaPublica_(p) {
  return { codigo: p.codigo, titulo: p.titulo, area: p.area, grado: p.grado, docente: p.docente, cursos: p.cursos ? String(p.cursos).split(',') : [], modo: p.modo,
    minutos: Number(p.minutos) || 0, mostrar: p.mostrar, mezclar: p.mezclar === 'si', intentos: Number(p.intentos) || 1, abre: p.abre, cierra: p.cierra, estado: p.estado, opciones: sanearOpciones_(parse_(p.opciones, {})) };
}
function abierta_(p) {
  var t = Date.now();
  if (p.estado !== 'activa') return { si: false, motivo: 'cerrada' };
  if (p.abre && Date.parse(p.abre) > t) return { si: false, motivo: 'aun_no', abre: p.abre };
  if (p.cierra && Date.parse(p.cierra) < t) return { si: false, motivo: 'vencida' };
  return { si: true };
}

function entregar_(d) {
  var p = filaPrueba_(String(d.codigo || ''));
  if (!p || p.estado === 'eliminada') throw error_('no_existe', 'No encontramos esa prueba.');
  var ab = abierta_(p); if (!ab.si) throw error_('cerrada', ab.motivo === 'aun_no' ? 'La prueba todavía no ha abierto.' : 'La prueba ya está cerrada.');
  var nombre = limpio_(d.nombre, 70), curso = limpio_(d.curso, 20);
  if (nombre.length < 3) throw error_('nombre', 'Escribe tu nombre completo.');
  var pub = leerGrande_(p.codigo, 'publico'), clave = leerGrande_(p.codigo, 'clave');
  var lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    var previas = tabla_('resp').filter(function (r) { return r.codigo === p.codigo; });
    var cid = limpio_(d.cid, 60);
    if (cid) { var igual = previas.filter(function (r) { return r.id === cid; })[0]; if (igual) return { ok: true, repetida: true, resultado: armarResultado_(p, pub, clave, igual) }; }   // reintento por mala señal
    var clavePersona = norm_(nombre) + '|' + norm_(curso);
    var mias = previas.filter(function (r) { return norm_(r.nombre) + '|' + norm_(r.curso) === clavePersona; }).length;
    if (mias >= (Number(p.intentos) || 1)) throw error_('intentos', 'Ya usaste todos tus intentos en esta prueba.');
    var resp = {}, ab_ = {}, g = calificar_(pub, clave, d.respuestas || {});
    pub.preguntas.forEach(function (q) { if (q.tipo === 'abierta') ab_[q.id] = limpio_((d.abiertas || {})[q.id], 2000); else resp[q.id] = (d.respuestas || {})[q.id] === undefined ? null : Number((d.respuestas || {})[q.id]); });
    var fila = { id: cid || Utilities.getUuid(), fecha: new Date().toISOString(), codigo: p.codigo, nombre: nombre, curso: curso, intento: mias + 1,
      aciertos: g.aciertos, total: g.total, segundos: Math.max(0, Math.min(86400, Number(d.segundos) || 0)), salidas: Math.max(0, Math.min(999, Number(d.salidas) || 0)),
      respuestas: JSON.stringify(resp), abiertas: JSON.stringify(ab_), pts_abiertas: '{}', fraude: JSON.stringify(fraude_(d.fraude)), tq: JSON.stringify(tiempos_(d.tq, pub)), forzada: limpio_(d.forzada, 30) };
    anexar_('resp', fila);
    return { ok: true, resultado: armarResultado_(p, pub, clave, fila) };
  } finally { lock.releaseLock(); }
}

/** Registro de intentos de fraude enviado por el navegador del estudiante: [{ t: tipo, q: n.º de pregunta, h: hora }] (máx. 60). */
function fraude_(a) {
  if (!Array.isArray(a)) return [];
  return a.slice(0, 60).map(function (x) { x = x || {}; return { t: limpio_(x.t, 30), q: entero_(x.q, 0, 200, 0), h: limpio_(x.h, 30) }; });
}
/** Segundos que tardó en cada pregunta: { id: segundos } (solo ids que existen). */
function tiempos_(o, pub) {
  var r = {}; o = o || {}; pub.preguntas.forEach(function (q) { if (o[q.id] !== undefined) r[q.id] = entero_(o[q.id], 0, 7200, 0); }); return r;
}
/** Califica las preguntas de selección múltiple. La clave: { m: { id: { ci, just, err[] } } } */
function calificar_(pub, clave, respuestas) {
  var aciertos = 0, total = 0;
  pub.preguntas.forEach(function (q) { if (q.tipo === 'abierta') return; total++; if (Number(respuestas[q.id]) === clave.m[q.id].ci && respuestas[q.id] !== null && respuestas[q.id] !== undefined) aciertos++; });
  return { aciertos: aciertos, total: total };
}
function notaDe_(fila, pub) {
  var aM = Number(fila.aciertos) || 0, nM = Number(fila.total) || 0;
  var abs = pub.preguntas.filter(function (q) { return q.tipo === 'abierta'; });
  if (!abs.length) return { nota: nM ? redondeo_(5 * aM / nM) : 0, provisional: false };
  var pts = parse_(fila.pts_abiertas, {}), todos = abs.every(function (q) { return pts[q.id] !== undefined; });
  if (!todos) return { nota: nM ? redondeo_(5 * aM / nM) : 0, provisional: true };
  var maxAb = abs.reduce(function (s, q) { return s + (Number(q.puntos) || 1); }, 0), got = abs.reduce(function (s, q) { return s + (Number(pts[q.id]) || 0); }, 0);
  return { nota: redondeo_(5 * (aM + got) / (nM + maxAb)), provisional: false };
}
function armarResultado_(p, pub, clave, fila) {
  var n = notaDe_(fila, pub), r = { aciertos: Number(fila.aciertos), total: Number(fila.total), nota: n.nota, provisional: n.provisional, modo: p.modo, mostrar: p.mostrar, abiertasPendientes: p.n_abiertas > 0 };
  if (p.mostrar === 'nada') return { recibido: true, mostrar: 'nada', modo: p.modo };
  var resp = parse_(fila.respuestas, {}), comp = {}, detalle = [];
  pub.preguntas.forEach(function (q) {
    if (q.tipo === 'abierta') return;
    var k = clave.m[q.id], el = resp[q.id], ok = el !== null && el !== undefined && Number(el) === k.ci, c = q.competencia || 'General';
    comp[c] = comp[c] || { c: c, ok: 0, n: 0 }; comp[c].n++; if (ok) comp[c].ok++;
    if (p.mostrar === 'completo') detalle.push({ id: q.id, ok: ok, elegida: el === undefined ? null : el, correcta: k.ci, just: k.just || '', error: (!ok && el !== null && el !== undefined) ? ((k.err || [])[el] || '') : '' });
  });
  r.competencias = Object.keys(comp).map(function (x) { return comp[x]; });
  if (p.mostrar === 'completo') r.detalle = detalle;
  return r;
}

/* ===================== REPORTE DEL DOCENTE ===================== */
function resultados_(d) {
  var p = auth_(d.codigo, d.pin), pub = leerGrande_(p.codigo, 'publico'), clave = leerGrande_(p.codigo, 'clave');
  var filas = tabla_('resp').filter(function (r) { return r.codigo === p.codigo; });
  var est = filas.map(function (f) {
    var n = notaDe_(f, pub), rs = parse_(f.respuestas, {}), okq = {};
    pub.preguntas.forEach(function (q) { if (q.tipo !== 'abierta') okq[q.id] = (rs[q.id] === null || rs[q.id] === undefined) ? null : (Number(rs[q.id]) === clave.m[q.id].ci ? 1 : 0); });
    return { ok: okq, id: f.id, nombre: f.nombre, curso: f.curso, intento: Number(f.intento), aciertos: Number(f.aciertos), total: Number(f.total), nota: n.nota, provisional: n.provisional,
      segundos: Number(f.segundos), salidas: Number(f.salidas), fecha: f.fecha, abiertas: parse_(f.abiertas, {}), pts: parse_(f.pts_abiertas, {}), fraude: parse_(f.fraude, []), forzada: f.forzada || '' };
  });
  var preguntas = pub.preguntas.map(function (q, i) {
    if (q.tipo === 'abierta') return { id: q.id, n: i + 1, tipo: 'abierta', pregunta: q.pregunta, enunciado: q.enunciado || '', puntos: Number(q.puntos) || 1, modelo: (clave.a && clave.a[q.id] || {}).modelo || '', criterios: (clave.a && clave.a[q.id] || {}).criterios || [] };
    var k = clave.m[q.id], dist = q.opciones.map(function () { return 0; }), omit = 0, ok = 0;
    filas.forEach(function (f) { var el = parse_(f.respuestas, {})[q.id]; if (el === null || el === undefined) omit++; else { dist[el]++; if (Number(el) === k.ci) ok++; } });
    return { id: q.id, n: i + 1, tipo: 'multiple', estimulo: q.estimulo || '', enunciado: q.enunciado || '', pregunta: q.pregunta, opciones: q.opciones, correcta: k.ci, just: k.just || '', err: k.err || [],
      competencia: q.competencia || '', componente: q.componente || '', nivel: q.nivel || '', dist: dist, omitidas: omit, aciertos: ok, respondieron: filas.length, tiempoMedio: mediaTq_(filas, q.id) };
  });
  return { ok: true, meta: metaPublica_(p), abierta: abierta_(p), publico: { estimulos: pub.estimulos || [] }, estudiantes: est, preguntas: preguntas, version: VERSION };
}
function mediaTq_(filas, id) {
  var v = filas.map(function (f) { return parse_(f.tq, {})[id]; }).filter(function (x) { return typeof x === 'number'; });
  return v.length ? Math.round(v.reduce(function (a, b) { return a + b; }, 0) / v.length) : null;
}
function calificar_abierta_(d) {
  var p = auth_(d.codigo, d.pin), pub = leerGrande_(p.codigo, 'publico');
  var lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    var f = tabla_('resp').filter(function (r) { return r.codigo === p.codigo && r.id === d.id; })[0];
    if (!f) throw error_('no_existe', 'No se encontró esa entrega.');
    var pts = parse_(f.pts_abiertas, {});
    pub.preguntas.forEach(function (q) {
      if (q.tipo !== 'abierta' || (d.pts || {})[q.id] === undefined || (d.pts || {})[q.id] === null) return;
      pts[q.id] = Math.max(0, Math.min(Number(q.puntos) || 1, Number(d.pts[q.id]) || 0));
    });
    var h = hoja_('resp'); h.getRange(f._fila, COL.resp.indexOf('pts_abiertas') + 1).setValue(JSON.stringify(pts));
    return { ok: true, pts: pts };
  } finally { lock.releaseLock(); }
}
function estado_(d) {
  var p = auth_(d.codigo, d.pin);
  if (['activa', 'cerrada'].indexOf(d.estado) < 0) throw error_('estado', 'Estado no válido.');
  hoja_('pruebas').getRange(p._fila, COL.pruebas.indexOf('estado') + 1).setValue(d.estado);
  return { ok: true, estado: d.estado };
}
function eliminar_pin_(d) { var p = auth_(d.codigo, d.pin); eliminar_(p.codigo); return { ok: true }; }
function eliminar_(codigo) {
  [['resp', 'codigo'], ['datos', 'codigo']].forEach(function (par) {
    var h = hoja_(par[0]), t = tabla_(par[0]).filter(function (r) { return r[par[1]] === codigo; });
    for (var i = t.length - 1; i >= 0; i--) h.deleteRow(t[i]._fila);
  });
  var p = filaPrueba_(codigo); if (p) hoja_('pruebas').deleteRow(p._fila);
  var c = CacheService.getScriptCache(); ['publico', 'clave'].forEach(function (t) { var n = Number(c.get(t + ':' + codigo + ':n') || 0); for (var i = 0; i < n; i++) c.remove(t + ':' + codigo + ':' + i); c.remove(t + ':' + codigo + ':n'); });
}

/* ===================== DOCENTES ===================== */
/** Registro: el docente escribe su nombre y sede + el código del colegio, y recibe su código personal (queda en la hoja «Docentes»). */
function registrar_(d) {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('REGISTRO_ABIERTO') === 'no') throw error_('registro_cerrado', 'El registro de docentes está cerrado. Habla con coordinación.');
  if (!d.codigoColegio || String(d.codigoColegio).trim() !== props.getProperty('CODIGO_DOCENTES')) throw error_('codigo_colegio', 'El código del colegio no es correcto. Pídelo a coordinación.');
  var nombre = limpio_(d.nombre, 80), sede = limpio_(d.sede, 40), area = limpio_(d.area, 60);
  if (nombre.length < 5 || nombre.indexOf(' ') < 0) throw error_('nombre', 'Escribe tu nombre y apellido.');
  if (!sede) throw error_('sede', 'Elige o escribe tu sede.');
  var lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    var todos = tabla_('docentes'), k = norm_(nombre) + '|' + norm_(sede);
    if (todos.some(function (r) { return norm_(r.nombre) + '|' + norm_(r.sede) === k; })) throw error_('ya_registrado', 'Ya hay un docente registrado con ese nombre y sede. Si olvidaste tu código, pídeselo a coordinación (aparece en la hoja «Docentes»).');
    var usados = todos.map(function (r) { return r.codigo; }), c;
    do { c = 'D-' + aleatorio_(6, ALFABETO); } while (usados.indexOf(c) >= 0);
    anexar_('docentes', { codigo: c, nombre: nombre, sede: sede, area: area, fecha: new Date().toISOString(), estado: 'activo' });
    return { ok: true, codigo: c, nombre: nombre, sede: sede };
  } finally { lock.releaseLock(); }
}
function docenteActivo_(codigo) {
  codigo = String(codigo || '').trim().toUpperCase();
  return tabla_('docentes').filter(function (r) { return r.codigo === codigo && r.estado === 'activo'; })[0] || null;
}
function docenteDe_(codigo) {
  var c = String(codigo || '').trim();
  if (c && c === PropertiesService.getScriptProperties().getProperty('CLAVE_MAESTRA')) return { codigo: 'MAESTRA', nombre: 'Coordinación' };
  var r = docenteActivo_(c);
  if (!r) throw error_('codigo_docente', 'Tu código de docente no es válido o está bloqueado. Regístrate en «Registro de docentes» o habla con coordinación.');
  return r;
}
/** Valida el código personal y devuelve las pruebas de ese docente (la clave maestra ve todas). */
function misPruebas_(d) {
  var doc = docenteDe_(d.codigoDocente), maestra = doc.codigo === 'MAESTRA', conteo = {};
  tabla_('resp').forEach(function (r) { conteo[r.codigo] = (conteo[r.codigo] || 0) + 1; });
  var lista = tabla_('pruebas').filter(function (p) { return p.estado !== 'eliminada' && (maestra || p.docente_cod === doc.codigo); })
    .sort(function (a, b) { return Date.parse(b.creada) - Date.parse(a.creada); }).slice(0, 100)
    .map(function (p) { return { codigo: p.codigo, titulo: p.titulo, area: p.area, grado: p.grado, docente: p.docente, creada: p.creada, estado: p.estado, entregas: conteo[p.codigo] || 0 }; });
  return { ok: true, docente: { nombre: doc.nombre, sede: doc.sede || '', maestra: maestra }, pruebas: lista };
}

/* ===================== AUXILIARES ===================== */
function auth_(codigo, pin) {
  var p = filaPrueba_(String(codigo || '')); if (!p) throw error_('no_existe', 'No encontramos esa prueba.');
  var maestra = PropertiesService.getScriptProperties().getProperty('CLAVE_MAESTRA'), clave = String(pin || '').trim();
  var esDueno = clave && p.docente_cod && clave.toUpperCase() === p.docente_cod && docenteActivo_(p.docente_cod);   // su código personal abre sus propias pruebas
  if (!clave || (!esDueno && hash_(clave, p.codigo) !== p.pin_hash && clave !== maestra)) throw error_('pin', 'El código o la clave no es correcto para esta prueba.');
  return p;
}
function filaPrueba_(codigo) { codigo = String(codigo).toUpperCase().trim(); return tabla_('pruebas').filter(function (r) { return r.codigo === codigo; })[0] || null; }
function codigoNuevo_() { var usados = tabla_('pruebas').map(function (r) { return r.codigo; }), c; do { c = aleatorio_(6, ALFABETO); } while (usados.indexOf(c) >= 0); return c; }
function hash_(pin, codigo) {
  var sal = PropertiesService.getScriptProperties().getProperty('SAL') || '';
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pin + ':' + codigo + ':' + sal).map(function (b) { var h = ((b < 0 ? b + 256 : b)).toString(16); return h.length < 2 ? '0' + h : h; }).join('');
}
function aleatorio_(n, alfabeto) { var s = ''; for (var i = 0; i < n; i++) s += alfabeto.charAt(Math.floor(Math.random() * alfabeto.length)); return s; }
function limpio_(s, max) { return String(s === undefined || s === null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().substr(0, max); }
function norm_(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
function validaFecha_(s) { if (!s) return ''; var t = Date.parse(s); return isNaN(t) ? '' : new Date(t).toISOString(); }
function redondeo_(x) { return Math.round(x * 10) / 10; }
function parse_(s, def) { try { return s ? JSON.parse(s) : def; } catch (e) { return def; } }
/** Si la hoja ya existía de una versión anterior, completa los encabezados nuevos. */
function asegurarEncabezados_() {
  Object.keys(HOJAS).forEach(function (k) {
    var h = hoja_(k), enc = COL[k], act = h.getRange(1, 1, 1, enc.length).getValues()[0];
    if (enc.some(function (c, i) { return act[i] !== c; })) h.getRange(1, 1, 1, enc.length).setValues([enc]);
  });
}
function hoja_(clave) {
  var s = SpreadsheetApp.getActiveSpreadsheet(), h = s.getSheetByName(HOJAS[clave]);
  if (!h) {
    h = s.insertSheet(HOJAS[clave]);
    h.getRange(1, 1, 1, COL[clave].length).setValues([COL[clave]]);
    h.getRange(1, 1, 1, COL[clave].length).setFontWeight('bold');
    h.setFrozenRows(1);
    h.getRange(1, 1, 5000, COL[clave].length).setNumberFormat('@');      // todo texto: evita fechas/fórmulas automáticas
    if (clave === 'datos') h.hideSheet();
  }
  return h;
}
function tabla_(clave) {
  var h = hoja_(clave), n = h.getLastRow(), enc = COL[clave]; if (n < 2) return [];
  return h.getRange(2, 1, n - 1, enc.length).getValues().map(function (r, i) { var o = { _fila: i + 2 }; enc.forEach(function (c, j) { o[c] = r[j] === null || r[j] === undefined ? '' : (typeof r[j] === 'string' ? r[j] : String(r[j])); }); return o; });
}
function anexar_(clave, obj) { var h = hoja_(clave); h.getRange(h.getLastRow() + 1, 1, 1, COL[clave].length).setValues([COL[clave].map(function (c) { return obj[c] === undefined ? '' : String(obj[c]); })]); }
function guardarGrande_(codigo, tipo, obj) {
  var s = JSON.stringify(obj), filas = [];
  for (var i = 0; i * TROZO < s.length; i++) filas.push([codigo, tipo, String(i), s.substr(i * TROZO, TROZO)]);
  var h = hoja_('datos'); h.getRange(h.getLastRow() + 1, 1, filas.length, 4).setValues(filas);
}
function leerGrande_(codigo, tipo) {
  var cache = CacheService.getScriptCache(), k = tipo + ':' + codigo, n = cache.get(k + ':n');
  if (n) { var partes = [], ok = true; for (var i = 0; i < Number(n); i++) { var x = cache.get(k + ':' + i); if (x === null) { ok = false; break; } partes.push(x); } if (ok) return JSON.parse(partes.join('')); }
  var t = tabla_('datos').filter(function (r) { return r.codigo === codigo && r.tipo === tipo; }).sort(function (a, b) { return Number(a.idx) - Number(b.idx); });
  if (!t.length) throw error_('no_existe', 'No se encontraron los datos de la prueba.');
  var s = t.map(function (r) { return r.trozo; }).join('');
  try { var tr = s.match(new RegExp('[\\s\\S]{1,' + TROZO_CACHE + '}', 'g')) || ['']; tr.forEach(function (x, i) { cache.put(k + ':' + i, x, 3600); }); cache.put(k + ':n', String(tr.length), 3600); } catch (e) { }
  return JSON.parse(s);
}
