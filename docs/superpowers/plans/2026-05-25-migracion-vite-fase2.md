# Migración a Vite — Fase 2: Módulos Compartidos

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extraer las utilidades, la capa API y la gestión de sesión de `hc.html` a archivos JS separados en `src/shared/`, reduciendo el archivo principal sin cambiar ningún comportamiento.

**Architecture:** Scripts regulares (sin `type="module"`) añadidos como `<script src>` antes del bloque `<script>` principal de hc.html. Las funciones siguen en scope global — sin import/export por ahora. Cada tarea extrae un módulo, verifica con `npm run build`, y hace commit. Si algo rompe, solo afecta ese módulo.

**Tech Stack:** Vite 5, JavaScript vanilla, PowerShell (Windows 11)

---

## Mapa de archivos

| Archivo | Responsabilidad |
|---------|----------------|
| `migrar/src/shared/utils.js` | g, esc, e2, toast, overlay, delay, formatFecha, edad |
| `migrar/src/shared/api.js` | HC_URL, caché en memoria, apiGet, apiPost |
| `migrar/src/shared/session.js` | SK, TTL, sesión, timer, borradores |
| `migrar/hc.html` | Pierde las secciones extraídas, gana 3 `<script src>` |

---

### Task 1: Extraer `src/shared/utils.js`

**Files:**
- Create: `migrar/src/shared/utils.js`
- Modify: `migrar/hc.html`

- [ ] **Step 1: Crear carpeta y archivo utils.js**

```powershell
New-Item -ItemType Directory -Force "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\src\shared"
```

Crear `migrar/src/shared/utils.js` con este contenido exacto:

```js
// Utilidades puras: DOM helpers, escape, overlays, formato de fechas

const g = id => document.getElementById(id);
const esc = s => String(s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
const e2 = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function toast(msg, sub, tipo='ok'){
  const d=document.createElement('div');
  d.className='t-item '+tipo;
  d.innerHTML=`<strong>${e2(msg)}</strong>${sub?`<div style="font-size:11px;opacity:.8;margin-top:2px">${e2(sub)}</div>`:''}`;
  g('hcToast').appendChild(d);
  setTimeout(()=>d.remove(),3500);
}

var _busy = false;
function tryLock(){
  if(_busy) return false;
  _busy = true;
  return true;
}
function showSendOverlay(txt, sub){
  _busy = true;
  var ov=g('hcSendOverlay');
  var t=g('hcSendOverlayTxt');
  var s=g('hcSendOverlaySub');
  if(t) t.textContent=txt||'Enviando...';
  if(s) s.textContent=sub||'';
  if(ov){ ov.style.display='flex'; }
}
function hideSendOverlay(){
  _busy = false;
  var ov=g('hcSendOverlay');
  if(ov){ ov.style.opacity='1'; ov.style.transition='opacity .3s'; ov.style.opacity='0';
    setTimeout(function(){ ov.style.display='none'; ov.style.opacity='1'; },320); }
}

const delay = ms => new Promise(r => setTimeout(r, ms));

function formatFecha(raw){
  if(!raw) return '';
  var d;
  if(/^\d{4}-\d{2}-\d{2}$/.test(String(raw))) d=new Date(raw+'T12:00:00');
  else d=new Date(raw);
  if(isNaN(d.getTime())){
    var m=raw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if(m) d=new Date(m[3].length===2?'20'+m[3]:m[3],m[2]-1,m[1]);
    else return raw;
  }
  var dd=String(d.getDate()).padStart(2,'0');
  var mm=String(d.getMonth()+1).padStart(2,'0');
  var yy=String(d.getFullYear()).slice(-2);
  var h=d.getHours();
  var mi=String(d.getMinutes()).padStart(2,'0');
  var ap=h>=12?'PM':'AM';
  h=h%12||12;
  return dd+'/'+mm+'/'+yy+' '+h+':'+mi+' '+ap;
}
function formatFechaCorta(raw){
  if(!raw) return '';
  if(/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
  var d=new Date(raw);
  if(/^\d{4}-\d{2}-\d{2}$/.test(String(raw))) d=new Date(raw+'T12:00:00');
  if(isNaN(d.getTime())){
    var m=raw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if(m) d=new Date((m[3].length===2?'20'+m[3]:m[3])+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0')+'T12:00:00');
    else return raw;
  }
  var dd=String(d.getDate()).padStart(2,'0');
  var mm=String(d.getMonth()+1).padStart(2,'0');
  var yyyy=d.getFullYear();
  return dd+'/'+mm+'/'+yyyy;
}
function edad(fn){
  const d=new Date(fn),h=new Date();
  let a=h.getFullYear()-d.getFullYear();
  if(h<new Date(h.getFullYear(),d.getMonth(),d.getDate()))a--;
  return isNaN(a)?'':a;
}
```

- [ ] **Step 2: Añadir `<script src>` a hc.html ANTES del bloque `<script>` principal**

El bloque `<script>` principal de hc.html empieza en la línea 378 con `<script>`. Añadir la siguiente línea JUSTO ANTES de esa línea 378:

```html
<script src="/src/shared/utils.js"></script>
```

El resultado debe quedar así:
```html
<script src="/src/shared/utils.js"></script>
<script>
// ─── Config ───────────────────────────────────────────
const HC_URL = ...
```

- [ ] **Step 3: Eliminar las funciones extraídas del bloque `<script>` principal de hc.html**

Eliminar exactamente estas secciones del `<script>` inline (buscar y eliminar el texto exacto):

**Bloque 1 — g, esc, e2 (línea 534-536):**
```
const g = id => document.getElementById(id);
const esc = s => String(s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
const e2 = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
```

**Bloque 2 — Toast (líneas 538-545):**
```
// ─── Toast ────────────────────────────────────────────
function toast(msg, sub, tipo='ok'){
  const d=document.createElement('div');
  d.className='t-item '+tipo;
  d.innerHTML=`<strong>${e2(msg)}</strong>${sub?`<div style="font-size:11px;opacity:.8;margin-top:2px">${e2(sub)}</div>`:''}`;
  g('hcToast').appendChild(d);
  setTimeout(()=>d.remove(),3500);
}
```

**Bloque 3 — Overlay + lock (líneas 547-568):**
```
// ─── Overlay de envío + lock anti-doble-clic ─────────
var _busy = false;
function tryLock(){
  if(_busy) return false;
  _busy = true;
  return true;
}
function showSendOverlay(txt, sub){
  _busy = true;
  var ov=g('hcSendOverlay');
  var t=g('hcSendOverlayTxt');
  var s=g('hcSendOverlaySub');
  if(t) t.textContent=txt||'Enviando...';
  if(s) s.textContent=sub||'';
  if(ov){ ov.style.display='flex'; }
}
function hideSendOverlay(){
  _busy = false;
  var ov=g('hcSendOverlay');
  if(ov){ ov.style.opacity='1'; ov.style.transition='opacity .3s'; ov.style.opacity='0';
    setTimeout(function(){ ov.style.display='none'; ov.style.opacity='1'; },320); }
}
```

**Bloque 4 — delay (línea 584):**
```
const delay = ms => new Promise(r => setTimeout(r, ms));
```

**Bloque 5 — edad (línea 810):**
```
function edad(fn){const d=new Date(fn),h=new Date();let a=h.getFullYear()-d.getFullYear();if(h<new Date(h.getFullYear(),d.getMonth(),d.getDate()))a--;return isNaN(a)?'':a;}
```

**Bloque 6 — formatFecha y formatFechaCorta (líneas 2782-2819):**
Eliminar desde `function formatFecha(raw){` hasta el cierre de `formatFechaCorta` (la línea que termina con `return dd+'/'+mm+'/'+yyyy;` y su `}`).

- [ ] **Step 4: Verificar build**

```powershell
cd D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar
npm run build 2>&1
```

Esperado: termina sin errores. Si hay errores de sintaxis en utils.js, aparecerán aquí.

- [ ] **Step 5: Verificar que el dev server sirve utils.js**

```powershell
$job = Start-Job -ScriptBlock { Set-Location "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar"; npx vite --port 5173 }
Start-Sleep -Seconds 8
$status = (Invoke-WebRequest -Uri "http://localhost:5173/src/shared/utils.js" -UseBasicParsing -TimeoutSec 10).StatusCode
Write-Host "utils.js status: $status"
Stop-Job $job; Remove-Job $job
```

Esperado: HTTP 200.

- [ ] **Step 6: Commit**

```powershell
cd D:\projectoshtmls\CENTYRGC\CENTYRGC
git add migrar/src/shared/utils.js migrar/hc.html
git commit -m "refactor: extraer utils.js desde hc.html (g, esc, e2, toast, overlay, delay, formatFecha, edad)"
```

---

### Task 2: Extraer `src/shared/api.js`

**Files:**
- Create: `migrar/src/shared/api.js`
- Modify: `migrar/hc.html`

- [ ] **Step 1: Crear api.js**

Crear `migrar/src/shared/api.js` con este contenido exacto:

```js
// Capa de comunicación con Google Apps Script

const HC_URL = 'https://script.google.com/macros/s/AKfycbwbIfL5zpBlekIBu_btJrIgJqPilKlyDyLsu9oSh9SZhVFQxv1RckYnudE0AcmxF9EU/exec';

const _cache = new Map();
const _CACHE_TTL = {
  listarPacientes: 30000, listarCategorias: 300000,
  listarUsuarios: 60000,  obtenerPaciente: 20000,
  listarEvaluaciones: 15000, listarSesiones: 15000,
  pendientesRevision: 10000
};
function _cacheKey(action, p){ return action+'|'+JSON.stringify(p); }
function invalidarCache(prefijos){
  (prefijos||[]).forEach(function(p){
    _cache.forEach(function(_,k){ if(k.startsWith(p)) _cache.delete(k); });
  });
}

async function apiGet(action, p={}){
  const ttl=_CACHE_TTL[action];
  const key=_cacheKey(action,p);
  if(ttl){
    const hit=_cache.get(key);
    if(hit&&Date.now()-hit.ts<ttl) return hit.data;
  }
  const u=new URL(HC_URL);
  u.searchParams.set('action',action);
  if(session) u.searchParams.set('token',session.token);
  Object.entries(p).forEach(([k,v])=>u.searchParams.set(k,String(v)));
  u.searchParams.set('_t', Date.now());
  const r=await fetch(u.toString());
  const data=await r.json();
  if(ttl&&data.ok!==false) _cache.set(key,{data,ts:Date.now()});
  return data;
}
async function apiPost(body){
  const r=await fetch(HC_URL,{method:'POST',headers:{'Content-Type':'text/plain'},
    body:JSON.stringify({...body,token:session?.token||''})});
  const data=await r.json();
  const a=body.action||'';
  if(a.includes('Paciente')) invalidarCache(['listarPacientes','obtenerPaciente']);
  if(a.includes('Evaluacion')||a.includes('evaluacion')) invalidarCache(['listarEvaluaciones','obtenerEvaluacion','listarPacientes','pendientesRevision']);
  if(a.includes('Sesion')||a.includes('sesion')) invalidarCache(['listarSesiones','listarPacientes','pendientesRevision']);
  if(a.includes('revisar')) invalidarCache(['listarEvaluaciones','listarSesiones','pendientesRevision','listarPacientes']);
  if(a.includes('Firma')||a.includes('Ctmp')) invalidarCache(['listarUsuarios']);
  if(a.includes('onsentimiento')) invalidarCache(['obtenerEvaluacion','listarEvaluaciones']);
  return data;
}
```

- [ ] **Step 2: Añadir `<script src="/src/shared/api.js">` a hc.html**

Añadir DESPUÉS de la línea `<script src="/src/shared/utils.js"></script>` y ANTES del bloque `<script>` principal:

```html
<script src="/src/shared/utils.js"></script>
<script src="/src/shared/api.js"></script>
<script>
```

- [ ] **Step 3: Eliminar las secciones extraídas del `<script>` inline**

**Bloque 1 — HC_URL (línea 380):**
```
const HC_URL = 'https://script.google.com/macros/s/AKfycbwbIfL5zpBlekIBu_btJrIgJqPilKlyDyLsu9oSh9SZhVFQxv1RckYnudE0AcmxF9EU/exec';
```

**Bloque 2 — Caché en memoria (líneas 570-583):**
Eliminar solo estas líneas (el Timer que viene después se extrae en Task 3; `delay` ya fue eliminado en Task 1):

```
// ─── API + Caché en memoria ───────────────────────────
const _cache = new Map();
const _CACHE_TTL = {
  listarPacientes: 30000, listarCategorias: 300000,
  listarUsuarios: 60000,  obtenerPaciente: 20000,
  listarEvaluaciones: 15000, listarSesiones: 15000,
  pendientesRevision: 10000
};
function _cacheKey(action, p){ return action+'|'+JSON.stringify(p); }
function invalidarCache(prefijos){
  (prefijos||[]).forEach(function(p){
    _cache.forEach(function(_,k){ if(k.startsWith(p)) _cache.delete(k); });
  });
}
```

**Bloque 3 — apiGet (líneas ~669-685):**
```
async function apiGet(action, p={}){
  const ttl=_CACHE_TTL[action];
  const key=_cacheKey(action,p);
  if(ttl){
    const hit=_cache.get(key);
    if(hit&&Date.now()-hit.ts<ttl) return hit.data;
  }
  const u=new URL(HC_URL);
  u.searchParams.set('action',action);
  if(session) u.searchParams.set('token',session.token);
  Object.entries(p).forEach(([k,v])=>u.searchParams.set(k,String(v)));
  u.searchParams.set('_t', Date.now()); // evita caché de browser y GAS CDN
  const r=await fetch(u.toString());
  const data=await r.json();
  if(ttl&&data.ok!==false) _cache.set(key,{data,ts:Date.now()});
  return data;
}
```

**Bloque 4 — apiPost (líneas ~686-699):**
```
async function apiPost(body){
  const r=await fetch(HC_URL,{method:'POST',headers:{'Content-Type':'text/plain'},
    body:JSON.stringify({...body,token:session?.token||''})});
  const data=await r.json();
  // Invalida caché relevante según la acción
  const a=body.action||'';
  if(a.includes('Paciente')) invalidarCache(['listarPacientes','obtenerPaciente']);
  if(a.includes('Evaluacion')||a.includes('evaluacion')) invalidarCache(['listarEvaluaciones','obtenerEvaluacion','listarPacientes','pendientesRevision']);
  if(a.includes('Sesion')||a.includes('sesion')) invalidarCache(['listarSesiones','listarPacientes','pendientesRevision']);
  if(a.includes('revisar')) invalidarCache(['listarEvaluaciones','listarSesiones','pendientesRevision','listarPacientes']);
  if(a.includes('Firma')||a.includes('Ctmp')) invalidarCache(['listarUsuarios']);
  if(a.includes('onsentimiento')) invalidarCache(['obtenerEvaluacion','listarEvaluaciones']);
  return data;
}
```

- [ ] **Step 4: Verificar build**

```powershell
cd D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar
npm run build 2>&1
```

Esperado: sin errores.

- [ ] **Step 5: Commit**

```powershell
cd D:\projectoshtmls\CENTYRGC\CENTYRGC
git add migrar/src/shared/api.js migrar/hc.html
git commit -m "refactor: extraer api.js desde hc.html (HC_URL, caché, apiGet, apiPost)"
```

---

### Task 3: Extraer `src/shared/session.js`

**Files:**
- Create: `migrar/src/shared/session.js`
- Modify: `migrar/hc.html`

- [ ] **Step 1: Crear session.js**

Crear `migrar/src/shared/session.js` con este contenido exacto:

```js
// Sesión de usuario, autenticación, timer de evaluación y borradores de formulario

const SK = 'centyr_hc_s';
const TTL = 6*60*60*1000;
let session = null;

function loadSess(){
  try{
    const s=JSON.parse(localStorage.getItem(SK)||'null');
    if(!s||Date.now()-s.ts>TTL){localStorage.removeItem(SK);return null;}
    return s;
  }catch{return null;}
}
function saveSess(s){localStorage.setItem(SK,JSON.stringify({...s,ts:Date.now()}));}

async function doLogin(){
  const cod=(g('lgCod')?.value||'').trim(),pass=(g('lgPass')?.value||'').trim();
  if(!cod||!pass){g('lgErr').textContent='Completa los campos';g('lgErr').style.display='block';return;}
  g('lgErr').style.display='none';
  const r=await apiGet('login',{codigo:cod,password:pass,token:''});
  if(!r.ok){g('lgErr').textContent=r.error||'Error';g('lgErr').style.display='block';return;}
  session={token:r.token,rol:r.rol,nombre:r.nombre,codigo:r.codigo||cod};
  saveSess(session); iniciarApp();
}
function doLogout(){localStorage.removeItem(SK);session=null;g('appPage').style.display='none';g('lgPage').classList.add('on');}

const TIMER_MS  = 30 * 60 * 1000;
const TIMER_KEY = 'hc_eval_timer';

function timerGuardar(evalId, pacId, catId, startTime){
  try{ localStorage.setItem(TIMER_KEY, JSON.stringify({evalId, pacId, catId, startTime: startTime||Date.now()})); }catch(e){}
}
function timerCargar(){
  try{ var r=localStorage.getItem(TIMER_KEY); return r?JSON.parse(r):null; }catch(e){ return null; }
}
function timerBorrar(){
  try{ localStorage.removeItem(TIMER_KEY); }catch(e){}
}

const DRAFT_KEY = (pacId, catId) => 'hc_draft_' + pacId + '_' + catId;

function draftGuardar(pacId, catId) {
  try {
    var datos = typeof recogerDatosFormulario === 'function' ? recogerDatosFormulario() : null;
    if (!datos) return;
    localStorage.setItem(DRAFT_KEY(pacId, catId), JSON.stringify({ ts: Date.now(), datos: datos }));
  } catch(e) {}
}
function draftCargar(pacId, catId) {
  try {
    var raw = localStorage.getItem(DRAFT_KEY(pacId, catId));
    if (!raw) return null;
    var d = JSON.parse(raw);
    if (Date.now() - d.ts > 86400000) { localStorage.removeItem(DRAFT_KEY(pacId, catId)); return null; }
    return d.datos;
  } catch(e) { return null; }
}
function draftBorrar(pacId, catId) {
  try { localStorage.removeItem(DRAFT_KEY(pacId, catId)); } catch(e) {}
}
```

- [ ] **Step 2: Añadir `<script src="/src/shared/session.js">` a hc.html**

El orden de los tres scripts debe quedar exactamente así, antes del `<script>` principal:

```html
<script src="/src/shared/utils.js"></script>
<script src="/src/shared/api.js"></script>
<script src="/src/shared/session.js"></script>
<script>
```

- [ ] **Step 3: Eliminar las secciones extraídas del `<script>` inline**

**Bloque 1 — SK y TTL (líneas 440-441):**
```
const SK = 'centyr_hc_s';
const TTL = 6*60*60*1000;
```

**Bloque 2 — Modificar línea de estado global (línea 533):**

Cambiar:
```
let session = null, cats = [], pacActivo = null, revTarget = null;
```
Por:
```
let cats = [], pacActivo = null, revTarget = null;
```
(`session` ahora se declara en session.js)

**Bloque 3 — Timer (líneas 586-598):**
```
// ─── Timer de evaluación borrador ──────────────────────
const TIMER_MS  = 30 * 60 * 1000;
const TIMER_KEY = 'hc_eval_timer';

function timerGuardar(evalId, pacId, catId, startTime){
  try{ localStorage.setItem(TIMER_KEY, JSON.stringify({evalId, pacId, catId, startTime: startTime||Date.now()})); }catch(e){}
}
function timerCargar(){
  try{ var r=localStorage.getItem(TIMER_KEY); return r?JSON.parse(r):null; }catch(e){ return null; }
}
function timerBorrar(){
  try{ localStorage.removeItem(TIMER_KEY); }catch(e){}
}
```

**Bloque 4 — Auth: loadSess, saveSess, doLogin, doLogout (líneas 701-717):**
```
// ─── Auth ─────────────────────────────────────────────
function loadSess(){
  try{const s=JSON.parse(localStorage.getItem(SK)||'null');
    if(!s||Date.now()-s.ts>TTL){localStorage.removeItem(SK);return null;}return s;}catch{return null;}
}
function saveSess(s){localStorage.setItem(SK,JSON.stringify({...s,ts:Date.now()}));}

async function doLogin(){
  const cod=(g('lgCod')?.value||'').trim(),pass=(g('lgPass')?.value||'').trim();
  if(!cod||!pass){g('lgErr').textContent='Completa los campos';g('lgErr').style.display='block';return;}
  g('lgErr').style.display='none';
  const r=await apiGet('login',{codigo:cod,password:pass,token:''});
  if(!r.ok){g('lgErr').textContent=r.error||'Error';g('lgErr').style.display='block';return;}
  session={token:r.token,rol:r.rol,nombre:r.nombre,codigo:r.codigo||cod};
  saveSess(session); iniciarApp();
}
function doLogout(){localStorage.removeItem(SK);session=null;g('appPage').style.display='none';g('lgPage').classList.add('on');}
```

**Bloque 5 — DRAFT_KEY, draftGuardar, draftCargar, draftBorrar (alrededor de línea 3593):**
```
const DRAFT_KEY = (pacId, catId) => 'hc_draft_' + pacId + '_' + catId;

function draftGuardar(pacId, catId) {
  try {
    var datos = typeof recogerDatosFormulario === 'function' ? recogerDatosFormulario() : null;
    if (!datos) return;
    localStorage.setItem(DRAFT_KEY(pacId, catId), JSON.stringify({ ts: Date.now(), datos: datos }));
  } catch(e) {}
}
function draftCargar(pacId, catId) {
  try {
    var raw = localStorage.getItem(DRAFT_KEY(pacId, catId));
    if (!raw) return null;
    var d = JSON.parse(raw);
    if (Date.now() - d.ts > 86400000) { localStorage.removeItem(DRAFT_KEY(pacId, catId)); return null; }
    return d.datos;
  } catch(e) { return null; }
}
function draftBorrar(pacId, catId) {
  try { localStorage.removeItem(DRAFT_KEY(pacId, catId)); } catch(e) {}
}
```

- [ ] **Step 4: Verificar build**

```powershell
cd D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar
npm run build 2>&1
```

Esperado: sin errores.

- [ ] **Step 5: Verificar que los 3 módulos son servidos**

```powershell
$job = Start-Job -ScriptBlock { Set-Location "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar"; npx vite --port 5173 }
Start-Sleep -Seconds 8
@('utils','api','session') | ForEach-Object {
  $s=(Invoke-WebRequest -Uri "http://localhost:5173/src/shared/$_.js" -UseBasicParsing -TimeoutSec 10).StatusCode
  Write-Host "$_.js: $s"
}
Stop-Job $job; Remove-Job $job
```

Esperado: los 3 devuelven HTTP 200.

- [ ] **Step 6: Commit final de Fase 2**

```powershell
cd D:\projectoshtmls\CENTYRGC\CENTYRGC
git add migrar/src/shared/session.js migrar/hc.html
git commit -m "refactor: extraer session.js desde hc.html (SK, TTL, sesión, timer, borradores)"
```

---

## Criterios de éxito de Fase 2

- [ ] `migrar/src/shared/utils.js` existe con g, esc, e2, toast, overlay, delay, formatFecha, edad
- [ ] `migrar/src/shared/api.js` existe con HC_URL, caché, apiGet, apiPost
- [ ] `migrar/src/shared/session.js` existe con SK, TTL, session, timer, draft
- [ ] `migrar/hc.html` tiene los 3 `<script src>` en orden antes del bloque principal
- [ ] Las funciones extraídas NO aparecen duplicadas en el `<script>` inline de hc.html
- [ ] `npm run build` termina sin errores tras cada tarea
- [ ] 3 commits separados, uno por módulo

## Nota de verificación manual

Después de completar las 3 tareas, abrir `http://localhost:5173/hc.html` en el navegador, abrir DevTools → Console y verificar que no haya errores de tipo `X is not defined`. El login real con el sistema GAS confirma que todo funciona end-to-end.

## Siguiente fase

Fase 3 cubrirá la extracción de los módulos específicos de HC: `hc/sello.js` y `hc/widget-postural.js`. El plan se escribirá por separado.
