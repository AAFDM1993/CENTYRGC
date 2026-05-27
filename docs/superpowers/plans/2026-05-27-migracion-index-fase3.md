# Migración index.html — Fase 3: notas.js

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extraer el editor de notas/hojas del inline script de `migrar/index.html` al archivo `migrar/src/index/notas.js`, reduciendo el inline script en ~287 líneas.

**Architecture:** Mismo patrón — plain `<script src>` sin type="module", scope global. `notas.js` se carga como el 5.º script antes del inline.

**Spec:** `docs/superpowers/specs/2026-05-27-migracion-index-html-design.md`

**Prerequisito:** Fases 1 y 2 completadas (commit 8f84c3a). El inline script actualmente empieza con `async function loadHojas()` en línea ~1486.

---

## Contexto del archivo

Después de Fase 2, `migrar/index.html` tiene 5161 líneas. El inline script empieza en línea ~1484 (`<script>`) y su primer contenido es:

```
1484  <script>
1485  (blank)
1486  async function loadHojas(){     ← EMPIEZA FASE 3
...
1772  }                               ← cierre de saveNota
1773  async function iniciarVistaEstudiante(){  ← EMPIEZA FASE 4
```

Esta fase extrae líneas **1486–1772** (287 líneas).

## Funciones incluidas en notas.js

| Función | Línea actual | Descripción |
|---------|-------------|-------------|
| `loadHojas` | 1486 | Cargar lista de hojas desde GAS |
| `delHoja` | 1508 | Eliminar hoja |
| `abrirHoja` | 1518 | Abrir hoja y cargar datos en editor |
| `renderEditor` | 1544 | Render del editor de notas |
| `renderAlBlock` | 1562 | Render de bloque de notas por alumno |
| `aplicarFiltro` | 1632 | Filtro de búsqueda en editor |
| `saveNombrePac` | 1638 | Guardar nombre de paciente inline |
| `toggleMejoriaManual` | 1652 | Toggle de mejoría manual |
| `saveNota` | 1665 | Guardar nota con debounce (función más larga, ~107 líneas) |

## Mapa de archivos

| Acción | Archivo |
|--------|---------|
| Crear | `migrar/src/index/notas.js` |
| Modificar | `migrar/index.html` (agregar 1 script tag, eliminar líneas 1486–1772) |

---

## Task 1: Crear `migrar/src/index/notas.js`

**Files:**
- Create: `migrar/src/index/notas.js`

- [ ] **Step 1: Verificar líneas de referencia**

```powershell
$lines = Get-Content 'migrar\index.html'
$startL = ($lines | Select-String -SimpleMatch 'async function loadHojas()' | Select-Object -First 1).LineNumber
$endL   = ($lines | Select-String -SimpleMatch 'async function iniciarVistaEstudiante()' | Select-Object -First 1).LineNumber - 1
Write-Host "Extraer desde linea $startL hasta $endL (inclusive)"
```

Expected: desde ~1486 hasta ~1772. (No hay blank line entre saveNota y iniciarVistaEstudiante.)

- [ ] **Step 2: Crear el archivo**

```powershell
$lines = Get-Content 'migrar\index.html'
$startIdx = ($lines | Select-String -SimpleMatch 'async function loadHojas()' | Select-Object -First 1).LineNumber - 1  # 0-indexed
$nextIdx  = ($lines | Select-String -SimpleMatch 'async function iniciarVistaEstudiante()' | Select-Object -First 1).LineNumber - 1  # 0-indexed
$endIdx   = $nextIdx - 1  # la línea antes de iniciarVistaEstudiante (no hay blank line entre ellas)

$header = @(
  '// ── notas.js: editor de hojas y notas ──────────────────────────────────────',
  '// Depende de: core.js (g, vi, esc, esc2, toast, showLoader, hideLoader, APRO)',
  '//             session.js (session, hojaActiva, hojaData, saveTimers)',
  '//             api.js (apiGet, apiPost, apiGetCached, invalidateCache)',
  '//             alumnos.js (renderPreview)',
  '// Globals inline (pendientes): iniciarVistaEstudiante, cargarHojasExport,',
  '//   preguntarMejoria, ofrecerPacienteExtra, eliminarPacX, actualizarTodasPlanillas',
  ''
)
$body = $lines[$startIdx..$endIdx]
($header + $body) | Set-Content 'migrar\src\index\notas.js' -Encoding UTF8
Write-Host "notas.js creado con $($body.Length) lineas de contenido + $($header.Length) de cabecera"
```

Expected: `notas.js creado con 287 lineas de contenido + 8 de cabecera` (aproximado). Si el cuerpo tiene 286 o 288 líneas también es aceptable — depende de si hay blank line exacta antes de iniciarVistaEstudiante.

- [ ] **Step 3: Verificar funciones clave**

```powershell
$checks = @(
  'async function loadHojas()',
  'async function delHoja(',
  'async function abrirHoja(',
  'function renderEditor()',
  'function renderAlBlock(',
  'function aplicarFiltro()',
  'async function saveNombrePac(',
  'function toggleMejoriaManual(',
  'async function saveNota('
)
foreach($c in $checks){
  $h = Select-String -Path 'migrar\src\index\notas.js' -SimpleMatch $c
  if($h){ Write-Host "OK [$($h.LineNumber)]: $c" }
  else   { Write-Host "FAIL: no encontrado: $c" }
}
```

Expected: 9 líneas de "OK".

---

## Task 2: Agregar `<script src="src/index/notas.js">` a `migrar/index.html`

**Files:**
- Modify: `migrar/index.html`

- [ ] **Step 1: Verificar load order actual**

```powershell
$lines = Get-Content 'migrar\index.html'
$inlineIdx = ($lines | Select-String -Pattern '^<script>$' | Select-Object -Last 1).LineNumber - 1
$lines[($inlineIdx-6)..($inlineIdx)]
```

Expected: core.js → session.js → api.js → alumnos.js → `<script>`

- [ ] **Step 2: Insertar tag de notas.js**

Buscar y reemplazar en `migrar/index.html`:

Old:
```
<script src="src/index/alumnos.js"></script>
<script>
```

New:
```
<script src="src/index/alumnos.js"></script>
<script src="src/index/notas.js"></script>
<script>
```

- [ ] **Step 3: Verificar**

```powershell
$lines = Get-Content 'migrar\index.html'
$inlineIdx = ($lines | Select-String -Pattern '^<script>$' | Select-Object -Last 1).LineNumber - 1
$lines[($inlineIdx-7)..($inlineIdx)]
```

Expected:
```
<script src="src/index/core.js"></script>
<script src="src/index/session.js"></script>
<script src="src/index/api.js"></script>
<script src="src/index/alumnos.js"></script>
<script src="src/index/notas.js"></script>
<script>
```

---

## Task 3: Eliminar líneas extraídas del inline script

**Files:**
- Modify: `migrar/index.html`

- [ ] **Step 1: Verificar líneas de referencia**

```powershell
$lines = Get-Content 'migrar\index.html'
$inlineScriptIdx   = ($lines | Select-String -Pattern '^<script>$' | Select-Object -Last 1).LineNumber - 1
$loadHojasIdx      = ($lines | Select-String -SimpleMatch 'async function loadHojas()' | Select-Object -First 1).LineNumber - 1
$iniciarVistaIdx   = ($lines | Select-String -SimpleMatch 'async function iniciarVistaEstudiante()' | Select-Object -First 1).LineNumber - 1

Write-Host "inline <script> idx: $inlineScriptIdx"
Write-Host "loadHojas idx: $loadHojasIdx"
Write-Host "iniciarVistaEstudiante idx: $iniciarVistaIdx"
```

Expected: inlineScriptIdx ~1484, loadHojasIdx ~1486, iniciarVistaIdx ~1774.

- [ ] **Step 2: Eliminar el bloque**

```powershell
$lines = Get-Content 'migrar\index.html'
$inlineScriptIdx = ($lines | Select-String -Pattern '^<script>$' | Select-Object -Last 1).LineNumber - 1
$iniciarVistaIdx = ($lines | Select-String -SimpleMatch 'async function iniciarVistaEstudiante()' | Select-Object -First 1).LineNumber - 1

# Conservar: todo hasta <script> + blank line
# Luego desde iniciarVistaEstudiante hasta el final
$result = $lines[0..($inlineScriptIdx+1)] + $lines[$iniciarVistaIdx..($lines.Length-1)]
$result | Set-Content 'migrar\index.html' -Encoding UTF8
Write-Host "Hecho. Lineas en archivo: $($result.Length)"
```

Expected: ~4875 líneas (5161 - 287 eliminadas + 1 script tag = 4875).

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
async function iniciarVistaEstudiante(){
  document.body.className=...
```

- [ ] **Step 4: Verificar eliminación**

```powershell
$removed = @('async function loadHojas()', 'function renderAlBlock(', 'async function saveNota(')
foreach($c in $removed){
  $hits = Select-String -Path 'migrar\index.html' -SimpleMatch $c
  if($hits){ Write-Host "WARN: '$c' sigue en index.html linea $($hits.LineNumber)" }
  else      { Write-Host "OK: '$c' eliminado" }
}
```

Expected: 3 líneas de "OK".

---

## Task 4: Verificar build

- [ ] **Step 1: Build**

```powershell
Set-Location 'D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar'
npm run build 2>&1
```

Expected: build termina sin errores.

---

## Task 5: Commit

- [ ] **Step 1: Commit**

```powershell
Set-Location 'D:\projectoshtmls\CENTYRGC\CENTYRGC'
git add migrar/src/index/notas.js migrar/index.html
git commit -m "refactor: extraer notas.js desde index.html (editor de hojas y notas)"
```

---

## Checklist final

- [ ] `migrar/src/index/notas.js` existe con las 9 funciones clave
- [ ] Load order en index.html: `core.js → session.js → api.js → alumnos.js → notas.js`
- [ ] Inline script empieza con `async function iniciarVistaEstudiante()`
- [ ] `npm run build` pasa sin errores
- [ ] Commit realizado

---

## Notas para fases siguientes

Después de esta fase, el inline script empieza con `async function iniciarVistaEstudiante()` (~1486). Las fases siguientes:

- **Fase 4:** `exportar.js` + `config-index.js` + `log.js` — iniciarVistaEstudiante, renderEstNotas, mostrarDocenteNota, cargarHojasExport, exportarPDF, cargarConfigSistema, cargarLog, sidebar stubs, mostrarCambioPass (~430 líneas, hasta iniciarAgenda)
- **Fase 5:** `agenda.js` — iniciarAgenda, renderCalendario y todo el sistema de calendario (~1345 líneas)
- **Fase 6:** `admin.js` + `vistas.js` + `casilleros.js` — casilleros, recepción, record panel (~900 líneas)
- **Fase 7:** inline script → vacío
