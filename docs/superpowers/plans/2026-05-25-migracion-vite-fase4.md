# Migración a Vite — Fase 4: pdf.js, escalas.js, secciones.js

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extraer tres bloques bien delimitados de `hc.html` a archivos JS separados: las funciones de generación de PDF/export, el sistema de escalas clínicas, y los constructores de secciones de formulario.

**Architecture:** Igual que Fases 2 y 3 — plain `<script src>` sin `type="module"`, funciones en scope global. Los tres archivos se añaden antes del script principal. Task 1 extrae 2 clusters no contiguos para pdf.js. Tasks 2 y 3 extraen bloques contiguos para escalas.js y secciones.js.

**Tech Stack:** Vite 5, JavaScript vanilla, PowerShell (Windows 11)

---

## Estado actual de hc.html (al inicio de esta fase)

```html
<script src="/src/shared/utils.js"></script>
<script src="/src/shared/api.js"></script>
<script src="/src/shared/session.js"></script>
<script src="/src/hc/sello.js"></script>
<script>
  <!-- script principal: ~8000 líneas inline -->
</script>
<script src="/src/hc/widget-postural.js"></script>
</body>
</html>
```

## Mapa de archivos

| Archivo | Líneas aprox. en hc.html | Contenido |
|---------|--------------------------|-----------|
| `migrar/src/hc/pdf.js` | 1705-1943 + 2726-2885 | Generación PDF, buildHCCompletaHTML, verEvalConFirma, verSesConFirma |
| `migrar/src/hc/escalas.js` | 4425-5954 | Helpers de escalas + 30+ escalas clínicas individuales |
| `migrar/src/hc/secciones.js` | 5960-7175 | Constructores de secciones de formulario por especialidad |
| `migrar/hc.html` | Pierde 3 bloques, gana 3 `<script src>` |

**Orden final de scripts en hc.html:**
```
utils.js → api.js → session.js → sello.js → pdf.js → escalas.js → secciones.js → <script principal> → widget-postural.js
```

---

### Task 1: Extraer `src/hc/pdf.js`

**Files:**
- Create: `migrar/src/hc/pdf.js`
- Modify: `migrar/hc.html`

Hay **2 clusters no contiguos** en hc.html:
- **Cluster 1** (~líneas 1705-1943): `_generarHCPdf`, `_normNombreExport`, `_findInMap`, `buildHCCompletaHTML`
- **Cluster 2** (~líneas 2726-2885): `exportarEvalModal`, `verEvalConFirma`, `exportarSesModal`, `verSesConFirma`

Estas funciones se relacionan con la generación de vistas y documentos exportables firmados. Llaman a funciones globales de otros módulos ya extraídos (como `abrirModalFirmaExport` de sello.js, `apiGet` de api.js) y funciones que permanecen en hc.html (como `exportarDocumento`).

- [ ] **Step 1: Confirmar líneas exactas con grep**

```powershell
Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Pattern '^async function _generarHCPdf|^function _normNombreExport|^function _findInMap|^function buildHCCompletaHTML|^async function renderPacs|^function exportarEvalModal|^async function verEvalConFirma|^function exportarSesModal|^async function verSesConFirma|^function sesCard'
```

Anotar los números de línea antes de proceder. Esperado:
- `_generarHCPdf` ~1705, `_normNombreExport` ~1809, `_findInMap` ~1820, `buildHCCompletaHTML` ~1838
- `renderPacs` ~1945 (marca el FIN del Cluster 1 — no se extrae)
- `exportarEvalModal` ~2726, `verEvalConFirma` ~2736, `exportarSesModal` ~2813, `verSesConFirma` ~2822
- `sesCard` ~2887 (marca el FIN del Cluster 2 — no se extrae)

- [ ] **Step 2: Extraer Cluster 1 y escribir pdf.js**

```powershell
$lines = Get-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html"

$startC1 = ($lines | Select-String -Pattern '^async function _generarHCPdf').LineNumber - 1  # 0-based
$endC1   = ($lines | Select-String -Pattern '^async function renderPacs').LineNumber - 2     # línea anterior (0-based)

Write-Host "Cluster 1: líneas $($startC1+1) a $($endC1+1) (total: $($endC1 - $startC1 + 1))"

$cluster1 = $lines[$startC1..$endC1]
# Escribir pdf.js con encabezado + cluster 1
$header = @('// Generación de PDF, vistas exportables y export con firma de docente', '')
($header + $cluster1) | Set-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\src\hc\pdf.js" -Encoding UTF8
Write-Host "Escritas: $($cluster1.Count + $header.Count) líneas"
```

- [ ] **Step 3: Extraer Cluster 2 y añadir a pdf.js**

```powershell
$lines = Get-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html"

$startC2 = ($lines | Select-String -Pattern '^function exportarEvalModal').LineNumber - 1  # 0-based
$endC2   = ($lines | Select-String -Pattern '^function sesCard').LineNumber - 2            # 0-based

Write-Host "Cluster 2: líneas $($startC2+1) a $($endC2+1) (total: $($endC2 - $startC2 + 1))"

$lines[$startC2..$endC2] | Add-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\src\hc\pdf.js" -Encoding UTF8
Write-Host "Añadidas: $($endC2 - $startC2 + 1) líneas"
```

- [ ] **Step 4: Añadir `<script src="/src/hc/pdf.js">` a hc.html**

Usar el Edit tool para modificar el encabezado de scripts. Cambiar de:
```html
<script src="/src/hc/sello.js"></script>
<script>
```
A:
```html
<script src="/src/hc/sello.js"></script>
<script src="/src/hc/pdf.js"></script>
<script>
```

Leer el archivo primero para confirmar el texto exacto antes de editar.

- [ ] **Step 5: Eliminar Cluster 1 de hc.html**

```powershell
$content = Get-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Raw -Encoding UTF8

# Cluster 1: desde _generarHCPdf hasta justo antes de renderPacs
$pattern = '(?s)async function _generarHCPdf\(pacId, docFirmante, evalIds\)\{.+?(?=async function renderPacs\(\))'
$newContent = [regex]::Replace($content, $pattern, '')

if ($newContent -eq $content) {
    Write-Host "WARN: regex Cluster 1 no funcionó — usar Edit tool con texto exacto"
} else {
    Set-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" $newContent -Encoding UTF8
    Write-Host "OK: Cluster 1 eliminado"
}
```

Si el regex falla: leer las líneas exactas con el Read tool y usar el Edit tool con exact string matching.

- [ ] **Step 6: Eliminar Cluster 2 de hc.html**

```powershell
$content = Get-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Raw -Encoding UTF8

# Cluster 2: desde exportarEvalModal hasta justo antes de sesCard
$pattern = '(?s)function exportarEvalModal\(evalId, pacId\)\{.+?(?=function sesCard\()'
$newContent = [regex]::Replace($content, $pattern, '')

if ($newContent -eq $content) {
    Write-Host "WARN: regex Cluster 2 no funcionó — usar Edit tool con texto exacto"
} else {
    Set-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" $newContent -Encoding UTF8
    Write-Host "OK: Cluster 2 eliminado"
}
```

- [ ] **Step 7: Verificar que las funciones no están duplicadas**

```powershell
@('_generarHCPdf','buildHCCompletaHTML','verEvalConFirma','verSesConFirma','exportarEvalModal','exportarSesModal') | ForEach-Object {
    $found = Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Pattern "function $_\("
    if ($found) { Write-Host "DUPLICADO: $_ en hc.html línea $($found.LineNumber)" }
    else { Write-Host "OK: $_ no está en hc.html" }
}

# Verificar que SÍ están en pdf.js
@('_generarHCPdf','buildHCCompletaHTML','verEvalConFirma','verSesConFirma') | ForEach-Object {
    $found = Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\src\hc\pdf.js" -Pattern $_
    if ($found) { Write-Host "OK en pdf.js: $_" } else { Write-Host "FALTA en pdf.js: $_" }
}
```

- [ ] **Step 8: Verificar build**

```powershell
cd D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar
npm run build 2>&1
```

Esperado: sin errores. Warnings sobre chunk size son aceptables.

- [ ] **Step 9: Commit**

```powershell
cd D:\projectoshtmls\CENTYRGC\CENTYRGC
git add migrar/src/hc/pdf.js migrar/hc.html
git commit -m "refactor: extraer pdf.js desde hc.html (generarPDF, buildHCCompleta, verConFirma)"
```

---

### Task 2: Extraer `src/hc/escalas.js`

**Files:**
- Create: `migrar/src/hc/escalas.js`
- Modify: `migrar/hc.html`

Un bloque **contiguo** de ~1530 líneas (~4425-5954) con los helpers del sistema de escalas y las 30+ escalas clínicas individuales (EVA, BORG, BERG, TUG, NIHSS, EDSS, Barthel, Ashworth, MMSE, Tinetti, Sunnybrook, etc.).

Las escalas llaman a `g()` (de utils.js) y a funciones helper como `_selItem`, `_numItem`, `_escalaSimpleItems` que están todas en este mismo bloque.

- [ ] **Step 1: Confirmar líneas exactas con grep**

```powershell
Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Pattern '^function toggleEscalaBloque|^function calcularWeeFIM|^function secCardiorespiratorio'
```

Esperado:
- `toggleEscalaBloque` ~4425 (inicio del bloque)
- `calcularWeeFIM` ~5948 (penúltima función del bloque)
- `secCardiorespiratorio` ~5960 (marca el FIN — no se extrae aquí)

- [ ] **Step 2: Extraer el bloque y crear escalas.js**

```powershell
$lines = Get-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html"

$startE = ($lines | Select-String -Pattern '^function toggleEscalaBloque').LineNumber - 1  # 0-based
$endE   = ($lines | Select-String -Pattern '^function secCardiorespiratorio').LineNumber - 2  # 0-based

Write-Host "Bloque escalas: líneas $($startE+1) a $($endE+1) (total: $($endE - $startE + 1))"

$bloque = $lines[$startE..$endE]
$header = @('// Sistema de escalas clínicas: helpers, render y cálculo de 30+ escalas', '')
($header + $bloque) | Set-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\src\hc\escalas.js" -Encoding UTF8
Write-Host "Líneas escritas: $($bloque.Count + $header.Count)"
```

Esperado: ~1532 líneas.

- [ ] **Step 3: Añadir `<script src="/src/hc/escalas.js">` a hc.html**

Usar el Edit tool para cambiar:
```html
<script src="/src/hc/pdf.js"></script>
<script>
```
A:
```html
<script src="/src/hc/pdf.js"></script>
<script src="/src/hc/escalas.js"></script>
<script>
```

- [ ] **Step 4: Eliminar el bloque de hc.html**

```powershell
$content = Get-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Raw -Encoding UTF8

# Desde toggleEscalaBloque hasta justo antes de secCardiorespiratorio
$pattern = '(?s)function toggleEscalaBloque\(id\)\{.+?(?=function secCardiorespiratorio\()'
$newContent = [regex]::Replace($content, $pattern, '')

if ($newContent -eq $content) {
    Write-Host "WARN: regex no funcionó — usar Edit tool con texto exacto de primera y última línea del bloque"
} else {
    Set-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" $newContent -Encoding UTF8
    Write-Host "OK: bloque escalas eliminado"
}
```

- [ ] **Step 5: Verificar que las funciones no están duplicadas**

```powershell
@('toggleEscalaBloque','renderEscalaEVA','renderEscalaBerg','renderEscalaMMSE','renderEscalaTinetti','renderEscalaSunnybrook','calcularWeeFIM') | ForEach-Object {
    $found = Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Pattern "function $_\("
    if ($found) { Write-Host "DUPLICADO: $_ en hc.html línea $($found.LineNumber)" }
    else { Write-Host "OK: $_ no está en hc.html" }
}
```

- [ ] **Step 6: Verificar build**

```powershell
cd D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar
npm run build 2>&1
```

Esperado: sin errores.

- [ ] **Step 7: Commit**

```powershell
cd D:\projectoshtmls\CENTYRGC\CENTYRGC
git add migrar/src/hc/escalas.js migrar/hc.html
git commit -m "refactor: extraer escalas.js desde hc.html (30+ escalas clínicas)"
```

---

### Task 3: Extraer `src/hc/secciones.js`

**Files:**
- Create: `migrar/src/hc/secciones.js`
- Modify: `migrar/hc.html`

Un bloque **contiguo** de ~1216 líneas (~5960-7175) con los constructores de secciones de formulario por especialidad clínica: cardiorrespiratoria, postural, neurología adultos/pediátrica, geriatría y plan de tratamiento.

Estas funciones llaman a `secWrap()` (que permanece en hc.html), a `g()` y `e2()` (de utils.js), y a las escalas individuales de escalas.js (que carga antes).

- [ ] **Step 1: Confirmar líneas exactas con grep**

```powershell
Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Pattern '^function secCardiorespiratorio|^function secPlanTratamiento|^function filtrarRegiones'
```

Esperado:
- `secCardiorespiratorio` ~5960 (inicio)
- `secPlanTratamiento` ~7161 (penúltima/última función del bloque)
- `filtrarRegiones` ~7179 (marca el FIN — no se extrae aquí)

- [ ] **Step 2: Extraer el bloque y crear secciones.js**

```powershell
$lines = Get-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html"

$startS = ($lines | Select-String -Pattern '^function secCardiorespiratorio').LineNumber - 1  # 0-based
$endS   = ($lines | Select-String -Pattern '^function filtrarRegiones').LineNumber - 2         # 0-based

Write-Host "Bloque secciones: líneas $($startS+1) a $($endS+1) (total: $($endS - $startS + 1))"

$bloque = $lines[$startS..$endS]
$header = @('// Constructores de secciones de formulario clínico por especialidad', '')
($header + $bloque) | Set-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\src\hc\secciones.js" -Encoding UTF8
Write-Host "Líneas escritas: $($bloque.Count + $header.Count)"
```

Esperado: ~1218 líneas.

- [ ] **Step 3: Añadir `<script src="/src/hc/secciones.js">` a hc.html**

Usar el Edit tool para cambiar:
```html
<script src="/src/hc/escalas.js"></script>
<script>
```
A:
```html
<script src="/src/hc/escalas.js"></script>
<script src="/src/hc/secciones.js"></script>
<script>
```

- [ ] **Step 4: Eliminar el bloque de hc.html**

```powershell
$content = Get-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Raw -Encoding UTF8

# Desde secCardiorespiratorio hasta justo antes de filtrarRegiones
$pattern = '(?s)function secCardiorespiratorio\(d\)\{.+?(?=function filtrarRegiones\()'
$newContent = [regex]::Replace($content, $pattern, '')

if ($newContent -eq $content) {
    Write-Host "WARN: regex no funcionó — usar Edit tool con texto exacto de primera y última línea del bloque"
} else {
    Set-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" $newContent -Encoding UTF8
    Write-Host "OK: bloque secciones eliminado"
}
```

- [ ] **Step 5: Verificar que las funciones no están duplicadas**

```powershell
@('secCardiorespiratorio','secSignosVitales','secPostural','secNeuroAdultos','secNeuroPediatrica','secGeriatria','secPlanTratamiento') | ForEach-Object {
    $found = Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Pattern "function $_\("
    if ($found) { Write-Host "DUPLICADO: $_ en hc.html línea $($found.LineNumber)" }
    else { Write-Host "OK: $_ no está en hc.html" }
}
```

- [ ] **Step 6: Verificar build**

```powershell
cd D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar
npm run build 2>&1
```

Esperado: sin errores.

- [ ] **Step 7: Commit**

```powershell
cd D:\projectoshtmls\CENTYRGC\CENTYRGC
git add migrar/src/hc/secciones.js migrar/hc.html
git commit -m "refactor: extraer secciones.js desde hc.html (secciones de formulario clínico)"
```

---

## Criterios de éxito de Fase 4

- [ ] `migrar/src/hc/pdf.js` existe con `_generarHCPdf`, `buildHCCompletaHTML`, `verEvalConFirma`, `verSesConFirma`
- [ ] `migrar/src/hc/escalas.js` existe con `toggleEscalaBloque`, 30+ `renderEscala*` y sus `calcular*`
- [ ] `migrar/src/hc/secciones.js` existe con todos los `sec*` builders de especialidad
- [ ] `migrar/hc.html` tiene los 3 nuevos `<script src>` en orden correcto (antes del script principal)
- [ ] Las funciones extraídas NO están duplicadas en el script inline de hc.html
- [ ] `npm run build` sin errores tras cada tarea
- [ ] 3 commits separados

## Funciones NO extraídas en esta fase

Las siguientes permanecen en hc.html para fases futuras:
- `secWrap` (helper base de secciones — podría moverse a secciones.js en futura iteración)
- `filtrarRegiones`, `agregarRegion`, `quitarRegion`, `mkRomParalelo`, `actualizarTablas` (región/ROM)
- `guardarHC` (~260 líneas) — la función de guardado principal
- `guardarSes` — guardado de sesiones
- `renderPacs`, `abrirPac`, `abrirFrmPac` — gestión de pacientes
- `renderConfig`, `cfgHandleFile`, `cfgSubirLogo`, `guardarNombreEmpresa` — configuración
- `subirConsentimientoUI`, `verConsentimientoUI`, `eliminarConsentimientoUI` — consentimiento
- `_precargarPlantigrafia`, `_inicializarPlantigrafia`, `_subirPlantigrafia` — plantigrafía

## Siguiente fase

Fase 5 cubrirá las funciones restantes de mayor tamaño: `guardarHC` y la gestión de pacientes/formularios.
