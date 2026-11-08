# Recorre documentos/**/*.pdf y crea datos/catalogo-documentos.json (título, carpeta, páginas, peso).
# La página «Documentos institucionales» lo lee para mostrar solos los PDF que se suban a la carpeta documentos/.
import os, re, json, datetime
from pypdf import PdfReader
CARPETAS = {"academicos": "Académicos", "convivencia-e-inclusion": "Convivencia e inclusión", "proyectos-y-gestion": "Proyectos y gestión"}
SIGLAS = {"PEI","SIEE","PIAR","DUA","PEGRD","SSEO","PRAE","ICFES","MEN","SENA","TIC","PMI","PAE","GA","GD","GC"}
CHICAS = {"de","del","la","las","el","los","y","e","o","en","a","para","con","por","al","un","una"}
def bonita_carpeta(n):
    n = re.sub(r"^\d+[-_ ]*", "", n)
    return CARPETAS.get(n, n.replace("-", " ").replace("_", " ").strip().capitalize())
def bonito(nombre):
    t = re.sub(r"\.pdf$", "", nombre, flags=re.I).replace("_", " ")
    t = re.sub(r"\s+", " ", t).strip()
    letras = [c for c in t if c.isalpha()]
    if letras and sum(c.isupper() for c in letras) / len(letras) > 0.6:
        out = []
        for i, w in enumerate(t.split(" ")):
            if i and w.lower() in CHICAS: out.append(w.lower())
            elif w.upper() in SIGLAS or re.search(r"\d", w) or "-" in w: out.append(w.upper() if w.upper() in SIGLAS else w)
            else: out.append(w.capitalize())
        t = " ".join(out)
    return t
docs = []
for raiz, dirs, files in os.walk("documentos"):
    dirs[:] = sorted(d for d in dirs if not d.startswith((".", "_")))
    for f in sorted(files):
        if not f.lower().endswith(".pdf"): continue
        ruta = os.path.join(raiz, f).replace(os.sep, "/")
        partes = ruta.split("/")
        carpeta = bonita_carpeta(partes[1]) if len(partes) > 2 else "Sin clasificar"
        try: pag = len(PdfReader(ruta).pages)
        except Exception: pag = 0
        docs.append({"r": ruta, "t": bonito(f), "c": carpeta, "ci": partes[1] if len(partes) > 2 else "", "p": pag, "kb": os.path.getsize(ruta) // 1024})
docs.sort(key=lambda d: (d["ci"], d["t"].lower()))
os.makedirs("datos", exist_ok=True)
json.dump({"v": 1, "generado": datetime.date.today().isoformat(), "docs": docs}, open("datos/catalogo-documentos.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(len(docs), "documentos en el catálogo")
