# Diseño: Bloqueo de áreas/espacios y rango de fechas

**Fecha:** 2026-05-22  
**Estado:** Aprobado

## Contexto

La agenda ya soporta bloqueos por slot (hora) y rango de horas. Se añaden dos mejoras:

1. **Rango de fechas** en el formulario de bloqueos: bloquear de fecha X a fecha Y.
2. **Toggle ON/OFF** por área y espacio en la pestaña "Áreas y Franjas": crear/eliminar un bloqueo permanente con un clic.

---

## Parte 1: Rango de fechas en el formulario de bloqueos

### Layout del formulario

El form pasa de 3 columnas en una fila a 4 filas de 2 columnas:

```
[ Fecha inicio          ] [ Fecha fin (opcional)  ]
[ Hora inicio           ] [ Hora fin (opcional)   ]
[ Area                  ] [ Espacio               ]
[ Motivo                                          ]
```

### Formato de almacenamiento

- Fecha única: `"2026-06-01"` (sin cambio)
- Todas las fechas: `"*"` (sin cambio)
- Rango: `"2026-06-01/2026-06-30"` — separador `/` para evitar colisión con el `-` de las fechas ISO

### Cambios en `index.html`

**HTML — formulario** (~línea 1236):
- Separar la fila actual `[Fecha | Hora inicio | Hora fin]` en dos filas `[Fecha inicio | Fecha fin]` y `[Hora inicio | Hora fin]`
- Nuevo campo `id="mbFechaFin"` tipo `date`, label "Fecha fin (opcional)"
- Label de `mbFecha` cambia a "Fecha inicio"

**`crearBloqueoModal()`**:
- Leer `vi('mbFechaFin')`
- Si `fechaInicio` tiene valor Y `fechaFin` tiene valor: validar `fechaFin >= fechaInicio` (error toast si no), construir `fecha = fechaInicio + '/' + fechaFin`
- Si solo `fechaInicio` (fechaFin vacío): `fecha = fechaInicio` (comportamiento anterior)
- Si solo `fechaFin` sin `fechaInicio`: `fechaFin` se ignora, `fecha = '*'`
- Si ninguno: `fecha = '*'`
- Limpiar `mbFechaFin` en el reset post-creación

**`esBloqueado(fecha, hora, area, camilla)`**:
```js
const fOk = b.fecha === '*' || (b.fecha.includes('/')
  ? (()=>{ const [fi,ff]=b.fecha.split('/'); return fi&&ff&&fecha>=fi&&fecha<=ff; })()
  : b.fecha === fecha);
```
- Rango de fechas es **inclusivo** en ambos extremos (se bloquean días completos).
- Guard `fi&&ff&&` para evitar crash con datos malformados.

### Cambios en `gasindex.txt`

**`leerBloqueos(fechaInicio, fechaFin)`** — actualizar el filtro de filas:

```js
var fechaStr = String(r[0]).trim();
if (!fechaStr) return false;
if (fechaStr === '*') return true;
var parts = fechaStr.includes('/') ? fechaStr.split('/') : null;
var fIni = parts ? parts[0].substring(0,10) : (r[0] instanceof Date
  ? Utilities.formatDate(r[0],'GMT-5','yyyy-MM-dd')
  : fechaStr.substring(0,10));
var fFin = parts ? parts[1].substring(0,10) : fIni;
return (!fechaInicio || fFin >= fechaInicio) && (!fechaFin || fIni <= fechaFin);
```

Lógica: incluir el bloqueo si su rango se superpone con la ventana solicitada (`fFin >= inicio_ventana && fIni <= fin_ventana`).

---

## Parte 2: Toggle ON/OFF por área y espacio

### Visual

**Área activa:**
```
[ nombre área ]  [ duracion ] [ 🔒 Bloquear área ] [ 🗑 ]
  - Camilla 1 (cap. 1)  [ 🔒 ]  [ 🗑 ]
```

**Área bloqueada** (botón verde):
```
[ nombre área ]  [ duracion ] [ 🔓 Desbloquear ] [ 🗑 ]
```

### Cambios en `index.html`

**`abrirConfigAgenda()`**:
- Convertir a `async function` para poder usar `await`.
- Llamar `await cargarBloqueos()` (sin parámetros de fecha) antes de `renderAreasConfig()` para garantizar que `agendaBloqueos` tiene los bloqueos permanentes (`fecha='*'`).

**Helpers de estado** (nuevas funciones):

```js
function esAreaBloqueada(nombre) {
  return agendaBloqueos.some(b =>
    b.fecha==='*' && b.hora==='*' && b.area===nombre && b.camilla==='*');
}

function esEspacioBloqueado(areaNombre, espNombre) {
  return agendaBloqueos.some(b =>
    b.fecha==='*' && b.hora==='*' && b.area===areaNombre && b.camilla===espNombre);
}
```

**Acciones de toggle** (nuevas funciones):

```js
async function toggleBloqueoArea(nombre) {
  const bloq = agendaBloqueos.find(b =>
    b.fecha==='*' && b.hora==='*' && b.area===nombre && b.camilla==='*');
  if (bloq) {
    // desbloquear
    await apiPost({action:'eliminarBloqueo', id: bloq.id});
  } else {
    // bloquear
    await apiPost({action:'crearBloqueo',
      fecha:'*', hora:'*', area:nombre, camilla:'*', motivo:'Área bloqueada'});
  }
  invalidateCache('leerBloqueos');
  await cargarBloqueos();
  renderAreasConfig();
  renderCalendario();
}

async function toggleBloqueoEspacio(areaNombre, espNombre) {
  const bloq = agendaBloqueos.find(b =>
    b.fecha==='*' && b.hora==='*' && b.area===areaNombre && b.camilla===espNombre);
  if (bloq) {
    await apiPost({action:'eliminarBloqueo', id: bloq.id});
  } else {
    await apiPost({action:'crearBloqueo',
      fecha:'*', hora:'*', area:areaNombre, camilla:espNombre, motivo:'Espacio bloqueado'});
  }
  invalidateCache('leerBloqueos');
  await cargarBloqueos();
  renderAreasConfig();
  renderCalendario();
}
```

**`renderAreasConfig()`** — agregar botón de toggle a cada área y espacio:

- En el header de cada área: botón que llama `toggleBloqueoArea(a.nombre)`. Si `esAreaBloqueada(a.nombre)` → texto "🔓 Desbloquear" en verde; si no → "🔒 Bloquear" en rojo tenue.
- En cada espacio: botón pequeño que llama `toggleBloqueoEspacio(a.nombre, esp.nombre)`. Si `esEspacioBloqueado(a.nombre, esp.nombre)` → "🔓" en verde; si no → "🔒" en rojo tenue.

### Sin cambios en `gasindex.txt` para esta parte

Los bloqueos con `fecha='*'` siempre son devueltos por `leerBloqueos` en cualquier consulta (la lógica actual ya los incluye con `if (fechaStr === '*') return true`).

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `index.html` | Formulario, `crearBloqueoModal`, `esBloqueado`, `abrirConfigAgenda`, `renderAreasConfig`, 4 funciones nuevas |
| `gasindex.txt` | `leerBloqueos` — filtro de filas actualizado para rangos de fecha |
