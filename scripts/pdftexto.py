# Texto limpio por página de un PDF (pdftotext) sin encabezados/pies repetidos. Lo usan el OCR, las tablas y el indexador.
import re, subprocess, collections
def _norm(l): return re.sub(r"\d+", "#", re.sub(r"\s+", " ", l)).strip().lower()
def paginas(pdf):
    t = subprocess.run(["pdftotext", "-layout", pdf, "-"], capture_output=True, text=True).stdout
    pgs = t.split("\f")
    if pgs and not pgs[-1].strip(): pgs = pgs[:-1]
    cnt = collections.Counter()
    for p in pgs:
        for l in set(_norm(x) for x in p.split("\n") if x.strip()): cnt[l] += 1
    lim = max(3, int(len(pgs) * 0.35))
    rep = {l for l, c in cnt.items() if c >= lim and len(l) > 3}
    out = []
    for p in pgs:
        ls = [x.rstrip() for x in p.split("\n") if x.strip() and _norm(x) not in rep and not re.fullmatch(r"\s*(p[aá]gina\s*)?\d+(\s*de\s*\d+)?\s*", x, re.I)]
        out.append("\n".join(ls))
    return out
