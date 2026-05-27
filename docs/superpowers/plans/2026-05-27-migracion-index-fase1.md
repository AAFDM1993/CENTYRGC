# Migración index.html — Fase 1: core.js + api.js + session.js

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extraer la capa base del inline script de `migrar/index.html` (utilidades, API, sesión) a tres archivos JS separados en `migrar/src/index/`, reduciendo el inline script en ~108 líneas.

**Architecture:** Mismo patrón que la migración de hc.html — plain `<script src>` sin type="module", scope global compartido. Los tres archivos se cargan antes del inline script. `shared/utils.js` NO se carga en index.html por incompatibilidad de `const` (ver spec). Las variables de estado globales (`session`, `alumnos`, etc.) se declaran en `session.js` y son accesibles por todos los scripts posteriores.

**Tech Stack:** HTML5, JavaScript ES2020, Vite 5.x (build tool, carpeta `migrar/`). PowerShell para extracción de líneas.

**Spec:** `docs/superpowers/specs/2026-05-27-migracion-index-html-design.md`

---

## Contexto del archivo

`migrar/index.html` tiene 6025 líneas. El inline script empieza en la línea 1480 (`<script>`) y termina en la línea 6023 (`}</script>`). En esta fase extraemos las líneas 1481–1588:

```
1481  // ==========================
1482  // ====================================================
1483  // PEGA AQUI TU URL DE APPS SCRIPT WEB APP
1484  const GAS_URL = '...'
...
1506  let session=null,alumnos=[],...
1507  let cursos=...
1508  const APRO=...
1509  const g=...
...
1516  function toast(...)
1517  (blank)
1518  async function apiGet(...)
...
1531  }
1532  (blank)
1533  // ── CACHE DE LECTURAS ──
...
1565  }
1566  (blank)
1567  const SESSION_KEY=...
...
1588  }       ← cierra clearSession
1589  (blank)
1590  window.onload=function(){...   ← se queda en inline
```

Después de esta fase, el inline script empieza con `window.onload`.

---

## Mapa de archivos

| Acción | Archivo | Responsabilidad |
|--------|---------|-----------------|
| Crear | `migrar/src/index/core.js` | GAS_URL, confirmDialog, g, vi, esc, esc2, APRO, showLoader, hideLoader, _tt, toast |
| Crear | `migrar/src/index/api.js` | apiGet, apiPost, cache (_cache, _CACHE_TTL, apiGetCached, invalidateCache) |
| Crear | `migrar/src/index/session.js` | Estado global (session, alumnos, saveTimers, drawerIdx, hojaActiva, hojaData, cursos) + SESSION_KEY, SESSION_TTL, saveSession, loadSession, clearSession |
| Modificar | `migrar/index.html` | Agregar 3 `<script src>`, eliminar líneas 1481–1588 del inline |

---

## Task 1: Crear `migrar/src/index/core.js`

**Files:**
- Create: `migrar/src/index/core.js`

- [ ] **Step 1: Crear la carpeta y el archivo**

```powershell
New-Item -ItemType Directory -Force 'migrar\src\index'
```

- [ ] **Step 2: Escribir `migrar/src/index/core.js` con el contenido exacto**

```js
// ── Utilidades base de index.html ──────────────────────────────────────────
// GAS_URL: URL de Google Apps Script para index.html (gestión académica)
// IMPORTANTE: este archivo es específico de index.html; hc.html usa api.js con HC_URL
const GAS_URL = 'https://script.google.com/macros/s/AKfycbz_5ux4CU4JVIuE24eidR5M3tWOU3veMXlnbi06_hLBVil7DyVYjI5jrazr-NgpxtiKtg/exec';

// ── Modal confirm (reemplaza window.confirm para evitar supresión del navegador) ──
function confirmDialog(msg){
  return new Promise(function(resolve){
    var ov=document.getElementById('confirmOverlay');
    document.getElementById('confirmMsg').textContent=msg;
    ov.style.display='flex';
    function cleanup(val){
      ov.style.display='none';
      document.getElementById('confirmYes').removeEventListener('click',onYes);
      document.getElementById('confirmNo').removeEventListener('click',onNo);
      resolve(val);
    }
    function onYes(){cleanup(true);}
    function onNo(){cleanup(false);}
    document.getElementById('confirmYes').addEventListener('click',onYes);
    document.getElementById('confirmNo').addEventListener('click',onNo);
  });
}

const APRO=()=>+(document.getElementById('scApro')||{}).value||11;
const g=s=>document.getElementById(s);
const vi=s=>(g(s)||{}).value||'';
const esc=s=>String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;');
const esc2=s=>String(s).replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function showLoader(m){g('lmsg').textContent=m;g('loader').classList.add('show')}
function hideLoader(){g('loader').classList.remove('show')}
let _tt;
function toast(t,m,tp){const el=g('toast');g('ttt').textContent=t;g('ttm').textContent=m||'';el.className='show '+(tp||'');clearTimeout(_tt);_tt=setTimeout(()=>{el.className=tp||''},3800)}
```

- [ ] **Step 3: Verificar que el archivo existe y tiene exactamente esas funciones**

```powershell
Select-String -Path 'migrar\src\index\core.js' -Pattern 'function (confirmDialog|toast|showLoader|hideLoader)' | Select-Object LineNumber, Line
```

Expected: 4 líneas, una por cada función.

---

## Task 2: Crear `migrar/src/index/api.js`

**Files:**
- Create: `migrar/src/index/api.js`

- [ ] **Step 1: Escribir `migrar/src/index/api.js`**

Depende de: `GAS_URL` (definida en core.js), `session` y `saveSession` (definidas en session.js). Estas referencias son seguras porque los scripts se cargan en orden y las funciones solo se invocan durante interacción del usuario.

```js
// ── Capa API: fetch hacia GAS + cache en memoria ─────────────────────────
// Depende de: GAS_URL (core.js), session y saveSession (session.js)

async function apiGet(action,params){
  const p=Object.assign({action},params||{});
  if(session&&session.token)p.token=session.token;
  const r=await fetch(GAS_URL+'?'+new URLSearchParams(p));
  if(!r.ok)throw new Error('HTTP '+r.status);
  if(session)saveSession(session); // renovar timestamp al hacer actividad
  return r.json();
}
async function apiPost(body){
  if(session&&session.token)body.token=session.token;
  const r=await fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(body)});
  if(!r.ok)throw new Error('HTTP '+r.status);
  return r.json();
}

// ── Cache de lecturas ─────────────────────────────────────────────────────
// Evita llamadas repetidas a GAS para datos que no cambian frecuentemente.
// TTLs: usuarios/hojas/config = 5-10 min, reservas/casilleros = 1 min
const _cache = {};
const _CACHE_TTL = {
  listarUsuarios:    5*60*1000,
  listarHojas:       5*60*1000,
  leerConfig:       10*60*1000,
  leerBranding:     10*60*1000,
  leerRecordInfo:    5*60*1000,
  listarCursosTodos: 5*60*1000,
  leerRecordsCursos: 5*60*1000,
  misNotas:          5*60*1000,
  leerHoja:          2*60*1000,
  leerReservas:         60*1000,
  leerBloqueos:         60*1000,
  listarCasilleros:     60*1000,
  leerLogCasilleros:    60*1000,
  leerLog:              60*1000,
};
function _cacheKey(action,params){return action+'|'+JSON.stringify(params||{});}
async function apiGetCached(action,params){
  const key=_cacheKey(action,params);
  const ttl=_CACHE_TTL[action]||0;
  if(ttl&&_cache[key]&&(Date.now()-_cache[key].ts<ttl))return _cache[key].data;
  const data=await apiGet(action,params);
  if(ttl)_cache[key]={data,ts:Date.now()};
  return data;
}
function invalidateCache(action){
  // Borra todas las entradas de cache que empiecen con esa action
  Object.keys(_cache).forEach(k=>{if(k.startsWith(action+'|'))delete _cache[k];});
}
```

- [ ] **Step 2: Verificar funciones exportadas**

```powershell
Select-String -Path 'migrar\src\index\api.js' -Pattern 'async function apiGet|async function apiPost|async function apiGetCached|function invalidateCache' | Select-Object LineNumber
```

Expected: 4 líneas.

---

## Task 3: Crear `migrar/src/index/session.js`

**Files:**
- Create: `migrar/src/index/session.js`

- [ ] **Step 1: Escribir `migrar/src/index/session.js`**

Nota: `let session=null,alumnos=[],...` está actualmente en la línea 1506 del inline script, intercalada con las utilities. Se extrae aquí (en session.js) junto con las funciones de sesión.

```js
// ── Estado global de la aplicación ───────────────────────────────────────
// Estas variables son declaradas aquí y usadas por todos los scripts posteriores.
// session: datos del usuario autenticado (null = no autenticado)
// alumnos: lista de alumnos del generador de planillas
// saveTimers: timers de auto-guardado por alumno (objeto indexado por nombre)
// drawerIdx: índice del alumno actualmente en el drawer (-1 = ninguno)
// hojaActiva: nombre de la hoja de notas activa
// hojaData:  datos de la hoja activa (objeto con alumnos y config)
// cursos: configuración de cursos, persistida en localStorage
let session=null,alumnos=[],saveTimers={},drawerIdx=-1,hojaActiva=null,hojaData=null;
let cursos=JSON.parse(localStorage.getItem('ft_cursos_v6')||'[]');

// ── Gestión de sesión (localStorage) ─────────────────────────────────────
const SESSION_KEY='ft_session_v2';
const SESSION_TTL=6*60*60*1000; // 6 horas en ms

function saveSession(data){
  const payload={data:data,ts:Date.now()};
  localStorage.setItem(SESSION_KEY,JSON.stringify(payload));
}
function loadSession(){
  try{
    const raw=localStorage.getItem(SESSION_KEY);
    if(!raw)return null;
    const payload=JSON.parse(raw);
    if(Date.now()-payload.ts>SESSION_TTL){
      localStorage.removeItem(SESSION_KEY);return null;
    }
    return payload.data;
  }catch(e){return null;}
}
function clearSession(){
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem('ft_session'); // limpiar legacy
}
```

- [ ] **Step 2: Verificar**

```powershell
Select-String -Path 'migrar\src\index\session.js' -Pattern 'let session=|function saveSession|function loadSession|function clearSession' | Select-Object LineNumber
```

Expected: 4 líneas.

---

## Task 4: Agregar `<script src>` a `migrar/index.html`

**Files:**
- Modify: `migrar/index.html`

Los tres scripts se cargan en este orden: **core.js → session.js → api.js**, antes del inline `<script>`. Este orden es importante: `api.js` referencia `session` y `saveSession` definidos en `session.js`, por lo que `session.js` debe cargarse primero.

- [ ] **Step 1: Verificar la línea actual de `<script>` (inline)**

```powershell
(Select-String -Path 'migrar\index.html' -Pattern '^<script>$').LineNumber
```

Expected: 1480 (si aún no se modificó el archivo). Anotar el número para referencia.

- [ ] **Step 2: Editar `migrar/index.html` para insertar los tres tags**

Buscar y reemplazar en el archivo. El bloque a encontrar es (línea 1479-1480):

```
</div>

<script>
```

Reemplazar con:

```
</div>

<script src="src/index/core.js"></script>
<script src="src/index/session.js"></script>
<script src="src/index/api.js"></script>
<script>
```

> **Nota de implementación:** Usar el Edit tool con old_string = `\n\n<script>` al final de `</div>` (justo antes del inline script). Verificar que el old_string sea único en el archivo antes de editar.

- [ ] **Step 3: Verificar que los tres tags quedaron antes del inline script**

```powershell
$lines = Get-Content 'migrar\index.html'
$lines[1479..1487]
```

Expected output:
```
</div>

<script src="src/index/core.js"></script>
<script src="src/index/session.js"></script>
<script src="src/index/api.js"></script>
<script>
// ==========================
// ====================================================
// PEGA AQUI TU URL DE APPS SCRIPT WEB APP
```

---

## Task 5: Eliminar líneas extraídas del inline script

**Files:**
- Modify: `migrar/index.html`

Ahora que los scripts están en archivos separados, se eliminan esas líneas del inline script. El bloque a eliminar es desde el inicio del inline script (la primera línea después de `<script>`) hasta el cierre de `clearSession`, dejando el `window.onload` como primera instrucción.

- [ ] **Step 1: Verificar las líneas de referencia**

```powershell
$lines = Get-Content 'migrar\index.html'
$gasLine = ($lines | Select-String -SimpleMatch 'const GAS_URL =' | Select-Object -First 1).LineNumber
$windowLoad = ($lines | Select-String -SimpleMatch 'window.onload=function()' | Select-Object -First 1).LineNumber
Write-Host "GAS_URL en linea: $gasLine"
Write-Host "window.onload en linea: $windowLoad"
```

Expected: GAS_URL ~1487, window.onload ~1593 (3 líneas más que el original, por los script tags insertados).

- [ ] **Step 2: Eliminar el bloque de la capa base del inline script**

```powershell
$lines = Get-Content 'migrar\index.html'

# Encontrar el tag <script> del inline (sin src=)
$inlineScriptLine = ($lines | Select-String -Pattern '^<script>$' | Select-Object -Last 1).LineNumber - 1  # 0-indexed

# Encontrar window.onload (primera línea a conservar del inline)
$windowLoadLine = ($lines | Select-String -SimpleMatch 'window.onload=function()' | Select-Object -First 1).LineNumber - 1  # 0-indexed

Write-Host "Inline <script> en indice: $inlineScriptLine"
Write-Host "window.onload en indice: $windowLoadLine"

# Construir resultado: todo hasta <script> (inclusive) + blank + window.onload hasta el fin
# La línea antes de window.onload debería ser un blank line — la incluimos
$result = $lines[0..$inlineScriptLine] + $lines[($windowLoadLine-1)..($lines.Length-1)]
$result | Set-Content 'migrar\index.html' -Encoding UTF8
Write-Host "Hecho. Líneas en archivo: $($result.Length)"
```

Expected: archivo pasa de 6025 a ~5920 líneas (se eliminaron ~108 líneas de la capa base, más las 3 de script tags ya añadidas).

- [ ] **Step 3: Verificar resultado**

```powershell
$lines = Get-Content 'migrar\index.html'
# Mostrar las líneas alrededor del inline script (debería empezar con window.onload)
$sLine = ($lines | Select-String -Pattern '^<script>$' | Select-Object -Last 1).LineNumber - 1
$lines[$sLine..($sLine+5)]
```

Expected:
```
<script>

window.onload=function(){
  // Migrar sesión legacy de sessionStorage si existe
  const legacy=sessionStorage.getItem('ft_session');
```

- [ ] **Step 4: Verificar que el inline script NO contiene las funciones extraídas**

```powershell
# Estos deben aparecer SOLO en sus archivos respectivos, no en index.html
$checks = @('const GAS_URL', 'function confirmDialog', 'const SESSION_KEY', 'function saveSession', 'async function apiGet', 'async function apiGetCached')
foreach($c in $checks){
  $hits = Select-String -Path 'migrar\index.html' -SimpleMatch $c
  if($hits){ Write-Host "WARN: '$c' sigue en index.html" } else { Write-Host "OK: '$c' eliminado de index.html" }
}
```

Expected: 6 líneas de "OK: ...". Si alguna aparece como WARN, revisar el paso de eliminación.

---

## Task 6: Verificar build

**Files:** ninguno (solo ejecución)

- [ ] **Step 1: Ejecutar build**

```powershell
Set-Location migrar
npm run build
```

Expected: build termina sin errores. Si hay errores de "undefined" en build time, son falsos positivos de Vite analizando el bundle — el código funciona en runtime porque los scripts globales se cargan en orden.

- [ ] **Step 2: Verificar dev server**

```powershell
npm run dev
```

Abrir en navegador: `http://localhost:5173/`. La página de login debe cargar visualmente igual que antes. Verificar en consola del navegador que no hay errores de JavaScript.

- [ ] **Step 3: Verificar que `GAS_URL` es accesible**

En la consola del navegador (DevTools):
```js
typeof GAS_URL  // debe devolver "string"
typeof apiGet   // debe devolver "function"
typeof saveSession  // debe devolver "function"
typeof session  // debe devolver "object" (null)
```

Expected: `"string"`, `"function"`, `"function"`, `"object"`.

- [ ] **Step 4: Cerrar dev server** (`Ctrl+C`)

---

## Task 7: Commit

- [ ] **Step 1: Verificar cambios**

```powershell
Set-Location ..
git status
git diff --stat
```

Expected: 3 archivos nuevos en `migrar/src/index/`, y `migrar/index.html` modificado.

- [ ] **Step 2: Commit**

```powershell
git add migrar/src/index/core.js migrar/src/index/api.js migrar/src/index/session.js migrar/index.html
git commit -m "refactor: extraer core.js + api.js + session.js desde index.html (base layer)"
```

---

## Checklist de verificación final

Antes de marcar la fase como completa:

- [ ] `migrar/src/index/core.js` existe y contiene `GAS_URL`, `confirmDialog`, `g`, `esc`, `esc2`, `toast`, `showLoader`, `hideLoader`
- [ ] `migrar/src/index/api.js` existe y contiene `apiGet`, `apiPost`, `apiGetCached`, `invalidateCache`, `_CACHE_TTL`
- [ ] `migrar/src/index/session.js` existe y contiene `session`, `alumnos`, `SESSION_KEY`, `saveSession`, `loadSession`, `clearSession`
- [ ] `migrar/index.html` carga los 3 scripts en orden `core.js → session.js → api.js` antes del inline `<script>`
- [ ] El inline script de `migrar/index.html` empieza con `window.onload` (no con `const GAS_URL`)
- [ ] `npm run build` pasa sin errores
- [ ] La página de login carga correctamente en dev server
- [ ] Commit realizado

---

## Notas para fases siguientes

Después de esta fase, el inline script empieza en `window.onload=function(){...}` (línea ~1481). Las fases siguientes extraerán:

- **Fase 2:** `alumnos.js` — startApp, doLogin, logout, makeAlumno, renderAlumnos, renderCursos, loadCSV, cargarUsuarios, renderPreview, buscarAlumnoGlobal, generarPlanilla y funciones relacionadas (~760 líneas, aproximadamente líneas 1481–2240 tras esta fase)
- **Fase 3:** `notas.js` — loadHojas, renderHojaList, renderAlBlock y helpers (~290 líneas)
- **Fase 4:** `exportar.js` + `config-index.js` + `log.js` — export, config del sistema, log de actividad (~600 líneas)
- **Fase 5:** `agenda.js` — sistema de agenda/calendario (~1345 líneas)
- **Fase 6:** `admin.js` + `vistas.js` + `casilleros.js` — panel admin, vistas de estudiante/recepción, casilleros (~900 líneas)
- **Fase 7:** inline script → vacío
