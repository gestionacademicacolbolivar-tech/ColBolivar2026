# 📝 Pruebas en línea — instalación y administración

Usa **una hoja de Google Sheets** como base de datos y **Google Apps Script** como servidor. Es gratis y no hay nada que mantener.

## Instalar (una sola vez, ~10 minutos)
1. **sheets.new** → ponle nombre `ColBolívar · Pruebas en línea`.
2. **Extensiones → Apps Script** → borra lo que aparece y pega **todo `pruebas/Code.gs`** → guarda 💾.
3. Elige la función **`instalar`** → **▶ Ejecutar** → acepta los permisos (*Revisar permisos → tu cuenta → Avanzado → Ir a… → Permitir*).
4. **Ver → Registros de ejecución**: anota el **CÓDIGO DEL COLEGIO** y la **CLAVE MAESTRA**.
5. **Implementar → Nueva implementación → ⚙️ Aplicación web**:
   - *Ejecutar como:* **Yo**
   - *Quién tiene acceso:* **Cualquier persona** ⚠️ (por defecto sale «Solo yo»: si se deja así, **nadie podrá conectarse** y el portal dirá «no se pudo conectar»).
6. Copia la **URL** (termina en `/exec`) y pégala en `datos/pruebas-config.json`.
7. Comprueba: abre `TU-URL/exec?accion=ping` en el navegador → debe verse `{"ok":true,"version":"1.4"}`.

> Si en el paso 5 no aparece la opción **«Cualquier persona»**, tu cuenta de Google pertenece a una organización que la bloquea. Haz el proceso con una cuenta Gmail normal (por ejemplo `gestionacademica…@gmail.com`).

## Actualizar a la versión 1.4 (necesaria para tiempos y seguridad)
La v1.4 guarda las opciones de cada prueba (tiempo para pensar, límite por pregunta, anti-fraude…) y el registro de salidas de los estudiantes. **Sin esta versión esas opciones se ignoran.**
1. Pega el nuevo `Code.gs` en el editor y guarda.
2. **Implementar → Administrar implementaciones → ✏️ → Versión: Nueva versión → Implementar** (la URL no cambia; revisa que el acceso siga en «Cualquier persona»).
3. No hace falta tocar la hoja: las columnas nuevas se agregan solas al publicar la siguiente prueba.
4. Comprueba con `…/exec?accion=ping` → `{"ok":true,"version":"1.4"}`.

## 📝 Menú «ColBolívar» en la hoja (administración sin tocar código)
Después de pegar `Code.gs` (v1.3), **recarga la hoja** (F5). Aparece el menú **📝 ColBolívar** junto a «Ayuda». Si no aparece: en el editor de Apps Script elige la función `onOpen` y pulsa ▶ Ejecutar.

| Opción | Para qué sirve |
|---|---|
| 🔎 Ver claves y estado | Muestra el **código del colegio**, la **clave maestra**, si el registro está abierto, cuántos docentes/pruebas/entregas hay y la URL de la aplicación web |
| 👩‍🏫 Docentes → Cambiar el código del colegio | Pone un código nuevo para registrarse (los ya inscritos no se afectan) |
| 👩‍🏫 Docentes → Abrir / cerrar el registro | Cierra el registro cuando todos estén inscritos |
| 👩‍🏫 Docentes → Bloquear / Desbloquear | Actúa sobre el docente de la **fila seleccionada** en la hoja «Docentes» |
| 👩‍🏫 Docentes → Dar un código nuevo | Si un profe perdió o filtró su código: se genera otro y **conserva sus pruebas** |
| 👩‍🏫 Docentes → Eliminar | Lo quita de la lista (sus pruebas no se borran) |
| 📝 Pruebas → Cerrar / Reabrir | Actúa sobre la prueba de la **fila seleccionada** en la hoja «Pruebas» |
| 📝 Pruebas → Borrar las respuestas | Deja la prueba limpia (útil tras un ensayo); la prueba se conserva |
| 📝 Pruebas → Eliminar la prueba | La borra con todas sus respuestas |
| 📝 Pruebas → Borrar las que no tienen entregas / con más de N días | Limpieza en bloque, siempre con confirmación |
| 🔐 Seguridad → Clave maestra nueva | Invalida la anterior (úsala si se filtró) |
| 🔐 Seguridad → Días que se guardan / Borrado automático | Privacidad: borra solo cada noche lo vencido |

**Cómo usar las opciones de «fila seleccionada»:** ve a la hoja indicada (pestaña de abajo), haz clic en cualquier celda de la fila y luego elige la opción del menú. Todo lo que borra pide confirmación y **no se puede deshacer**.

## Cómo se registran los docentes
Cada profe entra a **`docentes.html`** (enlace «Registro de docentes» dentro de *Pruebas en línea*), escribe **nombre, sede** y el **código del colegio**, y recibe su **código personal** (`D-XXXXXX`).
- Todo queda en la hoja **Docentes** del Sheet: ahí ves nombre, sede, fecha y **el código de cada profe**.
- **Bloquear a alguien:** cambia su `estado` a `bloqueado` (ya no puede publicar ni abrir resultados).
- **Código del colegio:** se lo compartes a todos por WhatsApp una vez. Cámbialo cuando quieras en ⚙️ *Configuración del proyecto → Propiedades de la secuencia de comandos → `CODIGO_DOCENTES`*.
- **Cerrar el registro** cuando todos estén inscritos: `REGISTRO_ABIERTO` = `no`.
- Con su código el profe ve **todas sus pruebas desde cualquier celular o computador** y abre sus resultados sin más claves. La **clave maestra** abre cualquier prueba (rectoría/coordinación).

Mensaje sugerido para el grupo de profes:
> 📝 *Pruebas en línea ColBolívar*: regístrate en TU-PORTAL/docentes.html con tu nombre y sede. Código del colegio: **XXXX**. Te dará tu código personal. Guía: TU-PORTAL/pruebas.html

## Actualizar el script
Cada vez que cambie `Code.gs`: pégalo, guarda y **Implementar → Administrar implementaciones → ✏️ → Versión: Nueva versión → Implementar** (la URL no cambia; revisa que el acceso siga en «Cualquier persona»).

## Privacidad (recomendado)
Ejecuta una vez **`crearDisparadorLimpieza`**: cada noche borra las pruebas y resultados con más de **180 días** (`DIAS_RETENCION`). Se guardan solo **nombre y curso** del estudiante. Avisa a estudiantes y acudientes que su nombre se registra para la prueba.

## Si el portal dice «No se pudo conectar»
**Primero abre la página de diagnóstico del portal: `pruebas-diagnostico.html`.** Te dice la causa exacta (acceso mal configurado, falta autorizar, dirección mal escrita, versión vieja…).

⚠️ **Cada implementación tiene su propia configuración de acceso y su propia URL.** Si usas «Nueva implementación» obtienes una URL nueva (hay que pegarla en `datos/pruebas-config.json`) y hay que volver a poner «Cualquier persona». Para no cambiar la URL, usa Administrar implementaciones → ✏️ → Nueva versión.

La dirección que sirve es la que termina en `/exec` (no la de «biblioteca», `…/macros/library/…`, ni la de prueba `/dev`).

A mano:
1. Abre `TU-URL/exec?accion=ping` en el navegador. Si pide iniciar sesión o da error → el acceso **no** es «Cualquier persona» (paso 5).
2. Si la URL en `datos/pruebas-config.json` cambió o tiene espacios, corrígela.
3. Si ping funciona pero publicar falla, la prueba es muy pesada: usa menos imágenes.

## Límites
- La selección múltiple se califica sola; las **preguntas abiertas** las califica el docente en el reporte.
- **Word (.docx):** el portal lee el documento en el navegador (no se envía a ningún servidor). Detecta preguntas, opciones, textos compartidos, tablas, imágenes y fórmulas, y la respuesta correcta si está marcada (←, ✓, *, resaltado, sombreado, subrayado, negrita, color, «Respuesta: B» o clave al final). No lee cuadros de texto ni formas, ni imágenes en formato EMF/WMF, ni archivos .doc antiguos (guárdalos como .docx). Siempre se revisa en el editor antes de publicar.
- **Seguridad:** el anti-fraude detecta salidas de la pestaña/ventana, salida de pantalla completa e intentos de copiar. Es un **disuasivo**, no un candado: no detecta otro dispositivo ni una pantalla dividida.
- Las figuras e ilustraciones llegan con el archivo **`prueba-en-linea.json`** que crea el generador de pruebas actualizado (parche `exportar-en-linea.patch`). Las tablas y recuadros de texto se dibujan solos.
- Google limita las ejecuciones simultáneas (~30): un curso de 40 estudiantes funciona; grupos mucho más grandes pueden notar lentitud.
- Es un **apoyo**: las notas oficiales se registran en la plataforma institucional.
