/**
 * ColBolívar · Autoevaluación institucional 2026 (Guía 34 MEN) — recolección ANÓNIMA
 * Pega este código en: Hoja de cálculo → Extensiones → Apps Script. Luego Implementar → Nueva implementación
 * → Aplicación web → Ejecutar como: Yo · Quién tiene acceso: Cualquier persona. Copia la URL /exec a
 * datos/autoevaluacion-config.json
 * No se guarda nombre, correo ni IP. Solo: fecha, un código aleatorio del envío (evita duplicados por reintento),
 * el rol (opcional), las valoraciones 1-4 y los comentarios por proceso.
 */
var VERSION = '1.0';
var CLAVE_ENVIAR = '';   // opcional: clave común para que solo el personal pueda enviar (y pon pedirClaveEnviar:true en el config)
var CLAVE_VER = '';      // opcional: clave para ver el tablero (y pon pedirClaveVer:true en el config)
var HOJA = 'Respuestas';

function resp_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function hoja_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), h = ss.getSheetByName(HOJA);
  if (!h) { h = ss.insertSheet(HOJA); h.appendRow(['fecha', 'codigo_envio', 'rol', 'valoraciones_json', 'comentarios_json', 'componentes_valorados']); h.setFrozenRows(1); }
  return h;
}

function doGet(e) {
  var a = (e && e.parameter && e.parameter.accion) || 'ping';
  if (a === 'ping') return resp_({ ok: true, version: VERSION });
  if (a === 'resultados') {
    if (CLAVE_VER && e.parameter.clave !== CLAVE_VER) return resp_({ ok: false, error: 'clave', mensaje: 'La clave no es correcta.' });
    var v = hoja_().getDataRange().getValues(), out = [];
    for (var i = 1; i < v.length; i++) {
      try { out.push({ t: (v[i][0] instanceof Date) ? v[i][0].toISOString() : String(v[i][0]), rol: String(v[i][2] || ''), r: JSON.parse(v[i][3]), c: JSON.parse(v[i][4] || '{}') }); } catch (x) {}
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
    if (CLAVE_ENVIAR && d.clave !== CLAVE_ENVIAR) return resp_({ ok: false, error: 'clave', mensaje: 'La clave de participación no es correcta.' });
    var r = {}, n = 0;
    for (var k in (d.r || {})) { if (/^G[DAFC]P\d+C\d+$/.test(k)) { var x = Number(d.r[k]); if (x >= 0 && x <= 4) { r[k] = x; if (x > 0) n++; } } }
    if (!n) return resp_({ ok: false, error: 'vacio', mensaje: 'No hay valoraciones para guardar.' });
    var c = {};
    for (var p in (d.c || {})) { if (/^G[DAFC]P\d+$/.test(p)) c[p] = String(d.c[p]).slice(0, 1200); }
    var id = String(d.id || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
    var h = hoja_(), last = h.getLastRow();
    if (id && last > 1) {
      var ids = h.getRange(2, 2, last - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) if (ids[i][0] === id) return resp_({ ok: true, duplicado: true });
    }
    var rol = String(d.rol || '').replace(/[^\wáéíóúñÁÉÍÓÚÑ ,.\-]/g, '').slice(0, 60);
    h.appendRow([new Date(), id, rol, JSON.stringify(r), JSON.stringify(c), n]);
    return resp_({ ok: true });
  } catch (err) {
    return resp_({ ok: false, error: 'servidor', mensaje: String(err) });
  } finally { lock.releaseLock(); }
}
