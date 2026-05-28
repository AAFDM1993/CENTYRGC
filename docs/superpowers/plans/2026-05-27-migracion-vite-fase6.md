# Migración a Vite — Fase 6: visor.js y pacientes.js

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extraer el visor HTML de evaluaciones/sesiones y el sistema de gestión de pacientes desde `hc.html` a archivos JS separados.

**Architecture:** Igual que fases anteriores — plain `<script src>` sin `type="module"`, funciones en scope global. Task 1 extrae el bloque del visor HTML (~875 líneas: buildEvalHTML, helpers internos, buildSesHTML y el workflow de exportación). Task 2 extrae el bloque de gestión de pacientes (~1300 líneas: renderPacs hasta archivarAtencion). Ambos bloques son contiguos en el inline script; la extracción es mecánica.

**Tech Stack:** Vite 5, JavaScript vanilla, PowerShell (Windows 11)

---

## Estado actual de hc.html (al inicio de esta fase)

```html
<script src="/src/hc/formulario.js"></script>
<script src="/src/hc/config.js"></script>
<script>
  <!-- script principal: ~3066 líneas inline -->
</script>
<script src="/src/hc/widget-postural.js"></script>
```

## Mapa de funciones en hc.html

| Líneas (aprox.) | Bloque | Destino |
|-----------------|--------|---------|
| 393–835 | Inicialización: paleta, brand, timers, `iniciarApp`, `navTo`, helpers `getCat`/`catPill`/`bdg`, `renderBusqHC`, `buscarHC`, `exportarDocumento` | Permanece (fases futuras) |
| 835–1709 | Visor HTML: `buildEvalHTML`, helpers `_build*`, `buildSesHTML`, export workflow | → `visor.js` (Task 1) |
| 1710–3010 | Gestión pacientes: `renderPacs` → `archivarAtencion` | → `pacientes.js` (Task 2) |
| 3011–3098 | ROM/Región: `filtrarRegiones`, `agregarRegion`, `mkRomParalelo`, `actualizarTablas` | Permanece (fases futuras) |
| 3099–3358 | Guardado: `guardarHC` (~260 líneas) | Permanece (fases futuras) |
| 3360–3453 | Modales/UI: `abrirModalCategoria`, `calcularEdadAuto`, `iniciarPollingPendientes` | Permanece (fases futuras) |

## Orden final de scripts tras esta fase

```
utils.js → api.js → session.js → sello.js → pdf.js → escalas.js → secciones.js
  → formulario.js → config.js → visor.js → pacientes.js → <script principal> → widget-postural.js
```

---

### Task 1: Extraer `src/hc/visor.js`

**Files:**
- Create: `migrar/src/hc/visor.js`
- Modify: `migrar/hc.html`

Bloque de ~875 líneas que contiene todo el sistema de renderizado HTML de evaluaciones y sesiones:
- `buildEvalHTML(ev, pac, firmaHTML)` — construye el HTML completo de una evaluación (incluye las funciones internas `row()` y `rowFull()` definidas dentro de ella)
- `_buildPlanHTML`, `_buildEscalasHTML`, `_buildExamenObjetivoPorCategoria` — helpers del visor
- `buildRomTable`, `buildFuerzaTable` — tablas ROM y fuerza
- `_fld2`, `_buildEscalasExport` — helpers de exportación
- `buildSesHTML(s, pac, firmaHTML)` — HTML de una sesión
- `renderExportHC`, `buscarPacExport`, `abrirSelectorExportPDF`, `exportarHCPaciente` — workflow de exportación PDF de HC completa

Estas funciones son llamadas por: `pdf.js` (buildEvalHTML/buildSesHTML en función bodies), `pacientes.js` (Task 2: toggleEvalInline llama buildEvalHTML). Todo en scope global, sin problema de orden.

- [ ] **Step 1: Confirmar líneas exactas**

```powershell
Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Pattern '^function buildEvalHTML|^function buildSesHTML|^function renderExportHC|^async function renderPacs' | Select-Object LineNumber, Line | Format-Table -AutoSize
```

Esperado:
- `buildEvalHTML` ~836 (inicio del bloque — extracción empieza en 835 para incluir comentario separador)
- `buildSesHTML` ~1570 (dentro del bloque)
- `renderExportHC` ~1616 (dentro del bloque)
- `renderPacs` ~1710 (marca el FIN — NO se extrae)

- [ ] **Step 2: Extraer el bloque y crear visor.js**

```powershell
$lines = Get-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html"

# -2 respecto a buildEvalHTML para incluir el comentario separador "// ─── BUILD HTML EVALUACIÓN" en línea anterior
$startV = ($lines | Select-String -Pattern '^function buildEvalHTML').LineNumber - 2  # 0-based
# -2 respecto a renderPacs para incluir la línea en blanco que lo precede
$endV   = ($lines | Select-String -Pattern '^async function renderPacs').LineNumber - 2  # 0-based

Write-Host "Bloque visor: líneas $($startV+1) a $($endV+1) (total: $($endV - $startV + 1))"

$bloque = $lines[$startV..$endV]
$header = @('// Visor HTML de evaluaciones/sesiones y exportación de HC', '')
($header + $bloque) | Set-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\src\hc\visor.js" -Encoding UTF8
Write-Host "Líneas escritas: $($bloque.Count + $header.Count)"
```

Esperado: ~877 líneas.

- [ ] **Step 3: Añadir `<script src="/src/hc/visor.js">` a hc.html**

Usar el Read tool para leer las líneas alrededor del área de scripts (buscar `config.js`) y confirmar el texto exacto. Luego usar el Edit tool para cambiar:
```html
<script src="/src/hc/config.js"></script>
<script>
```
A:
```html
<script src="/src/hc/config.js"></script>
<script src="/src/hc/visor.js"></script>
<script>
```

- [ ] **Step 4: Eliminar el bloque de hc.html**

```powershell
$lines = Get-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html"

$startV = ($lines | Select-String -Pattern '^function buildEvalHTML').LineNumber - 2  # 0-based
$endV   = ($lines | Select-String -Pattern '^async function renderPacs').LineNumber - 2  # 0-based

$newLines = $lines[0..($startV-1)] + $lines[($endV+1)..($lines.Count-1)]
Set-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" $newLines -Encoding UTF8
Write-Host "OK: bloque visor eliminado. Líneas antes: $($lines.Count), después: $($newLines.Count)"
```

Esperado: el archivo pierde ~875 líneas (de ~3595 a ~2720).

- [ ] **Step 5: Verificar que las funciones no están duplicadas en hc.html**

```powershell
@('buildEvalHTML','buildSesHTML','renderExportHC','buscarPacExport','exportarHCPaciente','_buildEscalasHTML','_buildExamenObjetivoPorCategoria','buildRomTable','buildFuerzaTable','_buildEscalasExport') | ForEach-Object {
    $def = Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Pattern "(function $_\(|const $_\s*=)"
    if ($def) { Write-Host "DUPLICADO DEFINICION: $_ en hc.html línea $($def.LineNumber)" }
    else { Write-Host "OK: $_ no está definido en hc.html" }
}
```

- [ ] **Step 6: Verificar que renderPacs SÍ sigue en hc.html**

```powershell
Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Pattern '^async function renderPacs'
```

- [ ] **Step 7: Verificar build**

```powershell
cd D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar
npm run build 2>&1
```

Esperado: sin errores. Warnings sobre chunk size o CJS deprecation son aceptables (pre-existentes).

- [ ] **Step 8: Commit**

```powershell
cd D:\projectoshtmls\CENTYRGC\CENTYRGC
git add migrar/src/hc/visor.js migrar/hc.html
git commit -m "refactor: extraer visor.js desde hc.html (buildEvalHTML, buildSesHTML, export HC)"
```

---

### Task 2: Extraer `src/hc/pacientes.js`

**Files:**
- Create: `migrar/src/hc/pacientes.js`
- Modify: `migrar/hc.html`

Bloque de ~1301 líneas que contiene toda la gestión de pacientes:
- **Listado/filtrado:** `renderPacs`, `filtrarAlumnosDropdown`, `seleccionarAlumno`, `filtrarPacs`
- **Fichas:** `abrirFrmPac`, `abrirPac`
- **Cards y detalle:** `evalCard`, `buildDetalleEval`, `_buildDetalleExamenPorCategoria`, `toggleEvalInline`, `sesCard`
- **Edición evaluaciones:** `editarEvalAprobada`, `editarEvalRechazada`
- **Envío:** `enviarEval`, `enviarSes`
- **Docentes/firmas:** `filtrarDocentesHC`, `selDocHC`, `filtrarDocentes`, `selDoc`
- **Sesiones:** `abrirFrmSes`, `guardarSes`
- **Revisiones:** `abrirRev`, `cerrarRev`, `confirmarRev`
- **Pendientes y categorías:** `renderPend`, `cargarBadge`, `renderCats`
- **CRUD pacientes:** `editarPac`, `eliminarPac`, `eliminarEval`, `reasignarPac`, `archivarAtencion`

Estas funciones llaman a `buildEvalHTML`/`buildSesHTML` (definidos en visor.js — cargado antes), a helpers de pdf.js, sello.js, utils.js, api.js — todo en scope global.

- [ ] **Step 1: Confirmar líneas exactas**

```powershell
Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Pattern '^async function renderPacs|^async function archivarAtencion|^function filtrarRegiones' | Select-Object LineNumber, Line | Format-Table -AutoSize
```

Esperado (números shifts respecto a Fase 6 Task 1 — ~875 líneas menos):
- `renderPacs` ~835 (inicio del bloque)
- `archivarAtencion` ~2116 (cerca del fin del bloque)
- `filtrarRegiones` ~2136 (marca el FIN — NO se extrae; el bloque termina en la línea justo antes)

- [ ] **Step 2: Extraer el bloque y crear pacientes.js**

```powershell
$lines = Get-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html"

$startP = ($lines | Select-String -Pattern '^async function renderPacs').LineNumber - 1  # 0-based
# El bloque termina justo antes de filtrarRegiones; -2 incluye las líneas de comentario separador
$endP   = ($lines | Select-String -Pattern '^function filtrarRegiones').LineNumber - 2  # 0-based

Write-Host "Bloque pacientes: líneas $($startP+1) a $($endP+1) (total: $($endP - $startP + 1))"

$bloque = $lines[$startP..$endP]
$header = @('// Gestión de pacientes: listado, fichas, evaluaciones, sesiones, revisiones, CRUD', '')
($header + $bloque) | Set-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\src\hc\pacientes.js" -Encoding UTF8
Write-Host "Líneas escritas: $($bloque.Count + $header.Count)"
```

Esperado: ~1303 líneas.

- [ ] **Step 3: Añadir `<script src="/src/hc/pacientes.js">` a hc.html**

Usar el Read tool para confirmar el texto exacto alrededor del area de scripts (buscar `visor.js`). Luego usar el Edit tool para cambiar:
```html
<script src="/src/hc/visor.js"></script>
<script>
```
A:
```html
<script src="/src/hc/visor.js"></script>
<script src="/src/hc/pacientes.js"></script>
<script>
```

- [ ] **Step 4: Eliminar el bloque de hc.html**

```powershell
$lines = Get-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html"

$startP = ($lines | Select-String -Pattern '^async function renderPacs').LineNumber - 1  # 0-based
$endP   = ($lines | Select-String -Pattern '^function filtrarRegiones').LineNumber - 2  # 0-based

$newLines = $lines[0..($startP-1)] + $lines[($endP+1)..($lines.Count-1)]
Set-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" $newLines -Encoding UTF8
Write-Host "OK: bloque pacientes eliminado. Líneas antes: $($lines.Count), después: $($newLines.Count)"
```

Esperado: el archivo pierde ~1301 líneas (de ~2720 a ~1420).

- [ ] **Step 5: Verificar que las funciones no están duplicadas en hc.html**

```powershell
@('renderPacs','abrirPac','abrirFrmPac','evalCard','buildDetalleEval','sesCard','abrirFrmSes','guardarSes','enviarEval','enviarSes','confirmarRev','renderPend','renderCats','editarPac','eliminarPac','eliminarEval','archivarAtencion') | ForEach-Object {
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

Esperado: sin errores.

- [ ] **Step 8: Commit**

```powershell
cd D:\projectoshtmls\CENTYRGC\CENTYRGC
git add migrar/src/hc/pacientes.js migrar/hc.html
git commit -m "refactor: extraer pacientes.js desde hc.html (renderPacs, evalCard, sesiones, revisiones, CRUD)"
```

---

## Criterios de éxito de Fase 6

- [ ] `migrar/src/hc/visor.js` existe con `buildEvalHTML`, `buildSesHTML`, `renderExportHC`, `exportarHCPaciente`
- [ ] `migrar/src/hc/pacientes.js` existe con `renderPacs`, `abrirPac`, `evalCard`, `guardarSes`, `renderPend`, `archivarAtencion`
- [ ] `migrar/hc.html` tiene los 2 nuevos `<script src>` en el orden correcto (config.js → visor.js → pacientes.js → inline)
- [ ] Las funciones extraídas NO están duplicadas (definidas) en hc.html
- [ ] `filtrarRegiones` y `guardarHC` siguen presentes en hc.html
- [ ] `npm run build` sin errores tras cada tarea
- [ ] 2 commits separados

## Funciones NO extraídas en esta fase

Permanecen en hc.html (~890 líneas tras esta fase):
- **Inicialización** (393–835): `HC_DEBUG`, `dbg`, `HC_PALETAS`, `hcAplicarPaleta`, `cargarBrand`, `aplicarBrand`, timers (`startTimerBanner`, `stopTimerBanner`, `onTimerExpired`, `mostrarTimerModal`, `cerrarTimerModal`, `checkTimerOnInit`), `iniciarApp`, `navTo`, helpers `getCat`/`catPill`/`bdg`, `renderBusqHC`, `buscarHC`, `exportarDocumento`
- **ROM/Región** (3011–3098): `filtrarRegiones`, `agregarRegion`, `quitarRegion`, `_renderRegWrap`, `mkRomParalelo`, `actualizarTablas`
- **Guardado** (3099–3358): `guardarHC` (~260 líneas)
- **Modales/UI** (3360–3453): `abrirModalCategoria`, `cerrarModalCategoria`, `seleccionarCategoria`, `abrirModalCategoriaParaEval`, `calcularEdadAuto`, `iniciarPollingPendientes`

## Siguiente fase

Fase 7 cubrirá los bloques restantes: inicialización + navegación (`iniciarApp`, timers, brand), región/ROM (`filtrarRegiones`, `mkRomParalelo`) y `guardarHC`, llevando el inline script a ~0 líneas o solo código de arranque mínimo.
