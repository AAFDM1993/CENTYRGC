# Diseño: Bloqueo recurrente por día de semana

**Fecha:** 2026-06-01  
**Archivos afectados:** `index.html`, `src/index/agenda.js`

---

## Contexto

El sistema de bloqueos de agenda permite bloquear slots por fecha específica, rango de fechas, o comodín `*`. No existe soporte para bloqueos recurrentes por día de semana (ej. "todos los sábados"). El backend (GAS) almacena el campo `fecha` como texto — no requiere cambios.

---

## Solución

Almacenar el día de semana en el campo `fecha` con el formato `"DOW:N"` (N = 0–6, estándar `Date.getDay()`: 0=Domingo … 6=Sábado). El frontend reconoce este formato en tres lugares: formulario, matching y listado.

---

## Cambio 1 — Formulario de bloqueos (`index.html`)

Agregar encima de los inputs de fecha un checkbox **"Día de semana recurrente"** con id `mbEsDow`.

Cuando `mbEsDow` está **marcado**:
- Ocultar los campos `mbFecha` y `mbFechaFin` (y sus labels)
- Mostrar un `<select id="mbDiaSemana">` con 7 opciones:
  - `value="0"` → Domingo
  - `value="1"` → Lunes
  - `value="2"` → Martes
  - `value="3"` → Miércoles
  - `value="4"` → Jueves
  - `value="5"` → Viernes
  - `value="6"` → Sábado

Cuando `mbEsDow` está **desmarcado**: comportamiento actual sin cambios.

El toggle se controla con una función `_toggleDowMode()` definida en `src/index/agenda.js` y llamada en el `onchange` del checkbox (`onchange="_toggleDowMode()"`). Muestra/oculta los elementos con ids `mbFechaWrap` y `mbDiaSemanaWrap` (wrappers que incluyen label + input).

---

## Cambio 2 — Función `crearBloqueoModal` (`src/index/agenda.js`)

En la construcción del payload, detectar si `mbEsDow` está marcado:

```javascript
const esDow = g('mbEsDow') && g('mbEsDow').checked;
const fecha = esDow
  ? 'DOW:' + (vi('mbDiaSemana') || '1')
  : (vi('mbFecha') || '*');
```

El resto del flujo (hora, area, camilla, motivo) no cambia.

---

## Cambio 3 — Función `_matchBloqueo` (`src/index/agenda.js`)

Agregar rama para el formato DOW antes de la lógica de fecha existente:

```javascript
let fOk;
if (b.fecha.startsWith('DOW:')) {
  const dow = parseInt(b.fecha.split(':')[1]);
  const d = new Date(fecha + 'T12:00:00'); // mediodía evita problemas de timezone
  fOk = d.getDay() === dow;
} else {
  fOk = b.fecha === '*' ||
    (b.fecha.includes('/')
      ? (function(){ const p=b.fecha.split('/'); return p[0]&&p[1]&&fecha>=p[0]&&fecha<=p[1]; })()
      : b.fecha === fecha);
}
```

---

## Cambio 4 — Función `renderListaBloqueosModal` (`src/index/agenda.js`)

Al renderizar el campo `fecha` de cada bloqueo, convertir `"DOW:N"` a texto legible:

```javascript
const DIAS_DOW = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const fechaLabel = b.fecha && b.fecha.startsWith('DOW:')
  ? 'Todos los ' + (DIAS_DOW[parseInt(b.fecha.split(':')[1])] || b.fecha)
  : b.fecha;
```

---

## Sin cambios en backend

GAS almacena `fecha` como texto sin validación de formato. `"DOW:6"` se guarda y devuelve igual que cualquier otra fecha. No se toca `gasindex.txt`.

---

## Resumen de archivos

| Archivo | Cambio |
|---------|--------|
| `index.html` | Checkbox `mbEsDow` + select `mbDiaSemana` + wrappers `mbFechaWrap`/`mbDiaSemanaWrap` |
| `src/index/agenda.js` | `_toggleDowMode()`, `crearBloqueoModal` (leer mbEsDow/mbDiaSemana), `_matchBloqueo` (rama DOW), `renderListaBloqueosModal` (label legible) |
| `backend/gasindex.txt` | Sin cambios |
