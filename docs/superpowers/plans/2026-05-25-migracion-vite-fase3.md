# Migración a Vite — Fase 3: Módulos HC (widget-postural y sello)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extraer el widget postural y las funciones de sello/firma de docentes de `hc.html` a archivos JS separados en `src/hc/`, reduciendo el archivo sin cambiar ningún comportamiento.

**Architecture:** Igual que Fase 2 — plain `<script src>` sin `type="module"`, funciones en scope global. Task 1 extrae el widget (ya está en su propio `<script>` block, extracción limpia). Task 2 extrae las funciones de sello distribuidas en 4 clusters del script principal. Los funciones PDF complejas (`_generarHCPdf`, `buildHCCompletaHTML`, `verEvalConFirma`, `verSesConFirma`) se difieren a una fase futura.

**Tech Stack:** Vite 5, JavaScript vanilla, PowerShell (Windows 11)

---

## Estado actual de hc.html (al inicio de esta fase)

```html
<script src="/src/shared/utils.js"></script>
<script src="/src/shared/api.js"></script>
<script src="/src/shared/session.js"></script>
<script>
  <!-- script principal: ~8400 líneas -->
</script>
<script>
  <!-- widget postural IIFE: líneas 8558-8820 -->
</script>
</body>
</html>
```

---

## Mapa de archivos

| Archivo | Responsabilidad |
|---------|----------------|
| `migrar/src/hc/widget-postural.js` | IIFE del widget postural: IMGS, ALTS, estado de chips, wpostMount, wpostGetData, wpostSetData, renderPaleta, renderDrops, _wpostPrecargarFotos, wpostGetIMGS, wpostGetALTS |
| `migrar/src/hc/sello.js` | Generación de sellos, resolución de firmas, modal de exportación, panel admin de firmas |
| `migrar/hc.html` | Pierde 2 bloques, gana 2 `<script src>` |

---

### Task 1: Extraer `src/hc/widget-postural.js`

**Files:**
- Create: `migrar/src/hc/widget-postural.js`
- Modify: `migrar/hc.html`

El widget postural ya está en su propio bloque `<script>` separado (líneas ~8557-8821 de hc.html), completamente aislado del script principal. La extracción es copiar el contenido y reemplazar el bloque.

- [ ] **Step 1: Crear carpeta y extraer el contenido del IIFE a widget-postural.js**

Usar PowerShell para leer exactamente las líneas del IIFE y escribirlas al nuevo archivo:

```powershell
# Leer hc.html como array de líneas
$lines = Get-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html"

# Encontrar la línea con la etiqueta <script> del widget postural
# (el segundo <script> al final del archivo, justo antes de </body>)
# Buscar la línea que contiene el IIFE de inicio: (function(){
$startIdx = ($lines | Select-String -Pattern '^\(function\(\)\{' | Select-Object -Last 1).LineNumber - 1  # 0-based

# Encontrar el cierre del IIFE: })();
$endIdx = ($lines | Select-String -Pattern '^\}\)\(\);' | Select-Object -Last 1).LineNumber - 1  # 0-based

Write-Host "IIFE start line (0-based): $startIdx"
Write-Host "IIFE end line (0-based): $endIdx"
```

Esperado: startIdx alrededor de 8557, endIdx alrededor de 8819.

- [ ] **Step 2: Crear la carpeta src/hc/ y escribir el archivo**

```powershell
New-Item -ItemType Directory -Force "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\src\hc"

# Extraer las líneas del IIFE (startIdx a endIdx inclusive)
$lines = Get-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html"
$startIdx = ($lines | Select-String -Pattern '^\(function\(\)\{' | Select-Object -Last 1).LineNumber - 1
$endIdx = ($lines | Select-String -Pattern '^\}\)\(\);' | Select-Object -Last 1).LineNumber - 1
$iife = $lines[$startIdx..$endIdx]
$iife | Set-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\src\hc\widget-postural.js" -Encoding UTF8
Write-Host "Líneas extraídas: $($iife.Count)"
```

Esperado: ~263 líneas escritas.

- [ ] **Step 3: Reemplazar el bloque `<script>` del widget en hc.html**

El bloque a reemplazar en hc.html es:
```
<script>
(function(){
...
})();
</script>
```

Usar PowerShell para reemplazar el bloque completo (el `<script>` que contiene el IIFE) con la etiqueta src:

```powershell
$content = Get-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Raw -Encoding UTF8

# El bloque del widget empieza con <script>\n(function(){ y termina con })();\n</script>
# Usamos regex para reemplazarlo
$pattern = '(?s)<script>\s*\(function\(\)\{.+?\}\)\(\);\s*</script>'
$replacement = '<script src="/src/hc/widget-postural.js"></script>'
$newContent = [regex]::Replace($content, $pattern, $replacement)

if ($newContent -eq $content) {
    Write-Host "ERROR: No se encontró el patrón del IIFE"
} else {
    Set-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" $newContent -Encoding UTF8
    Write-Host "OK: bloque reemplazado"
}
```

- [ ] **Step 4: Verificar que widget-postural.js está en hc.html y el IIFE ya no está inline**

```powershell
# Verificar que el src está presente
Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Pattern 'src="/src/hc/widget-postural.js"'

# Verificar que el IIFE no está inline (no debe encontrarse)
$found = Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Pattern '^\(function\(\)\{'
if ($found) { Write-Host "ERROR: IIFE todavía inline" } else { Write-Host "OK: IIFE removido del inline" }
```

- [ ] **Step 5: Verificar build**

```powershell
cd D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar
npm run build 2>&1
```

Esperado: sin errores.

- [ ] **Step 6: Commit**

```powershell
cd D:\projectoshtmls\CENTYRGC\CENTYRGC
git add migrar/src/hc/widget-postural.js migrar/hc.html
git commit -m "refactor: extraer widget-postural.js desde hc.html (IIFE completo)"
```

---

### Task 2: Extraer `src/hc/sello.js`

**Files:**
- Create: `migrar/src/hc/sello.js`
- Modify: `migrar/hc.html`

Las funciones de sello están en **4 clusters no contiguos** dentro del script principal. Se extraen todas al mismo archivo `sello.js`. Las funciones PDF complejas (`_generarHCPdf`, `buildHCCompletaHTML`, `verEvalConFirma`, `verSesConFirma`) NO se extraen en esta fase.

**Clusters a extraer (líneas aproximadas — verificar con grep antes de editar):**

| Cluster | Líneas aprox. | Contenido |
|---------|--------------|-----------|
| A | 751-938 | Comentario, mkSelloInline, _mkSelloHTML, mkSelloDocente, _exportCallback, _exportando, abrirModalFirmaExport, filtrarFirmaExBusca, seleccionarFirmaEx, confirmarExportConFirma, cerrarModalFirmaExport |
| B | 1796 | `var _firmasDocentes=[];` (línea aislada) |
| C | 1802-1868 | _quitarFondoFirma_, var _firmaCache={}, resolverFirma_, resolverFirmaDoc_, previsualizarFirma |
| D | 2203-2376 | renderFirmas, _cargarPreviewFirma, subirFirma, guardarB64, _enviarFirma, eliminarFirma, guardarDatosDocente, guardarCtmp |

- [ ] **Step 1: Confirmar líneas exactas con grep**

```powershell
# Confirmar línea de inicio de cada cluster
Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Pattern '// ─── SELLO DIGITAL ASYNC|^var _exportCallback|^var _firmasDocentes|^function _quitarFondoFirma_|^async function renderFirmas|^async function guardarCtmp'
```

Anotar los números de línea reales antes de proceder.

- [ ] **Step 2: Crear sello.js con las declaraciones de variables globales**

Crear `migrar/src/hc/sello.js` con este encabezado (las variables se declaran aquí y se eliminan de hc.html):

```js
// Sello digital de docentes, resolución de firmas y panel de administración

var _exportCallback = null;
var _exportando = false;
var _firmasDocentes = [];
var _firmaCache = {};
```

- [ ] **Step 3: Extraer Cluster A (mkSelloInline → cerrarModalFirmaExport) y añadir a sello.js**

Leer de hc.html desde el comentario `// ─── SELLO DIGITAL ASYNC` hasta (e incluyendo) el cierre de `cerrarModalFirmaExport`. Usar PowerShell:

```powershell
$lines = Get-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html"

# Encontrar línea de inicio: el comentario del sello
$startA = ($lines | Select-String -Pattern '// ─── SELLO DIGITAL ASYNC').LineNumber - 1

# Encontrar línea de fin: cierre de cerrarModalFirmaExport
# Es la primera línea con solo "}" después de "function cerrarModalFirmaExport"
$cerrarLine = ($lines | Select-String -Pattern '^function cerrarModalFirmaExport').LineNumber - 1
# Buscar el "}" de cierre en las siguientes 5 líneas
$endA = $cerrarLine
for ($i = $cerrarLine + 1; $i -le $cerrarLine + 5; $i++) {
    if ($lines[$i].Trim() -eq '}') { $endA = $i; break }
}

Write-Host "Cluster A: líneas $startA a $endA"

# Añadir al sello.js (append)
$lines[$startA..$endA] | Add-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\src\hc\sello.js" -Encoding UTF8
```

- [ ] **Step 4: Extraer Cluster C (resolución de firmas) y añadir a sello.js**

```powershell
$lines = Get-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html"

# Inicio: _quitarFondoFirma_
$startC = ($lines | Select-String -Pattern '^function _quitarFondoFirma_').LineNumber - 1

# Fin: cierre de previsualizarFirma (buscar "}" después de previsualizarFirma)
$prevLine = ($lines | Select-String -Pattern '^async function previsualizarFirma').LineNumber - 1
$endC = $prevLine
for ($i = $prevLine + 1; $i -le $prevLine + 30; $i++) {
    if ($lines[$i].Trim() -eq '}') { $endC = $i; break }
}

Write-Host "Cluster C: líneas $startC a $endC"

# Añadir al sello.js
$lines[$startC..$endC] | Add-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\src\hc\sello.js" -Encoding UTF8
```

- [ ] **Step 5: Extraer Cluster D (panel admin de firmas) y añadir a sello.js**

```powershell
$lines = Get-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html"

# Inicio: renderFirmas
$startD = ($lines | Select-String -Pattern '^async function renderFirmas').LineNumber - 1

# Fin: cierre de guardarCtmp (es una one-liner: async function guardarCtmp...)
$ctmpLine = ($lines | Select-String -Pattern '^async function guardarCtmp').LineNumber - 1
$endD = $ctmpLine  # guardarCtmp es una sola línea con { return ... }

Write-Host "Cluster D: líneas $startD a $endD"

# Añadir al sello.js
$lines[$startD..$endD] | Add-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\src\hc\sello.js" -Encoding UTF8
```

- [ ] **Step 6: Añadir `<script src="/src/hc/sello.js">` a hc.html**

Modificar el encabezado de scripts en hc.html. Cambiar de:
```html
<script src="/src/shared/utils.js"></script>
<script src="/src/shared/api.js"></script>
<script src="/src/shared/session.js"></script>
<script>
```
A:
```html
<script src="/src/shared/utils.js"></script>
<script src="/src/shared/api.js"></script>
<script src="/src/shared/session.js"></script>
<script src="/src/hc/sello.js"></script>
<script>
```

Usar el Edit tool con exact string matching para insertar solo la nueva línea.

- [ ] **Step 7: Eliminar Cluster A de hc.html**

Usar PowerShell para eliminar las líneas del cluster A del script principal:

```powershell
$content = Get-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Raw -Encoding UTF8

# Eliminar bloque: desde el comentario del sello hasta el cierre de cerrarModalFirmaExport
# El bloque empieza con el comentario y termina con la "}" de cerrarModalFirmaExport
$pattern = '(?s)// ─── SELLO DIGITAL ASYNC \(para vista inline — carga firma lazy\) ─+\n.*?function cerrarModalFirmaExport\(\)\{[^\}]*\}'
$newContent = [regex]::Replace($content, $pattern, '')

if ($newContent -eq $content) {
    Write-Host "ERROR: patrón Cluster A no encontrado — usar Edit tool manual"
} else {
    Set-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" $newContent -Encoding UTF8
    Write-Host "OK: Cluster A eliminado"
}
```

Si el regex falla, usar el Edit tool con el texto exacto de las primeras y últimas líneas del bloque A para identificarlo.

- [ ] **Step 8: Eliminar Cluster B (var _firmasDocentes) de hc.html**

Usar Edit tool para eliminar exactamente esta línea:
```
var _firmasDocentes=[];
```
Reemplazar con cadena vacía (eliminación).

- [ ] **Step 9: Eliminar Cluster C (resolución de firmas) de hc.html**

```powershell
$content = Get-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Raw -Encoding UTF8

# Bloque C: desde _quitarFondoFirma_ hasta el cierre de previsualizarFirma
# Empieza con "function _quitarFondoFirma_" y termina después de previsualizarFirma
$pattern = '(?s)function _quitarFondoFirma_\(b64\)\{.+?async function previsualizarFirma\(.+?\n\}'
$newContent = [regex]::Replace($content, $pattern, '')

if ($newContent -eq $content) {
    Write-Host "ERROR: patrón Cluster C no encontrado — usar Edit tool manual"
} else {
    Set-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" $newContent -Encoding UTF8
    Write-Host "OK: Cluster C eliminado"
}
```

También eliminar la línea aislada `var _firmaCache={};` usando Edit tool.

- [ ] **Step 10: Eliminar Cluster D (panel admin de firmas) de hc.html**

```powershell
$content = Get-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Raw -Encoding UTF8

# Bloque D: desde renderFirmas hasta guardarCtmp (one-liner)
$pattern = '(?s)async function renderFirmas\(\)\{.+?async function guardarCtmp\(codigo, idx\)\{ return guardarDatosDocente\(codigo, idx\); \}'
$newContent = [regex]::Replace($content, $pattern, '')

if ($newContent -eq $content) {
    Write-Host "ERROR: patrón Cluster D no encontrado — usar Edit tool manual"
} else {
    Set-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" $newContent -Encoding UTF8
    Write-Host "OK: Cluster D eliminado"
}
```

- [ ] **Step 11: Verificar que las funciones no están duplicadas**

```powershell
# Estas funciones NO deben aparecer en hc.html después de la extracción
@('mkSelloInline','_mkSelloHTML','mkSelloDocente','_quitarFondoFirma_','renderFirmas','subirFirma','guardarDatosDocente') | ForEach-Object {
    $found = Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Pattern "function $_\("
    if ($found) { Write-Host "DUPLICADO: $_ sigue en hc.html línea $($found.LineNumber)" }
    else { Write-Host "OK: $_ no está en hc.html" }
}
```

- [ ] **Step 12: Verificar build**

```powershell
cd D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar
npm run build 2>&1
```

Esperado: sin errores.

- [ ] **Step 13: Commit**

```powershell
cd D:\projectoshtmls\CENTYRGC\CENTYRGC
git add migrar/src/hc/sello.js migrar/hc.html
git commit -m "refactor: extraer sello.js desde hc.html (sellos, firmas, panel admin docentes)"
```

---

## Criterios de éxito de Fase 3

- [ ] `migrar/src/hc/widget-postural.js` existe con el IIFE completo del widget
- [ ] `migrar/src/hc/sello.js` existe con las 4 clusters de funciones de sello/firma
- [ ] `migrar/hc.html` tiene los 2 nuevos `<script src>` en el orden correcto
- [ ] Las funciones extraídas NO están duplicadas en el script inline de hc.html
- [ ] `wpostMount`, `wpostGetData`, `wpostSetData`, `wpostGetIMGS`, `wpostGetALTS` siguen accesibles globalmente (expuestos como `window.*` dentro del IIFE)
- [ ] `npm run build` sin errores tras cada tarea
- [ ] 2 commits separados

## Funciones NO extraídas en esta fase (diferidas)

Las siguientes funciones de sello.js permanecen en hc.html y se extraen en una fase futura:
- `_generarHCPdf` (~94 líneas, muy integrada con el form)
- `buildHCCompletaHTML` (~85 líneas, muy integrada)
- `verEvalConFirma` (~67 líneas)
- `verSesConFirma` (~55 líneas)

## Siguiente fase

Fase 4 cubrirá las funciones PDF diferidas y potencialmente la extracción del sistema de formularios (`hc/formularios.js`).
