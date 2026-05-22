# Rediseño de chips del widget postural

**Fecha:** 2026-05-22  
**Archivo afectado:** `hc.html` (widget postural, IIFE al final del archivo)

---

## Problema

Los chips del widget de inspección visual postural usan caracteres Unicode que:

1. Se renderizan distinto según el OS/navegador/PDF renderer (⌢ ⌣ ⟹ ⟸ se "mueven" o recortan en chips de 22–28px).
2. Algunos son ambiguos o no comunican la alteración (< para ángulo agudo, ⌢ para hipercifosis).
3. Hay caracteres duplicados: hipercifosis y flexión usan ⌢; hiperlordosis y extensión usan ⌣; pares espejo de protracción/retracción y anteriorización/posteriorización también coinciden.
4. La paleta muestra los 28 chips mezclados sin distinguir para qué vista aplica cada uno.
5. La leyenda en el render/PDF siempre muestra los 28, aunque solo se hayan colocado 3 chips.

---

## Decisiones de diseño

### 1. Chips rediseñados (8 cambios en ALTS)

| id | Antes | Después | Motivo |
|---|---|---|---|
| `hipercif` | char: `⌢` | SVG curva-C abre → | Representa la convexidad posterior torácica vista lateral D |
| `hiperlord` | char: `⌣` | SVG curva-C abre ← | Representa la convexidad anterior lumbar vista lateral D |
| `hipercif2` | *(no existía)* | SVG curva-C abre ← | Versión espejo de hipercifosis para vista lateral I |
| `hiperlord2` | *(no existía)* | SVG curva-C abre → | Versión espejo de hiperlordosis para vista lateral I |
| `flex` | char: `⌢` | char: `FLX` (texto) | Elimina duplicado con hipercif; texto claro |
| `ext` | char: `⌣` | char: `EXT` (texto) | Elimina duplicado con hiperlord; texto claro |
| `ang_ag` | char: `<` | char: `AA` (texto) | < ambiguo y difícil de leer en 22px |
| `ang_ob` | char: `∠` | char: `AO` (texto) | ∠ apenas visible en chip pequeño |

#### SVG paths para curvas de columna

```
hipercif  (lat-D, abre →): M28 10 Q12 14 10 22 Q12 30 28 34
hiperlord (lat-D, abre ←): M16 10 Q32 14 34 22 Q32 30 16 34
hipercif2 (lat-I, abre ←): M16 10 Q32 14 34 22 Q32 30 16 34  [= hiperlord path]
hiperlord2(lat-I, abre →): M28 10 Q12 14 10 22 Q12 30 28 34  [= hipercif path]
```

El carácter (`char`) de estos 4 pasa de string Unicode a un string SVG inline:  
`<svg viewBox="0 0 44 44" width="100%" height="100%"><path d="…" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/></svg>`

El campo `char` sigue siendo un string; cuando contiene `<svg`, el código de render lo inyecta como `innerHTML` en vez de `textContent`.

### 2. Paleta organizada por vista activa

La paleta de alteraciones (div `#wpost_ig`) pasa de mostrar los 28 chips en una cuadrícula fija `repeat(7,1fr)` a mostrar solo los chips de la vista que tiene el foco activo.

**Mapeo vista → chips:**

```
ant / post  →  elev, dep, inc_d, inc_i, inc_d2, inc_i2,
               rot_d, rot_i, valgo, varo,
               flex, ext, ang_ag, ang_ob

latd        →  ant_z, post_z, prot, retr,
               recurv, gflexum,
               hipercif, hiperlord,
               antev_pelv, retrov_pelv,
               flex, ext, ang_ag, ang_ob

lati        →  ant_z2, post_z2, prot2, retr2,
               recurv, gflexum,
               hipercif2, hiperlord2,
               antev_pelv, retrov_pelv,
               flex, ext, ang_ag, ang_ob
```

**Comportamiento:**
- Al montar el widget, la paleta muestra los chips de `ant` por defecto.
- El foco cambia al disparar `mouseenter` en el contenedor `div.wpost-vb_<vista>` — no en `click` (ya usado para colocar chips) ni en `mouseover` (demasiado ruidoso durante drag).
- En móvil/touch, el foco cambia al inicio del gesto `touchstart` sobre cualquiera de las 4 imágenes.
- La vista activa se indica visualmente con un encabezado sobre la paleta: "Alteraciones — Vista Anterior", "Alteraciones — Lateral Derecha", etc.
- La cuadrícula usa `repeat(auto-fill, minmax(52px, 1fr))` para adaptarse al número de chips de cada vista.
- Se extrae un helper `_renderChip(alt, container)` que centraliza la lógica: si `alt.char` empieza con `<svg`, usa `innerHTML`; si no, `textContent`. Se usa en las 4 ubicaciones de renderizado.

### 3. Leyenda filtrada en render y PDF

En las dos secciones de renderizado (`renderHC` ~línea 1260 y `buildDetalle` ~línea 1684), la leyenda pasa de iterar sobre `_alts` completo a iterar solo sobre las alteraciones que aparecen al menos una vez en `_wdata`.

```js
// Antes
_alts.forEach(function(alt){ … });

// Después
var usedIds = new Set();
['ant','post','latd','lati'].forEach(function(v){
  (_wdata[v]||[]).forEach(function(c){ usedIds.add(c.altId); });
});
_alts.filter(function(a){ return usedIds.has(a.id); })
     .forEach(function(alt){ … });
```

### 4. Render de chips SVG en vistas (wpost-chip-view)

Cuando se pinta un chip sobre la imagen en el render/PDF, si `alt.char` empieza con `<svg`, se usa `innerHTML`; si no, `textContent`. Esto aplica en las tres ubicaciones donde se construye el div `.wpost-chip-view`:

- `renderHC` → `_rendVista` (~línea 1250)
- `buildDetalle` → bloques ant/post y latd/lati (~líneas 1654, 1674)
- `renderDrops` → chip interactivo en el formulario (~línea 9213)
- tooltip hover en `wpost-chip-view` (~línea 3265)

---

## Alcance

- **Solo `hc.html`** — un único archivo.
- **Sin cambios en Google Apps Script** — los datos `widgetPostural` guardados en Drive siguen siendo `{altId, xp, yp}`. Los nuevos ids (`hipercif2`, `hiperlord2`) se guardan igual.
- **Retrocompatibilidad** — los registros existentes con `hipercif`/`hiperlord` siguen funcionando; solo cambia el aspecto visual.

---

## Lo que NO cambia

- Colores de todos los chips existentes.
- IDs de chips existentes.
- Estructura de datos `widgetPostural` en Drive.
- Los chips de flechas Unicode (↑ ↓ ↗ ↖ ↻ ↺ → ← ⟹ ⟸ ↩ ≥ )( () AP RP) — se mantienen porque se ven bien.
- Lógica de drag-drop, click-to-place, tooltip, subida de fotos.
