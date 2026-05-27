# Migración index.html — Fase 5: agenda.js

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extraer el sistema completo de agenda del inline script de `migrar/index.html` al archivo `migrar/src/index/agenda.js`, reduciendo el inline en ~1386 líneas.

**Architecture:** Mismo patrón — plain `<script src>` sin type="module", scope global. `agenda.js` se carga como el 10.º script antes del inline.

**Spec:** `docs/superpowers/specs/2026-05-27-migracion-index-html-design.md`

**Prerequisito:** Fase 4 completada (commit 9a5c94c). El inline script actualmente empieza con `let agendaCfg` en línea ~1491.

---

## Contexto del archivo

Después de Fase 4, `migrar/index.html` tiene 4024 líneas. El inline script empieza en línea ~1489 (`<script>`) y su primer contenido es:

```
1491  let agendaCfg   = { areas:[], franjas:[...] };   ← EMPIEZA FASE 5
...
2877  let casillerosTodos=[];                           ← EMPIEZA FASE 6
```

Esta fase extrae líneas **1491–2876** (~1386 líneas) a `agenda.js`.

## Funciones principales en agenda.js

State vars: `agendaCfg`, `agendaReservas`, `calFechaBase`, `rsvPendiente`, `calEstFechaBase`, `agendaEstReservas`, `calGridTarget`, `agendaBloqueos`

Helpers: `getLunes`, `fmt`, `fmtDia`, `timeToMin`, `minToTime`, `generarSlots`

Agenda admin/docente: `iniciarAgenda`, `_recargarCalendarios`, `cargarReservasSemana`, `verReservasHoy`, `cerrarReservasHoy`, `eliminarReservaHoy`, `renderCalendario`, `renderAreasConfig`, `addArea`, `delArea`, `guardarAgendaConfig`, `abrirReserva`, `confirmarReserva`, `pedirEliminar`

Agenda estudiante: `iniciarAgendaEstudiante`, `cargarReservasEst`, `renderCalendarioEst`, `abrirReservaEst`

Bloqueos: `cargarBloqueos`, `esBloqueado`, `crearBloqueoModal`, `renderListaBloqueosModal`

Panel/Nav: `toggleSection`, `mostrarAgenda`, `abrirPanelAdmin`, `admNavNotas`, `admNavAgenda`

## Mapa de archivos

| Acción | Archivo | Contenido |
|--------|---------|-----------|
| Crear | `migrar/src/index/agenda.js` | Todo el sistema de agenda |
| Modificar | `migrar/index.html` | +1 script tag, −1386 líneas del inline |

---

## Task 1: Crear `migrar/src/index/agenda.js`

**Files:**
- Create: `migrar/src/index/agenda.js`

- [ ] **Step 1: Verificar índices de boundary**

```powershell
Set-Location 'D:\projectoshtmls\CENTYRGC\CENTYRGC'
$lines = Get-Content 'migrar\index.html'
$idxAgenda    = ($lines | Select-String -SimpleMatch 'let agendaCfg   = { areas:' | Select-Object -First 1).LineNumber - 1
$idxCasillero = ($lines | Select-String -SimpleMatch 'let casillerosTodos=[];' | Select-Object -First 1).LineNumber - 1

Write-Host "agendaCfg:      idx $idxAgenda   (~linea $($idxAgenda+1))"
Write-Host "casillerosTodos: idx $idxCasillero (~linea $($idxCasillero+1))"
Write-Host "Lineas a extraer: $($idxCasillero - $idxAgenda)"
```

Expected: `agendaCfg` ~idx 1490, `casillerosTodos` ~idx 2876, diferencia ~1386.

- [ ] **Step 2: Crear `agenda.js`**

```powershell
Set-Location 'D:\projectoshtmls\CENTYRGC\CENTYRGC'
$lines = Get-Content 'migrar\index.html'
$idxAgenda    = ($lines | Select-String -SimpleMatch 'let agendaCfg   = { areas:' | Select-Object -First 1).LineNumber - 1
$idxCasillero = ($lines | Select-String -SimpleMatch 'let casillerosTodos=[];' | Select-Object -First 1).LineNumber - 1

$header = @(
  '// ── agenda.js: sistema completo de agenda (admin + docente + estudiante) ─────',
  '// Depende de: core.js (g, vi, esc, toast, showLoader, hideLoader, confirmDialog)',
  '//             session.js (session, hojaActiva)',
  '//             api.js (apiGet, apiPost, apiGetCached, invalidateCache)',
  '//             notas.js (abrirHoja)',
  '//             vistas.js (iniciarVistaEstudiante)',
  ''
)
$body = $lines[$idxAgenda..($idxCasillero-1)]
($header + $body) | Set-Content 'migrar\src\index\agenda.js' -Encoding UTF8
Write-Host "agenda.js creado con $($body.Length) lineas de contenido + $($header.Length) de cabecera"
```

Expected: ~1386 líneas de contenido.

- [ ] **Step 3: Verificar funciones clave**

```powershell
Set-Location 'D:\projectoshtmls\CENTYRGC\CENTYRGC'
$checks = @(
  'let agendaCfg',
  'async function iniciarAgenda()',
  'function renderCalendario()',
  'async function guardarAgendaConfig()',
  'async function confirmarReserva()',
  'function renderCalendarioEst()',
  'async function iniciarAgendaEstudiante()',
  'async function cargarListaReservas()',
  'async function cargarBloqueos(',
  'function abrirPanelAdmin(',
  'function admNavAgenda('
)
foreach($c in $checks){
  $h = Select-String -Path 'migrar\src\index\agenda.js' -SimpleMatch $c
  if($h){ Write-Host "OK [$($h.LineNumber)]: $c" }
  else   { Write-Host "FAIL: no encontrado: $c" }
}
```

Expected: 11 líneas de "OK".

---

## Task 2: Agregar `<script src="src/index/agenda.js">` a `migrar/index.html`

**Files:**
- Modify: `migrar/index.html`

- [ ] **Step 1: Insertar tag**

Buscar en `migrar/index.html`:
```
<script src="src/index/log.js"></script>
<script>
```

Reemplazar con:
```
<script src="src/index/log.js"></script>
<script src="src/index/agenda.js"></script>
<script>
```

```powershell
Set-Location 'D:\projectoshtmls\CENTYRGC\CENTYRGC'
$content = Get-Content 'migrar\index.html' -Raw -Encoding UTF8

$old = '<script src="src/index/log.js"></script>
<script>'

$new = '<script src="src/index/log.js"></script>
<script src="src/index/agenda.js"></script>
<script>'

if($content.Contains($old)){
  $updated = $content.Replace($old, $new)
  [System.IO.File]::WriteAllText((Resolve-Path 'migrar\index.html').Path, $updated, [System.Text.Encoding]::UTF8)
  Write-Host "OK: agenda.js script tag insertado"
} else {
  Write-Host "FAIL: patron no encontrado"
}
```

- [ ] **Step 2: Verificar load order**

```powershell
Set-Location 'D:\projectoshtmls\CENTYRGC\CENTYRGC'
$lines = Get-Content 'migrar\index.html'
$inlineIdx = ($lines | Select-String -Pattern '^<script>$' | Select-Object -Last 1).LineNumber - 1
$lines[($inlineIdx-11)..($inlineIdx)]
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
<script src="src/index/agenda.js"></script>
<script>
```

---

## Task 3: Eliminar el bloque de agenda del inline script

**Files:**
- Modify: `migrar/index.html`

- [ ] **Step 1: Calcular índices**

```powershell
Set-Location 'D:\projectoshtmls\CENTYRGC\CENTYRGC'
$lines = Get-Content 'migrar\index.html'
$inlineScriptIdx = ($lines | Select-String -Pattern '^<script>$' | Select-Object -Last 1).LineNumber - 1
$agendaIdx       = ($lines | Select-String -SimpleMatch 'let agendaCfg   = { areas:' | Select-Object -First 1).LineNumber - 1
$casilleroIdx    = ($lines | Select-String -SimpleMatch 'let casillerosTodos=[];' | Select-Object -First 1).LineNumber - 1

Write-Host "inline <script>: idx $inlineScriptIdx"
Write-Host "agendaCfg:       idx $agendaIdx"
Write-Host "casillerosTodos: idx $casilleroIdx"
Write-Host "Lineas a eliminar: $($casilleroIdx - $agendaIdx)"
```

- [ ] **Step 2: Eliminar bloque**

```powershell
Set-Location 'D:\projectoshtmls\CENTYRGC\CENTYRGC'
$lines = Get-Content 'migrar\index.html'
$inlineScriptIdx = ($lines | Select-String -Pattern '^<script>$' | Select-Object -Last 1).LineNumber - 1
$casilleroIdx    = ($lines | Select-String -SimpleMatch 'let casillerosTodos=[];' | Select-Object -First 1).LineNumber - 1

# Conservar: hasta <script> + blank line, luego desde let casillerosTodos hasta el final
$result = $lines[0..($inlineScriptIdx+1)] + $lines[$casilleroIdx..($lines.Length-1)]
$result | Set-Content 'migrar\index.html' -Encoding UTF8
Write-Host "Hecho. Lineas: $($result.Length)"
```

Expected: ~2638 líneas (4025 - 1386 + 1 script tag = ~2640).

- [ ] **Step 3: Verificar inicio del inline**

```powershell
Set-Location 'D:\projectoshtmls\CENTYRGC\CENTYRGC'
$lines = Get-Content 'migrar\index.html'
$inlineIdx = ($lines | Select-String -Pattern '^<script>$' | Select-Object -Last 1).LineNumber - 1
$lines[$inlineIdx..($inlineIdx+4)]
```

Expected:
```
<script>
(blank)
let casillerosTodos=[];
```

- [ ] **Step 4: Verificar eliminación**

```powershell
Set-Location 'D:\projectoshtmls\CENTYRGC\CENTYRGC'
$removed = @('let agendaCfg   = { areas:','async function iniciarAgenda()','function renderCalendario()','function admNavAgenda(')
foreach($c in $removed){
  $hits = Select-String -Path 'migrar\index.html' -SimpleMatch $c
  if($hits){ Write-Host "WARN: '$c' en linea $($hits.LineNumber)" }
  else      { Write-Host "OK eliminado: $c" }
}
```

Expected: 4 líneas de "OK eliminado".

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
git add migrar/src/index/agenda.js migrar/index.html
git commit -m "refactor: extraer agenda.js desde index.html (sistema completo de agenda)"
```

---

## Checklist final

- [ ] `migrar/src/index/agenda.js` existe con las 11 funciones clave
- [ ] Load order: core→session→api→alumnos→notas→vistas→exportar→config-index→log→agenda→inline
- [ ] Inline script empieza con `let casillerosTodos=[];`
- [ ] `npm run build` pasa
- [ ] Commit realizado

---

## Notas para Fase 6

Después de esta fase, el inline script empieza con `let casillerosTodos=[];` (línea ~1491 nueva numeración).

- **Fase 6:** `casilleros.js` + `recepcion.js` + `record.js` — extrae TODO el contenido restante hasta vaciar el inline script
