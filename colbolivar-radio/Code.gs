/**
 * ColBolívar Radio · Muro de comentarios (Google Apps Script + Hoja de cálculo)
 * Pégalo en Extensiones → Apps Script de una hoja de cálculo nueva.
 * Antes de implementar: Configuración del proyecto → Propiedades del script → agrega ADMIN_KEY con tu clave.
 */
const MODERACION = true;   // true: cada comentario espera tu aprobación · false: se publica de inmediato
const MAX_TXT = 240, MAX_NOM = 30, ESPERA_SEG = 60, MAX_PUBLICOS = 60;
const MALAS = ['puta','puto','putas','mierda','marica','malparido','malparida','gonorrea','hijueputa','hp','verga','pene','vagina','culo','sexo','porno','idiota','estupido','imbecil','pendejo','cabron','coño','carajo','hijueputas','guevon','huevon','pirobo','zorra','perra'];

function hoja_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('Comentarios');
  if (!sh) {
    sh = ss.insertSheet('Comentarios');
    sh.getRange('A:F').setNumberFormat('@');
    sh.appendRow(['id', 'fecha', 'nombre', 'texto', 'estado', 'cid']);
    sh.setFrozenRows(1);
  }
  return sh;
}
function leer_() {
  const v = hoja_().getDataRange().getValues(); v.shift();
  return v.map((r, i) => ({ fila: i + 2, id: String(r[0]), f: String(r[1]), n: String(r[2]), t: String(r[3]), e: String(r[4]) }));
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function norm_(s) { return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
function malas_(s) {
  const t = norm_(s).replace(/(.)\1{2,}/g, '$1');
  return t.split(/[^a-zñ]+/).some(w => MALAS.indexOf(w) >= 0);
}
function publicos_() {
  const c = CacheService.getScriptCache(), k = c.get('pub');
  if (k) return JSON.parse(k);
  const l = leer_().filter(x => x.e === 'publicado').sort((a, b) => a.f < b.f ? 1 : -1).slice(0, MAX_PUBLICOS).map(x => ({ id: x.id, n: x.n, t: x.t, f: x.f }));
  c.put('pub', JSON.stringify(l), 30);
  return l;
}
function limpiar_() { CacheService.getScriptCache().remove('pub'); }
function claveOk_(key) {
  const c = CacheService.getScriptCache(), malos = Number(c.get('bad') || 0);
  if (malos >= 8) return { ok: false, error: 'Demasiados intentos. Espera 10 minutos.' };
  const real = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  if (!real) return { ok: false, error: 'Falta crear la propiedad ADMIN_KEY en el script.' };
  if (String(key || '') !== real) { c.put('bad', String(malos + 1), 600); return { ok: false, error: 'Clave incorrecta.' }; }
  return { ok: true };
}

function doGet() { return json_({ ok: true, items: publicos_(), moderacion: MODERACION }); }

function doPost(e) {
  let a;
  try { a = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'Solicitud no válida.' }); }
  const c = CacheService.getScriptCache();

  if (a.a === 'add') {
    if (a.hp) return json_({ ok: true, estado: 'pendiente' });                  // trampa para robots
    const cid = String(a.cid || '').replace(/[^\w-]/g, '').slice(0, 40) || 'x';
    if (c.get('rl_' + cid)) return json_({ ok: false, error: 'Espera un momentito antes de enviar otro comentario.' });
    const flujo = Number(c.get('flujo') || 0);
    if (flujo >= 40) return json_({ ok: false, error: 'Hay muchos comentarios en este momento. Intenta más tarde.' });
    let n = String(a.n || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_NOM) || 'Anónimo';
    let t = String(a.t || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim();
    if (t.length < 2) return json_({ ok: false, error: 'Escribe un comentario.' });
    if (t.length > MAX_TXT) return json_({ ok: false, error: 'El comentario es muy largo (máximo ' + MAX_TXT + ' letras).' });
    if (/https?:|www\.|@|\.(com|co|net|org|edu|me|ly|io)\b/i.test(t + ' ' + n)) return json_({ ok: false, error: 'No se permiten enlaces, correos ni redes sociales.' });
    if (/\d[\s.\-]?\d[\s.\-]?\d[\s.\-]?\d[\s.\-]?\d[\s.\-]?\d[\s.\-]?\d/.test(t + ' ' + n)) return json_({ ok: false, error: 'No escribas teléfonos ni datos personales.' });
    if (malas_(t) || malas_(n)) return json_({ ok: false, error: 'Tu comentario tiene palabras no permitidas. Escríbelo con respeto, ¿sí?' });
    if (/^[=+\-@]/.test(t)) t = ' ' + t;
    if (/^[=+\-@]/.test(n)) n = ' ' + n;
    const estado = MODERACION ? 'pendiente' : 'publicado';
    const lock = LockService.getScriptLock(); lock.waitLock(8000);
    try { hoja_().appendRow([Utilities.getUuid().slice(0, 8), new Date().toISOString(), n, t, estado, cid]); } finally { lock.releaseLock(); }
    c.put('rl_' + cid, '1', ESPERA_SEG); c.put('flujo', String(flujo + 1), 600); limpiar_();
    return json_({ ok: true, estado: estado });
  }

  const k = claveOk_(a.key); if (!k.ok) return json_(k);
  if (a.a === 'adm_list') {
    const l = leer_().sort((x, y) => x.f < y.f ? 1 : -1).map(x => ({ id: x.id, f: x.f, n: x.n, t: x.t, e: x.e }));
    return json_({ ok: true, items: l, moderacion: MODERACION });
  }
  if (a.a === 'adm_ok' || a.a === 'adm_del') {
    const lock = LockService.getScriptLock(); lock.waitLock(8000);
    try {
      const f = leer_().filter(x => x.id === String(a.id))[0];
      if (!f) return json_({ ok: false, error: 'No se encontró ese comentario.' });
      if (a.a === 'adm_ok') hoja_().getRange(f.fila, 5).setValue('publicado'); else hoja_().deleteRow(f.fila);
    } finally { lock.releaseLock(); }
    limpiar_(); return json_({ ok: true });
  }
  return json_({ ok: false, error: 'Acción desconocida.' });
}
