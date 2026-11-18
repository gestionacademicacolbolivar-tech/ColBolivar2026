# Índice por PÁRRAFOS para ARIA -> indice-parrafos.json
# Trozos cortos (~600 car.) que conservan: documento, página, TÍTULO DE SECCIÓN y tipo (texto | tabla | ocr).
# Une: texto limpio de los PDF (sin encabezados repetidos), OCR de páginas-imagen (datos/ocr-paginas.json),
# filas de tablas (datos/tablas-documentos.json) y las páginas HTML/MD/DOCX/TXT del repositorio.
import os, re, sys, json, glob, urllib.parse
sys.path.insert(0, os.path.dirname(__file__))
from pdftexto import paginas
from bs4 import BeautifulSoup
OWNER, _, REPO = os.environ.get("GITHUB_REPOSITORY", "gestionacademicacolbolivar-tech/ColBolivar2026").partition("/")
BASE = os.environ.get("SITE_BASE", f"https://{OWNER}.github.io/{REPO}/")
SKIP = {".git", ".github", "node_modules", "scripts", "__pycache__"}
CH, MINC = int(os.environ.get("ARIA_CH", "620")), 50
EXCL = []
try: EXCL = [l.split("#")[0].strip() for l in open("aria-conocimiento/excluir-del-indice.lst", encoding="utf-8") if l.split("#")[0].strip()]
except FileNotFoundError: pass
B64 = re.compile(r"[A-Za-z0-9+/=_-]{120,}")
RUIDO = re.compile(r"(versi[oó]n \d|dane \d|nit \d|educamos para construir|proyecto educativo institucional \d|^\W*gd-d\d|p[aá]gina \d+ de \d+)", re.I)
out = []
def L(t): return re.sub(r"\s+", " ", B64.sub(" ", t or "")).strip()
def es_titulo(s):
    s = s.strip()
    if len(s) < 5 or len(s) > 110 or s.endswith((",", ";")): return False
    if re.match(r"^(CAP[IÍ]TULO|T[IÍ]TULO|SECCI[OÓ]N|ART[IÍ]CULO|Art\.)\s*[\dIVXLC]+", s, re.I): return True
    if re.match(r"^\d+(\.\d+){0,3}\.?\s+[A-ZÁÉÍÓÚÑ][^.]{3,90}$", s): return True
    letras = re.sub(r"[^A-Za-zÁÉÍÓÚÑáéíóúñ]", "", s)
    return len(letras) >= 6 and s == s.upper() and not re.search(r"\d{4}|P[AÁ]GINA|COLEGIO INTEGRADO", s)
def partir(txt, n=CH):
    """Divide en trozos de ~n caracteres respetando oraciones, con 1 oración de traslape."""
    txt = L(txt)
    if len(txt) <= n: return [txt] if len(txt) >= MINC else []
    sents = re.split(r"(?<=[.;:?!])\s+(?=[A-ZÁÉÍÓÚÑ¿¡•\d-])", txt); res = []; cur = ""
    for s in sents:
        if len(cur) + len(s) + 1 > n and cur:
            res.append(cur.strip()); cur = (cur.split(". ")[-1] + " " if "." in cur[-200:] and len(cur.split(". ")[-1]) < 220 else "") + s
        else: cur = (cur + " " + s).strip()
        while len(cur) > n * 1.6: res.append(cur[:n].strip()); cur = cur[n - 80:]
    if len(cur.strip()) >= MINC: res.append(cur.strip())
    return res
def add(url, titulo, pag, sec, texto, k="texto"):
    for c in partir(texto):
        out.append({"u": url + (f"#page={pag}" if pag else ""), "t": titulo, "p": pag, "s": sec or "", "x": c, "k": k})
def url_de(rel): return BASE + urllib.parse.quote(rel)
def titulo_de(f): return f.rsplit(".", 1)[0].replace("_", " ").replace("-", " ")
ocr = json.load(open("datos/ocr-paginas.json", encoding="utf-8")) if os.path.exists("datos/ocr-paginas.json") else {}
tablas = json.load(open("datos/tablas-documentos.json", encoding="utf-8")).get("pdfs", {}) if os.path.exists("datos/tablas-documentos.json") else {}
for raiz, dirs, files in os.walk("."):
    dirs[:] = [d for d in dirs if d not in SKIP]
    for f in sorted(files):
        rel = os.path.relpath(os.path.join(raiz, f)).replace(os.sep, "/")
        if any(e in rel for e in EXCL): continue
        ext = f.lower().rsplit(".", 1)[-1] if "." in f else ""; url = url_de(rel); tit = titulo_de(f)
        try:
            if ext == "pdf":
                tam = os.path.getsize(rel); sec = ""
                for n, pg in enumerate(paginas(rel), 1):
                    txt = pg
                    o = ocr.get(f"{rel}|{n}|{tam}")
                    if o and len(re.sub(r"\s", "", pg)) < 150:
                        txt = "\n".join(l for l in o.split("\n") if l.strip() and not RUIDO.search(l)); kind = "ocr"
                    else: kind = "texto"
                    bloque = []
                    for ln in txt.split("\n"):
                        if es_titulo(ln):
                            if bloque: add(url, tit, n, sec, " ".join(bloque), kind); bloque = []
                            sec = L(ln)
                        else: bloque.append(ln)
                    if bloque: add(url, tit, n, sec, " ".join(bloque), kind)
                for t in tablas.get(rel, {}).get("tablas", []):
                    enc = t["encabezado"]; sec_t = "Tabla: " + " / ".join(c for c in enc if c)[:90]
                    for fila in t["filas"]:
                        pares = [(enc[i] if i < len(enc) and enc[i] else "", c) for i, c in enumerate(fila) if c]
                        if len(pares) < 2 and not any(len(c) > 120 for _, c in pares): continue
                        add(url, tit, t["pag"], sec_t, " | ".join((f"{h}: {c}" if h else c) for h, c in pares), "tabla")
            elif ext in ("html", "htm"):
                s = BeautifulSoup(open(rel, encoding="utf-8", errors="ignore").read(), "html.parser")
                for x in s(["script", "style", "noscript", "svg"]): x.decompose()
                if s.title and s.title.string: tit = s.title.string.strip()
                sec = ""; bloque = []
                for el in s.find_all(["h1", "h2", "h3", "h4", "p", "li", "td", "th", "div", "span", "button", "a"]):
                    if el.name in ("h1", "h2", "h3", "h4"):
                        if bloque: add(url, tit, None, sec, " ".join(bloque)); bloque = []
                        sec = L(el.get_text(" "))
                    elif not el.find(["p", "li", "div", "h1", "h2", "h3", "h4", "td"]):
                        t = L(el.get_text(" "))
                        if len(t) > 1: bloque.append(t)
                if bloque: add(url, tit, None, sec, " ".join(bloque))
            elif ext == "docx":
                import docx; add(url, tit, None, "", " ".join(p.text for p in docx.Document(rel).paragraphs))
            elif ext in ("md", "txt"):
                sec = ""
                for ln in open(rel, encoding="utf-8", errors="ignore").read().split("\n"):
                    m = re.match(r"^#{1,4}\s+(.*)", ln)
                    if m: sec = m.group(1)
                    elif ln.strip(): add(url, tit, None, sec, ln)
        except Exception as e: print("saltado", rel, e, file=sys.stderr)
json.dump(out, open("indice-parrafos.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
import collections
print(len(out), "fragmentos |", collections.Counter(c["k"] for c in out), "|", round(os.path.getsize("indice-parrafos.json") / 1024), "KB")
