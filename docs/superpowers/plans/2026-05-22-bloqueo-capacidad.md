# Bloqueo de capacidad (reducción de puestos) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir reducir la capacidad disponible de un espacio para un rango horario usando el mini-form inline, almacenando `[cap:N]` en el campo motivo.

**Architecture:** Cuatro tareas sobre `index.html`: (1) nueva función `capacidadBloqueada`, (2) calendario usa la función en la comprobación `lleno`, (3) mini-form agrega selector de puestos, (4) `crearBloqueoEspacio` construye el motivo con prefijo `[cap:N]`.

**Tech Stack:** HTML/JS vanilla

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `index.html` | `capacidadBloqueada` nueva, 2 líneas de calendar, mini-form campo, `crearBloqueoEspacio` motivo |
| `gasindex.txt` | Ninguno |

---

### Task 1: Función `capacidadBloqueada()`

**Files:**
- Modify: `index.html` — insertar después de `esBloqueado()` (~línea 4632)

- [ ] **Step 1: Insertar `capacidadBloqueada` inmediatamente después del cierre de `esBloqueado`**

Localiza esta línea exacta (~línea 4632):
```js
}

function esAreaBloqueada(nombre){
```

Reemplaza con:
```js
}

function capacidadBloqueada(fecha,hora,area,camilla){
  return agendaBloqueos.reduce(function(sum,b){
    if(!b.motivo||!b.motivo.startsWith('[cap:'))return sum;
    var m=b.motivo.match(/^\[cap:(\d+)\]/);
    if(!m)return sum;
    var n=parseInt(m[1]);
    var fOk=b.fecha==='*'||(b.fecha.includes('/')
      ?(function(){var p=b.fecha.split('/');return p[0]&&p[1]&&fecha>=p[0]&&fecha<=p[1];})()
      :b.fecha===fecha);
    var hOk=b.hora==='*'||(b.hora.includes('-')
      ?(function(){var p=b.hora.split('-');return p[0]&&p[1]&&hora>=p[0]&&hora<p[1];})()
      :b.hora===hora);
    var aOk=b.area==='*'||b.area===area;
    var cOk=b.camilla==='*'||b.camilla===camilla;
    return (fOk&&hOk&&aOk&&cOk)?sum+n:sum;
  },0);
}

function esAreaBloqueada(nombre){
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add capacidadBloqueada function for partial capacity blocks"
```

---

### Task 2: Calendario — `lleno` usa `capacidadBloqueada`

**Files:**
- Modify: `index.html:3757` y `index.html:4203`

Ambas líneas son idénticas. Hay exactamente **dos** ocurrencias de `const lleno=rsvEsp.length>=cap;` en el archivo.

- [ ] **Step 1: Reemplazar las 2 ocurrencias de `const lleno=rsvEsp.length>=cap;`**

Usa `replace_all: true` para reemplazar ambas en un solo paso.

Localiza:
```js
          const lleno=rsvEsp.length>=cap;
```

Reemplaza con (`replace_all: true`):
```js
          const capBloq=typeof capacidadBloqueada==='function'?capacidadBloqueada(fechaStr,hora,area.nombre,esp.nombre):0;
          const lleno=rsvEsp.length>=(cap-capBloq);
```

- [ ] **Step 2: Verificar en el navegador**

  - En un espacio con capacidad=2, crear un bloqueo `[cap:1]` para las 10:00 → el slot de las 10:00 debe admitir solo 1 reserva en lugar de 2 (el botón "+" desaparece al agregar la primera).
  - Crear un bloqueo `[cap:2]` para las 11:00 → el slot de las 11:00 no debe mostrar el botón "+" aunque no haya reservas.
  - Slots sin bloqueos de capacidad deben seguir comportándose exactamente igual.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: incorporate capacidadBloqueada into calendar slot availability check"
```

---

### Task 3: Mini-form — selector "Puestos a bloquear"

**Files:**
- Modify: `index.html:3819-3826` (dentro del template del mini-form en `renderAreasConfig`)

- [ ] **Step 1: Agregar el campo de puestos antes de los botones del mini-form**

Localiza este bloque exacto (líneas 3819–3826):
```js
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">
            <div class="field" style="margin:0"><label>Fecha inicio</label><input type="date" class="inp" id="bef-f1-${i}-${ei}"></div>
            <div class="field" style="margin:0"><label>Fecha fin (opc.)</label><input type="date" class="inp" id="bef-f2-${i}-${ei}"></div>
          </div>
          <div style="display:flex;gap:6px">
            <button onclick="crearBloqueoEspacio(${i},${ei})" style="flex:1;background:var(--red);color:#fff;border:none;border-radius:7px;padding:7px;font-size:12px;font-weight:700;cursor:pointer">&#128274; Crear bloqueo</button>
            <button onclick="toggleEspForm(${i},${ei})" style="background:var(--surf2);border:1px solid var(--bd);border-radius:7px;padding:7px 12px;font-size:12px;cursor:pointer">Cancelar</button>
          </div>
```

Reemplaza con:
```js
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">
            <div class="field" style="margin:0"><label>Fecha inicio</label><input type="date" class="inp" id="bef-f1-${i}-${ei}"></div>
            <div class="field" style="margin:0"><label>Fecha fin (opc.)</label><input type="date" class="inp" id="bef-f2-${i}-${ei}"></div>
          </div>
          ${esp.capacidad>1?`<div class="field" style="margin:0 0 8px 0"><label>Puestos a bloquear (de ${esp.capacidad})</label><input type="number" class="inp" id="bef-cap-${i}-${ei}" min="1" max="${esp.capacidad}" value="1" style="width:80px;text-align:center"></div>`:''}
          <div style="display:flex;gap:6px">
            <button onclick="crearBloqueoEspacio(${i},${ei})" style="flex:1;background:var(--red);color:#fff;border:none;border-radius:7px;padding:7px;font-size:12px;font-weight:700;cursor:pointer">&#128274; Crear bloqueo</button>
            <button onclick="toggleEspForm(${i},${ei})" style="background:var(--surf2);border:1px solid var(--bd);border-radius:7px;padding:7px 12px;font-size:12px;cursor:pointer">Cancelar</button>
          </div>
```

- [ ] **Step 2: Verificar en el navegador**

Abrir Config → Áreas y Franjas. Hacer clic en 🔒 de un espacio con capacidad=2 → el mini-form debe mostrar el campo "Puestos a bloquear (de 2)" entre las fechas y los botones. Para un espacio con capacidad=1, ese campo NO debe aparecer.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add puestos-a-bloquear selector to inline space block form"
```

---

### Task 4: `crearBloqueoEspacio()` — motivo con prefijo `[cap:N]`

**Files:**
- Modify: `index.html:4665-4701`

- [ ] **Step 1: Reemplazar `crearBloqueoEspacio()` completa**

Localiza esta función exacta (líneas 4665–4701):

```js
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

Reemplaza con:

```js
async function crearBloqueoEspacio(areaIdx,espIdx){
  var areaNombre=agendaCfg.areas[areaIdx].nombre;
  var espNombre=agendaCfg.areas[areaIdx].espacios[espIdx].nombre;
  var cap=agendaCfg.areas[areaIdx].espacios[espIdx].capacidad||1;
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
  var capBloq=cap>1?(parseInt(vi('bef-cap-'+k))||1):1;
  if(capBloq<1||capBloq>cap)capBloq=1;
  var motivo='[cap:'+capBloq+']';
  showLoader('Creando bloqueo...');
  try{
    var r=await apiPost({action:'crearBloqueo',fecha,hora,area:areaNombre,camilla:espNombre,motivo});
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

- [ ] **Step 2: Probar en el navegador**

  1. Espacio capacidad=2: abrir mini-form, hora=10:00, puestos=1 → crear bloqueo. Verificar que el motivo en la lista de bloqueos muestra `[cap:1]`.
  2. Intentar agregar 2 reservas al slot 10:00 → la segunda debe ser rechazada (slot lleno con 1 reserva).
  3. Espacio capacidad=1: abrir mini-form (sin campo puestos), hora=11:00 → crear bloqueo. El motivo debe ser `[cap:1]`. El slot 11:00 debe bloquearse completamente.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: use [cap:N] motivo prefix in crearBloqueoEspacio for capacity reduction"
```
