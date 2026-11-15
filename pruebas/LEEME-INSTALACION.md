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
7. Comprueba: abre `TU-URL/exec?accion=ping` en el navegador → debe verse `{"ok":true,"version":"1.2"}`.

> Si en el paso 5 no aparece la opción **«Cualquier persona»**, tu cuenta de Google pertenece a una organización que la bloquea. Haz el proceso con una cuenta Gmail normal (por ejemplo `gestionacademica…@gmail.com`).

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
1. Abre `TU-URL/exec?accion=ping` en el navegador. Si pide iniciar sesión o da error → el acceso **no** es «Cualquier persona» (paso 5).
2. Si la URL en `datos/pruebas-config.json` cambió o tiene espacios, corrígela.
3. Si ping funciona pero publicar falla, la prueba es muy pesada: usa menos imágenes.

## Límites
- La selección múltiple se califica sola; las **preguntas abiertas** las califica el docente en el reporte.
- Las figuras e ilustraciones llegan con el archivo **`prueba-en-linea.json`** que crea el generador de pruebas actualizado (parche `exportar-en-linea.patch`). Las tablas y recuadros de texto se dibujan solos.
- Google limita las ejecuciones simultáneas (~30): un curso de 40 estudiantes funciona; grupos mucho más grandes pueden notar lentitud.
- Es un **apoyo**: las notas oficiales se registran en la plataforma institucional.
