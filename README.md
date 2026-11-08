# 🎓 ColBolívar · Portal de gestión académica

Sitio web de la **I.E. Colegio Integrado Simón Bolívar** (Cúcuta), publicado con GitHub Pages.
Portada: `index.html` · Documentos institucionales · Cartelera · Cumpleaños · ColBolívar Radio · ARIA (asistente virtual) · Modo estudio.

## 🗂️ Mapa del repositorio

| Carpeta / archivo | Qué contiene | ¿Lo editas tú? |
|---|---|---|
| **`documentos/`** | **Los PDF institucionales**, ordenados por categoría en subcarpetas. Aquí se suben los documentos nuevos. | ✅ Sí → ver [`documentos/LEEME.md`](documentos/LEEME.md) |
| **`datos/`** | Lo que se actualiza seguido: avisos y fechas (`hoy-data.js`), cumpleaños (`cumpleanos-data.js`), preguntas del Modo estudio y el catálogo de documentos. | ✅ Sí → ver [`datos/LEEME.md`](datos/LEEME.md) |
| `colbolivar-radio/` | La emisora: página, programación, `audio/` (música y podcast) y herramientas. | ✅ Música y podcast |
| `tarjetas_cumpleanos/` | Imágenes de las tarjetas de cumpleaños. | ✅ Sí |
| `procesos/` | Mapa de procesos y evidencias. | ✅ Sí |
| `aria-conocimiento/` | Base de conocimiento de ARIA. | ✅ Sí |
| `assets/` | Imágenes, estilos, scripts, íconos y librerías del sitio (`img/`, `css/`, `js/`, `icons/`, `aria/`, `vendor/`). | ❌ No tocar |
| `scripts/` y `.github/` | Automatizaciones: indexan los documentos para ARIA y generan el catálogo. | ❌ No tocar |
| Páginas `*.html` de la raíz | Las páginas del sitio (`CALIDAD.html`, `cartelera.html`, `visor.html`, `estudio.html`…). | Solo con ayuda |
| `index.html`, `404.html`, `sw.js`, `manifest.webmanifest`, `favicon.ico` | **Deben estar en la raíz** para que el sitio funcione, se instale como app y tenga ícono. | ❌ No mover |
| `aria-widget.html`, `aria-docs.js`, `aria-kb.js`, `indice-docs.json` | ARIA. El índice lo regenera un robot cada vez que subes archivos. | ❌ No tocar |

> Las páginas públicas se dejan en la raíz a propósito: sus direcciones ya están compartidas (WhatsApp, códigos QR, el sitio de Wix) y moverlas rompería esos enlaces.

## ⬆️ Subir un documento nuevo (3 pasos)

1. Entra a la carpeta **`documentos/`** y elige la subcarpeta que corresponda (o crea una nueva).
2. **Add file → Upload files** y arrastra el PDF.
3. Espera 1–2 minutos: aparece solo en *Documentos institucionales → Más documentos*, ARIA lo aprende y el visor lo abre en línea.

## 🔒 Privacidad

Este repositorio y el sitio son **públicos**. **No subas documentos con datos personales o de salud de estudiantes** (fichas, PIAR individuales, actas con nombres). Lo que se sube a GitHub queda en el historial aunque se borre después.
