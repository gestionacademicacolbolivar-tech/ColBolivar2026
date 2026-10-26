# Recorre TODO el repositorio y crea indice-docs.json (texto de PDF, HTML, DOCX, MD, TXT) para ARIA.
import os, re, json, sys, urllib.parse
from pypdf import PdfReader
from bs4 import BeautifulSoup
OWNER, _, REPO = os.environ.get("GITHUB_REPOSITORY", "gestionacademicacolbolivar-tech/ColBolivar2026").partition("/")
BASE = os.environ.get("SITE_BASE", f"https://{OWNER}.github.io/{REPO}/")
SKIP = {".git", ".github", "node_modules", "scripts", "__pycache__"}
B64 = re.compile(r"[A-Za-z0-9+/=_-]{120,}")
out = []
def limpiar(t): return re.sub(r"\s+", " ", B64.sub(" ", t)).strip()
def trozos(t, n=900):
    t = limpiar(t); i = 0
    while i < len(t):
        j = min(len(t), i + n)
        if j < len(t):
            k = t.rfind(". ", i + n // 2, j)
            j = k + 1 if k > 0 else j
        yield t[i:j].strip(); i = j
def add(url, titulo, texto, pag=None):
    for c in trozos(texto):
        if len(c) > 40: out.append({"u": url + (f"#page={pag}" if pag else ""), "t": titulo, "p": pag, "x": c})
for raiz, dirs, files in os.walk("."):
    dirs[:] = [d for d in dirs if d not in SKIP]
    for f in files:
        ruta = os.path.join(raiz, f); rel = os.path.relpath(ruta).replace(os.sep, "/")
        url = BASE + urllib.parse.quote(rel); ext = f.lower().rsplit(".", 1)[-1] if "." in f else ""
        titulo = f.rsplit(".", 1)[0].replace("_", " ").replace("-", " ")
        try:
            if ext == "pdf":
                for n, pg in enumerate(PdfReader(ruta).pages, 1): add(url, titulo, pg.extract_text() or "", n)
            elif ext in ("html", "htm"):
                s = BeautifulSoup(open(ruta, encoding="utf-8", errors="ignore").read(), "html.parser")
                for x in s(["script", "style", "noscript", "svg"]): x.decompose()
                if s.title and s.title.string: titulo = s.title.string.strip()
                add(url, titulo, s.get_text(" "))
            elif ext == "docx":
                import docx; add(url, titulo, " ".join(p.text for p in docx.Document(ruta).paragraphs))
            elif ext in ("md", "txt"):
                add(url, titulo, open(ruta, encoding="utf-8", errors="ignore").read())
        except Exception as e: print("saltado", rel, e, file=sys.stderr)
json.dump(out, open("indice-docs.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(len(out), "fragmentos indexados")
