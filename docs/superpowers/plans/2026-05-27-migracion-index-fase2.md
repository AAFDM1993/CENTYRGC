# Migración index.html — Fase 2: alumnos.js

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extraer las funciones de bootstrap de app + gestión de alumnos y cursos del inline script de `migrar/index.html` al archivo `migrar/src/index/alumnos.js`, reduciendo el inline script en ~760 líneas.

**Architecture:** Mismo patrón que Fase 1 — plain `<script src>` sin type="module", scope global. `alumnos.js` se carga como el cuarto script antes del inline. Las funciones extraídas referencian globales de otros scripts (declarados en core.js, session.js, api.js) dentro de sus cuerpos — esto es correcto y funciona en runtime.

**Tech Stack:** HTML5, JavaScript ES2020, Vite 5.x. PowerShell para extracción de líneas.

**Spec:** `docs/superpowers/specs/2026-05-27-migracion-index-html-design.md`

**Prerequisito:** Fase 1 completada (commit d0f90c3). `migrar/src/index/core.js`, `api.js`, `session.js` ya existen.

---

## Contexto del archivo

Después de Fase 1, `migrar/index.html` tiene 5920 líneas. El inline script empieza en línea 1483 (`<script>`) y su primer contenido es:

```
1483  <script>
1484  (blank)
1485  window.onload=function(){
...
2243  }   ← cierre de generarPlanilla
2244  (blank)
2245  async function loadHojas(){   ← EMPIEZA FASE 3
```

Esta fase extrae líneas **1485–2243** (759 líneas).

## Funciones incluidas en alumnos.js

| Función | Línea actual | Descripción |
|---------|-------------|-------------|
| `window.onload` | 1485 | Bootstrap: carga sesión guardada |
| `window.addEventListener('resize',...)` | 1494 | Adaptación responsive |
| `doLogin` | 1507 | Login con GAS |
| `lgErr` | 1523 | Mostrar error de login |
| `logout` | 1524 | Cierre de sesión |
| `startApp` | 1529 | Inicializa app según rol |
| `pingConn` / `setConn` | 1544/1548 | Verificación de conectividad |
| `iniciarVistaAdmin` | 1555 | Inicializa panel admin/docente |
| `showTab` | 1581 | Cambio de tab en panel admin |
| `openDrawer` / `closeDrawer` | 1589/1595 | Drawer de alumno |
| `renderDrawerChecks` | 1596 | Render de checks de cursos en drawer |
| `toggleDrawerCurso` / `updBadge` | 1606/1610 | Toggle curso en drawer + badge |
| `makeAlumno` | 1616 | Factory de objeto alumno |
| `toggleGenSection` / `initGenSections` | 1619/1634 | Secciones colapsables del panel |
| `loadCSV` / `loadCSVMulti` | 1643/1645 | Importar CSV de alumnos |
| `parsearLineaCSV_` | 1677 | Parser de línea CSV |
| `importarFilas_` | 1712 | Importar filas a lista de alumnos |
| `addAlumno` | 1746 | Agregar alumno manualmente |
| `remAlumno` / `clearAlumnos` | 1755/1756 | Eliminar alumno(s) |
| `renderAlumnos` | 1757 | Render de lista de alumnos |
| `renderCursos` | 1796 | Render de lista de cursos |
| `renderSgrCard` | 1809 | Render de tarjeta de subgrupo |
| `toggleCurso` / `toggleCursoExpand` | 1842/1843 | Toggle curso on/off y expandido |
| `addCurso` / `delCurso` | 1844/1854 | CRUD de cursos |
| `addSubgrupo` / `delSubgrupo` | 1855/1856 | CRUD de subgrupos |
| `renderSgrList` / `updateSgrNombre` | 1857/1858 | Helpers de subgrupos |
| `changeSgr` / `setSgrVal` / `setSgrValBase` / `setSgrValTotal` | 1859–1890 | Setters de valores de subgrupo |
| `guardarCursos` / `resetCursos` | 1891/1892 | Persistencia de cursos en localStorage |
| `cargarUsuarios` | 1894 | Cargar usuarios desde GAS |
| `editarUsuario` | 1906 | Pre-llenar form de edición de usuario |
| `guardarUsuarioDB` / `mostrarGradoAcademico` | 1937/1959 | Guardar usuario + UI de grado |
| `eliminarUsuarioDB` | 1969 | Eliminar usuario desde GAS |
| `_importPlanillasData` (let) | 1979 | Estado de importación desde planillas |
| `buscarAlumnoGlobal` | 1981 | Búsqueda de alumno en todas las hojas |
| `importarDesdePlanillas` | 2101 | Importar alumnos desde planillas GAS |
| `seleccionarTodosImport` | 2165 | Seleccionar todos en modal de importación |
| `confirmarImportPlanillas` | 2172 | Confirmar importación desde planillas |
| `importarDesdeAlumnos` | 2194 | Importar desde hoja de alumnos GAS |
| `renderPreview` | 2209 | Preview de planilla a generar |
| `generarPlanilla` | 2229 | Generar planilla en GAS |

**Nota de dependencias:** `startApp` llama a `iniciarVistaEstudiante` y `iniciarVistaRecepcion` — esas funciones estarán en el inline script hasta fases posteriores. Esto es seguro porque se resuelven en runtime.

## Mapa de archivos

| Acción | Archivo |
|--------|---------|
| Crear | `migrar/src/index/alumnos.js` |
| Modificar | `migrar/index.html` (agregar 1 script tag, eliminar líneas 1485–2243) |

---

## Task 1: Crear `migrar/src/index/alumnos.js`

**Files:**
- Create: `migrar/src/index/alumnos.js`

- [ ] **Step 1: Extraer líneas 1485–2243 de `migrar/index.html` a `alumnos.js`**

```powershell
$lines = Get-Content 'migrar\index.html'

# Verificar líneas de referencia antes de extraer
$startL = ($lines | Select-String -SimpleMatch 'window.onload=function()' | Select-Object -First 1).LineNumber
$endL   = ($lines | Select-String -SimpleMatch 'async function loadHojas()' | Select-Object -First 1).LineNumber - 2
Write-Host "Extraer desde linea $startL hasta $endL (inclusive)"
# Expected: desde ~1485 hasta ~2243
```

- [ ] **Step 2: Crear el archivo con cabecera + contenido extraído**

```powershell
$lines = Get-Content 'migrar\index.html'
$startIdx = ($lines | Select-String -SimpleMatch 'window.onload=function()' | Select-Object -First 1).LineNumber - 1  # 0-indexed
$nextIdx  = ($lines | Select-String -SimpleMatch 'async function loadHojas()' | Select-Object -First 1).LineNumber - 1  # 0-indexed
$endIdx   = $nextIdx - 2  # excluir blank line antes de loadHojas

$header = @(
  '// ── alumnos.js: bootstrap de app + gestión de alumnos y cursos ──────────────',
  '// Depende de: core.js (g, vi, esc, esc2, toast, showLoader, hideLoader, confirmDialog)',
  '//             session.js (session, alumnos, cursos, drawerIdx, hojaActiva, hojaData,',
  '//                         saveTimers, saveSession, loadSession, clearSession)',
  '//             api.js (apiGet, apiPost, apiGetCached, invalidateCache)',
  '// Carga siguiente: notas.js (loadHojas, renderAlBlock, etc.)',
  ''
)
$body = $lines[$startIdx..$endIdx]
($header + $body) | Set-Content 'migrar\src\index\alumnos.js' -Encoding UTF8
Write-Host "alumnos.js creado con $($body.Length) lineas de contenido + $($header.Length) de cabecera"
```

Expected: `alumnos.js creado con 759 lineas de contenido + 7 de cabecera` (aproximado).

- [ ] **Step 3: Verificar funciones clave en alumnos.js**

```powershell
$checks = @(
  'window.onload=function()',
  'async function doLogin',
  'function logout',
  'function startApp',
  'function iniciarVistaAdmin',
  'function makeAlumno',
  'function renderAlumnos',
  'function renderCursos',
  'function renderSgrCard',
  'async function cargarUsuarios',
  'async function buscarAlumnoGlobal',
  'function renderPreview',
  'async function generarPlanilla'
)
foreach($c in $checks){
  $h = Select-String -Path 'migrar\src\index\alumnos.js' -SimpleMatch $c
  if($h){ Write-Host "OK [$($h.LineNumber)]: $c" }
  else   { Write-Host "FAIL: no encontrado: $c" }
}
```

Expected: 13 líneas de "OK".

---

## Task 2: Agregar `<script src="src/index/alumnos.js">` a `migrar/index.html`

**Files:**
- Modify: `migrar/index.html`

El tag de alumnos.js va en 4.º lugar, después de `api.js` y antes del inline `<script>`.

- [ ] **Step 1: Verificar el load order actual**

```powershell
$lines = Get-Content 'migrar\index.html'
$inlineIdx = ($lines | Select-String -Pattern '^<script>$' | Select-Object -Last 1).LineNumber - 1
$lines[($inlineIdx-5)..($inlineIdx)]
```

Expected:
```
<script src="src/index/core.js"></script>
<script src="src/index/session.js"></script>
<script src="src/index/api.js"></script>
<script>
```

- [ ] **Step 2: Insertar el tag de alumnos.js**

Usar el Edit tool. Buscar y reemplazar:

Old string (las últimas 2 líneas antes del inline script):
```
<script src="src/index/api.js"></script>
<script>
```

New string:
```
<script src="src/index/api.js"></script>
<script src="src/index/alumnos.js"></script>
<script>
```

- [ ] **Step 3: Verificar load order final**

```powershell
$lines = Get-Content 'migrar\index.html'
$inlineIdx = ($lines | Select-String -Pattern '^<script>$' | Select-Object -Last 1).LineNumber - 1
$lines[($inlineIdx-6)..($inlineIdx)]
```

Expected:
```
<script src="src/index/core.js"></script>
<script src="src/index/session.js"></script>
<script src="src/index/api.js"></script>
<script src="src/index/alumnos.js"></script>
<script>
```

---

## Task 3: Eliminar líneas extraídas del inline script

**Files:**
- Modify: `migrar/index.html`

Eliminar las líneas de `window.onload` hasta el final de `generarPlanilla` (inclusive la blank line después). El inline script quedará empezando con `async function loadHojas()`.

- [ ] **Step 1: Verificar líneas de referencia**

```powershell
$lines = Get-Content 'migrar\index.html'
$inlineScriptIdx = ($lines | Select-String -Pattern '^<script>$' | Select-Object -Last 1).LineNumber - 1  # 0-indexed
$windowOnloadIdx = ($lines | Select-String -SimpleMatch 'window.onload=function()' | Select-Object -First 1).LineNumber - 1  # 0-indexed
$loadHojasIdx    = ($lines | Select-String -SimpleMatch 'async function loadHojas()' | Select-Object -First 1).LineNumber - 1  # 0-indexed

Write-Host "inline <script> idx (0-based): $inlineScriptIdx"
Write-Host "window.onload idx (0-based): $windowOnloadIdx"
Write-Host "loadHojas idx (0-based): $loadHojasIdx"
```

Expected: inlineScriptIdx ~1483, windowOnloadIdx ~1485, loadHojasIdx ~2245 (todos 0-indexed, es decir 1-indexed+1).

- [ ] **Step 2: Eliminar el bloque**

```powershell
$lines = Get-Content 'migrar\index.html'
$inlineScriptIdx = ($lines | Select-String -Pattern '^<script>$' | Select-Object -Last 1).LineNumber - 1
$loadHojasIdx    = ($lines | Select-String -SimpleMatch 'async function loadHojas()' | Select-Object -First 1).LineNumber - 1

# Conservar: todo hasta inline <script> + blank line inmediata = $inlineScriptIdx+1
# Luego saltar a loadHojas sin blank line previa (ya hay una en el bloque que precede al script)
$result = $lines[0..($inlineScriptIdx+1)] + $lines[$loadHojasIdx..($lines.Length-1)]
$result | Set-Content 'migrar\index.html' -Encoding UTF8
Write-Host "Hecho. Lineas en archivo: $($result.Length)"
```

Expected: ~5161 líneas (5920 - 760 líneas eliminadas del inline + 1 script tag agregado = 5161).

- [ ] **Step 3: Verificar inicio del inline script**

```powershell
$lines = Get-Content 'migrar\index.html'
$inlineIdx = ($lines | Select-String -Pattern '^<script>$' | Select-Object -Last 1).LineNumber - 1
$lines[$inlineIdx..($inlineIdx+4)]
```

Expected:
```
<script>
(blank)
async function loadHojas(){
  // Filtrar hojas del sistema
  var HOJAS_SIS=...
```

- [ ] **Step 4: Verificar que window.onload NO está en el inline**

```powershell
$removed = @('window.onload=function()', 'async function doLogin', 'function startApp', 'async function generarPlanilla')
foreach($c in $removed){
  $hits = Select-String -Path 'migrar\index.html' -SimpleMatch $c
  if($hits){ Write-Host "WARN: '$c' sigue en index.html en linea $($hits.LineNumber)" }
  else      { Write-Host "OK: '$c' no esta en el inline de index.html" }
}
```

Expected: 4 líneas de "OK".

- [ ] **Step 5: Verificar que loadHojas SÍ está (es la primera función del inline)**

```powershell
$lines = Get-Content 'migrar\index.html'
$lh = ($lines | Select-String -SimpleMatch 'async function loadHojas()' | Select-Object -First 1)
Write-Host "loadHojas en linea: $($lh.LineNumber)"
```

Expected: loadHojas en línea ~1487 (justo después del inline `<script>` + blank).

---

## Task 4: Verificar build

- [ ] **Step 1: Build**

```powershell
Set-Location 'D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar'
npm run build 2>&1
```

Expected: build termina sin errores. Posibles advertencias de Vite sobre variables globales no resueltas — son esperadas y no son errores.

- [ ] **Step 2: Verificar tamaño del bundle**

El bundle de `dist/index.html` debería ser similar o ligeramente mayor al de Fase 1 (alumnos.js agrega código al bundle). Si el tamaño cae significativamente o el build falla, revisar que alumnos.js fue creado correctamente.

---

## Task 5: Commit

- [ ] **Step 1: Verificar cambios**

```powershell
Set-Location 'D:\projectoshtmls\CENTYRGC\CENTYRGC'
git status
git diff --stat
```

Expected: 1 archivo nuevo (`migrar/src/index/alumnos.js`) y `migrar/index.html` modificado.

- [ ] **Step 2: Commit**

```powershell
git add migrar/src/index/alumnos.js migrar/index.html
git commit -m "refactor: extraer alumnos.js desde index.html (bootstrap + gestión de alumnos y cursos)"
```

---

## Checklist de verificación final

- [ ] `migrar/src/index/alumnos.js` existe con cabecera descriptiva y ~759 líneas de contenido
- [ ] `window.onload`, `startApp`, `doLogin`, `logout`, `renderAlumnos`, `renderCursos`, `generarPlanilla` están en alumnos.js
- [ ] `migrar/index.html` carga los 4 scripts en orden: `core.js → session.js → api.js → alumnos.js`
- [ ] El inline script de `migrar/index.html` empieza con `async function loadHojas()`
- [ ] `npm run build` pasa sin errores
- [ ] Commit realizado

---

## Notas para fases siguientes

Después de esta fase, el inline script empieza con `async function loadHojas()` (línea ~1487). Las fases siguientes:

- **Fase 3:** `notas.js` — loadHojas, renderHojaList, renderEditor, renderAlBlock y helpers de notas (~330 líneas, desde `loadHojas` hasta el inicio de `iniciarVistaEstudiante`)
- **Fase 4:** `exportar.js` + `config-index.js` + `log.js` — export PDF, configuración del sistema, log (~600 líneas)
- **Fase 5:** `agenda.js` — sistema de agenda/calendario completo (~1345 líneas)
- **Fase 6:** `admin.js` + `vistas.js` + `casilleros.js` — panel admin, vistas estudiante/recepción, casilleros (~900 líneas)
- **Fase 7:** inline script → vacío
