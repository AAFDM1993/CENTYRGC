# Diseño: Cancelación de alumno, Asistencia de docente y Lock de slot

**Fecha:** 2026-06-01  
**Archivos principales afectados:** `src/index/agenda.js`, `src/index/recepcion.js`, `backend/gasindex.txt`

---

## Contexto

El sistema de agenda actual (lunes–sábado) permite a alumnos crear reservas y a docentes/admin eliminarlas. No existe cancelación por parte del alumno, ni registro de asistencia, ni protección contra reservas simultáneas del mismo slot.

---

## Feature 1 — Cancelación de reserva por alumno (ventana de 15 minutos)

### Regla de negocio
Un alumno puede cancelar su propia reserva únicamente dentro de los **15 minutos siguientes** al momento en que la creó. Pasado ese tiempo, el botón desaparece.

### Backend — nueva acción `cancelarReservaEst`

- **Archivo:** `gasindex.txt`
- **Acción:** `cancelarReservaEst`
- **Parámetros:** `{ fecha, horaInicio, area, camilla }`
- **Validaciones:**
  1. El usuario debe tener rol `estudiante`
  2. La reserva debe existir con `reservadoPor === user.codigo` (o `user.nombre`)
  3. El campo `ts` de la reserva, parseado a `Date`, debe estar a menos de 15 minutos de `new Date()` en el servidor
- **Acción si válido:** `sheet.deleteRow(filaEncontrada)`
- **Respuesta:** `{ ok: true }` o `{ ok: false, error: "..." }`

El tiempo se valida en servidor para evitar que el cliente manipule el request.

### Frontend — `renderCalendarioEst()` en `agenda.js`

- Para cada tarjeta `esMia === true`, parsear `rsv.ts` (formato `dd/MM/yyyy HH:mm:ss`) a `Date`
- Si `(new Date() - tsDate) < 15 * 60 * 1000` → renderizar botón **"✕ Cancelar"** en la esquina superior derecha de la tarjeta
- Si no → no se renderiza ningún botón de cancelación
- **Al hacer click:** `confirm("¿Cancelar esta reserva?")` → si acepta, llama a `cancelarReservaEst`
- **Post-cancelación (optimista):**
  - Filtrar la reserva de `agendaEstReservas`
  - Llamar a `_markRsvDeleted(...)` (anti-cache igual que eliminación admin)
  - `renderCalendarioEst()`
  - `invalidateCache('leerReservas')`

---

## Feature 2 — Marcado de asistencia por docente

### Regla de negocio
El docente puede marcar si un paciente **asistió o no** a su cita, pero **solo el mismo día** de la reserva. El estado se persiste en Google Sheets. Hacer click en el estado activo lo desmarca (vuelve a vacío).

### Dato nuevo — columna `asistencia` en `_agenda`

La hoja `_agenda` agrega una **10ª columna** (índice 9):

| Índice | Campo | Valores posibles |
|--------|-------|-----------------|
| 9 | `asistencia` | `""` (sin marcar) / `"Asistió"` / `"No asistió"` |

Las filas existentes tienen esta columna vacía por defecto (Google Sheets lo maneja automáticamente al leer fuera de rango).

### Backend — `leerReservas` actualizado

- Incluir `asistencia: row[9] || ""` en cada objeto de reserva devuelto.

### Backend — nueva acción `marcarAsistencia`

- **Acción:** `marcarAsistencia`
- **Parámetros:** `{ fecha, horaInicio, area, camilla, asistencia }` donde `asistencia` es `"Asistió"`, `"No asistió"` o `""`
- **Validaciones:**
  1. Usuario con rol `docente` o `admin`
  2. La reserva existe (buscar por fecha + horaInicio + area + camilla con normalización)
  3. `fecha === Utilities.formatDate(new Date(), 'GMT-5', 'yyyy-MM-dd')` (solo el día de hoy)
- **Acción si válido:** `sheet.getRange(fila, 10).setValue(asistencia)` (columna 10, índice 1-based)
- **Respuesta:** `{ ok: true }` o `{ ok: false, error: "..." }`

### Frontend — `renderCalendario()` en `agenda.js`

Para cada tarjeta de reserva donde `rsv.fecha === hoy`:

- Renderizar dos íconos de acción en la parte inferior de la tarjeta:
  - **✓** — verde si `rsv.asistencia === "Asistió"`, gris neutro si no
  - **✗** — rojo si `rsv.asistencia === "No asistió"`, gris neutro si no
- Click en ✓:
  - Si ya era `"Asistió"` → llama con `asistencia: ""`
  - Si no → llama con `asistencia: "Asistió"`
- Click en ✗:
  - Si ya era `"No asistió"` → llama con `asistencia: ""`
  - Si no → llama con `asistencia: "No asistió"`
- **Actualización optimista:** actualizar `rsv.asistencia` directamente en el objeto de `agendaReservas` y llamar `renderCalendario()` sin esperar la red
- Si la respuesta del backend falla → revertir el cambio optimista y mostrar toast de error

Las tarjetas de días que **no son hoy** no muestran estos íconos.

---

## Feature 3 — Bloqueo temporal de slot (lock optimista, 2 minutos)

### Regla de negocio
Cuando un alumno hace click en "+" para reservar un slot, ese slot queda bloqueado temporalmente por **2 minutos** para evitar que otro alumno lo tome simultáneamente. Si no confirma en ese tiempo, el lock expira automáticamente.

### Dato nuevo — hoja `_agenda_locks`

Nueva hoja en Google Sheets con columnas:

| Columna | Campo |
|---------|-------|
| 0 | `fecha` |
| 1 | `horaInicio` |
| 2 | `area` |
| 3 | `camilla` |
| 4 | `lockedBy` (código/nombre del alumno) |
| 5 | `lockedAt` (timestamp ISO, ej: `"2026-06-01T10:30:00"`) |

### Backend — `leerReservas` actualizado

- Incluir campo adicional `locks: [{ fecha, horaInicio, area, camilla, lockedBy }]` en la respuesta, filtrando solo locks activos (menos de 2 minutos de antigüedad).
- Al calcular locks activos, eliminar de la hoja aquellos con más de 2 minutos (limpieza proactiva).

### Backend — nueva acción `adquirirLock`

- **Parámetros:** `{ fecha, horaInicio, area, camilla }`
- **Validaciones:**
  1. Usuario rol `estudiante`
  2. Verificar si existe lock activo (< 2 min) de **otro** usuario para ese slot
- **Si existe lock ajeno activo:** responde `{ ok: false, error: "ocupado" }`
- **Si no hay lock activo (o el existente es del mismo usuario, o está expirado):** escribe/sobreescribe la fila y responde `{ ok: true }`

### Backend — nueva acción `liberarLock`

- **Parámetros:** `{ fecha, horaInicio, area, camilla }`
- Elimina la fila del lock donde `lockedBy === user.codigo`
- Responde `{ ok: true }` siempre (silencioso si no existía)

### Backend — `crearReserva` actualizado

- Verificar que no exista lock activo de otro usuario para el slot antes de crear la reserva (capa de seguridad extra).
- Si hay lock ajeno activo: responde `{ ok: false, error: "El espacio fue tomado por otro estudiante" }`

### Frontend — `renderCalendarioEst()` en `agenda.js`

- `agendaLocks` — nueva variable que almacena el array `locks` devuelto por `leerReservas`
- Al renderizar cada slot "disponible" con botón "+", verificar si existe un lock activo en `agendaLocks` cuyo `lockedBy !== miCodigo && lockedBy !== miNombre` → si existe, no renderizar el "+" (el slot se ve ocupado)
- **Al click en "+":**
  1. Llamar `adquirirLock({ fecha, horaInicio, area, camilla })`
  2. Si `ok: false` → toast "Este espacio está siendo seleccionado por otro estudiante, intenta en un momento" y no abrir modal
  3. Si `ok: true` → abrir modal de reserva normalmente
- **Al cerrar modal (cancelar o confirmar):** llamar `liberarLock(...)` — tanto en el botón cancelar como al completar `confirmarReserva()`
- **Al navegar de semana o cambiar sección:** llamar `liberarLock` si hay un lock activo del usuario actual (guardar en variable `_lockActivo`)

### Variable de estado en frontend

```javascript
let _lockActivo = null; // { fecha, horaInicio, area, camilla } o null
```

Se asigna al adquirir y se limpia al liberar.

---

## Resumen de cambios por archivo

### `backend/gasindex.txt`
- `leerReservas`: agregar `asistencia` en cada reserva + campo `locks` en respuesta
- `crearReserva`: validar lock ajeno activo antes de crear
- Nueva acción `cancelarReservaEst`
- Nueva acción `marcarAsistencia`
- Nueva acción `adquirirLock`
- Nueva acción `liberarLock`

### `src/index/agenda.js`
- `renderCalendarioEst()`: botón cancelar (15 min) + lógica de lock en slot
- `renderCalendario()`: íconos ✓/✗ de asistencia en tarjetas de hoy
- Nueva función `cancelarReservaEst(fecha, horaInicio, area, camilla)`
- Nueva función `marcarAsistencia(fecha, horaInicio, area, camilla, valor)`
- Nueva función `adquirirLock(fecha, horaInicio, area, camilla)` → async, devuelve bool
- Nueva función `liberarLock()`
- Nueva variable `agendaLocks = []`
- Nueva variable `_lockActivo = null`

### `src/index/recepcion.js`
- Sin cambios (vista solo lectura, no afectada por estas features)
