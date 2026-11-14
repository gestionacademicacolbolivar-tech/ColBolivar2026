#!/usr/bin/env python3
"""Genera datos/calendario.ics (suscripción para Google Calendar, Outlook y el celular) y datos/calendario-auto.json
(lo que dibuja la página calendario.html). Fuentes, todas editables por el colegio:
  - datos/hoy-data.js        -> las «fechas» de la portada (cierre de período, entrega de informes…)
  - datos/calendario.json    -> el resto del año escolar (períodos, reuniones, eventos, vacaciones…)
  - festivos de Colombia     -> se calculan solos (Ley Emiliani); no hay que escribirlos
Solo biblioteca estándar de Python."""
import json, re, os, hashlib, datetime as dt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def p(*a): return os.path.join(ROOT, *a)
def leer(r, d=""):
    try:
        with open(p(r), encoding="utf-8") as f: return f.read()
    except OSError: return d

def siguiente_lunes(d):
    return d if d.weekday() == 0 else d + dt.timedelta(days=7 - d.weekday())
def pascua(y):  # algoritmo de Meeus/Jones/Butcher
    a, b, c = y % 19, y // 100, y % 100; d, e = b // 4, b % 4; f = (b + 8) // 25; g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30; i, k = c // 4, c % 4; l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451; mes = (h + l - 7 * m + 114) // 31; dia = (h + l - 7 * m + 114) % 31 + 1
    return dt.date(y, mes, dia)
def festivos(y):
    P = pascua(y); F = []
    fijos = [(1, 1, "Año Nuevo"), (5, 1, "Día del Trabajo"), (7, 20, "Día de la Independencia"), (8, 7, "Batalla de Boyacá"), (12, 8, "Inmaculada Concepción"), (12, 25, "Navidad")]
    for m, d, n in fijos: F.append((dt.date(y, m, d), n))
    emiliani = [(1, 6, "Día de los Reyes Magos"), (3, 19, "Día de San José"), (6, 29, "San Pedro y San Pablo"), (8, 15, "Asunción de la Virgen"), (10, 12, "Día de la Raza"), (11, 1, "Todos los Santos"), (11, 11, "Independencia de Cartagena")]
    for m, d, n in emiliani: F.append((siguiente_lunes(dt.date(y, m, d)), n))
    F += [(P - dt.timedelta(days=3), "Jueves Santo"), (P - dt.timedelta(days=2), "Viernes Santo"),
          (siguiente_lunes(P + dt.timedelta(days=39)), "Ascensión del Señor"), (siguiente_lunes(P + dt.timedelta(days=60)), "Corpus Christi"), (siguiente_lunes(P + dt.timedelta(days=68)), "Sagrado Corazón")]
    return sorted(F)

def tipo_de(t):
    s = t.lower()
    if "informe" in s: return "informes"
    if "período" in s or "periodo" in s: return "periodo"
    if "vacacion" in s or "receso" in s: return "vacaciones"
    if "reuni" in s or "asamblea" in s or "escuela de padres" in s: return "reunion"
    return "evento"

eventos = {}
def agregar(t, f, fin="", tipo=None, d="", origen="institucional"):
    try: ini = dt.date.fromisoformat(f); fi = dt.date.fromisoformat(fin) if fin else ini
    except ValueError: return
    if fi < ini: fi = ini
    k = (t.strip().lower(), ini.isoformat())
    eventos[k] = {"t": t.strip(), "f": ini.isoformat(), "fin": fi.isoformat(), "tipo": tipo or tipo_de(t), "d": d.strip(), "o": origen}

hoy_js = leer("datos/hoy-data.js")
bloque = re.search(r"fechas:\s*\[(.*?)\]", hoy_js, re.S)
for t, f in re.findall(r'\{\s*t:\s*"([^"]+)"\s*,\s*f:\s*"(\d{4}-\d{2}-\d{2})"\s*\}', bloque.group(1) if bloque else ""):
    agregar(t, f)
try: extra = json.loads(leer("datos/calendario.json", "{}")).get("eventos", [])
except ValueError: extra = []
for e in extra:
    if e.get("t") and e.get("f"): agregar(e["t"], e["f"], e.get("fin", ""), e.get("tipo"), e.get("d", ""))
hoy = dt.date.today()
for y in (hoy.year, hoy.year + 1):
    for d, n in festivos(y): agregar(n, d.isoformat(), tipo="festivo", origen="festivo")
lista = sorted(eventos.values(), key=lambda e: (e["f"], e["t"]))
for e in lista: e["id"] = hashlib.sha1((e["t"] + e["f"]).encode()).hexdigest()[:12]

# ---------- .ics ----------
def esc(s): return s.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")
def doblar(l):  # líneas de máx. 75 octetos
    b = l.encode("utf-8")
    if len(b) <= 75: return [l]
    out, cur = [], ""
    for ch in l:
        if len((cur + ch).encode("utf-8")) > (75 if not out else 74): out.append(cur); cur = ch
        else: cur += ch
    out.append(cur); return [out[0]] + [" " + x for x in out[1:]]
L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ColBolivar//Calendario institucional//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
     "X-WR-CALNAME:Calendario ColBolívar", "X-WR-CALDESC:Fechas institucionales del Colegio Integrado Simón Bolívar (Cúcuta)", "X-WR-TIMEZONE:America/Bogota",
     "REFRESH-INTERVAL;VALUE=DURATION:PT12H", "X-PUBLISHED-TTL:PT12H"]
ETQ = {"periodo": "Período", "informes": "Informes", "reunion": "Reunión", "vacaciones": "Vacaciones", "festivo": "Festivo", "evento": "Evento"}
for e in lista:
    ini = dt.date.fromisoformat(e["f"]); fin = dt.date.fromisoformat(e["fin"]) + dt.timedelta(days=1)
    L += ["BEGIN:VEVENT", f"UID:{e['id']}@colbolivar", "DTSTAMP:20260101T000000Z", f"DTSTART;VALUE=DATE:{ini:%Y%m%d}", f"DTEND;VALUE=DATE:{fin:%Y%m%d}",
          "SUMMARY:" + esc(("🏛️ " if e["tipo"] != "festivo" else "🇨🇴 ") + e["t"]), "CATEGORIES:" + esc(ETQ.get(e["tipo"], "Evento")), "TRANSP:TRANSPARENT"]
    if e["d"]: L.append("DESCRIPTION:" + esc(e["d"]))
    if e["tipo"] in ("periodo", "informes", "reunion", "evento"):
        L += ["BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", "DESCRIPTION:" + esc("Mañana: " + e["t"]), "END:VALARM"]
    L.append("END:VEVENT")
L.append("END:VCALENDAR")
ics = "\r\n".join(x for l in L for x in doblar(l)) + "\r\n"

def escribir(ruta, contenido, binario=False):
    try:
        with open(p(ruta), "rb") as f: viejo = f.read()
    except OSError: viejo = None
    nuevo = contenido.encode("utf-8")
    if viejo == nuevo: print("sin cambios:", ruta); return
    with open(p(ruta), "wb") as f: f.write(nuevo)
    print("actualizado:", ruta)
escribir("datos/calendario.ics", ics)
escribir("datos/calendario-auto.json", json.dumps({"v": 1, "eventos": lista}, ensure_ascii=False, separators=(",", ":")))
