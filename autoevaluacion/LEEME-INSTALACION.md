# Autoevaluación 2026 · activar la hoja de Google (unos 10 minutos)

La página `autoevaluacion.html` ya funciona sola, pero **para que las respuestas de todos los docentes se sumen** necesita una hoja de Google que las reciba. Mientras no la conectes, la página trabaja en *modo de prueba*: lo que se envía se queda solo en ese dispositivo.

## Paso a paso

1. **Crea la hoja.** En Google Drive: *Nuevo → Hojas de cálculo de Google*. Ponle un nombre, por ejemplo «Autoevaluación 2026 · respuestas».
2. **Pega el script.** *Extensiones → Apps Script*. Borra lo que haya, pega todo el contenido de [`Code.gs`](Code.gs) y guarda (💾).
3. **Recarga la hoja** (F5). Aparece el menú **🎓 Autoevaluación 2026**. *(Si no aparece: en Apps Script elige la función `onOpen`, pulsa ▶ Ejecutar y acepta los permisos.)*
4. **Menú → 🛠️ 1. Preparar la hoja.** Google pide permisos: *Revisar permisos → tu cuenta → Configuración avanzada → Ir a (nombre del proyecto) → Permitir*. (El aviso de «app no verificada» es normal: el script es tuyo.) Se crean las hojas **Respuestas** e **Instrucciones**.
5. **Publica.** En Apps Script: *Implementar → Nueva implementación → ⚙️ → Aplicación web*. Pon **Ejecutar como: Yo** y **Quién tiene acceso: Cualquier persona**. *Implementar* y copia la URL que termina en `/exec`.
6. **Conéctala al sitio.** En la hoja: menú **🔗 2. Ver la dirección para pegar en el sitio**. Copia esa URL y pégala en `datos/autoevaluacion-config.json`, en `"url"` (en GitHub: abrir el archivo → ✏️ → pegar → *Commit changes*).
7. **Prueba.** Menú **🧪 3. Probar que todo funciona**. Luego abre `…/exec?accion=ping` en una ventana de incógnito: debe responder `{"ok":true,...}`.
8. **Antes de abrirla a los docentes:** menú *🧹 Borrar datos → Restablecer* para dejar la hoja limpia (si hiciste pruebas desde el sitio).

> Si más adelante cambias el código: *Implementar → Administrar implementaciones → ✏️ → Versión: Nueva versión → Implementar* (la URL no cambia).

## El menú de la hoja

| Opción | Para qué sirve |
|---|---|
| 🛠️ 1. Preparar la hoja | Crea y da formato a «Respuestas» e «Instrucciones» (primera vez). |
| 🔗 2. Ver la dirección | Muestra la URL `/exec` que va en el config del sitio. |
| 🧪 3. Probar | Guarda y borra una respuesta de prueba y revisa que todo responda. |
| 📊 Actualizar «Resumen» | Crea una tabla por componente y por gestión, con colores por nivel y personas que evaluaron cada gestión. |
| ℹ️ Estado actual | Cuántas respuestas hay, última respuesta, si está abierta, si hay claves. |
| 🚪 Abrir / cerrar la recepción | Cierra el envío al terminar el plazo (el tablero sigue funcionando). |
| 🔑 Claves | Pone o quita la clave para **enviar** o para **ver** resultados (opcional). |
| 🧹 Borrar datos | Borra respuestas de PRUEBA, las filas seleccionadas, o **restablece todo** (pide escribir BORRAR y hace respaldo antes). |
| 💾 Crear un respaldo | Copia «Respuestas» a una hoja nueva «Respaldo …». |

**Claves (opcional).** Si pones clave para enviar, en `datos/autoevaluacion-config.json` cambia `"pedirClaveEnviar"` a `true` (igual con `"pedirClaveVer"`). La clave no se escribe en el sitio: cada persona la digita.

## Cómo se cuentan las personas
Cada gestión se envía por separado. El celular o computador genera un **código aleatorio** (no es nombre ni correo) para saber que dos envíos vienen del mismo dispositivo; así, quien evalúa dos gestiones cuenta como **una** persona y el tablero muestra cuántas personas evaluaron cada gestión. Si alguien reenvía la misma gestión, la última versión reemplaza a la anterior. Si otra persona usa el mismo dispositivo, debe pulsar «👤 Otra persona usa este dispositivo» en el menú de Evaluar.

## Qué se guarda (y qué no)
Se guarda: fecha y hora, el código aleatorio del dispositivo, el código del envío (evita duplicados), el rol (opcional), las valoraciones 1–4 y los comentarios por proceso. **No** se guarda nombre, correo ni IP. Pide a los docentes no escribir nombres de personas en los comentarios.

## Límite que conviene saber
Sin identificar a las personas no se puede impedir al 100 % que alguien conteste varias veces (por ejemplo desde otro dispositivo). Ayudan la clave de participación y revisar las filas en «Respuestas» (menú → *Borrar las filas seleccionadas*).

## Fuente
Instrumento: **Guía No. 34 actualizada (MEN, 2026)**: Anexo 1 (procesos, componentes y descriptores de 4 niveles), Anexo 2 (matriz de resultados) y Anexo 3 (fuentes de evidencia). Textos en `datos/autoevaluacion-guia34.json`.
