# Portada (index.html)

Rediseño de la portada con ilustraciones propias (estilo "sticker 3D") en 6 hojas.

- `index.html` — la portada. Secciones: escena de bienvenida · Hoy en Bolívar (pizarra) · Servicios por categorías · ColBolívar Radio · Conoce el colegio · Novedades · pie.
- `assets/img/portada/<grupo>/<pieza>.webp` — piezas sueltas con fondo transparente (servicios, hoy, componentes, escena, marcos, botones).
- `assets/img/portada/manifest.json` — tamaño de cada pieza y, en los marcos, las medidas para estirarlos con `border-image`.
- `portada/herramientas/fuente/*.webp` — las 6 hojas originales.
- `portada/herramientas/empaquetar_portada.py` — vuelve a recortar las hojas en piezas (`pip install pillow numpy scipy`, luego `python portada/herramientas/empaquetar_portada.py` desde la raíz).

## Cómo cambiar contenido
- **Servicios:** lista `CATS` al inicio del script de `index.html` (título, descripción, enlace e ícono de cada tarjeta; las que están en `LOCK` piden contraseña de docentes).
- **Cuentas regresivas, aviso y videos:** `datos/hoy-data.js` (como antes). **Cumpleaños:** `datos/cumpleanos-data.js`.
- **Una ilustración nueva:** reemplaza el archivo en `assets/img/portada/<grupo>/` con el mismo nombre.
