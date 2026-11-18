# Scripts de indexación de ARIA
Se ejecutan solos con la GitHub Action `Indexar documentos para ARIA` cada vez que subes un archivo.
- `indexar_docs.py`: índice clásico (`indice-docs.json`).
- `pdftexto.py`: texto limpio por página (quita encabezados y pies repetidos).
- `ocr_paginas.py`: OCR en español de páginas-imagen -> `datos/ocr-paginas.json` (no repite lo ya hecho).
- `tablas_pdf.py`: tablas de los PDF como datos -> `datos/tablas-documentos.json`.
- `indexar_parrafos.py`: índice por párrafos con sección y página -> `indice-parrafos.json` (lo usa `aria-buscar.js`).
Para probarlos en tu equipo: `pip install pypdf beautifulsoup4 python-docx pdfplumber` y tener `poppler-utils` y `tesseract-ocr-spa`.
