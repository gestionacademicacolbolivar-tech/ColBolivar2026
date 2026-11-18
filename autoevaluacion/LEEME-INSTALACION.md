# Autoevaluación institucional 2026 · cómo activarla (10 minutos)

La página `autoevaluacion.html` ya funciona sola, pero **para que las respuestas de todos los docentes se sumen** necesita una hoja de Google que las reciba (igual que «Pruebas en línea»). Mientras no la conectes, la página trabaja en *modo de prueba*: lo que se envía se queda solo en ese dispositivo.

## 1. Crear la hoja y pegar el código
1. Crea una hoja de cálculo nueva en Google Drive (nómbrala «Autoevaluación 2026 · respuestas»).
2. **Extensiones → Apps Script**. Borra lo que haya y pega todo el contenido de [`Code.gs`](Code.gs).
3. Guarda (💾).

## 2. Publicarla
1. **Implementar → Nueva implementación → ⚙️ Aplicación web**.
2. *Ejecutar como:* **Yo**. *Quién tiene acceso:* **Cualquier persona**.
3. **Implementar** y autoriza los permisos (Google avisará que la app no está verificada: *Configuración avanzada → Ir a…*).
4. Copia la **URL de la aplicación web** (termina en `/exec`).

## 3. Conectarla al sitio
Abre `datos/autoevaluacion-config.json` y pega la URL entre las comillas de `"url"`:

```json
{ "url": "https://script.google.com/macros/s/XXXXXXXX/exec", ... }
```

Prueba: abre `…/exec?accion=ping` en una ventana de incógnito; debe responder `{"ok":true,"version":"1.0"}`. Si no, revisa que el acceso sea «Cualquier persona».

## 4. (Opcional) Claves
- `CLAVE_ENVIAR` en `Code.gs`: solo quien tenga la clave puede enviar (evita que personas ajenas contesten). Después pon `"pedirClaveEnviar": true` en el config.
- `CLAVE_VER`: protege el tablero y el informe. Después pon `"pedirClaveVer": true`.
La clave **no se escribe en el sitio**: cada persona la digita. Cuando cambies una clave en `Code.gs`, publica **Nueva versión** de la implementación.

## Qué se guarda (y qué no)
Se guarda: fecha y hora, un código aleatorio del envío (solo evita duplicados si el celular reintenta), el rol (opcional), las valoraciones 1–4 y los comentarios por proceso. **No** se guarda nombre, correo ni IP. Pídele a los docentes que no escriban nombres de personas en los comentarios.

## Límite que conviene saber
Sin identificar a las personas, no se puede impedir al 100 % que alguien conteste dos veces. Lo que sí hay: el aviso en el dispositivo después de enviar y la clave de participación opcional. Si ves envíos raros, en la hoja puedes borrar filas a mano.

## Fuente
Instrumento: **Guía No. 34 actualizada (MEN, 2026)** — Anexo 1 (procesos, componentes y descriptores de 4 niveles), Anexo 2 (matriz de resultados) y Anexo 3 (fuentes de evidencia). Los textos están en `datos/autoevaluacion-guia34.json`.
