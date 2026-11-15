# 📝 Pruebas en línea — instalación (una sola vez, ~10 minutos)

Esta plataforma usa **una hoja de Google Sheets** como base de datos y **Google Apps Script** como servidor. Es gratis y no hay nada que mantener.
Hazlo con una cuenta de Google del colegio (por ejemplo la de gestión académica): ahí quedarán guardadas las pruebas y los resultados.

## Paso 1 · Crear la hoja y pegar el código
1. Entra a **sheets.new** (crea una hoja de cálculo) y ponle de nombre `ColBolívar · Pruebas en línea`.
2. Menú **Extensiones → Apps Script**.
3. Borra lo que aparece y **pega todo el contenido de `pruebas/Code.gs`**. Guarda (💾).

## Paso 2 · Instalar
1. En la barra superior elige la función **`instalar`** y pulsa **▶ Ejecutar**.
2. Google pedirá permisos (*Revisar permisos → tu cuenta → Avanzado → Ir a … → Permitir*). Es normal: es tu propio script.
3. Abre **Ver → Registros de ejecución**: allí verás tu **CÓDIGO DE DOCENTES** y tu **CLAVE MAESTRA**.
   - **Código de docentes:** se lo das a los profes; lo piden solo al publicar una prueba. Para cambiarlo: ⚙️ *Configuración del proyecto → Propiedades de la secuencia de comandos → `CODIGO_DOCENTES`*.
   - **Clave maestra:** abre el reporte de **cualquier** prueba (para rectoría/coordinación). Guárdala bien.

## Paso 3 · Publicar como aplicación web
1. **Implementar → Nueva implementación → ⚙️ Aplicación web**.
2. *Ejecutar como:* **Yo** · *Quién tiene acceso:* **Cualquier persona**.
3. **Implementar** y copia la **URL de la aplicación web** (termina en `/exec`).

## Paso 4 · Conectar el portal
En el repositorio abre `datos/pruebas-config.json` y pega la URL:
```json
{"url": "https://script.google.com/macros/s/XXXXXXXX/exec"}
```
Guarda (commit). En un par de minutos la tarjeta **Pruebas en línea** del portal ya funciona.

## Paso 5 (recomendado) · Privacidad
En el editor de Apps Script, ejecuta una vez la función **`crearDisparadorLimpieza`**: cada noche borra las pruebas y resultados con más de **180 días** (cámbialo con la propiedad `DIAS_RETENCION`).
Solo se guardan **nombre y curso** del estudiante (nada de documentos ni contactos). Avísales a los estudiantes y acudientes que sus nombres se registran para la prueba.

## Si cambias el código
Cada vez que modifiques `Code.gs`: **Implementar → Administrar implementaciones → ✏️ → Versión: Nueva versión → Implementar** (la URL no cambia).

## ¿Cómo la usa un profe?
1. Crea la prueba como siempre (el asistente de pruebas genera un `exam.json`) **o** pega sus preguntas en texto simple en la página.
2. Entra a **Pruebas en línea**, sube el archivo, revisa, pon el código de docentes y pulsa **Publicar**.
3. Comparte el enlace / QR / cartel. Los estudiantes la resuelven desde el celular.
4. Abre **Resultados** con su clave para ver notas, preguntas más falladas y comparación por curso.

## Límites a tener en cuenta
- La calificación de selección múltiple es automática; las **preguntas abiertas** las califica el docente en el reporte.
- Preguntas con **gráficos o imágenes** (las que el generador dibuja con `visual`/`imagenPrompt`) aún no se publican: se omiten con aviso.
- Google limita las ejecuciones simultáneas (~30): un curso de 40 estudiantes entrando a la vez funciona; grupos mucho más grandes pueden notar lentitud.
- Es un **apoyo**: las notas oficiales se siguen registrando en la plataforma institucional.
