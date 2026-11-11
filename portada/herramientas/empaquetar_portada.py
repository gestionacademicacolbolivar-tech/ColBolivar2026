#!/usr/bin/env python3
"""
Recorta las 6 hojas de ilustraciones de la portada (portada/herramientas/fuente/*.webp) en piezas sueltas
con fondo transparente y las guarda en assets/img/portada/<grupo>/<nombre>.webp.
También escribe assets/img/portada/manifest.json con el tamaño de cada pieza y, para los marcos,
las medidas para estirarlos con border-image (slice = [arriba, derecha, abajo, izquierda]).

Uso (desde la raíz del repo):  python portada/herramientas/empaquetar_portada.py
Requiere: pillow numpy scipy
"""
import os, json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

RAIZ = os.getcwd()
FUENTE = os.path.join(RAIZ, 'portada/herramientas/fuente')
SALIDA = os.path.join(RAIZ, 'assets/img/portada')

# hoja: (columnas, filas, nombres en orden de lectura). Un nombre que empieza por '*' guarda cada pieza suelta de esa celda.
HOJAS = {
 'servicios': (4, 4, ['biblioteca', 'icfes', 'modo-estudio', 'orientacion', 'notas', 'circulares', 'cartelera', 'documentos',
                      'sede-san-martin', 'planes-area', 'documentos-docentes', 'proyectos-transversales', 'calidad', 'procesos', 'radio', 'videos']),
 'hoy': (4, 3, ['sol-manana', 'sol-tarde', 'luna', 'torta', 'globos', 'regalo', 'calendario', 'boletin', 'campana', 'megafono', 'reloj-arena', 'estrella']),
 'componentes': (4, 4, ['medallon-aprender', 'medallon-vida', 'medallon-documentos', 'medallon-gestion',
                        'cinta-verde', 'cinta-naranja', 'cinta-azul', 'cinta-roja',
                        'candado', 'estallido', 'cinta-esquina', 'escudo-aviso',
                        'anillo-verde', 'anillo-naranja', 'anillo-azul', 'separador']),
 'escena': (4, 4, ['nube-1', 'nube-2', 'nube-3', 'sol', 'banderines-1', 'banderines-2', 'bandera', 'colegio',
                   'arbol', 'seto', 'estudiantes', 'docente', 'libros', 'birrete', '*confeti', '*brillo']),
 'marcos': (3, 4, ['panel-madera', 'pizarra', 'hoja-cuaderno', 'tarjeta-verde', 'tarjeta-naranja', 'tarjeta-azul',
                   'tarjeta-roja', 'pergamino', 'letrero', 'tv', 'polaroid', 'globo']),
 'botones': (4, 4, ['boton-verde', 'boton-naranja', 'boton-azul', 'boton-roja', 'pestana-activa', 'pestana-inactiva', 'etiqueta', 'burbuja-contador',
                    'chincheta-roja', 'chincheta-azul', 'cinta-adhesiva', 'clip', 'flecha-izq', 'flecha-der', 'flecha-curva', 'corazon']),
}
FRAMES = {'panel-madera', 'pizarra', 'tarjeta-verde', 'tarjeta-naranja', 'tarjeta-azul', 'tarjeta-roja', 'tv', 'letrero', 'polaroid',
          'pergamino', 'hoja-cuaderno', 'globo', 'pestana-activa', 'pestana-inactiva', 'etiqueta', 'burbuja-contador',
          'boton-verde', 'boton-naranja', 'boton-azul', 'boton-roja'}

def relleno(img):
    """Mide el rectángulo del centro liso de un marco → slice [arriba, derecha, abajo, izquierda] para border-image."""
    a = np.array(img.convert('RGBA')).astype(int); h, w = a.shape[:2]
    c = a[h // 2, w // 2, :3]
    cerca = (np.abs(a[..., :3] - c).sum(axis=2) < 40) & (a[..., 3] > 200)
    lab, k = ndi.label(cerca); ident = lab[h // 2, w // 2]
    if ident == 0: return None
    ys, xs = np.where(lab == ident)
    return [int(ys.min()), int(w - 1 - xs.max()), int(h - 1 - ys.max()), int(xs.min())]

os.makedirs(SALIDA, exist_ok=True); manifest = {}
def agrupar(lab, M, n_esperado):
    """Une los fragmentos pequeños (rayitas, estrellas) a su pieza más cercana y, si faltan piezas, parte las que se tocan."""
    ids = [i for i in range(1, int(lab.max()) + 1) if (lab == i).sum() >= 40]
    cajas = {i: ndi.find_objects((lab == i).astype(int))[0] for i in ids}
    area = {i: int(M[lab == i].sum()) for i in ids}
    med = float(np.median(sorted(area.values())[-n_esperado:]))
    grandes = [i for i in ids if area[i] >= 0.25 * med]; grupos = {g: [g] for g in grandes}
    def dist(a, b):
        ya, xa = cajas[a]; yb, xb = cajas[b]
        dx = max(xb.start - xa.stop, xa.start - xb.stop, 0); dy = max(yb.start - ya.stop, ya.start - yb.stop, 0); return (dx * dx + dy * dy) ** .5
    for i in ids:
        if i in grupos: continue
        g = min(grandes, key=lambda b: dist(i, b))
        if dist(i, g) < 90: grupos[g].append(i)
        elif area[i] >= 0.15 * med: grupos[i] = [i]      # pieza pequeña pero independiente (clip, cinta…)
    nxt = int(lab.max()) + 1
    while len(grupos) < n_esperado:                      # íconos que se tocan: se parte el más grande por su costura más delgada
        g = max(grupos, key=lambda k: sum(area[i] for i in grupos[k]))
        sel = np.isin(lab, grupos[g]) & M; ys, xs = np.where(sel)
        vertical = (ys.max() - ys.min()) >= (xs.max() - xs.min()); coord = ys if vertical else xs
        a0, a1 = coord.min(), coord.max(); rango = np.arange(int(a0 + 0.3 * (a1 - a0)), int(a0 + 0.7 * (a1 - a0)) + 1)
        corte = rango[int(np.argmin([(coord == v).sum() for v in rango]))]; m = coord >= corte
        lab[ys[m], xs[m]] = nxt; area[nxt] = int(m.sum()); area[grupos[g][0]] = int((~m).sum())
        cajas[nxt] = (slice(ys[m].min(), ys[m].max() + 1), slice(xs[m].min(), xs[m].max() + 1)); grupos[nxt] = [nxt]
        ids2 = [grupos[g][0]]; grupos[g] = ids2; nxt += 1
    res = []
    for g, miembros in grupos.items():
        sel = np.isin(lab, miembros) & M; ys, xs = np.where(sel); res.append((ys.mean(), xs.mean(), miembros))
    return res

def ordenar(res, filas, por_fila):
    """Agrupa en filas (por los saltos más grandes en vertical) y ordena cada fila de izquierda a derecha."""
    res = sorted(res, key=lambda r: r[0]); saltos = sorted(range(len(res) - 1), key=lambda k: res[k + 1][0] - res[k][0], reverse=True)[:filas - 1]
    cortes = sorted(saltos); out = []; ini = 0
    for c in cortes + [len(res) - 1]:
        out.append(sorted(res[ini:c + 1], key=lambda r: r[1])); ini = c + 1
    for fila, esp in zip(out, por_fila):
        if len(fila) != esp: raise SystemExit(f'Una fila tiene {len(fila)} piezas y se esperaban {esp}: {[round(r[1]) for r in fila]}')
    return [r for fila in out for r in fila]

for hoja, (cols, filas, nombres) in HOJAS.items():
    img = Image.open(os.path.join(FUENTE, hoja + '.webp')).convert('RGBA'); A = np.array(img); M = A[..., 3] > 20
    H, W = M.shape; cw, ch = W / cols, H / filas
    lab, k = ndi.label(ndi.binary_dilation(M, np.ones((3, 3)), iterations=1))
    carpeta = os.path.join(SALIDA, hoja); os.makedirs(carpeta, exist_ok=True); manifest[hoja] = {}
    def guardar(nombre, ids, etq):
        sel = np.isin(etq, ids) & M; sel = ndi.binary_dilation(sel, iterations=2) & (A[..., 3] > 0)
        ys, xs = np.where(sel); y0, y1, x0, x1 = max(ys.min() - 2, 0), min(ys.max() + 3, H), max(xs.min() - 2, 0), min(xs.max() + 3, W)
        out = A[y0:y1, x0:x1].copy(); out[..., 3] = np.where(sel[y0:y1, x0:x1], out[..., 3], 0)
        pieza = Image.fromarray(out); pieza.save(os.path.join(carpeta, nombre + '.webp'), 'WEBP', quality=90, alpha_quality=100, method=6, exact=True)
        info = {'w': pieza.width, 'h': pieza.height}
        if nombre in FRAMES:
            s = relleno(pieza)
            if s: info['slice'] = s
        manifest[hoja][nombre] = info
    # celdas "especiales" (*confeti, *brillo): se guarda cada pieza suelta que cae en su celda nominal
    esp = {n: nombre[1:] for n, nombre in enumerate(nombres) if nombre.startswith('*')}
    sueltas = {n: [] for n in esp}; resto = lab.copy()
    for i in range(1, k + 1):
        m = lab == i
        if m.sum() < 40: continue
        cy, cx = ndi.center_of_mass(m); celda = int(cy // ch) * cols + int(cx // cw)
        if celda in esp: sueltas[celda].append((cy, cx, i)); resto[m] = 0
    regulares = [n for n in nombres if not n.startswith('*')]
    por_fila = [sum(1 for n in range(r * cols, (r + 1) * cols) if n < len(nombres) and not nombres[n].startswith('*')) for r in range(filas)]
    piezas = ordenar(agrupar(resto, M, len(regulares)), filas, [x for x in por_fila if x])
    for nombre, (cy, cx, miembros) in zip(regulares, piezas): guardar(nombre, miembros, resto)
    for celda, lista in sueltas.items():
        for j, (_, _, i) in enumerate(sorted(lista, key=lambda r: (round(r[0] / 40), r[1])), 1):
            if M[lab == i].sum() >= 120: guardar(f'{esp[celda]}-{j:02d}', [i], lab)
    print(f'{hoja:12} {len(manifest[hoja]):3d} piezas')
json.dump(manifest, open(os.path.join(SALIDA, 'manifest.json'), 'w'), indent=1)
tot = sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(SALIDA) for f in fs)
print(f'total: {sum(len(v) for v in manifest.values())} piezas, {tot // 1024} KB')
