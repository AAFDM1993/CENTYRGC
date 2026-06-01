# Bloqueo recurrente por día de semana — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir crear bloqueos recurrentes por día de semana (ej. "todos los sábados") en la configuración de bloqueos de la agenda.

**Architecture:** El campo `fecha` del bloqueo almacena `"DOW:N"` (N=0–6, estándar `getDay()`). El frontend reconoce este formato en tres lugares: `_matchBloqueo` (evaluación), `crearBloqueoModal` (creación) y `renderListaBloqueosModal` (display). El formulario HTML agrega un checkbox que alterna entre modo fecha y modo día-de-semana. Sin cambios en el backend.

**Tech Stack:** Vanilla JS, HTML. Sin framework de tests — verificación manual.

---

## Mapa de archivos

| Archivo | Cambio |
|---------|--------|
| `src/index/agenda.js` | Actualizar `_matchBloqueo` (rama DOW), `crearBloqueoModal` (leer modo DOW), `renderListaBloqueosModal` (label legible), agregar `_toggleDowMode()` |
| `index.html` | Agregar checkbox `mbEsDow`, wrapper `mbFechaWrap`, select `mbDiaSemana` en wrapper `mbDiaSemanaWrap` |

---

## Task 1: Lógica de matching — `_matchBloqueo` con soporte DOW

**Files:**
- Modify: `src/index/agenda.js` — función `_matchBloqueo` (línea 1254)

- [ ] **Step 1: Reemplazar `_matchBloqueo`**

Buscar este bloque exacto:
```javascript
function _matchBloqueo(b, fecha, hora, area, camilla){
  const fOk = b.fecha==='*' || (b.fecha.includes('/')
    ? (()=>{ const [fi,ff]=b.fecha.split('/'); return fi&&ff&&fecha>=fi&&fecha<=ff; })()
    : b.fecha===fecha);
  const hOk = b.hora==='*' || (b.hora.includes('-')
    ? (()=>{ const [ini,fin]=b.hora.split('-'); return ini&&fin&&hora>=ini&&hora<fin; })()
    : b.hora===hora);
  const aOk = b.area==='*' || b.area===area;
  const cOk = b.camilla==='*' || b.camilla===camilla;
  return fOk && hOk && aOk && cOk;
}
```

Reemplazar con:
```javascript
function _matchBloqueo(b, fecha, hora, area, camilla){
  let fOk;
  if(b.fecha&&b.fecha.startsWith('DOW:')){
    const dow=parseInt(b.fecha.split(':')[1]);
    const d=new Date(fecha+'T12:00:00');
    fOk=d.getDay()===dow;
  } else {
    fOk = b.fecha==='*' || (b.fecha.includes('/')
      ? (()=>{ const [fi,ff]=b.fecha.split('/'); return fi&&ff&&fecha>=fi&&fecha<=ff; })()
      : b.fecha===fecha);
  }
  const hOk = b.hora==='*' || (b.hora.includes('-')
    ? (()=>{ const [ini,fin]=b.hora.split('-'); return ini&&fin&&hora>=ini&&hora<fin; })()
    : b.hora===hora);
  const aOk = b.area==='*' || b.area===area;
  const cOk = b.camilla==='*' || b.camilla===camilla;
  return fOk && hOk && aOk && cOk;
}
```

- [ ] **Step 2: Commit**

```
git add src/index/agenda.js
git commit -m "feat: _matchBloqueo soporta formato DOW:N para bloqueos recurrentes"
```

- [ ] **Step 3: Verificación mental**
  - `"DOW:6"` con fecha `"2026-06-06"` (sábado, getDay()=6) → `fOk = true` ✓
  - `"DOW:6"` con fecha `"2026-06-05"` (viernes, getDay()=5) → `fOk = false` ✓
  - `"DOW:1"` con fecha `"2026-06-08"` (lunes, getDay()=1) → `fOk = true` ✓
  - `"*"` sigue funcionando sin cambios ✓

---

## Task 2: Formulario HTML — checkbox + select en `index.html`

**Files:**
- Modify: `index.html` — sección "Nuevo bloqueo" (líneas 1328–1351)

- [ ] **Step 1: Envolver fecha en wrapper y agregar checkbox + select DOW**

Buscar este bloque exacto:
```html
        <div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.7px;margin-bottom:10px">Nuevo bloqueo</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
          <div class="field" style="margin:0"><label>Fecha inicio</label><input class="inp" id="mbFecha" type="date"></div>
          <div class="field" style="margin:0"><label>Fecha fin (opcional)</label><input class="inp" id="mbFechaFin" type="date"></div>
        </div>
```

Reemplazar con:
```html
        <div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.7px;margin-bottom:10px">Nuevo bloqueo</div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <input type="checkbox" id="mbEsDow" onchange="_toggleDowMode()" style="cursor:pointer;width:14px;height:14px">
          <label for="mbEsDow" style="font-size:12px;color:var(--tx2);cursor:pointer;margin:0">Día de semana recurrente</label>
        </div>
        <div id="mbFechaWrap" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
          <div class="field" style="margin:0"><label>Fecha inicio</label><input class="inp" id="mbFecha" type="date"></div>
          <div class="field" style="margin:0"><label>Fecha fin (opcional)</label><input class="inp" id="mbFechaFin" type="date"></div>
        </div>
        <div id="mbDiaSemanaWrap" style="display:none;margin-bottom:8px">
          <div class="field" style="margin:0"><label>Día de la semana</label>
            <select class="sel" id="mbDiaSemana" style="font-size:12px">
              <option value="1">Lunes</option>
              <option value="2">Martes</option>
              <option value="3">Miércoles</option>
              <option value="4">Jueves</option>
              <option value="5">Viernes</option>
              <option value="6">Sábado</option>
              <option value="0">Domingo</option>
            </select>
          </div>
        </div>
```

- [ ] **Step 2: Commit**

```
git add index.html
git commit -m "feat(html): agregar checkbox dia-de-semana en formulario de bloqueos"
```

---

## Task 3: JS — `_toggleDowMode`, `crearBloqueoModal`, `renderListaBloqueosModal`

**Files:**
- Modify: `src/index/agenda.js`

### Step 1: Agregar `_toggleDowMode`

Buscar:
```javascript
async function crearBloqueoModal(){
```

Insertar **justo antes**:
```javascript
function _toggleDowMode(){
  const esDow=g('mbEsDow')&&g('mbEsDow').checked;
  const fWrap=g('mbFechaWrap');
  const dWrap=g('mbDiaSemanaWrap');
  if(fWrap)fWrap.style.display=esDow?'none':'';
  if(dWrap)dWrap.style.display=esDow?'':'none';
}

```

- [ ] **Step 2: Actualizar `crearBloqueoModal` para leer modo DOW**

Buscar el bloque de construcción de `fecha` dentro de `crearBloqueoModal`:
```javascript
async function crearBloqueoModal(){
  var fechaIni=vi('mbFecha')||'';
  var fechaFin=vi('mbFechaFin')||'';
  var fecha;
  if(fechaIni&&fechaFin){
    if(fechaFin<fechaIni){toast('Error','La fecha fin debe ser igual o posterior a la fecha inicio','err');return;}
    fecha=fechaIni+'/'+fechaFin;
  } else if(fechaIni){
    fecha=fechaIni;
  } else {
    fecha='*';
  }
```

Reemplazar con:
```javascript
async function crearBloqueoModal(){
  const esDow=g('mbEsDow')&&g('mbEsDow').checked;
  var fecha;
  if(esDow){
    fecha='DOW:'+(vi('mbDiaSemana')||'1');
  } else {
    var fechaIni=vi('mbFecha')||'';
    var fechaFin=vi('mbFechaFin')||'';
    if(fechaIni&&fechaFin){
      if(fechaFin<fechaIni){toast('Error','La fecha fin debe ser igual o posterior a la fecha inicio','err');return;}
      fecha=fechaIni+'/'+fechaFin;
    } else if(fechaIni){
      fecha=fechaIni;
    } else {
      fecha='*';
    }
  }
```

- [ ] **Step 3: Resetear el checkbox al limpiar el formulario tras éxito**

Dentro de `crearBloqueoModal`, buscar el bloque de limpieza tras éxito:
```javascript
    var f=g('mbFecha');var ff=g('mbFechaFin');var h=g('mbHora');var hf=g('mbHoraFin');var mo=g('mbMotivo');
    if(f)f.value='';if(ff)ff.value='';if(h)h.value='';if(hf)hf.value='';if(mo)mo.value='';
```

Reemplazar con:
```javascript
    var f=g('mbFecha');var ff=g('mbFechaFin');var h=g('mbHora');var hf=g('mbHoraFin');var mo=g('mbMotivo');
    if(f)f.value='';if(ff)ff.value='';if(h)h.value='';if(hf)hf.value='';if(mo)mo.value='';
    const dowEl=g('mbEsDow');if(dowEl){dowEl.checked=false;_toggleDowMode();}
```

- [ ] **Step 4: Actualizar `renderListaBloqueosModal` para mostrar label legible**

Buscar dentro de `renderListaBloqueosModal` esta línea exacta:
```javascript
      <span style="font-family:'DM Mono',monospace;font-size:10px">${b.fecha}</span>
```

Reemplazar con:
```javascript
      <span style="font-family:'DM Mono',monospace;font-size:10px">${(function(){const _D=['Dom','Lun','Mar','Mie','Jue','Vie','Sab'];return b.fecha&&b.fecha.startsWith('DOW:')?'Todos los '+(_D[parseInt(b.fecha.split(':')[1])]||b.fecha):b.fecha;})()}</span>
```

- [ ] **Step 5: Commit**

```
git add src/index/agenda.js
git commit -m "feat: bloqueo recurrente por dia de semana (DOW:N)"
```

- [ ] **Step 6: Verificación manual**
  1. Abrir la app como admin → Configuración agenda → tab Bloqueos
  2. Marcar checkbox "Día de semana recurrente" → los inputs de fecha deben ocultarse y aparecer el select de días
  3. Seleccionar "Sábado", elegir un área, dejar hora en blanco (todos), crear el bloqueo
  4. En la lista debe aparecer "Todos los Sab" como fecha
  5. Navegar al calendario → todos los sábados del área seleccionada deben mostrarse como bloqueados (fondo rojo rayado)
  6. Desmarcar checkbox → los inputs de fecha reaparecen normalmente
  7. Crear un bloqueo de fecha normal → sigue funcionando igual
