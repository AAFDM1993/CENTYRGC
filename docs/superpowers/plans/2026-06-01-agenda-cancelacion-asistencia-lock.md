# Agenda: Cancelación alumno, Asistencia docente y Lock de slot — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar cancelación de reserva por alumno (15 min), marcado de asistencia por docente (✓/✗ en tarjetas del día), y bloqueo temporal de slot (2 min al abrir el modal).

**Architecture:** Las tres features comparten cambios en `backend/gasindex.txt` (nuevas acciones GAS + nueva hoja `_agenda_locks` + columna `asistencia` en `_agenda`) y en `src/index/agenda.js` (nuevas funciones + actualizaciones de render). El backend GAS valida todas las reglas de negocio; el frontend hace actualizaciones optimistas y libera locks al cerrar modales o navegar.

**Tech Stack:** Google Apps Script (GAS) para backend, vanilla JS + HTML para frontend. Sin framework de tests — cada tarea incluye pasos de verificación manual.

---

## Mapa de archivos

| Archivo | Cambios |
|---------|---------|
| `backend/gasindex.txt` | +`getLockSheet`, +`_limpiarLocksExpirados`, +`_getActiveLocks`, actualizar `getAgendaSheet` (col Asistencia), actualizar `leerReservas` (lee 10 cols + devuelve `locks`), actualizar `crearReserva` (check lock ajeno), +`cancelarReservaEst`, +`marcarAsistencia`, +`adquirirLock`, +`liberarLock`, actualizar `doPost` (6 nuevas líneas de dispatch) |
| `src/index/agenda.js` | +`_parseTsGAS`, +`cancelarReservaEst`, actualizar `renderCalendarioEst` (botón cancelar + check lock), +`marcarAsistencia`, actualizar `renderCalendario` (íconos ✓/✗), +`agendaLocks`, +`_lockActivo`, +`adquirirLock`, +`liberarLock`, actualizar `cargarReservasEst` (guarda `r.locks`), actualizar `abrirReservaEstEsp` (adquiere lock), actualizar `cerrarReservaModal` (libera lock), actualizar `confirmarReserva` (libera lock al confirmar), actualizar `semanaAnteriorEst`/`semanaSiguienteEst` (libera lock) |

---

## Task 1: GAS — hoja `_agenda_locks` + helpers de lock

**Files:**
- Modify: `backend/gasindex.txt` — después de la línea `var SHEET_BLOQUEOS = '_agenda_bloqueos';` (línea 934)

- [ ] **Step 1: Agregar constante y funciones de lock**

Insertar inmediatamente **antes** del bloque `// ════ BLOQUEOS DE AGENDA ════` (buscar `var SHEET_BLOQUEOS`):

```javascript
// ════════════════════════════════════════════════════════
// LOCKS TEMPORALES DE AGENDA
// ════════════════════════════════════════════════════════
var SHEET_LOCKS = '_agenda_locks';

function getLockSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_LOCKS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_LOCKS);
    var hdrs = ['Fecha','Hora Inicio','Area','Camilla','Locked By','Locked At'];
    sheet.getRange(1,1,1,hdrs.length).setValues([hdrs]);
    sheet.getRange(1,1,1,hdrs.length).setBackground('#0f172a').setFontColor('#fff').setFontWeight('bold').setFontSize(10);
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1,95); sheet.setColumnWidth(2,80); sheet.setColumnWidth(3,130);
    sheet.setColumnWidth(4,120); sheet.setColumnWidth(5,130); sheet.setColumnWidth(6,160);
  }
  return sheet;
}

function _limpiarLocksExpirados(sheet, now, twoMinMs) {
  var last = sheet.getLastRow();
  if (last < 2) return;
  var rows = sheet.getRange(2,1,last-1,6).getValues();
  var toDelete = [];
  for (var i = 0; i < rows.length; i++) {
    if (!rows[i][0]) { toDelete.push(i+2); continue; }
    var lockedAt = new Date(rows[i][5]);
    if (isNaN(lockedAt.getTime()) || (now - lockedAt) > twoMinMs) toDelete.push(i+2);
  }
  toDelete.reverse().forEach(function(rowIdx){ sheet.deleteRow(rowIdx); });
}

function _getActiveLocks(fechaInicio, fechaFin) {
  var sheet = getLockSheet();
  var now = new Date();
  var TWO_MIN = 2 * 60 * 1000;
  _limpiarLocksExpirados(sheet, now, TWO_MIN);
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var rows = sheet.getRange(2,1,last-1,6).getValues();
  var active = [];
  rows.forEach(function(r) {
    if (!r[0]) return;
    var fecha = String(r[0]).trim();
    if ((!fechaInicio || fecha >= fechaInicio) && (!fechaFin || fecha <= fechaFin)) {
      active.push({
        fecha:      fecha,
        horaInicio: horaToStr_(r[1]),
        area:       String(r[2]).trim(),
        camilla:    String(r[3]).trim(),
        lockedBy:   String(r[4]).trim()
      });
    }
  });
  return active;
}
```

- [ ] **Step 2: Actualizar `getAgendaSheet` para agregar columna `Asistencia`**

Buscar en `gasindex.txt`:
```javascript
    var hdrs = ['Fecha','Hora Inicio','Area','Camilla','Paciente','Docente','Observacion','Reservado por','Timestamp'];
    sheet.getRange(1,1,1,hdrs.length).setValues([hdrs]);
    sheet.getRange(1,1,1,hdrs.length).setBackground('#0f172a').setFontColor('#fff').setFontWeight('bold').setFontSize(10);
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1,95); sheet.setColumnWidth(2,80); sheet.setColumnWidth(3,130);
    sheet.setColumnWidth(4,80); sheet.setColumnWidth(5,180); sheet.setColumnWidth(6,130);
    sheet.setColumnWidth(7,200); sheet.setColumnWidth(8,130); sheet.setColumnWidth(9,140);
```

Reemplazar con:
```javascript
    var hdrs = ['Fecha','Hora Inicio','Area','Camilla','Paciente','Docente','Observacion','Reservado por','Timestamp','Asistencia'];
    sheet.getRange(1,1,1,hdrs.length).setValues([hdrs]);
    sheet.getRange(1,1,1,hdrs.length).setBackground('#0f172a').setFontColor('#fff').setFontWeight('bold').setFontSize(10);
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1,95); sheet.setColumnWidth(2,80); sheet.setColumnWidth(3,130);
    sheet.setColumnWidth(4,80); sheet.setColumnWidth(5,180); sheet.setColumnWidth(6,130);
    sheet.setColumnWidth(7,200); sheet.setColumnWidth(8,130); sheet.setColumnWidth(9,140);
    sheet.setColumnWidth(10,100);
```

- [ ] **Step 3: Commit**

```
git add backend/gasindex.txt
git commit -m "feat(gas): agregar hoja _agenda_locks y helpers de lock"
```

---

## Task 2: GAS — actualizar `leerReservas` (columna asistencia + locks)

**Files:**
- Modify: `backend/gasindex.txt` — función `leerReservas`

- [ ] **Step 1: Cambiar lectura de 9 a 10 columnas y agregar `asistencia` + `locks`**

Buscar:
```javascript
  var rows  = sheet.getRange(2,1,last-1,9).getValues();
  var reservas = rows.filter(function(r){
    if (!r[0]) return false;
    var f = (r[0] instanceof Date) ? Utilities.formatDate(r[0], 'GMT-5', 'yyyy-MM-dd') : String(r[0]).trim().substring(0,10);
    return (!fechaInicio || f >= fechaInicio) && (!fechaFin || f <= fechaFin);
  }).map(function(r, i){
    var fechaStr = (r[0] instanceof Date) ? Utilities.formatDate(r[0], 'GMT-5', 'yyyy-MM-dd') : String(r[0]).trim().substring(0,10);
    return {
      id:           i + 2,
      fecha:        fechaStr,
      horaInicio:   horaToStr_(r[1]),
      area:         String(r[2]).trim(),
      camilla:      String(r[3]).trim(),
      paciente:     String(r[4]).trim(),
      docente:      String(r[5]).trim(),
      observacion:  String(r[6]).trim(),
      reservadoPor: String(r[7]).trim(),
      ts:           r[8] instanceof Date ? Utilities.formatDate(r[8],'GMT-5','dd/MM/yyyy HH:mm:ss') : String(r[8]).trim()
    };
  });
  return { ok: true, reservas: reservas };
```

Reemplazar con:
```javascript
  var rows  = sheet.getRange(2,1,last-1,10).getValues();
  var reservas = rows.filter(function(r){
    if (!r[0]) return false;
    var f = (r[0] instanceof Date) ? Utilities.formatDate(r[0], 'GMT-5', 'yyyy-MM-dd') : String(r[0]).trim().substring(0,10);
    return (!fechaInicio || f >= fechaInicio) && (!fechaFin || f <= fechaFin);
  }).map(function(r, i){
    var fechaStr = (r[0] instanceof Date) ? Utilities.formatDate(r[0], 'GMT-5', 'yyyy-MM-dd') : String(r[0]).trim().substring(0,10);
    return {
      id:           i + 2,
      fecha:        fechaStr,
      horaInicio:   horaToStr_(r[1]),
      area:         String(r[2]).trim(),
      camilla:      String(r[3]).trim(),
      paciente:     String(r[4]).trim(),
      docente:      String(r[5]).trim(),
      observacion:  String(r[6]).trim(),
      reservadoPor: String(r[7]).trim(),
      ts:           r[8] instanceof Date ? Utilities.formatDate(r[8],'GMT-5','dd/MM/yyyy HH:mm:ss') : String(r[8]).trim(),
      asistencia:   String(r[9]||'').trim()
    };
  });
  return { ok: true, reservas: reservas, locks: _getActiveLocks(fechaInicio, fechaFin) };
```

- [ ] **Step 2: Commit**

```
git add backend/gasindex.txt
git commit -m "feat(gas): leerReservas incluye asistencia y locks activos"
```

---

## Task 3: GAS — `cancelarReservaEst` + dispatch

**Files:**
- Modify: `backend/gasindex.txt` — después de `eliminarReserva`, antes del bloque de bloqueos

- [ ] **Step 1: Agregar función `cancelarReservaEst`**

Insertar inmediatamente **después** de la función `eliminarReserva` (buscar la línea `return { error: 'Reserva no encontrada'` del `eliminarReserva`) y **antes** del comentario `// ════ BLOQUEOS DE AGENDA ════`:

```javascript
function cancelarReservaEst(body, user) {
  if (!user || user.rol !== 'estudiante')
    return { error: 'Solo estudiantes pueden usar esta accion' };
  var sheet = getAgendaSheet();
  var last  = sheet.getLastRow();
  if (last < 2) return { error: 'Sin reservas' };
  var rows = sheet.getRange(2,1,last-1,9).getValues();
  var nc   = function(s){ return String(s||'').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); };
  var quien = user.codigo || user.nombre || '';
  for (var i = 0; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    var f = (rows[i][0] instanceof Date) ? Utilities.formatDate(rows[i][0],'GMT-5','yyyy-MM-dd') : String(rows[i][0]).trim().substring(0,10);
    if (nc(f)                       === nc(body.fecha)      &&
        nc(horaToStr_(rows[i][1]))  === nc(body.horaInicio) &&
        nc(rows[i][2])              === nc(body.area)        &&
        nc(rows[i][3])              === nc(body.camilla)) {
      if (nc(rows[i][7]) !== nc(quien))
        return { error: 'No puedes cancelar una reserva de otro alumno' };
      // Verificar ventana de 15 minutos usando el campo ts (columna 9, índice 8)
      var ts = rows[i][8];
      var tsDate = (ts instanceof Date) ? ts : (function(){
        var m = String(ts).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
        return m ? new Date(+m[3], +m[2]-1, +m[1], +m[4], +m[5], +m[6]) : null;
      })();
      if (!tsDate || isNaN(tsDate.getTime()))
        return { error: 'No se puede verificar el tiempo de creacion de la reserva' };
      if ((new Date() - tsDate) > 15 * 60 * 1000)
        return { error: 'El plazo de 15 minutos para cancelar ha expirado' };
      sheet.deleteRow(i + 2);
      SpreadsheetApp.flush();
      return { ok: true };
    }
  }
  return { error: 'Reserva no encontrada' };
}
```

- [ ] **Step 2: Agregar dispatch en `doPost`**

Buscar:
```javascript
    if (a === 'eliminarReserva')       return json_(requireAuthBody(tok, ['admin','docente'],              function(u){ return eliminarReserva(b, u); }));
```

Agregar **después** de esa línea:
```javascript
    if (a === 'cancelarReservaEst')    return json_(requireAuthBody(tok, ['estudiante'],                  function(u){ return cancelarReservaEst(b, u); }));
```

- [ ] **Step 3: Commit**

```
git add backend/gasindex.txt
git commit -m "feat(gas): agregar cancelarReservaEst con ventana de 15 minutos"
```

---

## Task 4: GAS — `marcarAsistencia` + dispatch

**Files:**
- Modify: `backend/gasindex.txt` — después de `cancelarReservaEst`

- [ ] **Step 1: Agregar función `marcarAsistencia`**

Insertar inmediatamente **después** de `cancelarReservaEst`:

```javascript
function marcarAsistencia(body, user) {
  if (!user || (user.rol !== 'docente' && user.rol !== 'admin'))
    return { error: 'Solo docentes o admin pueden marcar asistencia' };
  var hoy = Utilities.formatDate(new Date(), 'GMT-5', 'yyyy-MM-dd');
  if (body.fecha !== hoy)
    return { error: 'La asistencia solo puede marcarse el dia de la cita' };
  var sheet = getAgendaSheet();
  var last  = sheet.getLastRow();
  if (last < 2) return { error: 'Sin reservas' };
  var rows = sheet.getRange(2,1,last-1,9).getValues();
  var nc   = function(s){ return String(s||'').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); };
  for (var i = 0; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    var f = (rows[i][0] instanceof Date) ? Utilities.formatDate(rows[i][0],'GMT-5','yyyy-MM-dd') : String(rows[i][0]).trim().substring(0,10);
    if (nc(f)                       === nc(body.fecha)      &&
        nc(horaToStr_(rows[i][1]))  === nc(body.horaInicio) &&
        nc(rows[i][2])              === nc(body.area)        &&
        nc(rows[i][3])              === nc(body.camilla)) {
      var valor = body.asistencia || '';
      sheet.getRange(i + 2, 10).setValue(valor);
      SpreadsheetApp.flush();
      return { ok: true };
    }
  }
  return { error: 'Reserva no encontrada' };
}
```

- [ ] **Step 2: Agregar dispatch en `doPost`**

Buscar:
```javascript
    if (a === 'cancelarReservaEst')    return json_(requireAuthBody(tok, ['estudiante'],                  function(u){ return cancelarReservaEst(b, u); }));
```

Agregar **después** de esa línea:
```javascript
    if (a === 'marcarAsistencia')      return json_(requireAuthBody(tok, ['admin','docente'],              function(u){ return marcarAsistencia(b, u); }));
```

- [ ] **Step 3: Commit**

```
git add backend/gasindex.txt
git commit -m "feat(gas): agregar marcarAsistencia para docentes (solo el dia de la cita)"
```

---

## Task 5: GAS — `adquirirLock`, `liberarLock` + actualizar `crearReserva` + dispatch

**Files:**
- Modify: `backend/gasindex.txt`

- [ ] **Step 1: Agregar `adquirirLock` y `liberarLock`**

Insertar después de `_getActiveLocks` (dentro del bloque de locks, antes del bloque de bloqueos):

```javascript
function adquirirLock(body, user) {
  if (!user || user.rol !== 'estudiante')
    return { error: 'Solo estudiantes pueden adquirir locks' };
  var sheet = getLockSheet();
  var quien = user.codigo || user.nombre || '';
  var now   = new Date();
  var TWO_MIN = 2 * 60 * 1000;
  var nc    = function(s){ return String(s||'').trim().toLowerCase(); };
  // Primero limpiar expirados
  _limpiarLocksExpirados(sheet, now, TWO_MIN);
  var last  = sheet.getLastRow();
  if (last >= 2) {
    var rows = sheet.getRange(2,1,last-1,6).getValues();
    for (var i = 0; i < rows.length; i++) {
      if (!rows[i][0]) continue;
      if (nc(rows[i][0])              === nc(body.fecha)      &&
          nc(horaToStr_(rows[i][1]))  === nc(body.horaInicio) &&
          nc(rows[i][2])              === nc(body.area)        &&
          nc(rows[i][3])              === nc(body.camilla)) {
        if (nc(rows[i][4]) !== nc(quien))
          return { ok: false, error: 'ocupado' };
        // Mismo usuario — refrescar timestamp
        sheet.getRange(i + 2, 6).setValue(now.toISOString());
        SpreadsheetApp.flush();
        return { ok: true };
      }
    }
  }
  sheet.appendRow([body.fecha, body.horaInicio, body.area, body.camilla, quien, now.toISOString()]);
  SpreadsheetApp.flush();
  return { ok: true };
}

function liberarLock(body, user) {
  var sheet = getLockSheet();
  var last  = sheet.getLastRow();
  if (last < 2) return { ok: true };
  var quien = user ? (user.codigo || user.nombre || '') : '';
  var nc    = function(s){ return String(s||'').trim().toLowerCase(); };
  var rows  = sheet.getRange(2,1,last-1,6).getValues();
  for (var i = rows.length - 1; i >= 0; i--) {
    if (!rows[i][0]) continue;
    if (nc(rows[i][0])             === nc(body.fecha)      &&
        nc(horaToStr_(rows[i][1])) === nc(body.horaInicio) &&
        nc(rows[i][2])             === nc(body.area)        &&
        nc(rows[i][3])             === nc(body.camilla)     &&
        nc(rows[i][4])             === nc(quien)) {
      sheet.deleteRow(i + 2);
      SpreadsheetApp.flush();
      return { ok: true };
    }
  }
  return { ok: true };
}
```

- [ ] **Step 2: Actualizar `crearReserva` para validar lock ajeno**

Buscar en `crearReserva` la validación de bloqueos que termina con:
```javascript
      if (fechaOk && horaOk && areaOk && camOk)
        return { error: 'Este espacio está bloqueado: ' + (bRows[bi][4]||'sin motivo') };
    }
  }
```

Agregar **después** de ese bloque (antes de la validación de capacidad):
```javascript
  // Verificar lock activo de otro usuario
  var lkSheet = getLockSheet();
  var lkLast  = lkSheet.getLastRow();
  if (lkLast >= 2) {
    var lkRows   = lkSheet.getRange(2,1,lkLast-1,6).getValues();
    var lkNow    = new Date();
    var TWO_MIN  = 2 * 60 * 1000;
    var quienCrea = user ? (user.codigo || user.nombre || '') : '';
    var nc3 = function(s){ return String(s||'').trim().toLowerCase(); };
    for (var li = 0; li < lkRows.length; li++) {
      if (!lkRows[li][0]) continue;
      var lkAt = new Date(lkRows[li][5]);
      if (isNaN(lkAt.getTime()) || (lkNow - lkAt) > TWO_MIN) continue;
      if (nc3(lkRows[li][0])             === nc3(body.fecha)      &&
          nc3(horaToStr_(lkRows[li][1])) === nc3(body.horaInicio) &&
          nc3(lkRows[li][2])             === nc3(body.area)        &&
          nc3(lkRows[li][3])             === nc3(body.camilla)     &&
          nc3(lkRows[li][4])             !== nc3(quienCrea)) {
        return { error: 'El espacio fue tomado por otro estudiante en este momento' };
      }
    }
  }
```

- [ ] **Step 3: Agregar dispatch en `doPost`**

Buscar:
```javascript
    if (a === 'marcarAsistencia')      return json_(requireAuthBody(tok, ['admin','docente'],              function(u){ return marcarAsistencia(b, u); }));
```

Agregar **después**:
```javascript
    if (a === 'adquirirLock')          return json_(requireAuthBody(tok, ['estudiante'],                  function(u){ return adquirirLock(b, u); }));
    if (a === 'liberarLock')           return json_(requireAuthBody(tok, ['estudiante'],                  function(u){ return liberarLock(b, u); }));
```

- [ ] **Step 4: Commit**

```
git add backend/gasindex.txt
git commit -m "feat(gas): agregar adquirirLock/liberarLock y validacion de lock en crearReserva"
```

---

## Task 6: Frontend — cancelación de alumno (15 minutos)

**Files:**
- Modify: `src/index/agenda.js`

- [ ] **Step 1: Agregar helper `_parseTsGAS` y función `cancelarReservaEst`**

Buscar la línea:
```javascript
// ── AGENDA DEL ESTUDIANTE ────────────────────────────────────
```

Insertar **justo antes** de esa línea:

```javascript
// Parsea timestamp GAS formato "dd/MM/yyyy HH:mm:ss" a Date
function _parseTsGAS(ts){
  const m=String(ts||'').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  return m?new Date(+m[3],+m[2]-1,+m[1],+m[4],+m[5],+m[6]):null;
}

async function cancelarReservaEst(fecha,hora,area,camilla){
  if(!confirm('¿Cancelar esta reserva?'))return;
  showLoader('Cancelando...');
  try{
    const r=await apiPost({action:'cancelarReservaEst',fecha,horaInicio:hora,area,camilla});
    hideLoader();if(!r.ok)throw new Error(r.error);
    toast('Reserva cancelada','','ok');
    const _n=s=>String(s).trim().toLowerCase();
    agendaEstReservas=agendaEstReservas.filter(rv=>!(
      _n(rv.fecha)===_n(fecha)&&_n(rv.horaInicio)===_n(hora)&&
      _n(rv.area)===_n(area)&&_n(rv.camilla)===_n(camilla)
    ));
    _markRsvDeleted(fecha,hora,area,camilla);
    renderCalendarioEst();
    invalidateCache('leerReservas');
  }catch(e){hideLoader();toast('Error',e.message,'err');}
}
```

- [ ] **Step 2: Actualizar tarjeta de reserva propia en `renderCalendarioEst`**

Buscar el bloque exacto:
```javascript
            rsvEsp.forEach(rsv=>{
              const esMia=rsv.reservadoPor===miNombre||rsv.reservadoPor===miCodigo;
              celda+=`<div style="background:${esMia?'var(--green)':'var(--n600)'};border-radius:6px;padding:3px 6px;margin-bottom:2px">
                <div style="font-size:10px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${rsv.paciente||'—'}</div>
                <div style="font-size:9px;color:rgba(255,255,255,.75);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${rsv.docente||rsv.reservadoPor||''}</div>
              </div>`;
            });
```

Reemplazar con:
```javascript
            rsvEsp.forEach(rsv=>{
              const esMia=rsv.reservadoPor===miNombre||rsv.reservadoPor===miCodigo;
              const tsDate=esMia?_parseTsGAS(rsv.ts):null;
              const puedeCancelar=tsDate&&(new Date()-tsDate)<15*60*1000;
              celda+=`<div style="background:${esMia?'var(--green)':'var(--n600)'};border-radius:6px;padding:3px 6px;margin-bottom:2px;position:relative">
                <div style="font-size:10px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis${puedeCancelar?';padding-right:60px':''}">${rsv.paciente||'—'}</div>
                <div style="font-size:9px;color:rgba(255,255,255,.75);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${rsv.docente||rsv.reservadoPor||''}</div>
                ${puedeCancelar?`<button onclick="event.stopPropagation();cancelarReservaEst('${esc(fechaStr)}','${esc(hora)}','${esc(area.nombre)}','${esc(esp.nombre)}')" style="position:absolute;top:50%;right:3px;transform:translateY(-50%);background:rgba(0,0,0,.3);border:none;color:#fff;font-size:9px;cursor:pointer;padding:2px 5px;border-radius:3px;white-space:nowrap" title="Cancelar reserva">✕ Cancelar</button>`:''}
              </div>`;
            });
```

- [ ] **Step 3: Commit**

```
git add src/index/agenda.js
git commit -m "feat(frontend): cancelacion de reserva propia para alumno (15 min)"
```

- [ ] **Step 4: Verificación manual**
  1. Ingresar como estudiante
  2. Crear una reserva → la tarjeta debe mostrar "✕ Cancelar" en la esquina derecha
  3. Hacer click en Cancelar → confirmar → la tarjeta desaparece
  4. Esperar 15 minutos (o en dev cambiar `15*60*1000` a `1*60*1000` temporalmente) → el botón no debe aparecer al recargar

---

## Task 7: Frontend — marcado de asistencia por docente

**Files:**
- Modify: `src/index/agenda.js`

- [ ] **Step 1: Agregar función `marcarAsistencia`**

Buscar:
```javascript
async function pedirEliminar(fecha,hora,area,camilla){
```

Insertar **justo antes** de esa función:

```javascript
async function marcarAsistencia(fecha,hora,area,camilla,valor){
  const _n=s=>String(s).trim().toLowerCase();
  const rsv=agendaReservas.find(r=>
    _n(r.fecha)===_n(fecha)&&_n(r.horaInicio)===_n(hora)&&
    _n(r.area)===_n(area)&&_n(r.camilla)===_n(camilla)
  );
  const prevValor=rsv?rsv.asistencia:'';
  if(rsv)rsv.asistencia=valor;
  renderCalendario();
  try{
    const r=await apiPost({action:'marcarAsistencia',fecha,horaInicio:hora,area,camilla,asistencia:valor});
    if(!r.ok)throw new Error(r.error);
  }catch(e){
    if(rsv)rsv.asistencia=prevValor;
    renderCalendario();
    toast('Error',e.message,'err');
  }
}
```

- [ ] **Step 2: Actualizar tarjeta de reserva en `renderCalendario` para agregar íconos ✓/✗**

Buscar el bloque exacto en `renderCalendario` (dentro del `else` del `if(bloq)`):
```javascript
            rsvEsp.forEach(rsv=>{
              celda+=`<div style="background:var(--n600);border-radius:6px;padding:3px 6px;margin-bottom:2px;position:relative">
                <div style="font-size:10px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-right:14px">${rsv.paciente||'—'}</div>
                <div style="font-size:9px;color:rgba(255,255,255,.75);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${rsv.docente||rsv.reservadoPor||''}</div>
                ${puedeElim?`<button onclick="event.stopPropagation();pedirEliminar('${esc(fechaStr)}','${esc(hora)}','${esc(area.nombre)}','${esc(esp.nombre)}')" style="position:absolute;top:2px;right:3px;background:none;border:none;color:rgba(255,255,255,.6);font-size:11px;cursor:pointer;line-height:1;padding:2px" title="Cancelar">&#10005;</button>`:''}
              </div>`;
            });
```

Reemplazar con:
```javascript
            rsvEsp.forEach(rsv=>{
              const asis=rsv.asistencia||'';
              const esHoyRsv=fechaStr===hoy;
              const bgCard=asis==='Asistió'?'#15803d':asis==='No asistió'?'#991b1b':'var(--n600)';
              const btnAsistio=esHoyRsv&&puedeElim?`<button onclick="event.stopPropagation();marcarAsistencia('${esc(fechaStr)}','${esc(hora)}','${esc(area.nombre)}','${esc(esp.nombre)}','${asis==='Asistió'?'':'Asistió'}')" style="background:${asis==='Asistió'?'rgba(255,255,255,.3)':'rgba(255,255,255,.15)'};border:none;color:#fff;font-size:10px;font-weight:700;cursor:pointer;padding:1px 5px;border-radius:3px;line-height:1.4" title="${asis==='Asistió'?'Desmarcar':'Marcar como Asistió'}">✓</button>`:'';
              const btnNoAsistio=esHoyRsv&&puedeElim?`<button onclick="event.stopPropagation();marcarAsistencia('${esc(fechaStr)}','${esc(hora)}','${esc(area.nombre)}','${esc(esp.nombre)}','${asis==='No asistió'?'':'No asistió'}')" style="background:${asis==='No asistió'?'rgba(255,255,255,.3)':'rgba(255,255,255,.15)'};border:none;color:#fff;font-size:10px;font-weight:700;cursor:pointer;padding:1px 5px;border-radius:3px;line-height:1.4" title="${asis==='No asistió'?'Desmarcar':'Marcar como No asistió'}">✗</button>`:'';
              celda+=`<div style="background:${bgCard};border-radius:6px;padding:3px 6px;margin-bottom:2px;position:relative">
                <div style="font-size:10px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-right:14px">${rsv.paciente||'—'}</div>
                <div style="font-size:9px;color:rgba(255,255,255,.75);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${rsv.docente||rsv.reservadoPor||''}</div>
                ${esHoyRsv&&puedeElim?`<div style="display:flex;gap:2px;margin-top:3px">${btnAsistio}${btnNoAsistio}</div>`:''}
                ${puedeElim?`<button onclick="event.stopPropagation();pedirEliminar('${esc(fechaStr)}','${esc(hora)}','${esc(area.nombre)}','${esc(esp.nombre)}')" style="position:absolute;top:2px;right:3px;background:none;border:none;color:rgba(255,255,255,.6);font-size:11px;cursor:pointer;line-height:1;padding:2px" title="Cancelar">&#10005;</button>`:''}
              </div>`;
            });
```

- [ ] **Step 3: Commit**

```
git add src/index/agenda.js
git commit -m "feat(frontend): iconos asistencia en tarjetas de hoy para docente/admin"
```

- [ ] **Step 4: Verificación manual**
  1. Ingresar como docente
  2. Ver el calendario en el día de hoy — las tarjetas deben mostrar botones ✓ y ✗ debajo del nombre del paciente
  3. Click en ✓ → tarjeta se pone verde, botón ✓ resaltado
  4. Click de nuevo en ✓ → vuelve a gris (desmarca)
  5. Click en ✗ → tarjeta se pone rojo oscuro
  6. En un día que no sea hoy → los botones no deben aparecer

---

## Task 8: Frontend — lock temporal de slot (2 minutos)

**Files:**
- Modify: `src/index/agenda.js`

- [ ] **Step 1: Agregar variables de estado y funciones de lock**

Buscar las variables del estudiante al inicio del bloque de agenda del estudiante:
```javascript
let calEstFechaBase = getLunes ? getLunes(new Date()) : new Date();
let agendaEstReservas = [];
```

Reemplazar con:
```javascript
let calEstFechaBase = getLunes ? getLunes(new Date()) : new Date();
let agendaEstReservas = [];
let agendaLocks = [];
let _lockActivo = null;
```

Luego buscar:
```javascript
// ── Reservar slot ─────────────────────────────────────────
async function abrirReservaEspacio(
```

Insertar **justo antes** de esa línea:

```javascript
async function adquirirLock(fecha,hora,area,camilla){
  try{
    const r=await apiPost({action:'adquirirLock',fecha,horaInicio:hora,area,camilla});
    if(r.ok){ _lockActivo={fecha,hora,area,camilla}; return true; }
    return false;
  }catch(e){ return false; }
}

async function liberarLock(){
  if(!_lockActivo)return;
  const{fecha,hora,area,camilla}=_lockActivo;
  _lockActivo=null;
  try{ await apiPost({action:'liberarLock',fecha,horaInicio:hora,area,camilla}); }catch(e){}
}
```

- [ ] **Step 2: Actualizar `cargarReservasEst` para guardar locks**

Buscar:
```javascript
async function cargarReservasEst(){
  const ini=fmt(calEstFechaBase);
  const finSem=new Date(calEstFechaBase); finSem.setDate(finSem.getDate()+5);
  try{
    const r=await apiGetCached('leerReservas',{fechaInicio:ini,fechaFin:fmt(finSem)});
    if(r.ok) agendaEstReservas=_filterRsvBorradas(r.reservas);
  }catch(e){ agendaEstReservas=[]; }
}
```

Reemplazar con:
```javascript
async function cargarReservasEst(){
  const ini=fmt(calEstFechaBase);
  const finSem=new Date(calEstFechaBase); finSem.setDate(finSem.getDate()+5);
  try{
    const r=await apiGetCached('leerReservas',{fechaInicio:ini,fechaFin:fmt(finSem)});
    if(r.ok){ agendaEstReservas=_filterRsvBorradas(r.reservas); agendaLocks=r.locks||[]; }
  }catch(e){ agendaEstReservas=[]; agendaLocks=[]; }
}
```

- [ ] **Step 3: Actualizar `abrirReservaEstEsp` para adquirir lock antes de abrir modal**

Buscar:
```javascript
async function abrirReservaEstEsp(fecha,hora,area,espacio,capacidad,fechaLabel){
  const _msg=agendaCfg.mensajeUltimaHora||'';
  if(_msg){
    const _aObj=agendaCfg.areas.find(function(a){return a.nombre===area;});
    const _dur=_aObj?(_aObj.duracion||60):60;
    if(esUltimaHoraFranja(hora,agendaCfg.franjas,_dur)) await infoDialog(_msg);
  }
  rsvPendiente={fecha,hora,area,camilla:espacio,capacidad,esEstudiante:true};
```

Reemplazar con:
```javascript
async function abrirReservaEstEsp(fecha,hora,area,espacio,capacidad,fechaLabel){
  const ok=await adquirirLock(fecha,hora,area,espacio);
  if(!ok){ toast('Espacio ocupado','Este espacio está siendo seleccionado por otro estudiante, intenta en un momento','warn'); return; }
  const _msg=agendaCfg.mensajeUltimaHora||'';
  if(_msg){
    const _aObj=agendaCfg.areas.find(function(a){return a.nombre===area;});
    const _dur=_aObj?(_aObj.duracion||60):60;
    if(esUltimaHoraFranja(hora,agendaCfg.franjas,_dur)) await infoDialog(_msg);
  }
  rsvPendiente={fecha,hora,area,camilla:espacio,capacidad,esEstudiante:true};
```

- [ ] **Step 4: Actualizar `cerrarReservaModal` para liberar lock al cancelar**

Buscar:
```javascript
function cerrarReservaModal(){ g('reservaModal').style.display='none'; rsvPendiente=null; }
```

Reemplazar con:
```javascript
function cerrarReservaModal(){ g('reservaModal').style.display='none'; if(rsvPendiente&&rsvPendiente.esEstudiante)liberarLock(); rsvPendiente=null; }
```

- [ ] **Step 5: Actualizar `confirmarReserva` para liberar lock tras confirmar**

Buscar dentro de `confirmarReserva` el bloque del flujo exitoso para estudiante:
```javascript
    if(esEst){
      await cargarReservasEst();
      const _finSemC=new Date(calEstFechaBase);_finSemC.setDate(_finSemC.getDate()+5);
      await cargarBloqueos(fmt(calEstFechaBase),fmt(_finSemC));
      renderCalendarioEst();
    }
```

Reemplazar con:
```javascript
    if(esEst){
      liberarLock();
      await cargarReservasEst();
      const _finSemC=new Date(calEstFechaBase);_finSemC.setDate(_finSemC.getDate()+5);
      await cargarBloqueos(fmt(calEstFechaBase),fmt(_finSemC));
      renderCalendarioEst();
    }
```

- [ ] **Step 6: Actualizar `renderCalendarioEst` para ocultar "+" en slots bloqueados por otro**

Buscar dentro de `renderCalendarioEst` la condición del botón "+":
```javascript
            // Botón de reservar si hay capacidad y no está en el pasado
            if(!pasado&&!lleno){
              const fl=d.toLocaleDateString('es-PE',{weekday:'long',day:'numeric',month:'long'});
              celda+=`<button onclick="abrirReservaEstEsp('${esc(fechaStr)}','${esc(hora)}','${esc(area.nombre)}','${esc(esp.nombre)}',${cap},'${esc(fl)}')"
```

Reemplazar únicamente la condición `if(!pasado&&!lleno){` con:
```javascript
            // Botón de reservar si hay capacidad, no está en el pasado y no hay lock ajeno
            const _nLk=s=>String(s||'').trim().toLowerCase();
            const isLocked=agendaLocks.some(lk=>_nLk(lk.fecha)===_nLk(fechaStr)&&_nLk(lk.horaInicio)===_nLk(hora)&&_nLk(lk.area)===_nLk(area.nombre)&&_nLk(lk.camilla)===_nLk(esp.nombre)&&_nLk(lk.lockedBy)!==_nLk(miCodigo)&&_nLk(lk.lockedBy)!==_nLk(miNombre));
            if(!pasado&&!lleno&&!isLocked){
              const fl=d.toLocaleDateString('es-PE',{weekday:'long',day:'numeric',month:'long'});
              celda+=`<button onclick="abrirReservaEstEsp('${esc(fechaStr)}','${esc(hora)}','${esc(area.nombre)}','${esc(esp.nombre)}',${cap},'${esc(fl)}')"
```

- [ ] **Step 7: Actualizar navegación de semana para liberar lock activo**

Buscar:
```javascript
function semanaAnteriorEst(){ calEstFechaBase.setDate(calEstFechaBase.getDate()-7); cargarReservasEst().then(renderCalendarioEst); }
function semanaSiguienteEst(){ calEstFechaBase.setDate(calEstFechaBase.getDate()+7); cargarReservasEst().then(renderCalendarioEst); }
```

Reemplazar con:
```javascript
function semanaAnteriorEst(){ liberarLock(); calEstFechaBase.setDate(calEstFechaBase.getDate()-7); cargarReservasEst().then(renderCalendarioEst); }
function semanaSiguienteEst(){ liberarLock(); calEstFechaBase.setDate(calEstFechaBase.getDate()+7); cargarReservasEst().then(renderCalendarioEst); }
```

- [ ] **Step 8: Commit**

```
git add src/index/agenda.js
git commit -m "feat(frontend): lock temporal de slot al abrir modal de reserva (2 min)"
```

- [ ] **Step 9: Verificación manual**
  1. Abrir dos ventanas como dos estudiantes distintos
  2. Estudiante A hace click en "+" de un slot → en la otra ventana recargar → ese slot no debe mostrar "+" (slot bloqueado)
  3. Estudiante A cierra el modal sin confirmar → después de 2 minutos el slot vuelve a mostrar "+" para el estudiante B
  4. Estudiante A confirma reserva → slot queda ocupado definitivamente
