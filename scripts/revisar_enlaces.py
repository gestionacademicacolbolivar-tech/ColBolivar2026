#!/usr/bin/env python3
"""Revisa los enlaces del portal y escribe datos/estado-enlaces.json (lo que muestra estado.html).
  🟢 ok  ·  🟡 intermitente (falló hoy; si falla otra vez pasa a rojo)  ·  🔴 caído  ·  ⚪ no verificable (el sitio bloquea robots, p. ej. redes sociales)
  python scripts/revisar_enlaces.py            -> revisa todo
  python scripts/revisar_enlaces.py --informe  -> imprime en Markdown los enlaces caídos (para el aviso de GitHub)
Variable SIN_RED=1 -> solo revisa los enlaces internos (pruebas)."""
import json, re, os, sys, html, time, datetime as dt, urllib.request, urllib.error, urllib.parse, ssl
from concurrent.futures import ThreadPoolExecutor
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def p(*a): return os.path.join(ROOT, *a)
HOY = dt.datetime.now(ZoneInfo("America/Bogota")).date().isoformat()
UA = "Mozilla/5.0 (compatible; ColBolivarLinkCheck/1.0; +https://github.com/gestionacademicacolbolivar-tech/ColBolivar2026)"
BLOQUEAN = ("facebook.com", "fb.com", "fb.watch", "instagram.com", "tiktok.com", "twitter.com", "x.com", "linkedin.com", "wa.me", "whatsapp.com", "youtube.com", "youtu.be", "canva.com")
IGNORAR_DIR = {".git", ".github", "node_modules", "assets", "colbolivar-radio"}
def leer(r):
    try:
        with open(p(r), encoding="utf-8", errors="replace") as f: return f.read()
    except OSError: return ""

# ---------- recolectar enlaces ----------
externos, internos = {}, {}      # url -> {"fuentes": set, "n": nombre}
def anotar(dic, u, fuente, nombre=""):
    d = dic.setdefault(u, {"fuentes": set(), "n": ""}); d["fuentes"].add(fuente)
    if nombre and not d["n"]: d["n"] = nombre
def clasificar(u, fuente, nombre=""):
    u = html.unescape(u.strip())
    if not u or u.startswith(("#", "mailto:", "tel:", "javascript:", "data:", "sms:", "webcal:", "whatsapp:")) or re.search(r"[{}']|\+|\$\{", u): return
    if u.startswith("//"): u = "https:" + u
    if re.match(r"https?://", u): anotar(externos, u.split("#")[0], fuente, nombre)
    elif not re.match(r"^[a-z]+:", u):
        ruta = urllib.parse.unquote(u.split("#")[0].split("?")[0])
        if ruta: anotar(internos, (os.path.normpath(os.path.join(os.path.dirname(fuente), ruta)) if not ruta.startswith("/") else ruta.lstrip("/")), fuente, nombre)

idx = leer("index.html")
B = (re.search(r"const B='([^']+)'", idx) or [0, ""])[1]
for t, d, u in re.findall(r"\['([^']+)','([^']*)',((?:B|G)\+'[^']*'|'https?://[^']*')", idx):   # tarjetas de servicios
    if u.startswith("B+"): clasificar(B + u[3:-1], "index.html", t)
    elif u.startswith("G+"): clasificar(u[3:-1], "index.html", t)
    else: clasificar(u.strip("'"), "index.html", t)
hoy_js = leer("datos/hoy-data.js")
for u in re.findall(r'"(https?://[^"]+)"', hoy_js): clasificar(u, "datos/hoy-data.js")
for dirpath, dirs, files in os.walk(ROOT):
    dirs[:] = [d for d in dirs if d not in IGNORAR_DIR and not d.startswith(".")]
    for fn in files:
        if not fn.endswith(".html"): continue
        rel = os.path.relpath(os.path.join(dirpath, fn), ROOT)
        txt = leer(rel)
        for u in re.findall(r"""(?:href|src)=["']([^"']+)["']""", txt): clasificar(u, rel)

# ---------- revisar ----------
previo = {}
try: previo = {e["u"]: e for e in json.load(open(p("datos/estado-enlaces.json"), encoding="utf-8")).get("enlaces", [])}
except Exception: pass
CTX = ssl.create_default_context()
def pedir(u, metodo):
    req = urllib.request.Request(u, method=metodo, headers={"User-Agent": UA, "Accept": "*/*"})
    return urllib.request.urlopen(req, timeout=15, context=CTX)
def chequear(u):
    """Devuelve (estado_bruto, código): ok | no_verificable | falla | muerto"""
    host = urllib.parse.urlparse(u).hostname or ""
    if any(host == b or host.endswith("." + b) for b in BLOQUEAN): return "no_verificable", 0
    ultimo = 0
    for intento in range(2):
        for metodo in ("HEAD", "GET"):
            try:
                with pedir(u, metodo) as r: return "ok", r.status
            except urllib.error.HTTPError as e:
                ultimo = e.code
                if e.code in (405, 501, 400) and metodo == "HEAD": continue
                if e.code in (401, 403, 429, 999): return "no_verificable", e.code
                if e.code in (404, 410): return "muerto", e.code
                break
            except Exception: ultimo = 0; break
        time.sleep(1)
    return "falla", ultimo
def estado_final(u, bruto, codigo):
    if bruto == "muerto": return "caido"
    if bruto == "falla": return "caido" if previo.get(u, {}).get("estado") in ("intermitente", "caido") else "intermitente"
    return bruto
res = []
for u, d in internos.items():
    if u.startswith(("http", "assets/")) and False: continue
    ok = os.path.exists(p(u)) or os.path.exists(p(u.rstrip("/"), "index.html"))
    res.append({"u": u, "n": d["n"], "origen": "interno", "fuentes": sorted(d["fuentes"])[:3], "estado": "ok" if ok else "caido", "codigo": 200 if ok else 404})
if not os.environ.get("SIN_RED"):
    with ThreadPoolExecutor(8) as ex: salidas = list(ex.map(lambda u: chequear(u), externos))
    for u, (bruto, codigo) in zip(externos, salidas):
        d = externos[u]; res.append({"u": u, "n": d["n"], "origen": "externo", "fuentes": sorted(d["fuentes"])[:3], "estado": estado_final(u, bruto, codigo), "codigo": codigo})
for e in res:
    pv = previo.get(e["u"], {})
    e["desde"] = pv.get("desde", HOY) if e["estado"] == pv.get("estado") else HOY
orden = {"caido": 0, "intermitente": 1, "no_verificable": 2, "ok": 3}
res.sort(key=lambda e: (orden[e["estado"]], e["origen"], e["u"]))
resumen = {k: sum(1 for e in res if e["estado"] == k) for k in orden}; resumen["total"] = len(res)

if "--informe" in sys.argv:
    rojos = [e for e in res if e["estado"] == "caido"]
    print("Estos enlaces del portal no responden (revisión del " + HOY + "):\n")
    for e in rojos: print(f"- **{e['n'] or e['u']}** → `{e['u']}` · código {e['codigo'] or 'sin respuesta'} · desde {e['desde']} · aparece en: {', '.join(e['fuentes'])}")
    print("\nVer el panel completo en `estado.html`. Este aviso se actualiza solo y se cierra cuando todo vuelva a funcionar.")
    sys.exit(0)

nuevo = {"v": 1, "generado": dt.datetime.now(ZoneInfo("America/Bogota")).isoformat(timespec="minutes"), "resumen": resumen, "enlaces": res}
try: viejo = json.load(open(p("datos/estado-enlaces.json"), encoding="utf-8"))
except Exception: viejo = {}
if viejo.get("resumen") == resumen and viejo.get("enlaces") == res: print("sin cambios en el estado de los enlaces")
else:
    with open(p("datos/estado-enlaces.json"), "w", encoding="utf-8") as f: json.dump(nuevo, f, ensure_ascii=False, separators=(",", ":"))
    print("actualizado: datos/estado-enlaces.json")
print(resumen)
