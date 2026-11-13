#!/usr/bin/env python3
"""Genera, cada noche, los datos vivos del portal (solo con lo que existe en el repositorio):
  datos/hoy-auto.json     -> cumpleaños de hoy y próximos, fechas límite, novedades (documentos nuevos/actualizados
                             y avisos manuales) y qué servicios llevan la insignia NUEVO.
  datos/cifras-auto.json  -> números del panel «Colegio en cifras» (documentos, ARIA, procesos de calidad,
                             comunidad y actividad del portal) + los datos manuales de datos/cifras-manual.json.
Solo usa la biblioteca estándar de Python (no instala nada)."""
import json, re, subprocess, datetime as dt, os, collections
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TZ = ZoneInfo("America/Bogota")
HOY = dt.datetime.now(TZ).date()
MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"]

def p(*a): return os.path.join(ROOT, *a)
def leer(ruta, defecto=None):
    try:
        with open(p(ruta), encoding="utf-8") as f: return f.read()
    except OSError: return defecto
def leer_json(ruta, defecto):
    t = leer(ruta)
    try: return json.loads(t) if t else defecto
    except ValueError: return defecto
def git(*args):
    try: return subprocess.run(["git", "-c", "core.quotepath=false", *args], cwd=ROOT, capture_output=True, text=True, check=True).stdout
    except Exception: return ""
def guardar(ruta, data):
    """Escribe solo si cambió algo (ignorando 'generado') para no llenar el historial de commits."""
    viejo = leer_json(ruta, {})
    a = {k: v for k, v in viejo.items() if k != "generado"}; b = {k: v for k, v in data.items() if k != "generado"}
    if a == b: print("sin cambios:", ruta); return
    with open(p(ruta), "w", encoding="utf-8") as f: json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print("actualizado:", ruta)
def bonito(nombre):
    t = re.sub(r"\.pdf$", "", os.path.basename(nombre), flags=re.I).replace("_", " ").strip()
    return t

# ---------- lectura de los archivos que edita el colegio ----------
hoy_js = leer("datos/hoy-data.js", "")
bloque = re.search(r"fechas:\s*\[(.*?)\]", hoy_js, re.S)
fechas = []
for t, f in re.findall(r'\{\s*t:\s*"([^"]+)"\s*,\s*f:\s*"(\d{4}-\d{2}-\d{2})"\s*\}', bloque.group(1) if bloque else ""):
    d = dt.date.fromisoformat(f)
    if d >= HOY: fechas.append({"t": t, "f": f, "dias": (d - HOY).days})
fechas.sort(key=lambda x: x["f"])
aviso = (re.search(r'aviso:\s*"([^"]*)"', hoy_js) or [None, ""])[1]
if aviso.startswith("📢 Aviso: escribe aquí"): aviso = ""   # texto de ejemplo, no es un aviso real

cj = re.search(r"window\.CUMPLES\s*=\s*(\[.*\])\s*;?", leer("datos/cumpleanos-data.js", ""), re.S)
cumples = json.loads(cj.group(1)) if cj else []
def proxima(c):
    for anio in (HOY.year, HOY.year + 1):
        try:
            d = dt.date(anio, c["m"], c["d"])
            if d >= HOY: return d
        except ValueError: pass
c_hoy, c_prox = [], []
for c in cumples:
    d = proxima(c)
    if not d: continue
    n = (d - HOY).days
    if n == 0: c_hoy.append({"n": c["n"], "s": c.get("s")})
    elif n <= 7: c_prox.append({"n": c["n"], "d": c["d"], "m": c["m"], "s": c.get("s"), "en": n})
c_prox.sort(key=lambda x: x["en"])

# ---------- novedades: PDF nuevos/actualizados en documentos/ + avisos manuales ----------
cfg = leer_json("datos/novedades-config.json", {})
ventana = int(cfg.get("ventana_dias", 14))
desde = max(HOY - dt.timedelta(days=ventana), dt.date.fromisoformat(cfg.get("ignorar_antes_de", "2000-01-01")))
catalogo = {d["r"]: d["t"] for d in leer_json("datos/catalogo-documentos.json", {}).get("docs", [])}
vistos, novedades = {}, []
for bloque_git in git("log", f"--since={desde.isoformat()}", "--name-status", "--format=@@%cs", "--", "documentos").split("@@")[1:]:
    lineas = bloque_git.strip().splitlines()
    if not lineas: continue
    fecha = lineas[0].strip()
    for l in lineas[1:]:
        partes = l.split("\t")
        if len(partes) < 2: continue
        estado, ruta = partes[0][0], partes[-1]
        if not ruta.lower().endswith(".pdf") or estado == "D" or not os.path.exists(p(ruta)): continue
        v = vistos.setdefault(ruta, {"f": fecha, "nuevo": False})
        if estado in "AR": v["nuevo"] = True
for ruta, v in vistos.items():
    es_circ = "circular" in ruta.lower()
    titulo = catalogo.get(ruta) or bonito(ruta)
    novedades.append({"id": "doc:" + ruta, "t": ("Documento nuevo: " if v["nuevo"] else "Documento actualizado: ") + titulo,
                      "u": "visor.html?" + urlencode({"f": ruta, "t": titulo}), "f": v["f"],
                      "tipo": "circular" if es_circ else "documento",
                      "servicio": "Circulares" if es_circ else "Documentos institucionales"})
for m in leer_json("datos/novedades-manual.json", []):   # avisos escritos a mano (circulares del Wix, etc.)
    try: d = dt.date.fromisoformat(m["f"])
    except Exception: continue
    if d >= HOY - dt.timedelta(days=ventana) and m.get("t") and m.get("u"):
        novedades.append({"id": "man:" + m["f"] + "|" + m["t"], "t": m["t"], "u": m["u"], "f": m["f"],
                          "tipo": m.get("tipo", "aviso"), "servicio": m.get("servicio", "Circulares")})
novedades.sort(key=lambda x: x["f"], reverse=True); novedades = novedades[:12]
servicios = {}
for n in novedades:
    s = servicios.setdefault(n["servicio"], {"f": n["f"], "n": 0}); s["n"] += 1
    if n["f"] > s["f"]: s["f"] = n["f"]

ahora = dt.datetime.now(TZ).isoformat(timespec="minutes")
guardar("datos/hoy-auto.json", {"v": 1, "generado": ahora, "fecha": HOY.isoformat(), "aviso": aviso,
    "cumples": {"hoy": c_hoy, "proximos": c_prox, "mes": {"nombre": MESES[HOY.month - 1], "total": sum(1 for c in cumples if c["m"] == HOY.month)}},
    "fechas": fechas, "novedades": novedades, "servicios": servicios})

# ---------- cifras ----------
docs = leer_json("datos/catalogo-documentos.json", {}).get("docs", [])
por_cat = collections.OrderedDict()
for d in docs:
    c = por_cat.setdefault(d.get("c", "Otros"), {"c": d.get("c", "Otros"), "n": 0, "p": 0}); c["n"] += 1; c["p"] += d.get("p", 0)
indice = leer_json("indice-docs.json", [])
temas = leer_json("aria-conocimiento/base-colegio.json", {}).get("entradas", [])
proc = leer_json("procesos/procesos.json", {})
gest = [{"id": g.get("id"), "nombre": g.get("nombre"), "color": g.get("color"), "emoji": g.get("emoji"),
         "procesos": len(g.get("procesos", [])),
         "subprocesos": sum(len(x.get("sub", [])) for x in g.get("procesos", []))} for g in proc.get("gestiones", [])]
por_sede, por_mes = collections.Counter(), [0] * 12
for c in cumples:
    por_sede[str(c.get("s"))] += 1; por_mes[c["m"] - 1] += 1
sem = collections.Counter(); lunes0 = HOY - dt.timedelta(days=HOY.weekday())
ultimo = ""
for l in git("log", "--since=90 days ago", "--format=%cs|%s").splitlines():
    f, _, msg = l.partition("|")
    if msg.startswith(("Actualizar índice de ARIA", "Actualizar tablero")): continue
    ultimo = ultimo or f
    sem[(dt.date.fromisoformat(f) - dt.timedelta(days=dt.date.fromisoformat(f).weekday()))] += 1
actividad = [{"s": (lunes0 - dt.timedelta(weeks=i)).isoformat(), "n": sem.get(lunes0 - dt.timedelta(weeks=i), 0)} for i in range(11, -1, -1)]
guardar("datos/cifras-auto.json", {"v": 1, "generado": ahora,
    "documentos": {"total": len(docs), "paginas": sum(d.get("p", 0) for d in docs), "por_categoria": list(por_cat.values())},
    "aria": {"temas": len(temas), "fragmentos": len(indice), "documentos_indexados": len({(x.get("u") or "").split("#")[0] for x in indice})},
    "calidad": {"gestiones": gest, "evidencias": len(proc.get("evidencias", {}))},
    "comunidad": {"por_sede": dict(por_sede), "por_mes": por_mes, "total": len(cumples)},
    "actividad": {"semanas": actividad, "ultimo_cambio": ultimo},
    "manual": leer_json("datos/cifras-manual.json", {})})
