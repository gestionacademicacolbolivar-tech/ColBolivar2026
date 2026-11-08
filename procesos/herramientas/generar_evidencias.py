#!/usr/bin/env python3
"""
Genera la sección PROCESOS de la web del ColBolívar a partir de:
  1) el Excel del mapa de procesos (hoja por gestión), y
  2) los PDF institucionales del repositorio (PEI 2026, SIEE, Manual de convivencia, ...).

Produce:
  - assets/img/procesos/evidencias/*.webp   -> captura recortada del PDF, con el título de la sección resaltado
  - procesos/procesos.json                  -> gestiones > procesos > subprocesos + evidencias (cita, página, texto)

Uso (desde la raíz del repo):
  pip install pymupdf pillow openpyxl
  python procesos/herramientas/generar_evidencias.py "ruta/MAPA_DE_PROCESOS.xlsx"

Cuando se actualice el PEI u otro PDF, basta con volver a correrlo: las capturas se regeneran solas.
La tabla EV (secciones) y la tabla MAPA (qué evidencia corresponde a cada subproceso) se editan abajo.
"""
import sys, os, re, io, json, glob, unicodedata, datetime
import pymupdf, openpyxl
from PIL import Image

RAIZ = os.getcwd()
IMG_DIR = os.path.join(RAIZ, 'assets/img/procesos/evidencias')
os.makedirs(IMG_DIR, exist_ok=True)
for _f in glob.glob(os.path.join(IMG_DIR, '*.webp')): os.remove(_f)      # no dejar capturas huérfanas de corridas anteriores

def pdf(prefijo):
    r = [x for x in glob.glob('documentos/**/*.pdf', recursive=True) + glob.glob('*.pdf') if os.path.basename(x).upper().startswith(prefijo.upper())]
    if not r: raise SystemExit(f'No encuentro el PDF que empieza por «{prefijo}» en la raíz del repo')
    return r[0]

DOCS = {
 'pei':      dict(pre='RESIGNIFICACION PEI', nombre='Resignificación del PEI 2024–2027 (GD-D1, v3.0)', corto='PEI 2024–2027'),
 'siee':     dict(pre='GA-D1_MANUAL_SIEE',   nombre='Manual SIEE – Sistema Institucional de Evaluación (GA-D1)', corto='SIEE'),
 'conv':     dict(pre='Manual de convivencia', nombre='Manual de Convivencia (GD-D02)', corto='Manual de Convivencia'),
 'modelo':   dict(pre='Modelo_Pedagogico',   nombre='Modelo Pedagógico Institucional ColBolívar 2026', corto='Modelo Pedagógico'),
 'servicio': dict(pre='PROYECTO INSTITUCIONAL DE SERVICIO', nombre='Proyecto Institucional de Servicio Social Estudiantil Obligatorio', corto='Servicio Social'),
}
for k, d in DOCS.items(): d['archivo'] = pdf(d['pre'])

# ---- Secciones (evidencias). p = página (en el PEI la página del PDF coincide con la impresa) ----
# h = texto que se busca para ubicar el título · H = alto máximo del recorte en puntos · sec = número de sección
def e(doc, p, h, titulo, sec='', H=330, **extra): return dict(doc=doc, p=p, h=h, titulo=titulo, sec=sec, H=H, **extra)
EV = {
 # blur: zonas (x0,y0,x1,y1 en píxeles de la imagen final) que se difuminan por contener datos personales (celular de una persona)
 # texto: transcripción manual cuando el fragmento del PDF es una imagen y no tiene texto seleccionable
 'mision-vision':   e('pei', 24, '1.3.1', 'Misión, visión y política de calidad', '1.3.1 – 1.3.3', 560,
                      blur=[(185,785,330,840)],
                      texto=('Visión: La Institución Educativa Colegio Simón Bolívar en el año 2027 será reconocida a nivel regional y nacional por desarrollar procesos académicos y administrativos de alta calidad apoyada en el manejo de las TIC, la inclusión escolar y la convivencia ciudadana post pandemia.\n'
                             'Misión: El Colegio Simón Bolívar es una Institución de carácter oficial que ofrece un servicio de calidad en los niveles de Preescolar, Básica, Media Académica y Técnica propendiendo por la formación integral del estudiante desde el «saber ser», «saber hacer» y «saber saber». Con el desarrollo de proyectos en el marco de inclusión educativa, la evaluación formativa y el trabajo colaborativo que fortalecen la construcción de proyectos de vida con éxito.\n'
                             'Política de calidad: Ofrecer un servicio educativo de alta calidad, que fortalezca en su comunidad el liderazgo, la comunicación y el trabajo en equipo, contando para ello con recursos físicos, financieros y tecnológicos apropiados y con un talento humano competente, que contribuya con el mejoramiento continuo de los procesos de la gestión escolar, para responder a las necesidades y expectativas de los actores educativos y su entorno.')),
 'principios':      e('pei', 25, '1.3.4', 'Principios y valores ColBolívar', '1.3.4', 420),
 'valores':         e('pei', 28, '1.3.5', 'Valores institucionales', '1.3.5', 330),
 'objetivos':       e('pei', 29, '1.3.6', 'Objetivos generales del proyecto', '1.3.6', 420),
 'perfil-educando': e('pei', 39, '1.6.1', 'Perfil del educando', '1.6.1', 330),
 'perfil-directivo':e('pei', 43, '1.6.3', 'Perfil del directivo docente', '1.6.3', 380),
 'perfil-padres':   e('pei', 45, '1.6.4 Perfil Del Padre', 'Perfil del padre de familia, cuidador o acudiente', '1.6.4', 330),
 'consejo-directivo':  e('pei', 47, '1.7.1', 'Consejo Directivo', '1.7.1', 330),
 'consejo-academico':  e('pei', 48, '1.7.2', 'Consejo Académico', '1.7.2', 200),
 'comision-evaluacion':e('pei', 48, '1.7.3', 'Comisión de Evaluación y Promoción', '1.7.3', 330),
 'personero':       e('pei', 49, '1.7.4', 'Personero estudiantil', '1.7.4', 330),
 'consejo-estudiantil': e('pei', 50, '1.7.5', 'Consejo Estudiantil', '1.7.5', 200),
 'consejo-padres':  e('pei', 50, '1.7.6', 'Consejo de Padres de Familia', '1.7.6', 360),
 'comunicacion':    e('pei', 55, '1.8.1', 'Mecanismos de comunicación', '1.8.1', 380),
 'politica-comunicacion': e('pei', 57, '1.8.2', 'Política de comunicación ColBolívar', '1.8.2', 330),
 'convenios':       e('pei', 58, '1.9 CONVENIOS', 'Convenios y alianzas', '1.9', 420),
 'gestion-objetivos': e('pei', 60, '1.10.1', 'Objetivos de la gestión escolar', '1.10.1', 420),
 'gestion-proceso': e('pei', 61, '1.10.2', 'Proceso administrativo de la gestión escolar', '1.10.2', 560),
 'modelo-educativo':e('pei', 72, '2.2 MODELO', 'Modelo educativo', '2.2', 400),
 'enfoque-curricular': e('pei', 78, '2.3 ENFOQUE', 'Enfoque curricular', '2.3', 420),
 'pensum':          e('pei', 83, '2.4 PENSUM', 'Pensum académico', '2.4', 420),
 'centros-interes': e('pei', 89, '2.5 LOS CENTROS', 'Los centros de interés en el ColBolívar', '2.5', 400),
 'equipo-dinamizador': e('pei', 91, '2.5.2', 'Funciones del equipo dinamizador', '2.5.2', 380),
 'evaluacion':      e('pei', 93, '2.6 EVALUACION', 'Evaluación', '2.6', 420),
 'caracteristicas-evaluacion': e('pei', 96, '2.6.1', 'Características de la evaluación', '2.6.1', 420),
 'proyectos-transversales': e('pei', 97, '2.7 PROYECTOS', 'Proyectos transversales ColBolívar', '2.7', 420),
 'matricula':       e('pei', 101, '3.1.1', 'Matrícula', '3.1.1', 420),
 'archivo':         e('pei', 103, '3.1.2', 'Archivo académico', '3.1.2', 330),
 'planta-fisica':   e('pei', 104, '3.2 ADMIN', 'Administración de la planta física y de los recursos', '3.2', 330),
 'transporte':      e('pei', 105, '3.3.1', 'Servicio de transporte humanitario', '3.3.1', 220),
 'restaurante':     e('pei', 105, '3.3.2', 'Servicio de restaurante', '3.3.2', 300),
 'talento-humano':  e('pei', 106, '3.4 TALENTO', 'Talento humano', '3.4', 420),
 'presupuesto':     e('pei', 107, '3.5 PRESUP', 'Presupuesto anual del Fondo de Servicios Educativos', '3.5', 380),
 'accesibilidad':   e('pei', 110, '4.1 PROCESO', 'Proceso: accesibilidad e inclusión', '4.1', 330),
 'politica-inclusion': e('pei', 111, '4.1.1', 'Política de inclusión', '4.1.1', 420),
 'proyeccion':      e('pei', 112, '4.2 PROCESO', 'Proceso: proyección a la comunidad', '4.2', 420),
 'asamblea':        e('pei', 113, '4.3.1', 'Asamblea de padres', '4.3.1', 330),
 'comite-convivencia': e('pei', 114, '4.3.2', 'El Comité Institucional de Convivencia', '4.3.2', 420),
 'ruta-atencion':   e('pei', 115, '4.3.3', 'Ruta de Atención Integral para la Convivencia Escolar', '4.3.3', 420),
 'servicio-social': e('pei', 118, '4.4 SERVICIO', 'Servicio social obligatorio', '4.4', 330),
 'escuela-comunidad': e('pei', 119, '4.5 RELACI', 'Relación escuela–comunidad', '4.5', 360),
 'smart-place':     e('pei', 120, '4.5.1', 'Los Smart Place', '4.5.1', 330),
 'escuela-segura':  e('pei', 121, '4.6 PROYECTO', 'Proyecto Escuela Segura', '4.6', 420),
 # títulos que solo sirven para marcar dónde termina una sección (no se generan capturas)
 'x-yukpa':         e('pei', 62, '1.11 PROPUESTA', '', '', 0),
 # --- otros documentos del repositorio ---
 'siee':            e('siee', 26, 'escala de valoración', 'Escala de valoración institucional', '', 420),
 'manual-convivencia': e('conv', 274, 'RUTA DE ATENCIÓN INTEGRAL PARA LA CONVIVENCIA ESCOLAR', 'Ruta de Atención Integral para la Convivencia Escolar ColBolívar', '', 480),
 'modelo-pedagogico': e('modelo', 3, 'enfoque', 'Enfoque del Modelo Pedagógico 2026', '', 460),
 # NO usar como evidencia: «Proyecto de Inclusión – DUA y PIAR» (trae fichas PIAR con datos de estudiantes) ni el PEGRD (el texto actual nombra a otra institución).
 'servicio-doc':    e('servicio', 9, 'Líneas de Acción', 'Líneas de acción y subproyectos del servicio social', '', 460, y0f=0.205),
}

# ---- Qué evidencia corresponde a cada subproceso. nivel: D = directa · R = relacionada · P = pendiente (no hay sección propia) ----
D, R, P = 'directa', 'relacionada', 'pendiente'
MAPA = {
 'GD': [
  [(D,['mision-vision','principios']),(D,['objetivos']),(R,['valores','comunicacion']),(D,['politica-inclusion','principios'])],
  [(R,['perfil-directivo']),(R,['gestion-objetivos','proyectos-transversales']),(D,['modelo-educativo','modelo-pedagogico']),(R,['gestion-objetivos','comunicacion']),(R,['gestion-objetivos','gestion-proceso']),(R,['gestion-objetivos','presupuesto'])],
  [(D,['consejo-directivo']),(D,['consejo-academico']),(D,['comision-evaluacion']),(D,['comite-convivencia']),(D,['consejo-estudiantil']),(D,['personero']),(D,['asamblea']),(D,['consejo-padres'])],
  [(D,['comunicacion','politica-comunicacion']),(R,['objetivos','equipo-dinamizador']),(R,['valores']),(P,['politica-comunicacion'])],
  [(R,['objetivos']),(R,['escuela-segura','planta-fisica']),(P,['matricula']),(R,['centros-interes']),(D,['ruta-atencion','comite-convivencia','manual-convivencia']),(D,['centros-interes','smart-place']),(R,['perfil-educando','ruta-atencion']),(D,['ruta-atencion']),(P,['ruta-atencion'])],
  [(R,['consejo-padres','perfil-padres']),(R,['convenios']),(D,['convenios']),(D,['convenios'])],
 ],
 'GA': [
  [(D,['enfoque-curricular','pensum']),(D,['modelo-educativo','modelo-pedagogico']),(D,['centros-interes']),(R,['pensum']),(D,['evaluacion','siee'])],
  [(D,['modelo-educativo']),(R,['pensum']),(R,['centros-interes']),(R,['pensum'])],
  [(R,['modelo-educativo']),(R,['pensum']),(R,['modelo-educativo']),(R,['ruta-atencion','manual-convivencia'])],
  [(D,['evaluacion']),(D,['caracteristicas-evaluacion','siee']),(R,['evaluacion']),(R,['evaluacion'])],
 ],
 'GF': [
  [(D,['matricula']),(D,['archivo']),(D,['planta-fisica']),(D,['transporte','restaurante'])],
  [(D,['planta-fisica']),(D,['planta-fisica']),(D,['planta-fisica']),(D,['planta-fisica','escuela-segura'])],
  [(D,['transporte']),(D,['restaurante']),(R,['talento-humano']),(R,['presupuesto'])],
  [(D,['talento-humano'])]*4,
  [(D,['presupuesto']),(R,['presupuesto']),(P,['presupuesto']),(R,['presupuesto','convenios'])],
 ],
 'GC': [
  [(D,['comunicacion']),(R,['accesibilidad','planta-fisica']),(R,['planta-fisica']),(D,['politica-inclusion'])],
  [(D,['proyeccion']),(D,['convenios']),(D,['escuela-comunidad']),(R,['servicio-social','servicio-doc'])],
 ],
}
GESTIONES = [  # hoja del Excel, id, nombre, color, emoji de respaldo (se cambia por sprite cuando existan las imágenes)
 ('GESTIÓN DIRECTIVA','GD','Gestión Directiva','#2b7a3a','🧭','Orienta el rumbo: horizonte, gobierno escolar, cultura y clima institucional.'),
 ('GESTIÓN ACADEMICA','GA','Gestión Académica','#e38a10','📚','Hace posible el aprendizaje: currículo, prácticas de aula, evaluación y seguimiento.'),
 ('ADMINISTRATIVA Y FINANCIERA','GF','Gestión Administrativa y Financiera','#12306e','🏛️','Sostiene la vida del colegio: matrícula, planta física, servicios, talento humano y presupuesto.'),
 ('GESTIÓN DE LA COMUNIDAD','GC','Gestión de la Comunidad','#d92d3a','🤝','Abre el colegio al entorno: accesibilidad, inclusión, convenios y proyección social.'),
]

# ---------------------------------------------------------------- utilidades
def norm(s): return unicodedata.normalize('NFD', s.lower()).encode('ascii','ignore').decode()
def frase(s):
    s = re.sub(r'\s+',' ', s.strip()).lower()
    s = re.sub(r'^[ps]\d+\.\s*','', s)
    s = s.replace('estratégico y','estratégico y').replace('direccionamiento o estratégico','direccionamiento estratégico')
    for a,b in [(' tic ',' TIC '),(' pei',' PEI'),(' pmi',' PMI')]: s = s.replace(a,b)
    return s[:1].upper()+s[1:]

def leer_excel(ruta):
    wb = openpyxl.load_workbook(ruta, data_only=True); out = {}
    for ws in wb:
        procs, cur = [], None
        for r in ws.iter_rows(min_row=3, values_only=True):
            _, p, s, c, d, ref = (list(r)+[None]*6)[:6]
            if c and c.strip().upper() in ('CÓDIGO','CODIGO'): continue           # encabezados repetidos
            if p and p.strip().upper() == 'PROCESO': continue
            if not (s and c and re.match(r'^G[A-Z]P\d', c.strip())): 
                if p and p.strip() and len(p.strip())>2: cur = dict(nombre=p.strip(), sub=[]); procs.append(cur)
                continue
            if p and p.strip(): cur = dict(nombre=p.strip(), sub=[]); procs.append(cur)
            cur['sub'].append(dict(c=c.strip(), s=s.strip(), d=(d or '').strip(), ref=(ref or '').strip()))
        out[ws.title] = procs
    return out

def descripcion(nombre, d):
    d = re.sub(r'\s+',' ', d).strip()
    m = re.match(r'^([^:]{3,70}):\s*(.+)$', d)
    return (m.group(2) if m else d)

# ---------------------------------------------------------------- recortes
def render(key, ev):
    info = DOCS[ev['doc']]; doc = pymupdf.open(info['archivo']); page = doc[ev['p']-1]
    W, Hh = page.rect.width, page.rect.height
    es_pei = ev['doc'] == 'pei'
    top_min = 85 if es_pei else 30                        # debajo del encabezado institucional
    tope = 732 if es_pei else Hh*0.94                     # encima del número de página
    hits = [r for r in page.search_for(ev['h']) if r.y0 > top_min]
    x0, x1 = W*0.045, W*0.955
    cont = None
    if hits:
        r = hits[0]
        words = page.get_text('words'); linea = [pymupdf.Rect(w[:4]) for w in words if abs(w[1]-r.y0) < 3.5 and w[0] >= r.x0-2]
        lr = linea[0]
        for q in linea[1:]: lr |= q
        otros = []                                         # títulos de otras secciones más abajo en la misma página
        for k2, e2 in EV.items():
            if k2 != key and e2['doc']==ev['doc'] and e2['p']==ev['p']:
                hh = [q for q in page.search_for(e2['h']) if q.y0 > r.y1+30]
                if hh: otros.append(hh[0].y0)
        y0 = max(r.y0-9, top_min)
        y1 = min(y0 + ev['H'], tope)
        corta_por_titulo = bool(otros) and (min(otros)-6) < y1
        if corta_por_titulo: y1 = min(otros)-6
        if y1-y0 < 120 and not corta_por_titulo: y1 = min(y0+120, tope)
        # si el título quedó al final de la página, el contenido sigue arriba en la página siguiente
        if not corta_por_titulo and (y1-y0) < ev['H']*0.8 and ev['p'] < doc.page_count:
            p2 = doc[ev['p']]; resto = ev['H'] - (y1-y0)
            lim = [q.y0 for k2, e2 in EV.items() if e2['doc']==ev['doc'] and e2['p']==ev['p']+1 for q in p2.search_for(e2['h']) if q.y0 > top_min]
            # la página siguiente empieza con el encabezado institucional: se salta para que no aparezca a mitad de la captura
            enc = [q.y1 for txt in ('NIT 800181183', 'Página') for q in p2.search_for(txt) if q.y1 < 200]
            ys0 = max(top_min, max(enc) + 8) if enc else top_min
            ye = min(ys0+resto, (min(lim)-6) if lim else tope, tope)
            if ye-ys0 > 40: cont = pymupdf.Rect(x0, ys0, x1, ye)
        marca = pymupdf.Rect(max(lr.x0-4,x0), lr.y0-2, min(lr.x1+6,x1), lr.y1+2)
        page.draw_rect(marca, color=None, fill=(1,0.85,0.1), fill_opacity=0.45, overlay=True)
        page.draw_rect(pymupdf.Rect(x0-2, lr.y0-2, x0+3, lr.y1+2), color=None, fill=(0.85,0.18,0.23), overlay=True)
        encontrado = True
    else:
        y0 = Hh*ev.get('y0f', 0.09); y1, encontrado = min(y0+ev['H'], Hh*0.95), False   # y0f: dónde empezar si no se halla el título
    clip = pymupdf.Rect(x0, y0, x1, y1)
    M = pymupdf.Matrix(2,2)
    def a_pil(pg, c):
        px = pg.get_pixmap(matrix=M, clip=c, alpha=False); return Image.frombytes('RGB', (px.width, px.height), px.samples)
    im = a_pil(page, clip)
    if cont:                                              # une las dos páginas con una franja separadora
        im2 = a_pil(doc[ev['p']], cont); sep = 14
        lienzo = Image.new('RGB', (im.width, im.height+sep+im2.height), (255,255,255))
        lienzo.paste(im, (0,0)); lienzo.paste(Image.new('RGB',(im.width,sep),(226,232,226)), (0,im.height)); lienzo.paste(im2, (0,im.height+sep)); im = lienzo
    for (bx0,by0,bx1,by1) in ev.get('blur', []):         # difumina datos personales
        from PIL import ImageFilter
        zona = im.crop((bx0,by0,bx1,by1)).filter(ImageFilter.GaussianBlur(9)); im.paste(zona,(bx0,by0))
    nombre = f'{ev["doc"]}-p{ev["p"]:03d}-{key}.webp'
    im.save(os.path.join(IMG_DIR, nombre), 'WEBP', quality=72, method=6)
    # texto del fragmento (para leerlo, buscarlo y accesibilidad)
    fresco = pymupdf.open(info['archivo'])
    t = fresco[ev['p']-1].get_text('text', clip=clip)
    if cont: t += '\n' + fresco[ev['p']].get_text('text', clip=cont)
    t = re.sub(r'(GD-D1|Versión 3\.0|PROYECTO EDUCATIVO INSTITUCIONAL|COLEGIO SIMÓN BOLÍVAR|DANE \d+|NIT [\d\-]+|Página \d+ de \d+)', ' ', t)
    t = re.sub(r'[•●▪]\s*', '• ', t); t = re.sub(r'[ \t]+',' ', t)
    t = re.sub(r'\n\s*(?=[a-záéíóúñ,;])',' ', t)         # une líneas partidas a mitad de frase
    t = re.sub(r'\n{2,}','\n', t).strip()
    if len(t) > 1100: t = t[:1100].rsplit(' ',1)[0] + '…'
    transcrito = 'texto' in ev
    if transcrito: t = ev['texto']
    return dict(transcrito=transcrito, img=f'assets/img/procesos/evidencias/{nombre}', w=im.width, h=im.height, texto=t, localizado=encontrado,
                pagina_fin=(ev['p']+1 if cont else ev['p']))


# ---------------------------------------------------------------- base de conocimiento de ARIA
def actualizar_kb(gest, evid, docs):
    """Agrega a aria-conocimiento/base-colegio.json las entradas del mapa de procesos (es idempotente)."""
    ruta = os.path.join(RAIZ, 'aria-conocimiento/base-colegio.json')
    kb = json.load(open(ruta, encoding='utf-8'))
    ent = [x for x in kb['entradas'] if not x['id'].startswith('proc-') and x['id'] != 'procesos-mapa']
    por_id = {x['id']: x for x in ent}
    # Visión y misión: texto oficial de la «Carta de navegación 2024-2027» del PEI (reemplaza el dato anterior)
    if 'mision-vision' in por_id:
        por_id['mision-vision']['respuesta'] = ('Visión: en el año 2027 el colegio será reconocido a nivel regional y nacional por desarrollar procesos académicos y administrativos de alta calidad, apoyado en las TIC, la inclusión escolar y la convivencia ciudadana post pandemia. '
          'Misión: somos una institución de carácter oficial que ofrece un servicio de calidad en Preescolar, Básica, Media Académica y Técnica, propendiendo por la formación integral desde el «saber ser», «saber hacer» y «saber saber», con proyectos de inclusión educativa, evaluación formativa y trabajo colaborativo que fortalecen la construcción de proyectos de vida con éxito. '
          'Política de calidad: ofrecer un servicio educativo de alta calidad que fortalezca el liderazgo, la comunicación y el trabajo en equipo, con recursos y talento humano competentes y mejoramiento continuo de la gestión escolar. '
          'Principios: Libertad, Orden, Justicia, Calidad y Liderazgo, Ética. Pilares (Delors): aprender a conocer, a hacer, a ser y a convivir.')
        por_id['mision-vision']['enlaces'] = [dict(t='Misión y visión en el PEI (p. 24)', u=f'PROCESOS.html#GDP1S1'), dict(t='Documentos institucionales', u='DOCUMENTOS%20INSTITUCIONALES.html')]
    if 'infraestructura' in por_id:
        por_id['infraestructura']['claves'] = [c for c in por_id['infraestructura']['claves'] if not c.startswith('gfp')]   # los códigos GFP ya los atienden las entradas de subprocesos
        por_id['infraestructura']['respuesta'] = 'En el mapa de procesos, la Gestión Administrativa y Financiera tiene el proceso «Administración de la planta física y los recursos» (GFP2): GFP2S1 mantenimiento de la infraestructura de las tres sedes, GFP2S2 recursos tecnológicos (computadores, proyectores y salas de informática), GFP2S3 distribución de recursos y GFP2S4 gestión de riesgos en la planta física.'
        por_id['infraestructura']['enlaces'] = [dict(t='Ver el proceso y su evidencia', u='PROCESOS.html#GFP2'), dict(t='Manual Salas de Informática (PDF)', u=por_id['infraestructura']['enlaces'][0]['u'] if por_id['infraestructura'].get('enlaces') else 'DOCUMENTOS%20INSTITUCIONALES.html')]
    def n(s): return re.sub(r'[()¿?:.,]','',s).strip().lower()
    nuevas = []
    ng = len(gest); npro = sum(len(g['procesos']) for g in gest); nsub = sum(len(p['sub']) for g in gest for p in g['procesos'])
    nuevas.append(dict(id='procesos-mapa', tema='Mapa de procesos del colegio',
        claves=['mapa de procesos','procesos del colegio','gestiones del colegio','cuantas gestiones','campos de gestion','cuantos procesos','cuantos subprocesos','procesos y subprocesos','pagina de procesos','subprocesos'],
        respuesta=f'El colegio se organiza en {ng} gestiones ({", ".join(g["nombre"].replace("Gestión ","") for g in gest)}), con {npro} procesos y {nsub} subprocesos. En la página «Procesos» puedes tocar cada subproceso para ver su evidencia con la página exacta del PEI y de los demás documentos institucionales.',
        enlaces=[dict(t='Mapa de procesos', u='PROCESOS.html')]))
    for g in gest:
        gn = n(g['nombre'])
        nuevas.append(dict(id=f'proc-{g["id"]}', tema=g['nombre']+' (mapa de procesos)',
            claves=[gn, f'procesos de la {gn}', f'subprocesos de la {gn}', f'que procesos tiene la {gn}'],
            respuesta=f'{g["nombre"]}: {g["lema"]} Tiene {len(g["procesos"])} procesos: ' + '; '.join(f'P{p["n"]} {p["nombre"]}' for p in g['procesos']) + '.',
            enlaces=[dict(t=f'Ver {g["nombre"]}', u=f'PROCESOS.html#{g["id"]}')]))
        for p in g['procesos']:
            x = n(p['nombre']); x = re.sub(r'^(la|el|los|las) ', '', x)
            nuevas.append(dict(id=f'proc-{p["id"]}', tema=f'Proceso: {p["nombre"]}',
                claves=[f'proceso {x}', f'proceso de {x}', f'proceso del {x}', f'proceso de la {x}', f'subprocesos de {x}', f'subprocesos del {x}', f'subprocesos de la {x}', f'subprocesos tiene el {x}', f'subprocesos tiene la {x}', f'subprocesos tiene {x}', f'subprocesos hay en {x}', f'subprocesos hay en el {x}', f'subprocesos hay en la {x}', p['id'].lower()],
                respuesta=f'«{p["nombre"]}» ({p["id"]}) es el proceso P{p["n"]} de la {g["nombre"]}. Tiene {len(p["sub"])} subprocesos: ' + '; '.join(s['nombre'] for s in p['sub']) + '.',
                enlaces=[dict(t='Ver el proceso y sus evidencias', u=f'PROCESOS.html#{p["id"]}')]))
            for s in p['sub']:
                e0 = evid[s['ev'][0]]; d0 = docs[e0['doc']]['corto']
                pg = f'pp. {e0["pagina"]}–{e0["pagina_fin"]}' if e0['pagina_fin'] != e0['pagina'] else f'p. {e0["pagina"]}'
                nivel = {'directa':'Evidencia directa','relacionada':'Evidencia relacionada','pendiente':'Por documentar (lo más cercano)'}[s['nivel']]
                sec = f', sección {e0["seccion"]}' if e0['doc']=='pei' and e0['seccion'] else ''
                sx = n(s['nombre'])
                nuevas.append(dict(id=f'proc-{s["cod"]}', tema=f'Subproceso: {s["nombre"]}',
                    claves=[s['cod'].lower(), f'subproceso {sx}', f'evidencia de {sx}', f'evidencia del {sx}', f'evidencia de la {sx}', f'referencia de {sx}', f'referencia del {sx}'],
                    respuesta=f'«{s["nombre"]}» ({s["cod"]}) es un subproceso de «{p["nombre"]}», de la {g["nombre"]}. {nivel}: {d0}{sec}, {pg}.',
                    enlaces=[dict(t='Ver la evidencia', u=f'PROCESOS.html#{s["cod"]}'), dict(t=f'Abrir el PDF ({pg})', u=f'{docs[e0["doc"]]["archivo"].replace(" ","%20")}#page={e0["pagina"]}')]))
    kb['entradas'] = ent + nuevas
    kb['actualizado'] = str(datetime.date.today())
    json.dump(kb, open(ruta, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'ARIA: base de conocimiento actualizada ({len(nuevas)} entradas de procesos; total {len(kb["entradas"])})')

PERSONAL = re.compile(r'\b3\d{9}\b|\b\d{3}[ .-]?\d{3}[ .-]?\d{4}\b|[\w.]+@[\w.]+\.\w+|\b\d{8,11}\b|c[eé]dula|tarjeta de identidad|celular|cel\.', re.I)
def revisar_privacidad(evid):
    """Se detiene si algún fragmento trae teléfonos, correos o números de identificación. Revisa también las imágenes a ojo."""
    mal = {k: PERSONAL.findall(v['texto'])[:3] for k, v in evid.items() if PERSONAL.search(v['texto'])}
    if mal: raise SystemExit(f'ALTO: posibles datos personales en estas evidencias, revísalas antes de publicar: {mal}')

def main(xlsx):
    excel = leer_excel(xlsx)
    evid = {}
    usados = {k for g in MAPA.values() for pr in g for (_, evs) in pr for k in evs}
    for k in sorted(usados):
        ev = EV[k]; r = render(k, ev); info = DOCS[ev['doc']]
        evid[k] = dict(doc=ev['doc'], pagina=ev['p'], seccion=ev['sec'], titulo=ev['titulo'], **r)
        print(f'{k:28} {info["corto"]:22} p.{ev["p"]}{"-"+str(r["pagina_fin"]) if r["pagina_fin"]!=ev["p"] else ""}'.ljust(62)+f'{"ok " if r["localizado"] else "SIN ENCABEZADO"} {r["w"]}x{r["h"]}  {os.path.getsize(os.path.join(RAIZ, r["img"]))//1024} KB')
    revisar_privacidad(evid)
    gest = []
    for hoja, gid, nombre, color, emoji, lema in GESTIONES:
        procs = excel[hoja]; mp = MAPA[gid]
        assert len(procs) == len(mp), f'{gid}: {len(procs)} procesos en el Excel y {len(mp)} en MAPA'
        gp = []
        for i, (p, mm) in enumerate(zip(procs, mp), 1):
            assert len(p['sub']) == len(mm), f'{gid} P{i}: {len(p["sub"])} subprocesos en el Excel y {len(mm)} en MAPA'
            subs = []
            for j, (s, (nivel, evs)) in enumerate(zip(p['sub'], mm), 1):
                cod = f'{gid}P{i}S{j}'
                desc = descripcion(s['s'], s['d'])
                if cod == 'GDP1S1': desc = 'Misión, visión, política de calidad y principios que orientan al colegio como institución integrada. Su redacción vigente está en el PEI.'
                subs.append(dict(cod=cod, cod2024=s['c'], nombre=frase(s['s']), desc=desc, nivel=nivel, ev=evs, ref2024=s['ref']))
            gp.append(dict(id=f'{gid}P{i}', n=i, nombre=frase(p['nombre']), sub=subs))
        gest.append(dict(id=gid, nombre=nombre, color=color, emoji=emoji, lema=lema, procesos=gp))
    docs = {k: dict(nombre=v['nombre'], corto=v['corto'], archivo=v['archivo']) for k, v in DOCS.items()}
    out = dict(version=1, generado=str(datetime.date.today()), docs=docs, gestiones=gest, evidencias=evid)
    os.makedirs(os.path.join(RAIZ,'procesos'), exist_ok=True)
    json.dump(out, open(os.path.join(RAIZ,'procesos/procesos.json'),'w',encoding='utf-8'), ensure_ascii=False, indent=1)
    actualizar_kb(gest, evid, DOCS)
    n = sum(len(p['sub']) for g in gest for p in g['procesos'])
    c = {x: sum(1 for g in gest for p in g['procesos'] for s in p['sub'] if s['nivel']==x) for x in (D,R,P)}
    print(f'\n{len(gest)} gestiones · {sum(len(g["procesos"]) for g in gest)} procesos · {n} subprocesos · evidencias: {c} · {len(evid)} capturas')

if __name__ == '__main__':
    if len(sys.argv) < 2: raise SystemExit(__doc__)
    main(sys.argv[1])
