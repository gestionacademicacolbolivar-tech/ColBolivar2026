#!/usr/bin/env python3
"""
Arma los sprites y recursos visuales de PROCESOS.html a partir de las imágenes fuente
(procesos/herramientas/fuente/*.webp) y los guarda en assets/img/procesos/.

  gestiones.webp · procesos-gd/ga/gf/gc.webp   → íconos en fila (una celda cuadrada por ícono)
  ui-iconos.webp (3×3) · sellos.webp (3×1)       → íconos pequeños de la interfaz y sellos de evidencia
  centro.webp · hero.webp                         → emblema del centro de la flor y portada
  fondo-gd/ga/gf/gc.webp                          → texturas de los pétalos

Uso (desde la raíz del repo):  python procesos/herramientas/empaquetar_sprites.py
Requiere: pillow numpy scipy
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

RAIZ = os.getcwd()
FUENTE = os.path.join(RAIZ, 'procesos/herramientas/fuente')
SALIDA = os.path.join(RAIZ, 'assets/img/procesos')
os.makedirs(SALIDA, exist_ok=True)
def abrir(n): return Image.open(os.path.join(FUENTE, n + '.webp')).convert('RGBA')
def kb(n): return os.path.getsize(os.path.join(SALIDA, n)) // 1024

# ------------------------------------------------------------------ separar íconos de una fila (fondo transparente)
def separar(img, esperados, cortes=None):
    """Devuelve los íconos (RGBA recortados) ordenados de izquierda a derecha. Los fragmentos pequeños
    (rayitas, destellos) se pegan al ícono más cercano."""
    A = np.array(img); M = A[..., 3] > 20
    if cortes: return separar_por_valles(A, M, esperados, cortes)
    lab, k = ndi.label(ndi.binary_dilation(M, np.ones((3, 3)), iterations=2))
    cajas = ndi.find_objects(lab); area = np.array(ndi.sum(M, lab, range(1, k + 1)))
    grupos = None
    for umbral in (0.04, 0.08, 0.15, 0.25, 0.01):
        grandes = [i for i in range(1, k + 1) if area[i - 1] >= umbral * np.median(area)]
        grp = {g: {g} for g in grandes}
        for i in range(1, k + 1):
            if i in grp: continue
            yi, xi = cajas[i - 1]
            def dist(g):
                yg, xg = cajas[g - 1]
                dx = max(xg.start - xi.stop, xi.start - xg.stop, 0); dy = max(yg.start - yi.stop, yi.start - yg.stop, 0)
                return (dx * dx + dy * dy) ** .5
            grp[min(grandes, key=dist)].add(i)
        if len(grp) == esperados: grupos = grp; break
    if grupos is None: return separar_por_valles(A, M, esperados)      # íconos que se tocan: se corta por los valles
    iconos = []
    for g, miembros in grupos.items():
        sel = np.isin(lab, list(miembros)); ys, xs = np.where(sel)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        out = A[y0:y1, x0:x1].copy(); out[..., 3] = np.where(sel[y0:y1, x0:x1], out[..., 3], 0)
        iconos.append((x0, Image.fromarray(out)))
    return [im for _, im in sorted(iconos, key=lambda t: t[0])]

def separar_por_valles(A, M, n, aprox=None):
    """Para filas de íconos que se tocan. Corta en las columnas con menos píxeles (los valles entre íconos).
    Si se dan posiciones aproximadas (aprox) cada corte se ajusta a la costura más delgada a ±25 px."""
    col = ndi.uniform_filter1d(M.sum(axis=0).astype(float), 5)
    xs = np.where(M.any(axis=0))[0]; ini, fin = xs.min(), xs.max() + 1; cortes = []
    if aprox:
        for a in aprox:
            lo, hi = max(ini + 1, a - 25), min(fin - 1, a + 25); w = col[lo:hi]; idx = np.where(w <= w.min() + 1e-6)[0]
            cortes.append(lo + int(idx[len(idx) // 2]))
    else:
        sep = (fin - ini) / n * 0.55; libre = np.ones(M.shape[1], bool); libre[:ini] = libre[fin:] = False
        for _ in range(n - 1):
            v = np.where(libre, col, np.inf); idx = np.where(v <= v.min() + 1e-6)[0]
            tiras = np.split(idx, np.where(np.diff(idx) > 1)[0] + 1); tira = max(tiras, key=len); c = int(tira[len(tira) // 2])
            cortes.append(c); libre[max(0, int(c - sep)):int(c + sep)] = False
    lim = [ini] + sorted(cortes) + [fin]; out = []
    for x0, x1 in zip(lim[:-1], lim[1:]):
        sub = M[:, x0:x1].copy()
        lab, k = ndi.label(ndi.binary_dilation(sub, np.ones((3, 3)), iterations=1)); H_, W_ = sub.shape
        if k > 1:        # quita los restos del ícono vecino que quedan pegados al borde del corte
            tam = ndi.sum(sub, lab, range(1, k + 1)); mayor = int(np.argmax(tam)) + 1; keep = np.zeros_like(sub)
            for q, sl in enumerate(ndi.find_objects(lab), 1):
                toca = sl[1].start <= 1 or sl[1].stop >= W_ - 1
                if q == mayor or not toca: keep |= (lab == q) & sub
            sub = keep
        ys, xs2 = np.where(sub); y0, y1, xx0, xx1 = ys.min(), ys.max() + 1, xs2.min(), xs2.max() + 1
        seg = A[y0:y1, x0 + xx0:x0 + xx1].copy(); seg[..., 3] = np.where(sub[y0:y1, xx0:xx1], seg[..., 3], 0)
        out.append(Image.fromarray(seg))
    return out

def borrar_color(ic, lado, ancho, h0, h1, smin=0.25):
    """Borra en el borde (izq/der, 'ancho' px) los píxeles de un tono (h0-h1 en escala 0-255 de PIL): quita restos del ícono vecino."""
    A = np.array(ic); hsv = np.array(ic.convert('RGB').convert('HSV')).astype(int)
    zona = np.zeros(A.shape[:2], bool)
    if lado == 'der': zona[:, -ancho:] = True
    else: zona[:, :ancho] = True
    malo = zona & (hsv[..., 0] >= h0) & (hsv[..., 0] <= h1) & (hsv[..., 1] >= smin * 255)
    malo = ndi.binary_dilation(malo, iterations=2) & zona
    A[malo, 3] = 0
    lab, k = ndi.label(A[..., 3] > 20)                  # además, se queda solo con el bloque principal (descarta contornos sueltos)
    if k > 1:
        tam = ndi.sum(A[..., 3] > 20, lab, range(1, k + 1)); A[lab != (int(np.argmax(tam)) + 1), 3] = 0
    ys, xs = np.where(A[..., 3] > 20)
    return Image.fromarray(A[ys.min():ys.max() + 1, xs.min():xs.max() + 1])

def en_celda(ic, celda, margen=0.06, maxup=1.0):
    w, h = ic.size; util = celda * (1 - 2 * margen)
    s = min(util / w, util / h, maxup)
    ic2 = ic.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
    lienzo = Image.new('RGBA', (celda, celda), (0, 0, 0, 0))
    lienzo.alpha_composite(ic2, ((celda - ic2.width) // 2, (celda - ic2.height) // 2)); return lienzo

def hoja(iconos, celda, cols, archivo, **kw):
    filas = -(-len(iconos) // cols); H = Image.new('RGBA', (celda * cols, celda * filas), (0, 0, 0, 0))
    for i, ic in enumerate(iconos): H.alpha_composite(en_celda(ic, celda, **kw), ((i % cols) * celda, (i // cols) * celda))
    H.save(os.path.join(SALIDA, archivo), 'WEBP', quality=90, alpha_quality=100, method=6, exact=True)
    print(f'{archivo:20} {H.width}×{H.height}  ({len(iconos)} íconos, celda {celda})  {kb(archivo)} KB')

# ------------------------------------------------------------------ íconos de gestiones y procesos
hoja(separar(abrir('gestiones'), 4), 256, 4, 'gestiones.webp')
hoja(separar(abrir('procesos-gd'), 6), 192, 6, 'procesos-gd.webp')
hoja(separar(abrir('procesos-ga'), 4), 192, 4, 'procesos-ga.webp')
gf = separar(abrir('procesos-gf'), 5, cortes=[370, 780, 1233, 1645])   # íconos que se tocan: cortes aproximados
gf[0] = borrar_color(gf[0], 'der', 60, 40, 120)    # hojita verde del edificio vecino pegada a la carpeta
gf[4] = gf[4].crop((14, 0, gf[4].width, gf[4].height))   # contorno de cabello de la niña pegado a la calculadora (primeras 13 columnas)
gf[4] = borrar_color(gf[4], 'izq', 30, 5, 30)
hoja(gf, 192, 5, 'procesos-gf.webp')
hoja(separar(abrir('procesos-gc'), 2), 192, 2, 'procesos-gc.webp')

# ------------------------------------------------------------------ íconos de interfaz
# Set nuevo (insignias azules 3D sobre blanco): se quita el fondo y la sombra gris usando la saturación del color.
def insignias(img_rgba):
    rgb = np.array(img_rgba.convert('RGB')).astype(float) / 255
    mx, mn = rgb.max(axis=2), rgb.min(axis=2); sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    mask = ndi.binary_fill_holes(ndi.binary_opening(sat > 0.25, iterations=1))       # insignia + glifo blanco interior
    lab, k = ndi.label(mask); area = ndi.sum(mask, lab, range(1, k + 1))
    ids = [i for i in range(1, k + 1) if area[i - 1] > 0.3 * area.max()]
    alfa = ndi.gaussian_filter(mask.astype(float), 0.9)
    A = np.dstack([(rgb * 255).astype(np.uint8), (np.clip(alfa, 0, 1) * 255).astype(np.uint8)])
    out = []
    for i in ids:
        sel = ndi.binary_dilation(lab == i, iterations=2); ys, xs = np.where(sel)
        c = A[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy()
        c[..., 3] = np.where(sel[ys.min():ys.max() + 1, xs.min():xs.max() + 1], c[..., 3], 0)
        out.append((ys.mean(), xs.mean(), Image.fromarray(c)))
    assert len(out) == 9, f'esperaba 9 insignias y encontré {len(out)}'
    out.sort(key=lambda t: (round(t[0] / 300), t[1])); return [t[2] for t in out]
nuevos = insignias(abrir('ui'))   # orden: objetivo, escudo, lupa / herramientas, libreta, nodos / clip, carpeta, enlace

# Íconos que el set nuevo no trae (comillas, cerrar, copiar) y los sellos: se toman de la hoja anterior (menor resolución).
VIEJA = Image.open(os.path.join(FUENTE, 'hoja-original.webp')).convert('RGBA'); AV = np.array(VIEJA); MV = AV[..., 3] > 20
def vieja(box):
    x0, y0, x1, y1 = box; sub = MV[y0:y1, x0:x1].copy()
    lab, n = ndi.label(ndi.binary_dilation(sub, np.ones((3, 3)), iterations=1)); H_, W_ = sub.shape
    if n > 1:
        tam = ndi.sum(sub, lab, range(1, n + 1)); mayor = int(np.argmax(tam)) + 1; keep = np.zeros_like(sub)
        for i, sl in enumerate(ndi.find_objects(lab), 1):
            toca = sl[0].start <= 1 or sl[1].start <= 1 or sl[0].stop >= H_ - 1 or sl[1].stop >= W_ - 1
            if i == mayor or not toca: keep |= (lab == i) & sub
        sub = keep
    ys, xs = np.where(sub); by0, by1, bx0, bx1 = y0 + ys.min(), y0 + ys.max() + 1, x0 + xs.min(), x0 + xs.max() + 1
    out = AV[by0:by1, bx0:bx1].copy(); out[..., 3] = np.where(sub[by0 - y0:by1 - y0, bx0 - x0:bx1 - x0], out[..., 3], 0)
    return Image.fromarray(out)
cita = vieja((335, 684, 411, 765)); cerrar = vieja((140, 768, 235, 858)); copiar = vieja((238, 769, 332, 858))
objetivo, escudo, lupa, herram, libreta, nodos, clip, carpeta, enlace = nuevos
# orden del sprite 3×3: lupa, clip, documento(pdf), cita, verificado, enlace, cerrar, copiar, compartir
hoja([lupa, clip, carpeta, cita, escudo, enlace, cerrar, copiar, nodos], 112, 3, 'ui-iconos.webp', margen=0.03, maxup=1.5)

# sellos de nivel de evidencia (de la hoja anterior; se corta por el valle entre sellos contiguos)
def valle(x0, x1, y0=690, y1=860): return x0 + int(np.argmin(MV[y0:y1, x0:x1].sum(axis=0)))
c1, c2 = valle(680, 712), valle(830, 860)
hoja([vieja((530, 688, c1 + 1, 862)), vieja((c1 + 1, 688, c2 + 1, 862)), vieja((c2 + 1, 688, 1010, 862))], 192, 3, 'sellos.webp', margen=0.03, maxup=1.3)

# ------------------------------------------------------------------ emblema del centro y portada
c = abrir('centro'); c = c.crop(c.getbbox())
en_celda(c, 384, margen=0.02).save(os.path.join(SALIDA, 'centro.webp'), 'WEBP', quality=90, alpha_quality=100, method=6, exact=True)
print(f'centro.webp          384×384  {kb("centro.webp")} KB')
h = abrir('hero').convert('RGB'); h = h.resize((1800, round(h.height * 1800 / h.width)), Image.LANCZOS)
h.save(os.path.join(SALIDA, 'hero.webp'), 'WEBP', quality=80, method=6); print(f'hero.webp            {h.width}×{h.height}  {kb("hero.webp")} KB')

# ------------------------------------------------------------------ texturas de pétalos
# 4 paneles (izq→der: turquesa, celeste, amarillo, rosa). Los paneles 2-4 traen una sombra a la izquierda: se recorta la parte limpia.
f = abrir('fondos').convert('RGB'); W, Hh = f.size; ancho = W // 4
orden = {'gd': 0, 'gf': 1, 'ga': 2, 'gc': 3}     # verde→turquesa · azul marino→celeste · naranja→amarillo · rojo→rosa
for nombre, p in orden.items():
    x0 = p * ancho + (0 if p == 0 else 66); x1 = (p + 1) * ancho
    f.crop((x0, 24, x1, 24 + (x1 - x0))).resize((384, 384), Image.LANCZOS).save(os.path.join(SALIDA, f'fondo-{nombre}.webp'), 'WEBP', quality=84, method=6)
print('fondo-gd/ga/gf/gc.webp  384×384')
