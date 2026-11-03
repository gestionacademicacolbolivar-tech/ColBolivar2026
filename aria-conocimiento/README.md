# Base de conocimiento de ARIA

`base-colegio.json` es la "memoria" institucional de ARIA. Cuando alguien pregunta por sedes, horarios,
SIEE, faltas, convivencia, contacto, manuales, etc., ARIA responde desde aquí **al instante**, con enlaces,
sin buscar en internet. Si la pregunta no está aquí, sigue el camino de siempre (índice de documentos → IA → Wikipedia).
Lo que sí encuentra aquí también se le entrega a la IA como contexto para que no invente.

## Formato de cada entrada
```json
{
  "id": "sedes",
  "tema": "Sedes y direcciones",
  "claves": ["sedes", "donde queda", "direccion", "telefono"],
  "respuesta": "Texto que ARIA dirá (breve y puntual).",
  "enlaces": [{"t": "Texto del enlace", "u": "https://... o archivo.html"}]
}
```
- `claves`: palabras o frases que el usuario podría escribir (sin tildes da igual; ARIA las normaliza).
  Las frases de varias palabras pesan más que las sueltas. Evita palabras muy genéricas como "tarde" o "notas" solas.
- Después de editar, haz commit: el sitio se republica solo.

## Qué NO va aquí (el repositorio es público)
Teléfonos personales de directivos, claves, tokens, llaves de cuentas de servicio, IDs de hojas de cálculo
ni datos de estudiantes. Esos viven únicamente en las variables de entorno del servidor (Render).
