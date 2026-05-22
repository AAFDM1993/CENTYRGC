# Mini-form inline bloqueo espacio por hora — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el toggle permanente del espacio por un mini-form inline que permite bloquear por hora, fecha y hora-fin opcionales.

**Architecture:** Tres tareas secuenciales en `index.html`: (1) agregar variable de estado y dos nuevas funciones, (2) actualizar el template HTML de espacios en `renderAreasConfig`, (3) eliminar las funciones obsoletas `esEspacioBloqueado` y `toggleBloqueoEspacio`.

**Tech Stack:** HTML/JS vanilla

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `index.html` | Variable `_espFormAbierto`, 2 funciones nuevas, `renderAreasConfig` espacio rows, 2 funciones eliminadas |
| `gasindex.txt` | Ninguno |

---

### Task 1: Variable de estado y funciones `toggleEspForm` / `crearBloqueoEspacio`

**Files:**
- Modify: `index.html:4593` (insertar variable después de `let agendaBloqueos`)
- Modify: `index.html:4665` (insertar 2 funciones antes de `// UI de bloqueos`)

- [ ] **Step 1: Insertar `var _espFormAbierto = null;` después de `let agendaBloqueos = [];`**

Localiza esta línea exacta (línea 4593):
```js
let agendaBloqueos = [];
```
Reemplaza con:
```js
let agendaBloqueos = [];
var _espFormAbierto = null;
```

- [ ] **Step 2: Insertar las 2 nuevas funciones antes de `// UI de bloqueos`**

Localiza esta línea exacta (línea ~4666):
```js
// UI de bloqueos
function actualizarSelectsBloqueo(){
```
Inserta ANTES:
```js
function toggleEspForm(areaIdx,espIdx){
  var key=areaIdx+'-'+espIdx;
  _espFormAbierto=(_espFormAbierto===key)?null:key;
  renderAreasConfig();
}
async function crearBloqueoEspacio(areaIdx,espIdx){
  var areaNombre=agendaCfg.areas[areaIdx].nombre;
  var espNombre=agendaCfg.areas[areaIdx].espacios[espIdx].nombre;
  var k=areaIdx+'-'+espIdx;
  var horaIni=vi('bef-h1-'+k)||'*';
  var horaFin=vi('bef-h2-'+k)||'';
  var hora;
  if(horaIni!=='*'&&horaFin){
    if(horaFin<=horaIni){toast('Error','La hora fin debe ser posterior a la hora inicio','err');return;}
    hora=horaIni+'-'+horaFin;
  } else {
    hora=horaIni;
  }
  var fechaIni=vi('bef-f1-'+k)||'';
  var fechaFin=vi('bef-f2-'+k)||'';
  var fecha;
  if(fechaIni&&fechaFin){
    if(fechaFin<fechaIni){toast('Error','La fecha fin debe ser igual o posterior a la fecha inicio','err');return;}
    fecha=fechaIni+'/'+fechaFin;
  } else if(fechaIni){
    fecha=fechaIni;
  } else {
    fecha='*';
  }
  showLoader('Creando bloqueo...');
  try{
    var r=await apiPost({action:'crearBloqueo',fecha,hora,area:areaNombre,camilla:espNombre,motivo:'Bloqueo por espacio'});
    hideLoader();if(!r.ok)throw new Error(r.error);
    toast('Bloqueo creado','','ok');
    _espFormAbierto=null;
    invalidateCache('leerBloqueos');
    await cargarBloqueos();
    renderAreasConfig();
    renderListaBloqueosModal();
    renderCalendario();
  }catch(e){hideLoader();toast('Error',e.message,'err')}
}

```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add toggleEspForm and crearBloqueoEspacio for inline space block form"
```

---

### Task 2: Actualizar espacio rows en `renderAreasConfig()`

**Files:**
- Modify: `index.html:3803-3812`

- [ ] **Step 1: Reemplazar el bloque de espacio rows**

Localiza este bloque exacto (líneas 3803–3812):

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

Reemplaza con:

```js
  const espaciosHtml=(a.espacios||[]).map((esp,ei)=>{
    const k=i+'-'+ei;
    const abierto=_espFormAbierto===k;
    return `
      <div>
        <div class="espacio-row">
          <div><label>Nombre del espacio</label><input value="${esc2(esp.nombre)}" placeholder="Ej. Camilla 1" oninput="agendaCfg.areas[${i}].espacios[${ei}].nombre=this.value"></div>
          <div><label>Capacidad (pac.)</label><input type="number" min="1" max="20" value="${esp.capacidad||1}" oninput="agendaCfg.areas[${i}].espacios[${ei}].capacidad=+this.value||1"></div>
          <button onclick="toggleEspForm(${i},${ei})" style="background:${abierto?'rgba(220,38,38,.15)':'var(--surf2)'};border:1px solid ${abierto?'var(--red)':'var(--bd)'};color:${abierto?'var(--red)':'var(--tx3)'};border-radius:6px;padding:0;font-size:14px;cursor:pointer;width:28px;height:28px" title="${abierto?'Cerrar':'Bloquear por hora'}">${abierto?'&#128275;':'&#128274;'}</button>
          <button class="area-del" onclick="delEspacio(${i},${ei})" title="Eliminar espacio">&#128465;</button>
        </div>
        ${abierto?`<div style="padding:8px 10px;background:var(--red2);border:1px solid var(--red);border-radius:8px;margin-top:4px;margin-left:8px">
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
        </div>`:''}
      </div>`;
  }).join('');
```

- [ ] **Step 2: Verificar en el navegador**

  1. Abrir Config → Áreas y Franjas.
  2. Hacer clic en 🔒 de un espacio → mini-form debe aparecer debajo con campos Hora inicio / Hora fin / Fecha inicio / Fecha fin.
  3. Hacer clic en otro 🔒 → el primer form se cierra y el nuevo se abre.
  4. Completar Hora inicio = 10:00, Hora fin = 12:00, sin fecha → clic en "Crear bloqueo" → debe crear bloqueo `{hora:'10:00-12:00', fecha:'*', camilla:'Camilla X'}`.
  5. Verificar que el form se cierra y el slot 10:00 aparece bloqueado en el calendario para ese espacio.
  6. Dejar todos los campos vacíos → clic "Crear bloqueo" → crea bloqueo permanente `{hora:'*', fecha:'*'}`.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: update renderAreasConfig espacio rows with inline block form"
```

---

### Task 3: Eliminar funciones obsoletas

**Files:**
- Modify: `index.html:4619-4664`

- [ ] **Step 1: Eliminar `esEspacioBloqueado` y `toggleBloqueoEspacio`**

Localiza este bloque exacto (líneas 4619–4664):

```js
function esEspacioBloqueado(areaNombre,espNombre){
  return agendaBloqueos.some(b=>b.fecha==='*'&&b.hora==='*'&&b.area===areaNombre&&b.camilla===espNombre);
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
    renderListaBloqueosModal();
    renderCalendario();
  }catch(e){hideLoader();toast('Error',e.message,'err')}
}
```

Reemplaza con una línea vacía (elimina el bloque completo dejando solo un salto de línea entre `esAreaBloqueada` y `toggleBloqueoArea`):

```js

```

Es decir, el resultado final debe quedar así (sin las dos funciones):

```js
function esAreaBloqueada(nombre){
  return agendaBloqueos.some(b=>b.fecha==='*'&&b.hora==='*'&&b.area===nombre&&b.camilla==='*');
}
async function toggleBloqueoArea(areaIdx){
```

- [ ] **Step 2: Verificar que no hay referencias a las funciones eliminadas**

Buscar en el archivo que no queden referencias:
```bash
grep -n "esEspacioBloqueado\|toggleBloqueoEspacio" index.html
```
Debe retornar vacío (ningún resultado).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "refactor: remove obsolete esEspacioBloqueado and toggleBloqueoEspacio"
```
