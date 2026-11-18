# Extrae las TABLAS de los PDF como datos estructurados -> datos/tablas-documentos.json (y filas legibles para el índice de ARIA).
# Cachea por PDF (nombre+tamaño): si no cambió, no lo vuelve a procesar. Requiere: pdfplumber.
import os, re, sys, json, glob
import pdfplumber
OUT = "datos/tablas-documentos.json"
EXCL = []
try: EXCL = [l.split("#")[0].strip() for l in open("aria-conocimiento/excluir-del-indice.lst", encoding="utf-8") if l.split("#")[0].strip()]
except FileNotFoundError: pass
prev = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {"pdfs": {}}
res = {"pdfs": {}}
def cel(c): return re.sub(r"\s+", " ", (c or "").replace("\n", " ")).strip()
def util(t):
    celdas = [c for r in t for c in r if c]
    return len(t) >= 2 and max(len(r) for r in t) >= 2 and len(celdas) >= 4 and sum(len(c) for c in celdas) >= 25
for pdf in sorted(glob.glob("**/*.pdf", recursive=True)):
    if any(e in pdf for e in EXCL): continue
    tam = os.path.getsize(pdf); ent = prev["pdfs"].get(pdf)
    if ent and ent.get("tam") == tam: res["pdfs"][pdf] = ent; continue
    tablas = []
    try:
        with pdfplumber.open(pdf) as doc:
            for n, pg in enumerate(doc.pages, 1):
                try: tbs = pg.extract_tables()
                except Exception: continue
                for i, t in enumerate(tbs, 1):
                    f = [[cel(c) for c in r] for r in t]
                    f = [r for r in f if any(r)]
                    if not util(f): continue
                    tablas.append({"pag": n, "n": i, "encabezado": f[0], "filas": f[1:]})
    except Exception as e: print("saltado", pdf, e, file=sys.stderr)
    # descarta tablas que se repiten en muchas páginas (encabezados/pies de página del formato institucional)
    import collections
    sig = lambda t: re.sub(r"\d+", "#", " ".join(t["encabezado"]).lower())[:120]
    c = collections.Counter(sig(t) for t in tablas)
    npag = max(t["pag"] for t in tablas) if tablas else 1
    tablas = [t for t in tablas if c[sig(t)] < max(4, 0.2 * npag)]
    res["pdfs"][pdf] = {"tam": tam, "tablas": tablas}
    print(f"{len(tablas):3d} tablas | {os.path.basename(pdf)[:60]}", flush=True)
os.makedirs("datos", exist_ok=True)
json.dump(res, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("tablas totales:", sum(len(v["tablas"]) for v in res["pdfs"].values()))
