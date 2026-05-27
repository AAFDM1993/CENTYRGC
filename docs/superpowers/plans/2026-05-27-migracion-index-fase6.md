# Migración index.html — Fase 6: casilleros.js + recepcion.js + record.js

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extraer los últimos 3 bloques del inline script de `migrar/index.html` a sus archivos respectivos, vaciando completamente el inline script.

**Architecture:** Mismo patrón — plain `<script src>` sin type="module", scope global.

**Spec:** `docs/superpowers/specs/2026-05-27-migracion-index-html-design.md`

**Prerequisito:** Fase 5 completada. El inline script actualmente empieza con `let casillerosTodos=[];`.

**IMPORTANTE:** El archivo termina con `}</script>` (la llave de cierre de `irAHC` y `</script>` están en la misma línea). El plan de eliminación lo maneja correctamente.

---

## Contexto del archivo

Después de Fase 5, `migrar/index.html` tiene ~2638 líneas. El inline script contiene:

```
~1491  let casillerosTodos=[];                     ← EMPIEZA casilleros.js
...
~2025  let calRecFechaBase = new Date();           ← EMPIEZA recepcion.js
...
~2221  // ── MODAL RECORD                          ← EMPIEZA record.js
...
~2534  }</script>                                  ← FIN (cierre irAHC + </script> juntos)
~2535  </body>
~2536  </html>
```

Los 3 archivos se crean con estos boundaries:
- `casilleros.js`: `let casillerosTodos=[];` → antes de `let calRecFechaBase = new Date();`
- `recepcion.js`: `let calRecFechaBase = new Date();` → antes de `// ── MODAL RECORD`
- `record.js`: `// ── MODAL RECORD` → antes de `</body>`

## Mapa de archivos

| Acción | Archivo | Contenido principal |
|--------|---------|---------------------|
| Crear | `migrar/src/index/casilleros.js` | casilleros + pctExtra + mejoria + pacx + agregar alumno |
| Crear | `migrar/src/index/recepcion.js` | calRec state + iniciarVistaRecepcion + renderCalendarioRec + guardarConfig |
| Crear | `migrar/src/index/record.js` | MODAL RECORD + irAHC |
| Modificar | `migrar/index.html` | +3 script tags, inline vaciado |

---

## Task 1: Crear los 3 archivos JS

**Files:**
- Create: `migrar/src/index/casilleros.js`
- Create: `migrar/src/index/recepcion.js`
- Create: `migrar/src/index/record.js`

- [ ] **Step 1: Encontrar índices de boundary**

```powershell
Set-Location 'D:\projectoshtmls\CENTYRGC\CENTYRGC'
$lines = Get-Content 'migrar\index.html'
$idxCasillero = ($lines | Select-String -SimpleMatch 'let casillerosTodos=[];' | Select-Object -First 1).LineNumber - 1
$idxRecepcion = ($lines | Select-String -SimpleMatch 'let calRecFechaBase = new Date();' | Select-Object -First 1).LineNumber - 1
$idxRecord    = ($lines | Select-String -SimpleMatch '// ── MODAL RECORD' | Select-Object -First 1).LineNumber - 1
$idxBody      = ($lines | Select-String -Pattern '^</body>$' | Select-Object -First 1).LineNumber - 1

Write-Host "casillerosTodos: idx $idxCasillero (~linea $($idxCasillero+1))"
Write-Host "calRecFechaBase: idx $idxRecepcion (~linea $($idxRecepcion+1))"
Write-Host "MODAL RECORD:    idx $idxRecord   (~linea $($idxRecord+1))"
Write-Host "</body>:         idx $idxBody     (~linea $($idxBody+1))"
```

- [ ] **Step 2: Crear `casilleros.js`**

```powershell
Set-Location 'D:\projectoshtmls\CENTYRGC\CENTYRGC'
$lines = Get-Content 'migrar\index.html'
$idxCasillero = ($lines | Select-String -SimpleMatch 'let casillerosTodos=[];' | Select-Object -First 1).LineNumber - 1
$idxRecepcion = ($lines | Select-String -SimpleMatch 'let calRecFechaBase = new Date();' | Select-Object -First 1).LineNumber - 1

$header = @(
  '// ── casilleros.js: casilleros + % extra + mejoría + paciente extra + alumno ──',
  '// Depende de: core.js (g, vi, esc, toast, showLoader, hideLoader, confirmDialog)',
  '//             session.js (session)',
  '//             api.js (apiGet, apiPost, apiGetCached, invalidateCache)',
  '//             log.js (mostrarCambioPass)',
  ''
)
$body = $lines[$idxCasillero..($idxRecepcion-1)]
($header + $body) | Set-Content 'migrar\src\index\casilleros.js' -Encoding UTF8
Write-Host "casilleros.js: $($body.Length) lineas"
```

- [ ] **Step 3: Crear `recepcion.js`**

```powershell
Set-Location 'D:\projectoshtmls\CENTYRGC\CENTYRGC'
$lines = Get-Content 'migrar\index.html'
$idxRecepcion = ($lines | Select-String -SimpleMatch 'let calRecFechaBase = new Date();' | Select-Object -First 1).LineNumber - 1
$idxRecord    = ($lines | Select-String -SimpleMatch '// ── MODAL RECORD' | Select-Object -First 1).LineNumber - 1

$header = @(
  '// ── recepcion.js: vista recepción + renderCalendarioRec + guardarConfig ───────',
  '// Depende de: core.js (g, vi, esc, toast, showLoader, hideLoader)',
  '//             session.js (session)',
  '//             api.js (apiGet, apiPost, apiGetCached, invalidateCache)',
  '//             agenda.js (getLunes, timeToMin, minToTime, generarSlots, agendaCfg)',
  ''
)
$body = $lines[$idxRecepcion..($idxRecord-1)]
($header + $body) | Set-Content 'migrar\src\index\recepcion.js' -Encoding UTF8
Write-Host "recepcion.js: $($body.Length) lineas"
```

- [ ] **Step 4: Crear `record.js`**

IMPORTANTE: El archivo termina con `}</script>` en la misma línea. Para `record.js`, el cuerpo debe terminar antes de `</body>`. Usar el índice de `</body>` como límite superior, y Strip el `</script>` del último elemento si está presente.

```powershell
Set-Location 'D:\projectoshtmls\CENTYRGC\CENTYRGC'
$lines = Get-Content 'migrar\index.html'
$idxRecord = ($lines | Select-String -SimpleMatch '// ── MODAL RECORD' | Select-Object -First 1).LineNumber - 1
$idxBody   = ($lines | Select-String -Pattern '^</body>$' | Select-Object -First 1).LineNumber - 1

$header = @(
  '// ── record.js: modal de registro de notas global + irAHC ───────────────────',
  '// Depende de: core.js (g, vi, esc, toast, showLoader, hideLoader)',
  '//             session.js (session, hojaActiva, hojaData)',
  '//             api.js (apiPost, apiGetCached, invalidateCache)',
  ''
)

# El bloque va desde idxRecord hasta idxBody-1 (que es la linea con }</script>)
# Necesitamos quitar el </script> del final de la ultima linea
$body = $lines[$idxRecord..($idxBody-1)]

# La ultima linea del body es "}</script>" — quitamos "</script>" del final
$lastLine = $body[-1]
if($lastLine.EndsWith('}</script>')){
  $body[-1] = $lastLine.Substring(0, $lastLine.Length - '</script>'.Length)
} elseif($lastLine.TrimEnd() -eq '</script>'){
  # Si es solo </script>, quitarla
  $body = $body[0..($body.Length-2)]
}

($header + $body) | Set-Content 'migrar\src\index\record.js' -Encoding UTF8
Write-Host "record.js: $($body.Length) lineas"
Write-Host "Ultima linea de record.js: '$($body[-1])'"
```

Expected: última línea es `}` (cierre de irAHC), sin `</script>`.

- [ ] **Step 5: Verificar funciones clave en los 3 archivos**

```powershell
Set-Location 'D:\projectoshtmls\CENTYRGC\CENTYRGC'
@{
  'migrar\src\index\casilleros.js' = @('async function cargarCasilleros()','async function confirmarAsignacion()','function preguntarMejoria(','async function ofrecerPacienteExtra(','async function eliminarPacX(')
  'migrar\src\index\recepcion.js'  = @('async function iniciarVistaRecepcion(','function renderCalendarioRec(','async function guardarConfigCurso(')
  'migrar\src\index\record.js'     = @('async function _recCargar(','async function _recGuardarGlobal(','function irAHC(')
}.GetEnumerator() | ForEach-Object {
  $file = $_.Key
  foreach($fn in $_.Value){
    $h = Select-String -Path $file -SimpleMatch $fn
    Write-Host $(if($h){"OK [$($h.LineNumber)] $([System.IO.Path]::GetFileName($file)): $fn"}else{"FAIL $file: $fn"})
  }
}
```

Expected: 11 líneas de "OK".

---

## Task 2: Agregar 3 `<script src>` a `migrar/index.html`

**Files:**
- Modify: `migrar/index.html`

Orden: agenda.js → casilleros.js → recepcion.js → record.js → `<script>` (inline vacío).

- [ ] **Step 1: Insertar los 3 tags**

```powershell
Set-Location 'D:\projectoshtmls\CENTYRGC\CENTYRGC'
$content = Get-Content 'migrar\index.html' -Raw -Encoding UTF8

$old = '<script src="src/index/agenda.js"></script>
<script>'

$new = '<script src="src/index/agenda.js"></script>
<script src="src/index/casilleros.js"></script>
<script src="src/index/recepcion.js"></script>
<script src="src/index/record.js"></script>
<script>'

if($content.Contains($old)){
  $updated = $content.Replace($old, $new)
  [System.IO.File]::WriteAllText((Resolve-Path 'migrar\index.html').Path, $updated, [System.Text.Encoding]::UTF8)
  Write-Host "OK: 3 script tags insertados"
} else {
  Write-Host "FAIL: patron no encontrado"
}
```

- [ ] **Step 2: Verificar load order**

```powershell
Set-Location 'D:\projectoshtmls\CENTYRGC\CENTYRGC'
$lines = Get-Content 'migrar\index.html'
$inlineIdx = ($lines | Select-String -Pattern '^<script>$' | Select-Object -Last 1).LineNumber - 1
$lines[($inlineIdx-14)..($inlineIdx)]
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
<script src="src/index/casilleros.js"></script>
<script src="src/index/recepcion.js"></script>
<script src="src/index/record.js"></script>
<script>
```

---

## Task 3: Vaciar el inline script

**Files:**
- Modify: `migrar/index.html`

NOTA: El archivo termina con `}</script>` (en la misma línea), seguido de `</body>` y `</html>`. El inline se vacía conservando la línea `<script>` y reemplazando todo el contenido por `</script>`.

- [ ] **Step 1: Calcular índices**

```powershell
Set-Location 'D:\projectoshtmls\CENTYRGC\CENTYRGC'
$lines = Get-Content 'migrar\index.html'
$inlineScriptIdx = ($lines | Select-String -Pattern '^<script>$' | Select-Object -Last 1).LineNumber - 1
$casilleroIdx    = ($lines | Select-String -SimpleMatch 'let casillerosTodos=[];' | Select-Object -First 1).LineNumber - 1
$bodyIdx         = ($lines | Select-String -Pattern '^</body>$' | Select-Object -First 1).LineNumber - 1

Write-Host "inline <script>: idx $inlineScriptIdx (~linea $($inlineScriptIdx+1))"
Write-Host "casillerosTodos: idx $casilleroIdx    (~linea $($casilleroIdx+1))"
Write-Host "</body>:         idx $bodyIdx         (~linea $($bodyIdx+1))"
```

- [ ] **Step 2: Vaciar el inline**

```powershell
Set-Location 'D:\projectoshtmls\CENTYRGC\CENTYRGC'
$lines = Get-Content 'migrar\index.html'
$inlineScriptIdx = ($lines | Select-String -Pattern '^<script>$' | Select-Object -Last 1).LineNumber - 1
$bodyIdx         = ($lines | Select-String -Pattern '^</body>$' | Select-Object -First 1).LineNumber - 1

# Conservar: hasta <script> (inclusive), agregar </script>, luego </body></html>
$result = $lines[0..$inlineScriptIdx] + '</script>' + $lines[$bodyIdx..($lines.Length-1)]
$result | Set-Content 'migrar\index.html' -Encoding UTF8
Write-Host "Hecho. Lineas: $($result.Length)"
```

Expected: ~1522 líneas (2638 - 1116 casilleros/recepcion/record + 3 script tags + </script> ajustado).

- [ ] **Step 3: Verificar inline vacío**

```powershell
Set-Location 'D:\projectoshtmls\CENTYRGC\CENTYRGC'
$lines = Get-Content 'migrar\index.html'
$inlineIdx = ($lines | Select-String -Pattern '^<script>$' | Select-Object -Last 1).LineNumber - 1
$lines[$inlineIdx..($inlineIdx+3)]
```

Expected:
```
<script>
</script>
</body>
</html>
```

- [ ] **Step 4: Verificar eliminación**

```powershell
Set-Location 'D:\projectoshtmls\CENTYRGC\CENTYRGC'
$removed = @('let casillerosTodos=[];','async function cargarCasilleros()','async function iniciarVistaRecepcion(','async function _recCargar(','function irAHC(')
foreach($c in $removed){
  $hits = Select-String -Path 'migrar\index.html' -SimpleMatch $c
  if($hits){ Write-Host "WARN: '$c' en linea $($hits.LineNumber)" }
  else      { Write-Host "OK eliminado: $c" }
}
```

Expected: 5 líneas de "OK eliminado".

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
git add migrar/src/index/casilleros.js migrar/src/index/recepcion.js migrar/src/index/record.js migrar/index.html
git commit -m "refactor: extraer casilleros.js + recepcion.js + record.js — inline script vaciado"
```

---

## Checklist final

- [ ] 3 archivos nuevos: casilleros.js, recepcion.js, record.js
- [ ] Load order: core→session→api→alumnos→notas→vistas→exportar→config-index→log→agenda→casilleros→recepcion→record→inline
- [ ] Inline script completamente vacío (`<script></script>`)
- [ ] `npm run build` pasa
- [ ] Commit realizado

---

## Resultado final de la migración

Después de Fase 6, toda la lógica de `migrar/index.html` estará en archivos JS modulares:

| Archivo | Contenido |
|---------|-----------|
| `src/index/core.js` | Utilidades base (g, vi, esc, toast, etc.) |
| `src/index/session.js` | Estado de sesión |
| `src/index/api.js` | Comunicación con GAS |
| `src/index/alumnos.js` | Gestión de alumnos y cursos |
| `src/index/notas.js` | Editor de hojas y notas |
| `src/index/vistas.js` | Vistas estudiante/docente |
| `src/index/exportar.js` | Exportación PDF/Excel |
| `src/index/config-index.js` | Configuración del sistema |
| `src/index/log.js` | Log de notas y casilleros |
| `src/index/agenda.js` | Sistema completo de agenda |
| `src/index/casilleros.js` | Casilleros + mejoría + paciente extra |
| `src/index/recepcion.js` | Vista recepción + calendario |
| `src/index/record.js` | Modal record + irAHC |
