# OCR (español) de las páginas de PDF que casi no tienen texto (imágenes, tablas escaneadas). Guarda el resultado en datos/ocr-paginas.json
# y no repite el trabajo si el PDF no cambió. Requiere: poppler-utils, tesseract-ocr, tesseract-ocr-spa.
import os, re, sys, json, glob, subprocess, tempfile
sys.path.insert(0, os.path.dirname(__file__))
from pdftexto import paginas
MIN = 150; OUT = "datos/ocr-paginas.json"
EXCL = []
try: EXCL = [l.split("#")[0].strip() for l in open("aria-conocimiento/excluir-del-indice.lst", encoding="utf-8") if l.split("#")[0].strip()]
except FileNotFoundError: pass
cache = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {}
nuevo = {}; hechos = 0
lang = "spa" if "spa" in subprocess.run(["tesseract", "--list-langs"], capture_output=True, text=True).stdout else "eng"
for pdf in sorted(glob.glob("**/*.pdf", recursive=True)):
    if any(e in pdf for e in EXCL): continue
    tam = os.path.getsize(pdf)
    for n, t in enumerate(paginas(pdf), 1):
        if len(re.sub(r"\s+", "", t)) >= MIN: continue
        k = f"{pdf}|{n}|{tam}"
        if k in cache: nuevo[k] = cache[k]; continue
        with tempfile.TemporaryDirectory() as d:
            subprocess.run(["pdftoppm", "-r", "200", "-f", str(n), "-l", str(n), "-png", pdf, f"{d}/p"], check=False)
            img = next(iter(sorted(glob.glob(f"{d}/p*.png"))), None)
            txt = subprocess.run(["tesseract", img, "-", "-l", lang, "--psm", "3"], capture_output=True, text=True).stdout if img else ""
        txt = re.sub(r"[ \t]+", " ", re.sub(r"\n{3,}", "\n\n", txt)).strip()
        nuevo[k] = txt; hechos += 1
os.makedirs("datos", exist_ok=True)
json.dump(nuevo, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print(f"OCR ({lang}): {hechos} páginas nuevas, {len(nuevo)} en total")
