# 🔔 Tablero diario, novedades y avisos al celular

## Qué pasa solo cada noche (5:00 a. m.)
El flujo `Tablero diario` (GitHub → Actions) ejecuta `scripts/generar_tablero.py` y crea:
- `datos/hoy-auto.json`: cumpleaños de hoy y próximos 7 días, fechas límite, **novedades** y servicios con insignia **NUEVO**.
- `datos/cifras-auto.json`: números de la página **Colegio en cifras** (`cifras.html`).
También se ejecuta solo cuando subes un PDF a `documentos/` o editas los archivos de `datos/`.
Para correrlo a mano: GitHub → Actions → *Tablero diario* → **Run workflow**.

## ¿Qué cuenta como «novedad»?
1. Un **PDF nuevo o actualizado** en `documentos/` (de los últimos 14 días; ajusta en `datos/novedades-config.json`).
2. Un **aviso manual**: escribe una línea en `datos/novedades-manual.json`, por ejemplo una circular publicada en el Wix:
```json
[{"t": "Circular 045: Reunión de padres", "u": "https://gestionacademicaco.wixsite.com/colbolivar1/circulares", "f": "2026-11-12", "servicio": "Circulares"}]
```
(`f` = fecha AAAA-MM-DD; `servicio` = nombre exacto de la tarjeta donde saldrá la insignia NUEVO.)
La insignia desaparece en cada dispositivo cuando la persona abre ese servicio.

## Avisos al celular — dos niveles
**Nivel 1 (ya funciona, sin cuentas):** el botón «🔔 Activar avisos» de *Hoy en Bolívar* pide permiso y el navegador/PWA avisa de las novedades y de las fechas del día siguiente cuando la persona abre el portal (en Android con la app instalada también puede revisar en segundo plano). No requiere servidor.

**Nivel 2 (push real, con la app cerrada y también en iPhone con la app instalada) — OneSignal, gratis:**
1. Crea una cuenta en onesignal.com → *New App* → *Web* → sitio `https://gestionacademicacolbolivar-tech.github.io/ColBolivar2026/`.
2. Copia el **App ID** y la **REST API Key**.
3. En GitHub → Settings → Secrets and variables → Actions crea los secretos `ONESIGNAL_APP_ID` y `ONESIGNAL_API_KEY`.
4. Pega el App ID en `datos/notificaciones-config.json` (`onesignal_app_id`).
5. En `sw.js` cambia `const PUSH_ONESIGNAL=false;` a `true`.
Desde ahí, cada noche el flujo envía un aviso por cada novedad y recordatorios de fechas límite (a 3 días, 1 día y el mismo día). Lo ya avisado queda en `datos/avisos-enviados.json`.

## Datos manuales de «Colegio en cifras»
Matrícula, resultados ICFES y visitas **no se inventan**: se llenan en `datos/cifras-manual.json` con datos oficiales y las gráficas aparecen solas.
