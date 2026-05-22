# Bloqueo de áreas/espacios y rango de fechas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir soporte de rango de fechas en el formulario de bloqueos y toggles ON/OFF por área/espacio en la config de la agenda.

**Architecture:** Cinco tareas independientes sobre dos archivos. Las tareas 1–4 extienden el formulario de bloqueos existente siguiendo el mismo patrón que el rango de horas ya implementado. La tarea 5 añade helpers de estado y botones de toggle en la config de áreas, reutilizando el sistema de bloqueos existente sin cambios en el backend GAS.

**Tech Stack:** HTML/JS vanilla, Google Apps Script (backend)

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `gasindex.txt` | `leerBloqueos()` — filtro y map actualizados para rango de fechas |
| `index.html` | Formulario (~1236), `crearBloqueoModal` (~4378), `esBloqueado` (~4582), CSS (~346-347), `abrirConfigAgenda` (~4317), `renderAreasConfig` (~3799), 4 funciones nuevas |

---

### Task 1: GAS — `leerBloqueos` con soporte de rango de fechas

**Files:**
- Modify: `gasindex.txt:948-971`

- [ ] **Step 1: Reemplazar la función `leerBloqueos` completa**

Localiza esta función (líneas 948–971):

```js
function leerBloqueos(fechaInicio, fechaFin) {
  var sheet = getBloqueoSheet();
  var last  = sheet.getLastRow();
  if (last < 2) return { ok: true, bloqueos: [] };
  var rows = sheet.getRange(2,1,last-1,7).getValues();
  var bloqueos = rows.filter(function(r){
    if (!r[0]) return false;
    if (String(r[0]).trim() === '*') return true;
    var f = (r[0] instanceof Date) ? Utilities.formatDate(r[0], 'GMT-5', 'yyyy-MM-dd') : String(r[0]).trim().substring(0,10);
    return (!fechaInicio||f>=fechaInicio)&&(!fechaFin||f<=fechaFin);
  }).map(function(r,i){
    return {
      id:        i+2,
      fecha:     (String(r[0]).trim()==='*')?'*':(r[0] instanceof Date?Utilities.formatDate(r[0],'GMT-5','yyyy-MM-dd'):String(r[0]).trim().substring(0,10)),
      hora:      String(r[1]).trim(),
      area:      String(r[2]).trim(),
      camilla:   String(r[3]).trim(),
      motivo:    String(r[4]).trim(),
      creadoPor: String(r[5]).trim(),
      ts:        String(r[6]).trim()
    };
  });
  return { ok: true, bloqueos: bloqueos };
}
```

Reemplaza con:

```js
function leerBloqueos(fechaInicio, fechaFin) {
  var sheet = getBloqueoSheet();
  var last  = sheet.getLastRow();
  if (last < 2) return { ok: true, bloqueos: [] };
  var rows = sheet.getRange(2,1,last-1,7).getValues();
  var bloqueos = rows.filter(function(r){
    if (!r[0]) return false;
    var fechaStr = String(r[0]).trim();
    if (fechaStr === '*') return true;
    var parts = fechaStr.includes('/') ? fechaStr.split('/') : null;
    var fIni, fFin;
    if (parts) {
      fIni = parts[0].substring(0,10);
      fFin = parts[1].substring(0,10);
    } else {
      fIni = (r[0] instanceof Date) ? Utilities.formatDate(r[0],'GMT-5','yyyy-MM-dd') : fechaStr.substring(0,10);
      fFin = fIni;
    }
    return (!fechaInicio||fFin>=fechaInicio)&&(!fechaFin||fIni<=fechaFin);
  }).map(function(r,i){
    var fechaStr = String(r[0]).trim();
    var fechaVal;
    if (fechaStr === '*') {
      fechaVal = '*';
    } else if (fechaStr.includes('/')) {
      fechaVal = fechaStr;
    } else {
      fechaVal = (r[0] instanceof Date) ? Utilities.formatDate(r[0],'GMT-5','yyyy-MM-dd') : fechaStr.substring(0,10);
    }
    return {
      id:        i+2,
      fecha:     fechaVal,
      hora:      String(r[1]).trim(),
      area:      String(r[2]).trim(),
      camilla:   String(r[3]).trim(),
      motivo:    String(r[4]).trim(),
      creadoPor: String(r[5]).trim(),
      ts:        String(r[6]).trim()
    };
  });
  return { ok: true, bloqueos: bloqueos };
}
```

- [ ] **Step 2: Commit**

```bash
git add gasindex.txt
git commit -m "feat: support date range in leerBloqueos filter and map"
```

---

### Task 2: Formulario HTML — campo Fecha fin

**Files:**
- Modify: `index.html:1236-1240`

- [ ] **Step 1: Reemplazar la fila de 3 columnas `[Fecha|Hora inicio|Hora fin]` por dos filas de 2 columnas**

Localiza este bloque exacto (líneas 1236–1240):

```html
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px">
          <div class="field" style="margin:0"><label>Fecha (o vacio = siempre)</label><input class="inp" id="mbFecha" type="date"></div>
          <div class="field" style="margin:0"><label>Hora inicio</label><input class="inp" id="mbHora" type="time"></div>
          <div class="field" style="margin:0"><label>Hora fin (opcional)</label><input class="inp" id="mbHoraFin" type="time"></div>
        </div>
```

Reemplaza con:

```html
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
          <div class="field" style="margin:0"><label>Fecha inicio</label><input class="inp" id="mbFecha" type="date"></div>
          <div class="field" style="margin:0"><label>Fecha fin (opcional)</label><input class="inp" id="mbFechaFin" type="date"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
          <div class="field" style="margin:0"><label>Hora inicio</label><input class="inp" id="mbHora" type="time"></div>
          <div class="field" style="margin:0"><label>Hora fin (opcional)</label><input class="inp" id="mbHoraFin" type="time"></div>
        </div>
```

- [ ] **Step 2: Verificar en el navegador**

Abrir `index.html`, ir a Config de agenda → Bloqueos. Confirmar que el formulario muestra 4 filas: [Fecha inicio | Fecha fin] / [Hora inicio | Hora fin] / [Area | Espacio] / [Motivo].

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add fecha-fin field to bloqueo form"
```

---

### Task 3: `crearBloqueoModal()` — lógica de rango de fechas

**Files:**
- Modify: `index.html:4378-4408`

- [ ] **Step 1: Reemplazar `crearBloqueoModal()` completa**

Localiza esta función exacta (líneas 4378–4408):

```js
async function crearBloqueoModal(){
  var fecha=vi('mbFecha')||'*';
  var horaIni=vi('mbHora')||'*';
  var horaFin=vi('mbHoraFin')||'';
  var hora;
  if(horaIni!=='*'&&horaFin){
    if(horaFin<=horaIni){toast('Error','La hora fin debe ser posterior a la hora inicio','err');return;}
    hora=horaIni+'-'+horaFin;
  } else {
    hora=horaIni;
  }
  var area=vi('mbArea')||'*';
  var camilla=vi('mbCamilla')||'*';
  var motivo=vi('mbMotivo')||'Sin motivo';
  if(fecha==='*'&&hora==='*'&&area==='*'){
    if(!await confirmDialog('Esto bloqueará TODOS los horarios de TODAS las áreas. ¿Continuar?'))return;
  }
  showLoader('Creando bloqueo...');
  try{
    var r=await apiPost({action:'crearBloqueo',fecha,hora,area,camilla,motivo});
    hideLoader();if(!r.ok)throw new Error(r.error);
    toast('Bloqueo creado','','ok');
    invalidateCache('leerBloqueos');
    var f=g('mbFecha');var h=g('mbHora');var hf=g('mbHoraFin');var mo=g('mbMotivo');
    if(f)f.value='';if(h)h.value='';if(hf)hf.value='';if(mo)mo.value='';
    await cargarBloqueos();
    renderListaBloqueos();
    renderListaBloqueosModal();
    renderCalendario();
  }catch(e){hideLoader();toast('Error',e.message,'err')}
}
```

Reemplaza con:

```js
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
  var horaIni=vi('mbHora')||'*';
  var horaFin=vi('mbHoraFin')||'';
  var hora;
  if(horaIni!=='*'&&horaFin){
    if(horaFin<=horaIni){toast('Error','La hora fin debe ser posterior a la hora inicio','err');return;}
    hora=horaIni+'-'+horaFin;
  } else {
    hora=horaIni;
  }
  var area=vi('mbArea')||'*';
  var camilla=vi('mbCamilla')||'*';
  var motivo=vi('mbMotivo')||'Sin motivo';
  if(fecha==='*'&&hora==='*'&&area==='*'){
    if(!await confirmDialog('Esto bloqueará TODOS los horarios de TODAS las áreas. ¿Continuar?'))return;
  }
  showLoader('Creando bloqueo...');
  try{
    var r=await apiPost({action:'crearBloqueo',fecha,hora,area,camilla,motivo});
    hideLoader();if(!r.ok)throw new Error(r.error);
    toast('Bloqueo creado','','ok');
    invalidateCache('leerBloqueos');
    var f=g('mbFecha');var ff=g('mbFechaFin');var h=g('mbHora');var hf=g('mbHoraFin');var mo=g('mbMotivo');
    if(f)f.value='';if(ff)ff.value='';if(h)h.value='';if(hf)hf.value='';if(mo)mo.value='';
    await cargarBloqueos();
    renderListaBloqueos();
    renderListaBloqueosModal();
    renderCalendario();
  }catch(e){hideLoader();toast('Error',e.message,'err')}
}
```

- [ ] **Step 2: Probar en el navegador**

  - Crear un bloqueo solo con Fecha inicio → debe guardarse como `"2026-06-01"`.
  - Crear un bloqueo con Fecha inicio = 2026-06-01 y Fecha fin = 2026-06-15 → debe guardarse como `"2026-06-01/2026-06-15"`.
  - Intentar con fecha fin < fecha inicio → debe mostrar toast de error.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: build fecha range in crearBloqueoModal when fecha-fin is set"
```

---

### Task 4: `esBloqueado()` — comparación de rango de fechas

**Files:**
- Modify: `index.html:4582-4592`

- [ ] **Step 1: Reemplazar `esBloqueado()` completa**

Localiza esta función exacta (líneas 4582–4592):

```js
function esBloqueado(fecha, hora, area, camilla){
  return agendaBloqueos.some(b=>{
    const fOk = b.fecha==='*' || b.fecha===fecha;
    const hOk = b.hora==='*' || (b.hora.includes('-')
      ? (()=>{ const [ini,fin]=b.hora.split('-'); return ini&&fin&&hora>=ini&&hora<fin; })()
      : b.hora===hora);
    const aOk = b.area==='*'  || b.area===area;
    const cOk = b.camilla==='*' || b.camilla===camilla;
    return fOk && hOk && aOk && cOk;
  });
}
```

Reemplaza con:

```js
function esBloqueado(fecha, hora, area, camilla){
  return agendaBloqueos.some(b=>{
    const fOk = b.fecha==='*' || (b.fecha.includes('/')
      ? (()=>{ const [fi,ff]=b.fecha.split('/'); return fi&&ff&&fecha>=fi&&fecha<=ff; })()
      : b.fecha===fecha);
    const hOk = b.hora==='*' || (b.hora.includes('-')
      ? (()=>{ const [ini,fin]=b.hora.split('-'); return ini&&fin&&hora>=ini&&hora<fin; })()
      : b.hora===hora);
    const aOk = b.area==='*'  || b.area===area;
    const cOk = b.camilla==='*' || b.camilla===camilla;
    return fOk && hOk && aOk && cOk;
  });
}
```

- [ ] **Step 2: Probar en el navegador**

  1. Con bloqueo `"2026-06-01/2026-06-15"` activo, navegar al calendario semana del 2 al 6 de junio → todos los slots deben aparecer bloqueados.
  2. Navegar a la semana del 16 al 20 de junio → ningún slot bloqueado por ese rango.
  3. Un bloqueo simple `"2026-06-01"` debe seguir bloqueando solo ese día (retrocompatibilidad).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: support fecha range in esBloqueado for date range matching"
```

---

### Task 5: Toggle ON/OFF por área y espacio en la config

**Files:**
- Modify: `index.html:346-347` (CSS)
- Modify: `index.html:4317-4325` (`abrirConfigAgenda`)
- Modify: `index.html:3799-3821` (`renderAreasConfig`)
- Insert after `index.html:4592` (4 funciones nuevas)

- [ ] **Step 1: Actualizar CSS de `.area-card-top` y `.espacio-row`**

Localiza (línea 346–347):

```css
.area-card-top{display:grid;grid-template-columns:1fr 80px 28px;gap:7px;align-items:center;margin-bottom:8px}
```

Reemplaza con:

```css
.area-card-top{display:grid;grid-template-columns:1fr 80px auto 28px;gap:7px;align-items:center;margin-bottom:8px}
```

Localiza (línea 347):

```css
.espacio-row{display:grid;grid-template-columns:1fr 70px 28px;gap:6px;align-items:center;margin-bottom:5px;padding-left:8px}
```

Reemplaza con:

```css
.espacio-row{display:grid;grid-template-columns:1fr 70px 28px 28px;gap:6px;align-items:center;margin-bottom:5px;padding-left:8px}
```

- [ ] **Step 2: Convertir `abrirConfigAgenda` en async y precargar bloqueos**

Localiza (líneas 4317–4325):

```js
function abrirConfigAgenda(){
  renderAreasConfig();
  // Poblar selects de bloqueo del modal con las áreas actuales
  actualizarSelectsBloqueoModal();
  renderListaBloqueosModal();
  cfgSwitchTab('areas');
  var m = g('configAgendaModal');
  if(m) m.style.display='flex';
}
```

Reemplaza con:

```js
async function abrirConfigAgenda(){
  await cargarBloqueos();
  renderAreasConfig();
  // Poblar selects de bloqueo del modal con las áreas actuales
  actualizarSelectsBloqueoModal();
  renderListaBloqueosModal();
  cfgSwitchTab('areas');
  var m = g('configAgendaModal');
  if(m) m.style.display='flex';
}
```

- [ ] **Step 3: Insertar las 4 funciones helper después de `esBloqueado()`**

Localiza el bloque (línea 4593):

```js
// UI de bloqueos
function actualizarSelectsBloqueo(){
```

Inserta ANTES de esa línea:

```js
function esAreaBloqueada(nombre){
  return agendaBloqueos.some(b=>b.fecha==='*'&&b.hora==='*'&&b.area===nombre&&b.camilla==='*');
}
function esEspacioBloqueado(areaNombre,espNombre){
  return agendaBloqueos.some(b=>b.fecha==='*'&&b.hora==='*'&&b.area===areaNombre&&b.camilla===espNombre);
}
async function toggleBloqueoArea(areaIdx){
  const nombre=agendaCfg.areas[areaIdx].nombre;
  showLoader('Actualizando...');
  try{
    const bloq=agendaBloqueos.find(b=>b.fecha==='*'&&b.hora==='*'&&b.area===nombre&&b.camilla==='*');
    if(bloq){
      const r=await apiPost({action:'eliminarBloqueo',id:bloq.id});
      hideLoader();if(!r.ok)throw new Error(r.error);
      toast('Área desbloqueada','','ok');
    }else{
      const r=await apiPost({action:'crearBloqueo',fecha:'*',hora:'*',area:nombre,camilla:'*',motivo:'Área bloqueada'});
      hideLoader();if(!r.ok)throw new Error(r.error);
      toast('Área bloqueada','','ok');
    }
    invalidateCache('leerBloqueos');
    await cargarBloqueos();
    renderAreasConfig();
    renderCalendario();
  }catch(e){hideLoader();toast('Error',e.message,'err')}
}
async function toggleBloqueoEspacio(areaIdx,espIdx){
  const areaNombre=agendaCfg.areas[areaIdx].nombre;
  const espNombre=agendaCfg.areas[areaIdx].espacios[espIdx].nombre;
  showLoader('Actualizando...');
  try{
    const bloq=agendaBloqueos.find(b=>b.fecha==='*'&&b.hora==='*'&&b.area===areaNombre&&b.camilla===espNombre);
    if(bloq){
      const r=await apiPost({action:'eliminarBloqueo',id:bloq.id});
      hideLoader();if(!r.ok)throw new Error(r.error);
      toast('Espacio desbloqueado','','ok');
    }else{
      const r=await apiPost({action:'crearBloqueo',fecha:'*',hora:'*',area:areaNombre,camilla:espNombre,motivo:'Espacio bloqueado'});
      hideLoader();if(!r.ok)throw new Error(r.error);
      toast('Espacio bloqueado','','ok');
    }
    invalidateCache('leerBloqueos');
    await cargarBloqueos();
    renderAreasConfig();
    renderCalendario();
  }catch(e){hideLoader();toast('Error',e.message,'err')}
}

```

- [ ] **Step 4: Actualizar `renderAreasConfig()` — espacios con toggle**

Localiza este bloque exacto dentro de `renderAreasConfig()` (líneas 3800–3805):

```js
  const espaciosHtml=(a.espacios||[]).map((esp,ei)=>`
      <div class="espacio-row">
        <div><label>Nombre del espacio</label><input value="${esc2(esp.nombre)}" placeholder="Ej. Camilla 1" oninput="agendaCfg.areas[${i}].espacios[${ei}].nombre=this.value"></div>
        <div><label>Capacidad (pac.)</label><input type="number" min="1" max="20" value="${esp.capacidad||1}" oninput="agendaCfg.areas[${i}].espacios[${ei}].capacidad=+this.value||1"></div>
        <button class="area-del" onclick="delEspacio(${i},${ei})" title="Eliminar espacio">&#128465;</button>
      </div>`).join('');
```

Reemplaza con:

```js
  const espaciosHtml=(a.espacios||[]).map((esp,ei)=>{
    const espBloq=esEspacioBloqueado(a.nombre,esp.nombre);
    return `
      <div class="espacio-row">
        <div><label>Nombre del espacio</label><input value="${esc2(esp.nombre)}" placeholder="Ej. Camilla 1" oninput="agendaCfg.areas[${i}].espacios[${ei}].nombre=this.value"></div>
        <div><label>Capacidad (pac.)</label><input type="number" min="1" max="20" value="${esp.capacidad||1}" oninput="agendaCfg.areas[${i}].espacios[${ei}].capacidad=+this.value||1"></div>
        <button onclick="toggleBloqueoEspacio(${i},${ei})" style="background:${espBloq?'var(--green2)':'rgba(220,38,38,.1)'};border:1px solid ${espBloq?'var(--green)':'var(--red)'};color:${espBloq?'var(--green)':'var(--red)'};border-radius:6px;padding:0;font-size:14px;cursor:pointer;width:28px;height:28px" title="${espBloq?'Desbloquear espacio':'Bloquear espacio'}">${espBloq?'&#128275;':'&#128274;'}</button>
        <button class="area-del" onclick="delEspacio(${i},${ei})" title="Eliminar espacio">&#128465;</button>
      </div>`;
  }).join('');
```

- [ ] **Step 5: Actualizar `renderAreasConfig()` — área header con toggle**

Localiza este bloque exacto dentro de `renderAreasConfig()` (líneas 3807–3816):

```js
    return `<div class="area-card">
      <div class="area-card-top">
        <div><label style="font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:.6px;display:block;margin-bottom:3px">Area</label>
          <input value="${esc2(a.nombre)}" oninput="agendaCfg.areas[${i}].nombre=this.value;actualizarFiltroArea()" placeholder="Nombre del area" style="background:#fff;border:1px solid var(--bd);border-radius:6px;padding:5px 8px;font-size:12px;font-family:'Plus Jakarta Sans',sans-serif;outline:none;width:100%">
        </div>
        <div><label style="font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:.6px;display:block;margin-bottom:3px">Durac.(min)</label>
          <input type="number" min="15" max="240" step="15" value="${a.duracion||60}" oninput="agendaCfg.areas[${i}].duracion=+this.value||60" style="background:#fff;border:1px solid var(--bd);border-radius:6px;padding:5px 8px;font-size:12px;outline:none;width:100%;text-align:center">
        </div>
        <button class="area-del" onclick="delArea(${i})" title="Eliminar area">&#128465;</button>
      </div>
```

Reemplaza con:

```js
    const areaBloq=esAreaBloqueada(a.nombre);
    return `<div class="area-card">
      <div class="area-card-top">
        <div><label style="font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:.6px;display:block;margin-bottom:3px">Area</label>
          <input value="${esc2(a.nombre)}" oninput="agendaCfg.areas[${i}].nombre=this.value;actualizarFiltroArea()" placeholder="Nombre del area" style="background:#fff;border:1px solid var(--bd);border-radius:6px;padding:5px 8px;font-size:12px;font-family:'Plus Jakarta Sans',sans-serif;outline:none;width:100%">
        </div>
        <div><label style="font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:.6px;display:block;margin-bottom:3px">Durac.(min)</label>
          <input type="number" min="15" max="240" step="15" value="${a.duracion||60}" oninput="agendaCfg.areas[${i}].duracion=+this.value||60" style="background:#fff;border:1px solid var(--bd);border-radius:6px;padding:5px 8px;font-size:12px;outline:none;width:100%;text-align:center">
        </div>
        <button onclick="toggleBloqueoArea(${i})" style="background:${areaBloq?'var(--green2)':'rgba(220,38,38,.1)'};border:1px solid ${areaBloq?'var(--green)':'var(--red)'};color:${areaBloq?'var(--green)':'var(--red)'};border-radius:6px;padding:4px 8px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap">${areaBloq?'&#128275; Activa':'&#128274; Bloquear'}</button>
        <button class="area-del" onclick="delArea(${i})" title="Eliminar area">&#128465;</button>
      </div>
```

- [ ] **Step 6: Verificar en el navegador**

  1. Abrir Config → Áreas y Franjas. Confirmar que cada área tiene el botón "🔒 Bloquear" y cada espacio tiene un ícono 🔒.
  2. Hacer clic en "🔒 Bloquear" en un área → debe cambiar a "🔓 Activa" en verde y bloquear todos los slots de esa área en el calendario.
  3. Hacer clic en "🔓 Activa" → debe volver a "🔒 Bloquear" y desbloquear los slots.
  4. Mismo ciclo con el botón de espacio individual.

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "feat: add block toggle per area and space in agenda config"
```
