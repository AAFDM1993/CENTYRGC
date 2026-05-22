# Diseño: Mini-form inline para bloquear espacio por hora

**Fecha:** 2026-05-22  
**Estado:** Aprobado

## Contexto

El toggle 🔒 por espacio creaba/eliminaba bloqueos permanentes (`hora='*'`, `fecha='*'`). El usuario necesita poder bloquear un espacio en una hora específica (o rango de horas) desde la misma config de áreas, sin ir a la pestaña Bloqueos.

## Comportamiento nuevo

Al hacer clic en 🔒 de un espacio, se despliega un mini-form inline **debajo** de esa fila:

```
[ Hora inicio: __:__ ]  [ Hora fin (opcional): __:__ ]
[ Fecha inicio: ____ ]  [ Fecha fin (opcional): ____ ]
[ 🔒 Crear bloqueo ]    [ Cancelar ]
```

- Todos los campos son opcionales: hora vacía → `hora='*'`; fecha vacía → `fecha='*'`
- Deja hora Y fecha vacíos → bloqueo permanente completo (equivalente al toggle anterior)
- Solo un espacio expandido a la vez — abrir otro cierra el anterior automáticamente
- "Crear bloqueo" crea el bloqueo y cierra el form
- "Cancelar" cierra el form sin crear nada

El botón 🔒 del **área** no cambia — sigue siendo el bloqueo permanente de toda el área.

## Cambios en `index.html`

### 1. Variable de estado global

Después de `let agendaBloqueos = [];` (línea ~4564):

```js
var _espFormAbierto = null; // "areaIdx-espIdx" o null
```

### 2. Función `toggleEspForm(areaIdx, espIdx)`

```js
function toggleEspForm(areaIdx, espIdx){
  var key = areaIdx+'-'+espIdx;
  _espFormAbierto = (_espFormAbierto===key) ? null : key;
  renderAreasConfig();
}
```

### 3. Función `crearBloqueoEspacio(areaIdx, espIdx)`

Lee los inputs del mini-form por ID dinámico, construye `hora` y `fecha`, llama `crearBloqueo`, cierra el form.

IDs de inputs: `bef-h1-{areaIdx}-{espIdx}`, `bef-h2-{areaIdx}-{espIdx}`, `bef-f1-{areaIdx}-{espIdx}`, `bef-f2-{areaIdx}-{espIdx}`.

Lógica de `hora`:
- Si horaIni y horaFin → validar horaFin > horaIni → `"HH:MM-HH:MM"`
- Si solo horaIni → `"HH:MM"`
- Si ninguna → `'*'`

Lógica de `fecha`:
- Si fechaIni y fechaFin → validar fechaFin >= fechaIni → `"YYYY-MM-DD/YYYY-MM-DD"`
- Si solo fechaIni → `"YYYY-MM-DD"`
- Si ninguna → `'*'`

Al completar: llama `invalidateCache`, `cargarBloqueos`, `renderAreasConfig`, `renderListaBloqueosModal`, `renderCalendario`. Setea `_espFormAbierto = null`.

### 4. `renderAreasConfig()` — espacio row actualizado

El botón del espacio cambia: siempre llama `toggleEspForm(${i},${ei})` (ya no `toggleBloqueoEspacio`). El botón muestra siempre 🔒 con estilo neutro (fondo gris/surf), sin estado verde/rojo basado en bloqueo existente — ya no se usa `esEspacioBloqueado` para colorearlo. Si el form está abierto para ese espacio, el botón muestra 🔓 para indicar "cerrar form".

Si `_espFormAbierto === '${i}-${ei}'`, renderiza el mini-form debajo de la fila.

Mini-form HTML:
```html
<div style="padding:8px 10px;background:var(--red2);border:1px solid var(--red);border-radius:8px;margin-top:4px">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px">
    <div class="field" style="margin:0"><label>Hora inicio</label><input type="time" class="inp" id="bef-h1-${i}-${ei}"></div>
    <div class="field" style="margin:0"><label>Hora fin (opc.)</label><input type="time" class="inp" id="bef-h2-${i}-${ei}"></div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">
    <div class="field" style="margin:0"><label>Fecha inicio</label><input type="date" class="inp" id="bef-f1-${i}-${ei}"></div>
    <div class="field" style="margin:0"><label>Fecha fin (opc.)</label><input type="date" class="inp" id="bef-f2-${i}-${ei}"></div>
  </div>
  <div style="display:flex;gap:6px">
    <button onclick="crearBloqueoEspacio(${i},${ei})" style="flex:1;background:var(--red);color:#fff;border:none;border-radius:7px;padding:7px;font-size:12px;font-weight:700;cursor:pointer">&#128274; Crear bloqueo</button>
    <button onclick="toggleEspForm(${i},${ei})" style="background:var(--surf2);border:1px solid var(--bd);border-radius:7px;padding:7px 12px;font-size:12px;cursor:pointer">Cancelar</button>
  </div>
</div>
```

### 5. Eliminar funciones obsoletas

- `toggleBloqueoEspacio(areaIdx, espIdx)` — reemplazada por `toggleEspForm` + `crearBloqueoEspacio`
- `esEspacioBloqueado(areaNombre, espNombre)` — ya no se usa

`esAreaBloqueada`, `toggleBloqueoArea` y el CSS permanecen sin cambios.

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `index.html` | Variable `_espFormAbierto`, 2 funciones nuevas, 2 funciones eliminadas, `renderAreasConfig` actualizado |
| `gasindex.txt` | Ninguno |
