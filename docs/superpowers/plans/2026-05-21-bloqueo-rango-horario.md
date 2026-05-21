# Bloqueo de rango horario en la agenda — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir bloquear un rango de horas (de X a Y) en la agenda guardando un único registro con formato `"HH:MM-HH:MM"` en el campo `hora`.

**Architecture:** Tres cambios aislados en `index.html`: (1) el formulario HTML agrega un campo "Hora fin", (2) `crearBloqueoModal()` construye el valor `hora` como rango cuando corresponde, (3) `esBloqueado()` detecta el guion y aplica comparación de rango. No se toca el backend GAS.

**Tech Stack:** HTML/JS vanilla, Google Apps Script (backend sin cambios)

---

## Archivos afectados

| Archivo | Líneas aproximadas | Cambio |
|---|---|---|
| `index.html` | 1236–1239 | Formulario: nueva columna "Hora fin" |
| `index.html` | 4377–4399 | `crearBloqueoModal()`: construcción de rango + limpieza + validación |
| `index.html` | 4573–4581 | `esBloqueado()`: detección de rango |

---

### Task 1: Actualizar el formulario HTML

**Files:**
- Modify: `index.html:1236-1239`

- [ ] **Step 1: Reemplazar la grilla `1fr 1fr` de Fecha/Hora por una grilla `1fr 1fr 1fr` con Fecha, Hora inicio y Hora fin**

Localiza esta sección exacta (líneas 1236–1239):

```html
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
          <div class="field" style="margin:0"><label>Fecha (o vacio = siempre)</label><input class="inp" id="mbFecha" type="date"></div>
          <div class="field" style="margin:0"><label>Hora (o vacio = todo el dia)</label><input class="inp" id="mbHora" type="time"></div>
        </div>
```

Reemplázala por:

```html
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px">
          <div class="field" style="margin:0"><label>Fecha (o vacio = siempre)</label><input class="inp" id="mbFecha" type="date"></div>
          <div class="field" style="margin:0"><label>Hora inicio</label><input class="inp" id="mbHora" type="time"></div>
          <div class="field" style="margin:0"><label>Hora fin (opcional)</label><input class="inp" id="mbHoraFin" type="time"></div>
        </div>
```

- [ ] **Step 2: Verificar visualmente en el navegador**

Abrir `index.html` en el navegador, ir a Config → Bloqueos y confirmar que aparecen tres columnas: Fecha / Hora inicio / Hora fin (opcional).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add hora-fin field to bloqueo form"
```

---

### Task 2: Actualizar `crearBloqueoModal()` para construir el rango

**Files:**
- Modify: `index.html:4377-4399`

- [ ] **Step 1: Reemplazar el cuerpo de `crearBloqueoModal()`**

Localiza esta función exacta (líneas 4377–4399):

```js
async function crearBloqueoModal(){
  var fecha=vi('mbFecha')||'*';
  var hora=vi('mbHora')||'*';
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
    var f=g('mbFecha');var h=g('mbHora');var mo=g('mbMotivo');
    if(f)f.value='';if(h)h.value='';if(mo)mo.value='';
    await cargarBloqueos();
    renderListaBloqueos();
    renderListaBloqueosModal();
    renderCalendario();
  }catch(e){hideLoader();toast('Error',e.message,'err')}
}
```

Reemplázala por:

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

- [ ] **Step 2: Probar en el navegador**

  - Crear un bloqueo con solo "Hora inicio" → debe guardarse como `"08:00"` (comportamiento anterior).
  - Crear un bloqueo con "Hora inicio = 08:00" y "Hora fin = 10:00" → debe guardarse como `"08:00-10:00"`.
  - Intentar con hora fin <= hora inicio → debe mostrar toast de error y no crear el bloqueo.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: build hora range in crearBloqueoModal when hora-fin is set"
```

---

### Task 3: Actualizar `esBloqueado()` para comparación de rango

**Files:**
- Modify: `index.html:4573-4581`

- [ ] **Step 1: Reemplazar `esBloqueado()`**

Localiza esta función exacta (líneas 4573–4581):

```js
function esBloqueado(fecha, hora, area, camilla){
  return agendaBloqueos.some(b=>{
    const fOk = b.fecha==='*' || b.fecha===fecha;
    const hOk = b.hora==='*'  || b.hora===hora;
    const aOk = b.area==='*'  || b.area===area;
    const cOk = b.camilla==='*' || b.camilla===camilla;
    return fOk && hOk && aOk && cOk;
  });
}
```

Reemplázala por:

```js
function esBloqueado(fecha, hora, area, camilla){
  return agendaBloqueos.some(b=>{
    const fOk = b.fecha==='*' || b.fecha===fecha;
    const hOk = b.hora==='*' || (b.hora.includes('-')
      ? (()=>{ const [ini,fin]=b.hora.split('-'); return hora>=ini && hora<fin; })()
      : b.hora===hora);
    const aOk = b.area==='*'  || b.area===area;
    const cOk = b.camilla==='*' || b.camilla===camilla;
    return fOk && hOk && aOk && cOk;
  });
}
```

- [ ] **Step 2: Probar en el navegador**

  1. Con el bloqueo `"08:00-10:00"` activo para un área de 30 min, abrir el calendario.
  2. Verificar que los slots 08:00, 08:30, 09:00, 09:30 aparecen bloqueados (fondo rayado rojo).
  3. Verificar que el slot 10:00 **no** está bloqueado.
  4. Verificar que un bloqueo simple de `"11:00"` sigue bloqueando solo ese slot (retrocompatibilidad).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: support hora range in esBloqueado for agenda block matching"
```
