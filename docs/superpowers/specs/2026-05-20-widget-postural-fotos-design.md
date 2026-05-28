# Widget Postural — Fotos reales + cuadrícula + chips pélvicos

**Fecha:** 2026-05-20  
**Archivo afectado:** `hc.html` (frontend + widget script), `gashc.txt` (backend)

---

## Contexto

El widget postural de evaluación clínica CENTYR muestra 4 vistas (anterior, posterior, lateral derecha, lateral izquierda) con imágenes estáticas de silueta sobre las que el usuario coloca chips de hallazgos. El objetivo es reemplazar esas siluetas estáticas con fotos reales del paciente, agregar una cuadrícula de referencia de 2 cm × 2 cm y añadir dos chips nuevos para el análisis pélvico.

---

## Alcance

1. Subida de foto por vista (4 vistas independientes) → almacenadas en Google Drive
2. Cuadrícula 2 cm × 2 cm como overlay CSS sobre la foto
3. Mismo tamaño/contenedor que la silueta estática actual
4. Funcionamiento en los 3 contextos: formulario (edición), render "Ver" y render PDF
5. Dos nuevos chips: Anteversión pélvica y Retroversión pélvica

---

## Modelo de datos

El campo `widgetPostural` en `datosEspecificos` de la evaluación se extiende con `fotos`:

```json
{
  "ant":  [{ "altId": "cabeza", "xp": 50, "yp": 10 }],
  "post": [],
  "latd": [],
  "lati": [],
  "fotos": {
    "ant":  "drive_file_id | null",
    "post": "drive_file_id | null",
    "latd": "drive_file_id | null",
    "lati": "drive_file_id | null"
  }
}
```

Si `fotos[vista]` es null o ausente → se muestra la silueta estática (fallback).

---

## Backend (`gashc.txt`)

### Nueva acción `subirFotoWidget`
- Auth: `['admin', 'docente', 'estudiante']`
- Parámetros: `{ token, base64, mimeType, vista, evalId }`
- Sube el archivo a la carpeta de Drive de la evaluación
- Nombre de archivo: `wpost_<vista>_<evalId>.<ext>`
- Si ya existe un archivo previo para esa vista/evalId, lo mueve a papelera antes de subir
- Devuelve `{ ok: true, fileId: '...' }`

### Nueva acción `getFotoWidget`
- Auth: ninguna (igual que `getConsentimiento`)
- Parámetros: `{ fileId }`
- Lee el archivo de Drive y devuelve `{ ok: true, base64: '...', mimeType: '...' }`

### Router `doPost`
Agregar ambas acciones junto a las existentes de consentimiento.

---

## Frontend (`hc.html`)

### A. Subida en el formulario (`wpostMount`)

Cada panel de vista agrega bajo la imagen:
- Botón **"📷 Subir foto"** (`<input type="file" accept="image/*">` oculto)
- Al seleccionar: comprimir con `<canvas>` → máx 800 px, JPEG 80%
- POST `subirFotoWidget` → recibir `fileId` → guardar en `VBS[k].fotoId`
- Reemplazar la `<img>` estática por la foto comprimida (src = base64 temporal hasta recargar)
- Mostrar overlay de cuadrícula sobre la foto

### B. Overlay de cuadrícula

Div absoluto sobre el contenedor de imagen, pointer-events none:
```css
background:
  linear-gradient(to right,  rgba(0,0,0,0.12) 1px, transparent 1px) 0 0 / 2cm 2cm,
  linear-gradient(to bottom, rgba(0,0,0,0.12) 1px, transparent 1px) 0 0 / 2cm 2cm;
```
Aplicado tanto en edición como en lectura y PDF.

### C. `wpostGetData()` — serialización

Incluir `fotos` en el objeto retornado:
```js
out.fotos = { ant: VBS.ant?.fotoId||null, post: VBS.post?.fotoId||null, ... };
```

### D. `wpostSetData(saved)` — carga al editar evaluación existente

Si `saved.fotos[k]` existe → llamar `getFotoWidget(fileId)` → mostrar foto.  
Operación async, mostrar spinner mientras carga.

### E. Render "Ver" (`buildDetalleEval` / `toggleEvalInline`)

Al cargar la evaluación:
- Leer `widgetPostural.fotos`
- Por cada vista con fileId, llamar `getFotoWidget` y cachear en `window._wpostFotosCache`
- `wpostGetIMGS()` devuelve `_wpostFotosCache[k]` o la silueta estática como fallback

### F. Render PDF (`wpostGetIMGS`)

Ya consume `wpostGetIMGS()` — al estar cacheado en `_wpostFotosCache`, el PDF funciona automáticamente. Cuadrícula incluida via el mismo overlay CSS.

---

## Nuevos chips

Agregar al array `ALTS` en el script del widget:

| id | lbl | char | color |
|---|---|---|---|
| `antev_pelv` | Anteversión pélvica | `AP` | `#7c3aed` (púrpura) |
| `retrov_pelv` | Retroversión pélvica | `RP` | `#b45309` (ámbar) |

Visibles en el selector de chips compartido por todas las vistas.

---

## Comportamiento de fallback

| Situación | Resultado |
|---|---|
| No hay foto subida | Silueta estática (comportamiento actual) |
| Error al cargar foto de Drive | Silueta estática + toast de aviso |
| Foto subida pero Drive no responde al ver PDF | Silueta estática en PDF |

---

## Fuera de alcance

- Eliminación manual de fotos desde la UI (se sobreescriben al subir una nueva)
- Edición/recorte de la foto en el browser
- Fotos compartidas entre evaluaciones del mismo paciente
