# Sección PROCESOS

- `PROCESOS.html` — la página (menú → Procesos).
- `procesos/procesos.json` — datos: 4 gestiones › procesos › subprocesos, cada uno con su evidencia (documento, página, cita, captura y fragmento).
- `assets/img/procesos/evidencias/` — capturas recortadas del PDF, con el título de la sección resaltado.
- `assets/img/procesos/` — sprites e imágenes de la sección (ver `PEDIDO-DE-IMAGENES.md`).
- `procesos/herramientas/generar_evidencias.py` — regenera todo lo anterior (y las entradas de ARIA) desde el Excel y los PDF.

## Cuando cambie el PEI (o cualquier documento)
```
pip install pymupdf pillow openpyxl
python procesos/herramientas/generar_evidencias.py MAPA_DE_PROCESOS.xlsx
```
Si una sección cambió de página, se corrige en la tabla `EV` del script (número de página y texto del título); el resto se recalcula solo.

## Niveles de evidencia
`directa` (sección propia) · `relacionada` (el tema aparece dentro de otra sección) · `pendiente` (aún no hay apartado específico).
Se cambian en la tabla `MAPA` del script.
