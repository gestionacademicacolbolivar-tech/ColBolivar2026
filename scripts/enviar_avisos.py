#!/usr/bin/env python3
"""Envía avisos push (OneSignal, gratis) de las novedades nuevas y de las fechas límite próximas (3 días, 1 día y el mismo día).
Solo actúa si existen los secretos ONESIGNAL_APP_ID y ONESIGNAL_API_KEY en GitHub; si no, no hace nada.
Guarda en datos/avisos-enviados.json lo ya avisado para no repetir."""
import json, os, urllib.request
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP, KEY = os.environ.get("ONESIGNAL_APP_ID", "").strip(), os.environ.get("ONESIGNAL_API_KEY", "").strip()
SITE = os.environ.get("SITE_URL", "https://gestionacademicacolbolivar-tech.github.io/ColBolivar2026/").rstrip("/") + "/"
if not (APP and KEY):
    print("Avisos push desactivados (faltan los secretos de OneSignal)."); raise SystemExit(0)
def cargar(r, d):
    try:
        with open(os.path.join(ROOT, r), encoding="utf-8") as f: return json.load(f)
    except Exception: return d
hoy = cargar("datos/hoy-auto.json", {}); ya = cargar("datos/avisos-enviados.json", {"ids": []})
ids = list(ya.get("ids", []))
pendientes = []
for n in hoy.get("novedades", []):
    if n["id"] not in ids:
        u = n["u"] if n["u"].startswith("http") else SITE + n["u"]
        pendientes.append((n["id"], "Nuevo en ColBolívar", n["t"], u))
for f in hoy.get("fechas", []):
    if f["dias"] in (3, 1, 0):
        i = f"fecha:{f['t']}:{f['f']}:{f['dias']}"
        if i not in ids:
            cuando = "es hoy" if f["dias"] == 0 else ("es mañana" if f["dias"] == 1 else f"es en {f['dias']} días")
            pendientes.append((i, "Fecha importante", f"{f['t']} {cuando}", SITE))
# la primera vez (sin historial) solo se registran las novedades ya existentes, para no avisar de lo viejo
if not ya.get("ids") and not os.path.exists(os.path.join(ROOT, "datos/avisos-enviados.json")):
    ids = [x[0] for x in pendientes if x[0].startswith("doc:") or x[0].startswith("man:")]
    pendientes = [x for x in pendientes if x[0] not in ids]
for i, titulo, texto, url in pendientes[:3]:
    cuerpo = {"app_id": APP, "included_segments": ["Subscribed Users"], "target_channel": "push",
              "headings": {"es": titulo, "en": titulo}, "contents": {"es": texto, "en": texto}, "url": url}
    req = urllib.request.Request("https://api.onesignal.com/notifications", data=json.dumps(cuerpo).encode(),
          headers={"Content-Type": "application/json", "Authorization": "Key " + KEY}, method="POST")
    try:
        urllib.request.urlopen(req, timeout=30); ids.append(i); print("Enviado:", texto)
    except Exception as e: print("No se pudo enviar:", texto, e)
with open(os.path.join(ROOT, "datos/avisos-enviados.json"), "w", encoding="utf-8") as f:
    json.dump({"ids": ids[-300:]}, f, ensure_ascii=False)
