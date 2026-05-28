# Migración a Vite — Fase 7: app.js, region.js, guardar.js, modales.js

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vaciar completamente el inline script de `hc.html` extrayendo los cuatro bloques restantes: inicialización de la app, helpers ROM/región, la función guardarHC y los helpers de modales.

**Architecture:** Igual que fases anteriores — plain `<script src>` sin `type="module"`, funciones en scope global. Los 4 bloques son contiguos en el inline script y la extracción es mecánica. Al terminar esta fase, el inline `<script>` quedará vacío (`<script></script>`) y toda la lógica estará en archivos JS separados.

**Tech Stack:** Vite 5, JavaScript vanilla, PowerShell (Windows 11)

---

## Estado actual de hc.html (al inicio de esta fase)

```html
<script src="/src/hc/pacientes.js"></script>
<script>
  <!-- inline script: ~889 líneas -->
  <!-- 390–836: inicialización (Config, Debug, HC_PALETAS, brand, state vars, timers, DOMContentLoaded, iniciarApp, nav, helpers, búsqueda) -->
  <!-- 837–922: ROM/Región (filtrarRegiones, mkRomParalelo, actualizarTablas) -->
  <!-- 923–1184: guardarHC -->
  <!-- 1185–1278: modales + var _pendCount + orphaned comment -->
</script>
<script src="/src/hc/widget-postural.js"></script>
```

## Mapa de funciones y variables restantes

| Líneas (aprox.) | Destino | Contenido |
|-----------------|---------|-----------|
| 390–836 | `app.js` | `HC_DEBUG`, `dbg`, `HC_PALETAS`, `hcAplicarPaleta`, `let _brandNombre/Logo`, `cargarBrand`, `aplicarBrand`, `let cats/pacActivo/revTarget`, `var _timerInterval`, `startTimerBanner` thru `checkTimerOnInit`, `window.addEventListener('DOMContentLoaded',…)`, `iniciarApp`, `views`/`sbs` consts, `setMobileActive`, `navTo`, `getCat`, `catPill`, `bdg`, `renderBusqHC`, `buscarHC`, `exportarDocumento` |
| 837–922 | `region.js` | `filtrarRegiones`, `agregarRegion`, `quitarRegion`, `_renderRegWrap`, `mkRomParalelo`, `actualizarTablas` |
| 923–1184 | `guardar.js` | `guardarHC` |
| 1185–1278 | `modales.js` | `// ─── Modal…` comment, `abrirModalCategoria`, `cerrarModalCategoria`, `seleccionarCategoria`, `abrirModalCategoriaParaEval`, `calcularEdadAuto`, `var _pendCount`, `iniciarPollingPendientes`, orphaned comment block |

**Nota sobre `let cats`, `_brandNombre`, etc.:** Son variables de estado global declaradas con `let`/`var` en el top level del script original. En scripts no-módulo del navegador, `let`/`var` top-level son accesibles desde otros scripts (no son propiedades de `window`, pero sí están en el lexical global environment). Pacientes.js (cargado antes) solo las **referencia dentro de function bodies**, nunca en parse-time, por lo que no hay problema de orden.

## Orden final de scripts tras esta fase

```
utils.js → api.js → session.js → sello.js → pdf.js → escalas.js → secciones.js
  → formulario.js → config.js → visor.js → pacientes.js
  → app.js → region.js → guardar.js → modales.js
  → <script></script>  ← vacío
  → widget-postural.js
```

---

### Task 1: Extraer `src/hc/app.js`

**Files:**
- Create: `migrar/src/hc/app.js`
- Modify: `migrar/hc.html`

El bloque más grande (~447 líneas): desde la primera línea del inline script hasta justo antes de `function filtrarRegiones`. Contiene:
- Constantes de configuración: `HC_DEBUG`, `dbg`, `HC_PALETAS`
- Brand dinámica: `let _brandNombre`, `let _brandLogo`, `cargarBrand`, `aplicarBrand`
- Estado global: `let cats = [], pacActivo = null, revTarget = null`, `var _timerInterval`
- Timer de sesión: `startTimerBanner`, `stopTimerBanner`, `onTimerExpired`, `mostrarTimerModal`, `cerrarTimerModal`, `checkTimerOnInit`
- Bootstrap: `window.addEventListener('DOMContentLoaded', async()=>{...})` — registra el listener que lanza `iniciarApp()` cuando el DOM está listo
- Núcleo: `iniciarApp`, `views`/`sbs` consts, `setMobileActive`, `navTo`
- Helpers de UI: `getCat`, `catPill`, `bdg`
- Búsqueda/exportación: `renderBusqHC`, `buscarHC`, `exportarDocumento`

- [ ] **Step 1: Confirmar líneas exactas**

```powershell
Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Pattern '^<script>$|^async function iniciarApp|^function filtrarRegiones|^function exportarDocumento' | Select-Object LineNumber, Line | Format-Table -AutoSize
```

Esperado:
- `<script>` ~389 (la apertura del inline script — el bloque empieza en la línea siguiente)
- `iniciarApp` ~660 (dentro del bloque)
- `exportarDocumento` ~760 (dentro del bloque — la última función)
- `filtrarRegiones` ~837 (marca el FIN — NO se extrae)

- [ ] **Step 2: Extraer el bloque y crear app.js**

```powershell
$lines = Get-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html"

# La primera línea de contenido está justo después de '<script>':
# LineNumber de '<script>' como 0-based = $startA
$scriptTag  = ($lines | Select-String -Pattern '^<script>$').LineNumber  # 1-based
$startA     = $scriptTag   # 0-based index de la primera línea DENTRO de <script> (= line scriptTag+1 en 1-based)

# El bloque termina en la línea justo antes de filtrarRegiones:
$endA       = ($lines | Select-String -Pattern '^function filtrarRegiones').LineNumber - 2  # 0-based

Write-Host "Bloque app: líneas $($startA+1) a $($endA+1) (total: $($endA - $startA + 1))"

$bloque = $lines[$startA..$endA]
$header = @('// Inicialización de la app HC: paleta, brand, timers, bootstrap DOMContentLoaded, navegación, búsqueda', '')
($header + $bloque) | Set-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\src\hc\app.js" -Encoding UTF8
Write-Host "Líneas escritas: $($bloque.Count + $header.Count)"
```

Esperado: ~449 líneas.

- [ ] **Step 3: Añadir `<script src="/src/hc/app.js">` a hc.html**

Leer el área de scripts para confirmar texto exacto:
```powershell
Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Pattern 'pacientes\.js|app\.js' -Context 0,1 | Select-Object LineNumber, Line | Format-Table -AutoSize
```

Usar el Edit tool para cambiar:
```html
<script src="/src/hc/pacientes.js"></script>
<script>
```
A:
```html
<script src="/src/hc/pacientes.js"></script>
<script src="/src/hc/app.js"></script>
<script>
```

- [ ] **Step 4: Eliminar el bloque de hc.html**

```powershell
$lines = Get-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html"

$scriptTag = ($lines | Select-String -Pattern '^<script>$').LineNumber
$startA    = $scriptTag   # 0-based index de primera línea de contenido
$endA      = ($lines | Select-String -Pattern '^function filtrarRegiones').LineNumber - 2

Write-Host "Eliminando líneas $($startA+1) a $($endA+1)"
$newLines = $lines[0..($startA-1)] + $lines[($endA+1)..($lines.Count-1)]
Set-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" $newLines -Encoding UTF8
Write-Host "OK: bloque app eliminado. Líneas antes: $($lines.Count), después: $($newLines.Count)"
```

Esperado: el archivo pierde ~447 líneas (de ~1421 a ~974).

- [ ] **Step 5: Verificar que las funciones no están duplicadas en hc.html**

```powershell
@('hcAplicarPaleta','cargarBrand','aplicarBrand','iniciarApp','navTo','getCat','catPill','bdg','renderBusqHC','buscarHC','exportarDocumento','startTimerBanner','stopTimerBanner','checkTimerOnInit') | ForEach-Object {
    $def = Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Pattern "(function $_\(|async function $_\()"
    if ($def) { Write-Host "DUPLICADO DEFINICION: $_ en hc.html línea $($def.LineNumber)" }
    else { Write-Host "OK: $_ no está definido en hc.html" }
}
```

- [ ] **Step 6: Verificar que filtrarRegiones SÍ sigue en hc.html**

```powershell
Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Pattern '^function filtrarRegiones'
```

- [ ] **Step 7: Verificar build**

```powershell
cd D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar
npm run build 2>&1
```

Esperado: sin errores. Warnings de chunk size o CJS deprecation son pre-existentes y aceptables.

- [ ] **Step 8: Commit**

```powershell
cd D:\projectoshtmls\CENTYRGC\CENTYRGC
git add migrar/src/hc/app.js migrar/hc.html
git commit -m "refactor: extraer app.js desde hc.html (inicializacion, brand, timers, navegacion, busqueda)"
```

---

### Task 2: Extraer `src/hc/region.js`

**Files:**
- Create: `migrar/src/hc/region.js`
- Modify: `migrar/hc.html`

Bloque pequeño de ~86 líneas con los helpers de ROM/Región:
- `filtrarRegiones(val)` — filtra el dropdown de regiones anatómicas
- `agregarRegion(rEnc)` — añade una región al formulario HC
- `quitarRegion(rEnc, evt)` — elimina una región
- `_renderRegWrap(wrap, sel)` — renderiza el contenedor de regiones seleccionadas
- `mkRomParalelo(sel, data, tipo)` — construye la tabla ROM/fuerza (llamado desde formulario.js y actualizarTablas)
- `actualizarTablas()` — refresca ambas tablas ROM y fuerza

**Nota:** `mkRomParalelo` es llamado desde `formulario.js` (dentro de function bodies — no en parse-time). Carga después de formulario.js pero antes del evento DOMContentLoaded que dispara el formulario. ✓

- [ ] **Step 1: Confirmar líneas exactas**

```powershell
Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Pattern '^function filtrarRegiones|^function mkRomParalelo|^function actualizarTablas|^async function guardarHC' | Select-Object LineNumber, Line | Format-Table -AutoSize
```

Esperado (números shifts ~447 líneas respecto al inicio de fase):
- `filtrarRegiones` ~390 (inicio del bloque — ahora es la primera función en el inline script)
- `mkRomParalelo` ~430
- `actualizarTablas` ~466
- `guardarHC` ~476 (marca el FIN — NO se extrae)

- [ ] **Step 2: Extraer el bloque y crear region.js**

```powershell
$lines = Get-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html"

$startR = ($lines | Select-String -Pattern '^function filtrarRegiones').LineNumber - 1  # 0-based
$endR   = ($lines | Select-String -Pattern '^async function guardarHC').LineNumber - 2  # 0-based

Write-Host "Bloque region: líneas $($startR+1) a $($endR+1) (total: $($endR - $startR + 1))"

$bloque = $lines[$startR..$endR]
$header = @('// Región anatómica y tablas ROM/Fuerza del formulario HC', '')
($header + $bloque) | Set-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\src\hc\region.js" -Encoding UTF8
Write-Host "Líneas escritas: $($bloque.Count + $header.Count)"
```

Esperado: ~88 líneas.

- [ ] **Step 3: Añadir `<script src="/src/hc/region.js">` a hc.html**

Usar el Edit tool para cambiar:
```html
<script src="/src/hc/app.js"></script>
<script>
```
A:
```html
<script src="/src/hc/app.js"></script>
<script src="/src/hc/region.js"></script>
<script>
```

Confirmar el texto exacto leyendo el área antes de editar.

- [ ] **Step 4: Eliminar el bloque de hc.html**

```powershell
$lines = Get-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html"

$startR = ($lines | Select-String -Pattern '^function filtrarRegiones').LineNumber - 1  # 0-based
$endR   = ($lines | Select-String -Pattern '^async function guardarHC').LineNumber - 2  # 0-based

Write-Host "Eliminando líneas $($startR+1) a $($endR+1)"
$newLines = $lines[0..($startR-1)] + $lines[($endR+1)..($lines.Count-1)]
Set-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" $newLines -Encoding UTF8
Write-Host "OK: bloque region eliminado. Líneas antes: $($lines.Count), después: $($newLines.Count)"
```

Esperado: el archivo pierde ~86 líneas (de ~974 a ~888).

- [ ] **Step 5: Verificar que las funciones no están duplicadas en hc.html**

```powershell
@('filtrarRegiones','agregarRegion','quitarRegion','_renderRegWrap','mkRomParalelo','actualizarTablas') | ForEach-Object {
    $def = Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Pattern "(function $_\()"
    if ($def) { Write-Host "DUPLICADO: $_ en hc.html línea $($def.LineNumber)" }
    else { Write-Host "OK: $_ no está definido en hc.html" }
}
```

- [ ] **Step 6: Verificar que guardarHC SÍ sigue en hc.html**

```powershell
Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Pattern '^async function guardarHC'
```

- [ ] **Step 7: Verificar build**

```powershell
cd D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar
npm run build 2>&1
```

- [ ] **Step 8: Commit**

```powershell
cd D:\projectoshtmls\CENTYRGC\CENTYRGC
git add migrar/src/hc/region.js migrar/hc.html
git commit -m "refactor: extraer region.js desde hc.html (filtrarRegiones, mkRomParalelo, tablas ROM)"
```

---

### Task 3: Extraer `src/hc/guardar.js`

**Files:**
- Create: `migrar/src/hc/guardar.js`
- Modify: `migrar/hc.html`

Bloque de ~262 líneas con la función de guardado unificado del formulario clínico:
- `guardarHC(catId, pacId, modo)` — recopila todos los campos del formulario HC (anamnesis, examen, escalas, pruebas funcionales, ROM, fuerza), construye el payload y lo envía al GAS. Llama a `plantillaHTML` (formulario.js), `leerEscalasForm` (escalas.js), `leerPruebasFuncionales` (formulario.js), `actualizarTablas` (region.js, cargado antes ✓).

- [ ] **Step 1: Confirmar líneas exactas**

```powershell
Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Pattern '^async function guardarHC|^// ─── Modal|^function abrirModalCategoria' | Select-Object LineNumber, Line | Format-Table -AutoSize
```

Esperado (números shifts ~533 líneas respecto al inicio de fase):
- `guardarHC` ~390 (ahora primera función en el inline script)
- `// ─── Modal` ~651 (o cerca — marca el FIN del bloque)
- `abrirModalCategoria` ~652

- [ ] **Step 2: Extraer el bloque y crear guardar.js**

```powershell
$lines = Get-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html"

$startG = ($lines | Select-String -Pattern '^async function guardarHC').LineNumber - 1  # 0-based
$endG   = ($lines | Select-String -Pattern '^function abrirModalCategoria').LineNumber - 2  # 0-based

Write-Host "Bloque guardar: líneas $($startG+1) a $($endG+1) (total: $($endG - $startG + 1))"

$bloque = $lines[$startG..$endG]
$header = @('// Guardado unificado del formulario de historia clínica', '')
($header + $bloque) | Set-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\src\hc\guardar.js" -Encoding UTF8
Write-Host "Líneas escritas: $($bloque.Count + $header.Count)"
```

Esperado: ~264 líneas.

- [ ] **Step 3: Añadir `<script src="/src/hc/guardar.js">` a hc.html**

Usar el Edit tool para cambiar:
```html
<script src="/src/hc/region.js"></script>
<script>
```
A:
```html
<script src="/src/hc/region.js"></script>
<script src="/src/hc/guardar.js"></script>
<script>
```

- [ ] **Step 4: Eliminar el bloque de hc.html**

```powershell
$lines = Get-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html"

$startG = ($lines | Select-String -Pattern '^async function guardarHC').LineNumber - 1  # 0-based
$endG   = ($lines | Select-String -Pattern '^function abrirModalCategoria').LineNumber - 2  # 0-based

Write-Host "Eliminando líneas $($startG+1) a $($endG+1)"
$newLines = $lines[0..($startG-1)] + $lines[($endG+1)..($lines.Count-1)]
Set-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" $newLines -Encoding UTF8
Write-Host "OK: guardarHC eliminado. Líneas antes: $($lines.Count), después: $($newLines.Count)"
```

Esperado: el archivo pierde ~262 líneas (de ~888 a ~626).

- [ ] **Step 5: Verificar que guardarHC no está duplicado**

```powershell
$def = Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Pattern '(async function guardarHC\()'
if ($def) { Write-Host "DUPLICADO: guardarHC en hc.html línea $($def.LineNumber)" }
else { Write-Host "OK: guardarHC no está definido en hc.html" }
```

- [ ] **Step 6: Verificar que abrirModalCategoria SÍ sigue en hc.html**

```powershell
Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Pattern '^function abrirModalCategoria'
```

- [ ] **Step 7: Verificar build**

```powershell
cd D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar
npm run build 2>&1
```

- [ ] **Step 8: Commit**

```powershell
cd D:\projectoshtmls\CENTYRGC\CENTYRGC
git add migrar/src/hc/guardar.js migrar/hc.html
git commit -m "refactor: extraer guardar.js desde hc.html (guardarHC)"
```

---

### Task 4: Extraer `src/hc/modales.js` y vaciar inline script

**Files:**
- Create: `migrar/src/hc/modales.js`
- Modify: `migrar/hc.html`

Bloque final de ~94 líneas (que incluye el bloque de comentarios vestigial al final):
- `// ─── Modal selección de categoría` — comentario separador
- `abrirModalCategoria()` — abre modal de selección de categoría HC
- `cerrarModalCategoria()` — cierra el modal
- `seleccionarCategoria(catId, catNombre)` — aplica la selección y abre el formulario
- `abrirModalCategoriaParaEval(pac)` — versión alternativa para re-evaluación
- `calcularEdadAuto()` — calcula edad del paciente automáticamente según fecha nacimiento
- `var _pendCount=0` — contador para el polling de pendientes
- `iniciarPollingPendientes()` — inicia el setInterval que consulta nuevos pendientes cada 30s
- Bloque de comentarios vestigiales (`// ════════...`, `// ─── Consentimiento Informado...`) — se incluyen como JS comments (inofensivos)

Después de esta tarea, el inline `<script>` queda **completamente vacío**.

- [ ] **Step 1: Confirmar líneas exactas**

```powershell
Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Pattern '^function abrirModalCategoria|^function iniciarPollingPendientes|^</script>' | Select-Object LineNumber, Line | Format-Table -AutoSize
```

Esperado (números shifts ~795 líneas respecto al inicio de fase):
- `abrirModalCategoria` ~390 (primera función en el inline script)
- `iniciarPollingPendientes` ~429
- `</script>` ~484

- [ ] **Step 2: Extraer el bloque y crear modales.js**

```powershell
$lines = Get-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html"

$startM = ($lines | Select-String -Pattern '^function abrirModalCategoria').LineNumber - 1  # 0-based (Task 3 ya eliminó el comentario separador junto con guardar.js)
$endM   = ($lines | Select-String -Pattern '^</script>').LineNumber - 2  # 0-based, línea justo antes de </script>

Write-Host "Bloque modales: líneas $($startM+1) a $($endM+1) (total: $($endM - $startM + 1))"

$bloque = $lines[$startM..$endM]
$header = @('// Modales de la app HC: selección de categoría, cálculo de edad, polling de pendientes', '')
($header + $bloque) | Set-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\src\hc\modales.js" -Encoding UTF8
Write-Host "Líneas escritas: $($bloque.Count + $header.Count)"
```

Esperado: ~96 líneas.

- [ ] **Step 3: Añadir `<script src="/src/hc/modales.js">` a hc.html**

Usar el Edit tool para cambiar:
```html
<script src="/src/hc/guardar.js"></script>
<script>
```
A:
```html
<script src="/src/hc/guardar.js"></script>
<script src="/src/hc/modales.js"></script>
<script>
```

- [ ] **Step 4: Eliminar el bloque de hc.html**

```powershell
$lines = Get-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html"

$startM = ($lines | Select-String -Pattern '^function abrirModalCategoria').LineNumber - 2  # 0-based
$endM   = ($lines | Select-String -Pattern '^</script>').LineNumber - 2  # 0-based

Write-Host "Eliminando líneas $($startM+1) a $($endM+1)"
$newLines = $lines[0..($startM-1)] + $lines[($endM+1)..($lines.Count-1)]
Set-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" $newLines -Encoding UTF8
Write-Host "OK: modales eliminado. Líneas antes: $($lines.Count), después: $($newLines.Count)"
```

Esperado: el archivo pierde ~94 líneas. El inline script debe quedar con sólo `<script></script>` (vacío o con líneas en blanco).

- [ ] **Step 5: Verificar que el inline script está vacío**

```powershell
# Verificar que </script> sigue presente
$sc = Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Pattern '^</script>'
Write-Host "Ocurrencias de </script>: $($sc.Count)"
$sc | ForEach-Object { Write-Host "  línea $($_.LineNumber): $($_.Line)" }

# Verificar que no hay definiciones de función en el inline script
$funciones = Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Pattern '^(async )?function [a-z]'
if ($funciones) {
    Write-Host "WARN: quedan funciones en hc.html:"
    $funciones | ForEach-Object { Write-Host "  línea $($_.LineNumber): $($_.Line)" }
} else { Write-Host "OK: no quedan definiciones de función en el inline script" }
```

- [ ] **Step 6: Verificar que las funciones no están duplicadas**

```powershell
@('abrirModalCategoria','cerrarModalCategoria','seleccionarCategoria','abrirModalCategoriaParaEval','calcularEdadAuto','iniciarPollingPendientes') | ForEach-Object {
    $def = Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Pattern "(function $_\()"
    if ($def) { Write-Host "DUPLICADO: $_ en hc.html línea $($def.LineNumber)" }
    else { Write-Host "OK: $_ no está definido en hc.html" }
}
```

- [ ] **Step 7: Verificar build**

```powershell
cd D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar
npm run build 2>&1
```

Esperado: sin errores.

- [ ] **Step 8: Commit**

```powershell
cd D:\projectoshtmls\CENTYRGC\CENTYRGC
git add migrar/src/hc/modales.js migrar/hc.html
git commit -m "refactor: extraer modales.js desde hc.html (categorias, calcEdad, polling) — inline script vaciado"
```

---

## Criterios de éxito de Fase 7

- [ ] `migrar/src/hc/app.js` existe con `iniciarApp`, `navTo`, `cargarBrand`, `buscarHC`, `exportarDocumento`, `startTimerBanner`, `let cats`
- [ ] `migrar/src/hc/region.js` existe con `filtrarRegiones`, `mkRomParalelo`, `actualizarTablas`
- [ ] `migrar/src/hc/guardar.js` existe con `guardarHC`
- [ ] `migrar/src/hc/modales.js` existe con `abrirModalCategoria`, `iniciarPollingPendientes`
- [ ] `migrar/hc.html` tiene los 4 nuevos `<script src>` en el orden correcto (pacientes.js → app.js → region.js → guardar.js → modales.js → inline vacío)
- [ ] El inline `<script>` está vacío (sin definiciones de función)
- [ ] `</script>` sigue presente una sola vez cerrando el inline script
- [ ] `npm run build` sin errores tras cada tarea
- [ ] 4 commits separados

## Funciones extraídas en esta fase por archivo

| Archivo | Funciones principales |
|---------|----------------------|
| `app.js` | `iniciarApp`, `navTo`, `cargarBrand`, `aplicarBrand`, `hcAplicarPaleta`, `buscarHC`, `exportarDocumento`, `startTimerBanner`…`checkTimerOnInit`, `getCat`, `catPill`, `bdg`, `setMobileActive` |
| `region.js` | `filtrarRegiones`, `agregarRegion`, `quitarRegion`, `_renderRegWrap`, `mkRomParalelo`, `actualizarTablas` |
| `guardar.js` | `guardarHC` |
| `modales.js` | `abrirModalCategoria`, `cerrarModalCategoria`, `seleccionarCategoria`, `abrirModalCategoriaParaEval`, `calcularEdadAuto`, `iniciarPollingPendientes` |

## Siguiente fase

Fase 8 (opcional): Optimización — convertir a `type="module"` con imports/exports, tree-shaking, o mantener el estado actual (funcional, plain scripts) y enfocarse en GitHub Pages deploy.
