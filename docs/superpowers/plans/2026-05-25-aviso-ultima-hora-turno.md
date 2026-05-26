# Aviso informativo en última hora de turno — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar un popup informativo configurable cuando el usuario intenta reservar en el último slot de la franja de mañana (T1) o tarde (T2) de la agenda.

**Architecture:** Todo el cambio ocurre en `index.html`. Se agrega un campo `mensajeUltimaHora` a `agendaCfg`, un overlay HTML nuevo `#infoOverlay` con su función JS `infoDialog`, una función helper `esUltimaHoraFranja`, y se intercepta el flujo de reserva en `abrirReservaEspacio` y `abrirReservaEstEsp` para mostrar el popup antes del modal de reserva cuando corresponda.

**Tech Stack:** HTML/JS vanilla, CSS con variables CSS del proyecto (`--amber`, `--amber2`, `--surf`, `--bd2`).

---

## Archivos modificados

| Archivo | Cambios |
|---|---|
| `index.html:1478` | Agregar HTML `#infoOverlay` después del `#confirmOverlay` |
| `index.html:1504` | Agregar función `infoDialog(msg)` después de `confirmDialog` |
| `index.html:1223` | Agregar textarea `#cfgMensajeUltimaHora` en config modal |
| `index.html:3492` | Agregar campo `mensajeUltimaHora:''` al default de `agendaCfg` |
| `index.html:3532` | Agregar función `esUltimaHoraFranja` después de `generarSlots` |
| `index.html:3859` | Leer `mensajeUltimaHora` en `abrirConfigAgenda` |
| `index.html:3928` | Guardar `mensajeUltimaHora` en `guardarAgendaConfig` |
| `index.html:3974` | Hacer `async` e interceptar `abrirReservaEspacio` |
| `index.html:4249` | Hacer `async` e interceptar `abrirReservaEstEsp` |

---

## Task 1: Agregar campo `mensajeUltimaHora` al default de `agendaCfg`

**Files:**
- Modify: `index.html:3492`

- [ ] **Step 1: Editar la declaración de `agendaCfg`**

Ubicar la línea 3492 (contiene `let agendaCfg`). Cambiar:

```js
// ANTES (línea 3492)
let agendaCfg   = { areas:[], franjas:[{inicio:'08:00',fin:'13:00'},{inicio:'14:00',fin:'19:00'}] };
```

Por:

```js
// DESPUÉS
let agendaCfg   = { areas:[], franjas:[{inicio:'08:00',fin:'13:00'},{inicio:'14:00',fin:'19:00'}], mensajeUltimaHora:'' };
```

- [ ] **Step 2: Verificar manualmente**

Abrir `index.html` en el browser. Abrir la consola (F12) e ir a la sección Agenda. Ejecutar en consola:
```js
console.log(agendaCfg.mensajeUltimaHora)
```
Esperado: `""` (string vacío, no `undefined`).

---

## Task 2: Guardar y cargar `mensajeUltimaHora` en las funciones de configuración

**Files:**
- Modify: `index.html:3928` (`guardarAgendaConfig`)
- Modify: `index.html:3859` (`abrirConfigAgenda`)

- [ ] **Step 1: Modificar `guardarAgendaConfig` para persistir el campo**

Ubicar `guardarAgendaConfig` (línea ~3921). Agregar una línea **antes** de `showLoader`, después de la línea que hace el `if(!f.length)`:

```js
// ANTES del showLoader (insertar tras la línea `if(!f.length) f.push(...)`)
agendaCfg.mensajeUltimaHora = (document.getElementById('cfgMensajeUltimaHora')||{}).value||'';
```

El bloque queda así:

```js
async function guardarAgendaConfig(){
  const f=agendaCfg.franjas=[];
  const pares=[['calFranja1IniModal','calFranja1FinModal'],['calFranja2IniModal','calFranja2FinModal']];
  pares.forEach(([iId,fId])=>{
    const ini=vi(iId), fin=vi(fId);
    if(ini&&fin) f.push({inicio:ini,fin:fin});
  });
  if(!f.length) f.push({inicio:'08:00',fin:'13:00'},{inicio:'14:00',fin:'19:00'});
  agendaCfg.mensajeUltimaHora = (document.getElementById('cfgMensajeUltimaHora')||{}).value||'';
  showLoader('Guardando configuracion...');
  // ... resto sin cambios
```

- [ ] **Step 2: Modificar `abrirConfigAgenda` para cargar el campo**

Ubicar el bloque de sincronización de franjas en `abrirConfigAgenda` (línea ~3855-3860):

```js
// Sincronizar franjas horarias en el modal
const f=agendaCfg.franjas||[{inicio:'08:00',fin:'13:00'},{inicio:'14:00',fin:'19:00'}];
['calFranja1Ini','calFranja1Fin','calFranja2Ini','calFranja2Fin'].forEach((id,i)=>{
  const elModal=g(id+'Modal');
  const frIdx=Math.floor(i/2); const tipo=i%2===0?'inicio':'fin';
  if(elModal) elModal.value=(f[frIdx]||{})[tipo]||'';
});
```

Agregar **una línea al final** de ese bloque:

```js
const elMsg=g('cfgMensajeUltimaHora');if(elMsg) elMsg.value=agendaCfg.mensajeUltimaHora||'';
```

Resultado:

```js
const f=agendaCfg.franjas||[{inicio:'08:00',fin:'13:00'},{inicio:'14:00',fin:'19:00'}];
['calFranja1Ini','calFranja1Fin','calFranja2Ini','calFranja2Fin'].forEach((id,i)=>{
  const elModal=g(id+'Modal');
  const frIdx=Math.floor(i/2); const tipo=i%2===0?'inicio':'fin';
  if(elModal) elModal.value=(f[frIdx]||{})[tipo]||'';
});
const elMsg=g('cfgMensajeUltimaHora');if(elMsg) elMsg.value=agendaCfg.mensajeUltimaHora||'';
```

- [ ] **Step 3: Verificar manualmente**

Abrir el modal de configuración de agenda. El campo de mensaje debe aparecer vacío (o con el valor guardado). Escribir un texto, guardar y volver a abrir el modal: el texto debe persistir.

---

## Task 3: Agregar textarea en el panel "Áreas y Franjas" del config modal

**Files:**
- Modify: `index.html:1217–1224` (panel `#cfgPanelAreas`)

- [ ] **Step 1: Insertar el bloque de textarea antes del botón "Guardar"**

Ubicar la línea ~1223 que dice:

```html
      <button class="btn-sm green" onclick="guardarAgendaConfig();cerrarConfigAgenda();" style="width:100%;min-height:40px">Guardar configuracion</button>
```

Insertar **antes** de ese botón:

```html
      <div class="slbl" style="margin-top:14px">Aviso ultima hora de turno</div>
      <textarea class="inp" id="cfgMensajeUltimaHora" rows="2" placeholder="Ej: Ultimo horario del turno — confirmar disponibilidad" style="resize:vertical;min-height:56px;width:100%;box-sizing:border-box"></textarea>
      <div style="font-size:11px;color:var(--tx4);margin-top:4px;margin-bottom:12px">Aparece al reservar en el ultimo slot de T1 o T2. Dejar vacio para desactivar.</div>
```

- [ ] **Step 2: Verificar visualmente**

Abrir el modal de configuración de agenda → tab "Áreas y Franjas". Debe verse un textarea con label "Aviso ultima hora de turno" y texto de ayuda debajo, antes del botón "Guardar configuracion".

---

## Task 4: Agregar `#infoOverlay` HTML y función `infoDialog`

**Files:**
- Modify: `index.html:1478` (después del cierre de `#confirmOverlay`)
- Modify: `index.html:1504` (después del cierre de `confirmDialog`)

- [ ] **Step 1: Agregar el HTML del overlay**

Ubicar la línea 1478 que cierra el `#confirmOverlay`:

```html
</div>
```
(la que está justo antes de `<script>` en la línea 1480)

Insertar **después** de esa línea (entre `</div>` y `<script>`):

```html

<!-- Overlay aviso informativo (ultima hora de turno) -->
<div id="infoOverlay" style="display:none;position:fixed;inset:0;background:rgba(10,22,40,.6);z-index:9999;align-items:center;justify-content:center;backdrop-filter:blur(3px)">
  <div style="background:var(--surf);border-radius:20px;padding:28px 28px 22px;max-width:360px;width:90%;box-shadow:0 24px 60px rgba(0,0,0,.35);border:1px solid var(--bd2)">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
      <span style="font-size:22px">&#9888;&#65039;</span>
      <span style="font-family:'Syne',sans-serif;font-weight:700;font-size:15px;color:var(--amber)">Aviso</span>
    </div>
    <p id="infoMsg" style="font-size:14px;color:var(--tx);line-height:1.6;margin-bottom:20px;white-space:pre-line"></p>
    <div style="display:flex;justify-content:flex-end">
      <button id="infoOk" style="background:var(--amber);border:none;border-radius:12px;padding:9px 24px;font-size:13px;font-weight:700;color:#fff;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif">Entendido</button>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Agregar la función `infoDialog` en JS**

Ubicar la línea ~1504 que cierra `confirmDialog`:

```js
  });
}
```

Insertar **después** de esa línea (y antes de `let session=null,...`):

```js

function infoDialog(msg){
  return new Promise(function(resolve){
    var ov=document.getElementById('infoOverlay');
    document.getElementById('infoMsg').textContent=msg;
    ov.style.display='flex';
    function onOk(){
      ov.style.display='none';
      document.getElementById('infoOk').removeEventListener('click',onOk);
      resolve();
    }
    document.getElementById('infoOk').addEventListener('click',onOk);
  });
}
```

- [ ] **Step 3: Verificar manualmente**

En la consola del browser, ejecutar:
```js
infoDialog('Mensaje de prueba — ultimo horario del turno')
```
Esperado: aparece el overlay ámbar con el mensaje y botón "Entendido". Al hacer clic en "Entendido" el overlay desaparece.

---

## Task 5: Agregar función helper `esUltimaHoraFranja`

**Files:**
- Modify: `index.html:3532` (después del cierre de `generarSlots`)

- [ ] **Step 1: Insertar la función tras `generarSlots`**

Ubicar la línea ~3532 que cierra `generarSlots`:

```js
  return slots;
}
```

Insertar **después**:

```js

function esUltimaHoraFranja(hora, franjas, durMin){
  const dur=(durMin&&durMin>0)?durMin:60;
  return (franjas||[]).some(function(fr){
    const end=timeToMin(fr.fin);
    const lastStart=end-dur;
    return lastStart>=timeToMin(fr.inicio)&&timeToMin(hora)===lastStart;
  });
}
```

- [ ] **Step 2: Verificar en consola**

Con franjas por defecto (T1 08:00-13:00, T2 14:00-19:00) y duración 60 min:
```js
console.log(esUltimaHoraFranja('12:00', agendaCfg.franjas, 60)) // true  (último de T1)
console.log(esUltimaHoraFranja('18:00', agendaCfg.franjas, 60)) // true  (último de T2)
console.log(esUltimaHoraFranja('11:00', agendaCfg.franjas, 60)) // false
console.log(esUltimaHoraFranja('08:00', agendaCfg.franjas, 60)) // false
```

---

## Task 6: Interceptar `abrirReservaEspacio` (vista admin/docente)

**Files:**
- Modify: `index.html:3974`

- [ ] **Step 1: Hacer la función `async` y agregar la verificación al inicio**

Ubicar la función en línea ~3974. Reemplazar el inicio:

```js
// ANTES
function abrirReservaEspacio(fecha,hora,area,espacio,capacidad,fechaLabel){
  rsvPendiente={fecha,hora,area,camilla:espacio,capacidad,esEstudiante:false};
```

Por:

```js
// DESPUÉS
async function abrirReservaEspacio(fecha,hora,area,espacio,capacidad,fechaLabel){
  const _msg=agendaCfg.mensajeUltimaHora||'';
  if(_msg){
    const _aObj=agendaCfg.areas.find(function(a){return a.nombre===area;});
    const _dur=_aObj?(_aObj.duracion||60):60;
    if(esUltimaHoraFranja(hora,agendaCfg.franjas,_dur)) await infoDialog(_msg);
  }
  rsvPendiente={fecha,hora,area,camilla:espacio,capacidad,esEstudiante:false};
```

- [ ] **Step 2: Verificar manualmente**

1. Abrir Configuración de Agenda → escribir un mensaje en "Aviso ultima hora de turno" → Guardar.
2. En el calendario, hacer clic en el botón "+" del **último slot** del turno de mañana (ej. 12:00 si la franja es 08:00-13:00 con slots de 60 min).
3. Esperado: aparece el popup ámbar con el mensaje. Al hacer clic "Entendido", se abre el modal de reserva.
4. Hacer clic en un slot de otra hora → el modal de reserva debe abrirse directamente **sin** popup.

---

## Task 7: Interceptar `abrirReservaEstEsp` (vista estudiante)

**Files:**
- Modify: `index.html:4249`

- [ ] **Step 1: Hacer la función `async` y agregar la verificación al inicio**

Ubicar la función en línea ~4249. Reemplazar el inicio:

```js
// ANTES
function abrirReservaEstEsp(fecha,hora,area,espacio,capacidad,fechaLabel){
  rsvPendiente={fecha,hora,area,camilla:espacio,capacidad,esEstudiante:true};
```

Por:

```js
// DESPUÉS
async function abrirReservaEstEsp(fecha,hora,area,espacio,capacidad,fechaLabel){
  const _msg=agendaCfg.mensajeUltimaHora||'';
  if(_msg){
    const _aObj=agendaCfg.areas.find(function(a){return a.nombre===area;});
    const _dur=_aObj?(_aObj.duracion||60):60;
    if(esUltimaHoraFranja(hora,agendaCfg.franjas,_dur)) await infoDialog(_msg);
  }
  rsvPendiente={fecha,hora,area,camilla:espacio,capacidad,esEstudiante:true};
```

- [ ] **Step 2: Verificar manualmente (vista estudiante)**

Iniciar sesión como estudiante. En la agenda del estudiante, hacer clic en el último slot de cualquier turno. Esperado: mismo comportamiento que en la vista admin (popup → modal de reserva).

---

## Task 8: Commit final

- [ ] **Step 1: Hacer commit**

```bash
git add index.html docs/superpowers/specs/2026-05-25-aviso-ultima-hora-turno-design.md docs/superpowers/plans/2026-05-25-aviso-ultima-hora-turno.md
git commit -m "feat: aviso informativo configurable en ultima hora de turno (agenda)"
```

---

## Casos borde cubiertos por el diseño

- **Mensaje vacío**: `if(_msg)` previene cualquier llamada a `infoDialog`. Sin impacto en el flujo normal.
- **Slot ya pasado**: el botón `+` no se renderiza para slots pasados; `abrirReservaEspacio` nunca se llama.
- **Franja de un solo slot**: ese slot es también el último → el aviso aparece. Correcto por diseño.
- **Duración de área hace que no quepan slots**: `esUltimaHoraFranja` devuelve `false` porque `lastStart < fr.inicio`. Sin popup.
