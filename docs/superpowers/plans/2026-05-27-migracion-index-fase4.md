# Migración index.html — Fase 4: vistas.js + exportar.js + config-index.js + log.js

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extraer 4 bloques del inline script de `migrar/index.html` a sus archivos respectivos, reduciendo el inline en ~855 líneas.

**Architecture:** Mismo patrón — plain `<script src>` sin type="module", scope global. Los 4 archivos se cargan en orden antes del inline.

**Spec:** `docs/superpowers/specs/2026-05-27-migracion-index-html-design.md`

**Prerequisito:** Fases 1–3 completadas (commit 9827ea8). El inline script actualmente empieza con `async function iniciarVistaEstudiante()` en línea ~1487.

---

## Contexto del archivo

Después de Fase 3, `migrar/index.html` tiene 4875 líneas. Esta fase extrae el bloque 1487–2341 en 4 archivos:

```
1487  async function iniciarVistaEstudiante(){   ← vistas.js
...
1629  // ── EXPORTAR PDF ────────────────────    ← exportar.js
...
1992  // ── CONFIGURACIÓN DEL SISTEMA ───────   ← config-index.js
...
2155  // ── LOG DE NOTAS ────────────────────   ← log.js
...
2341  }   ← cierre de guardarNuevaPass
2342  (blank)
2343  let agendaCfg = {...};                    ← EMPIEZA FASE 5
```

Los 4 archivos usan los **comentarios de sección** como marcadores de boundary.

## Mapa de archivos

| Acción | Archivo | Contenido principal |
|--------|---------|---------------------|
| Crear | `migrar/src/index/vistas.js` | iniciarVistaEstudiante, renderEstNotas, mostrarDocenteNota |
| Crear | `migrar/src/index/exportar.js` | cargarHojasExport → exportarPDF |
| Crear | `migrar/src/index/config-index.js` | cargarConfigSistema → applyBranding |
| Crear | `migrar/src/index/log.js` | cargarLog → guardarNuevaPass + sidebar stubs |
| Modificar | `migrar/index.html` | +4 script tags, −855 líneas del inline |

---

## Task 1: Crear los 4 archivos JS

**Files:**
- Create: `migrar/src/index/vistas.js`
- Create: `migrar/src/index/exportar.js`
- Create: `migrar/src/index/config-index.js`
- Create: `migrar/src/index/log.js`

- [ ] **Step 1: Encontrar índices de boundary**

```powershell
$lines = Get-Content 'migrar\index.html'
$idxVistas   = ($lines | Select-String -SimpleMatch 'async function iniciarVistaEstudiante()' | Select-Object -First 1).LineNumber - 1
$idxExportar = ($lines | Select-String -SimpleMatch '// ── EXPORTAR PDF' | Select-Object -First 1).LineNumber - 1
$idxConfig   = ($lines | Select-String -SimpleMatch '// ── CONFIGURACIÓN DEL SISTEMA' | Select-Object -First 1).LineNumber - 1
$idxLog      = ($lines | Select-String -SimpleMatch '// ── LOG DE NOTAS' | Select-Object -First 1).LineNumber - 1
$idxAgenda   = ($lines | Select-String -SimpleMatch 'let agendaCfg' | Select-Object -First 1).LineNumber - 1

Write-Host "vistas:   idx $idxVistas   (~linea $($idxVistas+1))"
Write-Host "exportar: idx $idxExportar (~linea $($idxExportar+1))"
Write-Host "config:   idx $idxConfig   (~linea $($idxConfig+1))"
Write-Host "log:      idx $idxLog      (~linea $($idxLog+1))"
Write-Host "agenda:   idx $idxAgenda   (~linea $($idxAgenda+1))"
```

Expected (aproximado):
```
vistas:   idx 1486  (~linea 1487)
exportar: idx 1628  (~linea 1629)
config:   idx 1991  (~linea 1992)
log:      idx 2154  (~linea 2155)
agenda:   idx 2341  (~linea 2342)  ← o 2342 si hay blank line
```

- [ ] **Step 2: Crear `vistas.js`**

```powershell
$lines = Get-Content 'migrar\index.html'
$idxVistas   = ($lines | Select-String -SimpleMatch 'async function iniciarVistaEstudiante()' | Select-Object -First 1).LineNumber - 1
$idxExportar = ($lines | Select-String -SimpleMatch '// ── EXPORTAR PDF' | Select-Object -First 1).LineNumber - 1

$header = @(
  '// ── vistas.js: vistas de estudiante y docente ──────────────────────────────',
  '// Depende de: core.js (g, vi, esc, toast, showLoader, hideLoader)',
  '//             session.js (session, hojaActiva, hojaData)',
  '//             api.js (apiGet, apiGetCached)',
  '//             notas.js (abrirHoja)',
  '// Fase 6 agregará: iniciarVistaRecepcion, renderCalendarioRec',
  ''
)
$body = $lines[$idxVistas..($idxExportar-1)]
($header + $body) | Set-Content 'migrar\src\index\vistas.js' -Encoding UTF8
Write-Host "vistas.js: $($body.Length) lineas"
```

- [ ] **Step 3: Crear `exportar.js`**

```powershell
$lines = Get-Content 'migrar\index.html'
$idxExportar = ($lines | Select-String -SimpleMatch '// ── EXPORTAR PDF' | Select-Object -First 1).LineNumber - 1
$idxConfig   = ($lines | Select-String -SimpleMatch '// ── CONFIGURACIÓN DEL SISTEMA' | Select-Object -First 1).LineNumber - 1

$header = @(
  '// ── exportar.js: exportación a PDF y Excel ─────────────────────────────────',
  '// Depende de: core.js (g, vi, esc, toast, showLoader, hideLoader)',
  '//             session.js (session)',
  '//             api.js (apiGet, apiGetCached)',
  '//             config-index.js (logoParaPDF_ usa applyBranding)',
  ''
)
$body = $lines[$idxExportar..($idxConfig-1)]
($header + $body) | Set-Content 'migrar\src\index\exportar.js' -Encoding UTF8
Write-Host "exportar.js: $($body.Length) lineas"
```

- [ ] **Step 4: Crear `config-index.js`**

```powershell
$lines = Get-Content 'migrar\index.html'
$idxConfig = ($lines | Select-String -SimpleMatch '// ── CONFIGURACIÓN DEL SISTEMA' | Select-Object -First 1).LineNumber - 1
$idxLog    = ($lines | Select-String -SimpleMatch '// ── LOG DE NOTAS' | Select-Object -First 1).LineNumber - 1

$header = @(
  '// ── config-index.js: configuración del sistema + branding ───────────────────',
  '// Depende de: core.js (g, vi, toast, showLoader, hideLoader)',
  '//             session.js (session)',
  '//             api.js (apiPost, apiGetCached, invalidateCache)',
  '// Nota: se llama config-index.js para evitar conflicto con src/hc/config.js',
  ''
)
$body = $lines[$idxConfig..($idxLog-1)]
($header + $body) | Set-Content 'migrar\src\index\config-index.js' -Encoding UTF8
Write-Host "config-index.js: $($body.Length) lineas"
```

- [ ] **Step 5: Crear `log.js`**

```powershell
$lines = Get-Content 'migrar\index.html'
$idxLog    = ($lines | Select-String -SimpleMatch '// ── LOG DE NOTAS' | Select-Object -First 1).LineNumber - 1
$idxAgenda = ($lines | Select-String -SimpleMatch 'let agendaCfg' | Select-Object -First 1).LineNumber - 1

$header = @(
  '// ── log.js: log de notas + log de casilleros + sidebar stubs + cambio de pass',
  '// Depende de: core.js (g, vi, toast, showLoader, hideLoader)',
  '//             session.js (session)',
  '//             api.js (apiGetCached, apiPost, invalidateCache)',
  ''
)
$body = $lines[$idxLog..($idxAgenda-1)]
($header + $body) | Set-Content 'migrar\src\index\log.js' -Encoding UTF8
Write-Host "log.js: $($body.Length) lineas"
```

- [ ] **Step 6: Verificar funciones clave en los 4 archivos**

```powershell
@{
  'migrar\src\index\vistas.js'      = @('async function iniciarVistaEstudiante()','function renderEstNotas(','function mostrarDocenteNota(')
  'migrar\src\index\exportar.js'    = @('async function cargarHojasExport()','async function exportarPDF()','async function logoParaPDF_()')
  'migrar\src\index\config-index.js'= @('async function cargarConfigSistema()','async function guardarConfigSistema()','function applyBranding(')
  'migrar\src\index\log.js'         = @('async function cargarLog()','function renderLogRows(','async function guardarNuevaPass()')
}.GetEnumerator() | ForEach-Object {
  $file = $_.Key
  foreach($fn in $_.Value){
    $h = Select-String -Path $file -SimpleMatch $fn
    Write-Host $(if($h){"OK [$($h.LineNumber)] $([System.IO.Path]::GetFileName($file)): $fn"}else{"FAIL $file: $fn"})
  }
}
```

Expected: 12 líneas de "OK".

---

## Task 2: Agregar 4 `<script src>` a `migrar/index.html`

**Files:**
- Modify: `migrar/index.html`

Orden: notas.js → vistas.js → exportar.js → config-index.js → log.js → `<script>` (inline).

- [ ] **Step 1: Insertar los 4 tags**

Buscar en `migrar/index.html`:
```
<script src="src/index/notas.js"></script>
<script>
```

Reemplazar con:
```
<script src="src/index/notas.js"></script>
<script src="src/index/vistas.js"></script>
<script src="src/index/exportar.js"></script>
<script src="src/index/config-index.js"></script>
<script src="src/index/log.js"></script>
<script>
```

- [ ] **Step 2: Verificar load order**

```powershell
$lines = Get-Content 'migrar\index.html'
$inlineIdx = ($lines | Select-String -Pattern '^<script>$' | Select-Object -Last 1).LineNumber - 1
$lines[($inlineIdx-10)..($inlineIdx)]
```

Expected:
```
<script src="src/index/core.js"></script>
<script src="src/index/session.js"></script>
<script src="src/index/api.js"></script>
<script src="src/index/alumnos.js"></script>
<script src="src/index/notas.js"></script>
<script src="src/index/vistas.js"></script>
<script src="src/index/exportar.js"></script>
<script src="src/index/config-index.js"></script>
<script src="src/index/log.js"></script>
<script>
```

---

## Task 3: Eliminar las 855 líneas del inline script

**Files:**
- Modify: `migrar/index.html`

- [ ] **Step 1: Calcular índices dinámicamente**

```powershell
$lines = Get-Content 'migrar\index.html'
$inlineScriptIdx = ($lines | Select-String -Pattern '^<script>$' | Select-Object -Last 1).LineNumber - 1
$vistasIdx       = ($lines | Select-String -SimpleMatch 'async function iniciarVistaEstudiante()' | Select-Object -First 1).LineNumber - 1
$agendaIdx       = ($lines | Select-String -SimpleMatch 'let agendaCfg' | Select-Object -First 1).LineNumber - 1

Write-Host "inline <script>: idx $inlineScriptIdx"
Write-Host "iniciarVistaEstudiante: idx $vistasIdx"
Write-Host "let agendaCfg: idx $agendaIdx"
```

- [ ] **Step 2: Eliminar bloque**

```powershell
$lines = Get-Content 'migrar\index.html'
$inlineScriptIdx = ($lines | Select-String -Pattern '^<script>$' | Select-Object -Last 1).LineNumber - 1
$vistasIdx       = ($lines | Select-String -SimpleMatch 'async function iniciarVistaEstudiante()' | Select-Object -First 1).LineNumber - 1
$agendaIdx       = ($lines | Select-String -SimpleMatch 'let agendaCfg' | Select-Object -First 1).LineNumber - 1

# Conservar: hasta <script> + blank line, luego desde let agendaCfg hasta el final
$result = $lines[0..($inlineScriptIdx+1)] + $lines[$agendaIdx..($lines.Length-1)]
$result | Set-Content 'migrar\index.html' -Encoding UTF8
Write-Host "Hecho. Lineas: $($result.Length)"
```

Expected: ~4024 líneas (4875 - 855 + 4 script tags = 4024).

- [ ] **Step 3: Verificar inicio del inline**

```powershell
$lines = Get-Content 'migrar\index.html'
$inlineIdx = ($lines | Select-String -Pattern '^<script>$' | Select-Object -Last 1).LineNumber - 1
$lines[$inlineIdx..($inlineIdx+5)]
```

Expected:
```
<script>
(blank)
let agendaCfg   = { areas:[], franjas:[...] };
let agendaReservas = [];
let calFechaBase   = new Date();
let rsvPendiente   = null;
```

- [ ] **Step 4: Verificar eliminación**

```powershell
$removed = @('async function iniciarVistaEstudiante()','async function cargarHojasExport()',
  'async function cargarConfigSistema()','async function cargarLog()')
foreach($c in $removed){
  $hits = Select-String -Path 'migrar\index.html' -SimpleMatch $c
  if($hits){ Write-Host "WARN: $c en linea $($hits.LineNumber)" }
  else      { Write-Host "OK eliminado: $c" }
}
```

Expected: 4 líneas de "OK".

---

## Task 4: Verificar build

- [ ] **Step 1:**

```powershell
Set-Location 'D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar'
npm run build 2>&1
```

Expected: build pasa sin errores.

---

## Task 5: Commit

- [ ] **Step 1:**

```powershell
Set-Location 'D:\projectoshtmls\CENTYRGC\CENTYRGC'
git add migrar/src/index/vistas.js migrar/src/index/exportar.js migrar/src/index/config-index.js migrar/src/index/log.js migrar/index.html
git commit -m "refactor: extraer vistas.js + exportar.js + config-index.js + log.js desde index.html"
```

---

## Checklist final

- [ ] 4 archivos nuevos en `migrar/src/index/`: vistas.js, exportar.js, config-index.js, log.js
- [ ] Load order: core→session→api→alumnos→notas→vistas→exportar→config-index→log→inline
- [ ] Inline script empieza con `let agendaCfg`
- [ ] `npm run build` pasa
- [ ] Commit realizado

---

## Notas para fases siguientes

Después de esta fase, el inline script empieza con las variables de estado de la agenda (`let agendaCfg`, `let agendaReservas`, `let calFechaBase`, `let rsvPendiente`) seguidas de `async function iniciarAgenda()`.

- **Fase 5:** `agenda.js` — vars de estado + iniciarAgenda + renderCalendario + todo el sistema de agenda (~1185 líneas hasta cargarCasilleros)
- **Fase 6:** `admin.js` + resto de `vistas.js` (iniciarVistaRecepcion) + `casilleros.js` + record panel + irAHC (~900 líneas)
- **Fase 7:** inline script → vacío
