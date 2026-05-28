# Migración a Vite — Fase 5: formulario.js y config.js

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extraer el sistema de construcción de formulario clínico y el panel de configuración desde `hc.html` a archivos JS separados.

**Architecture:** Igual que fases anteriores — plain `<script src>` sin `type="module"`, funciones en scope global. Task 1 extrae el bloque de formulario (1018 líneas contiguas incluyendo `ESCALAS_CATALOGO` y todos los constructores de secciones de formulario). Task 2 extrae el bloque de configuración (370 líneas al final del inline script incluyendo consentimiento, plantigrafía y config).

**Tech Stack:** Vite 5, JavaScript vanilla, PowerShell (Windows 11)

---

## Estado actual de hc.html (al inicio de esta fase)

```html
<script src="/src/shared/utils.js"></script>
<script src="/src/shared/api.js"></script>
<script src="/src/shared/session.js"></script>
<script src="/src/hc/sello.js"></script>
<script src="/src/hc/pdf.js"></script>
<script src="/src/hc/escalas.js"></script>
<script src="/src/hc/secciones.js"></script>
<script>
  <!-- script principal: ~4600 líneas inline -->
</script>
<script src="/src/hc/widget-postural.js"></script>
```

## Mapa de archivos

| Archivo | Líneas aprox. en hc.html | Contenido |
|---------|--------------------------|-----------|
| `migrar/src/hc/formulario.js` | 3009-4026 | ESCALAS_CATALOGO, plantillaHTML, secWrap, secFiliacion, secAnamnesis, secTrauma, pruebas funcionales, scale motor helpers, secEscalas, _renderBloqueEscala |
| `migrar/src/hc/config.js` | 4468-4837 | subirConsentimientoUI, verConsentimientoUI, eliminarConsentimientoUI, _precargar/inicializar/subir/eliminarPlantigrafia, renderConfig, cfgHandleFile, cfgCancelLogo, cfgSubirLogo, guardarNombreEmpresa |
| `migrar/hc.html` | Pierde 2 bloques, gana 2 `<script src>` |

**Orden final de scripts en hc.html tras esta fase:**
```
utils.js → api.js → session.js → sello.js → pdf.js → escalas.js → secciones.js → formulario.js → config.js → <script principal> → widget-postural.js
```

---

### Task 1: Extraer `src/hc/formulario.js`

**Files:**
- Create: `migrar/src/hc/formulario.js`
- Modify: `migrar/hc.html`

Bloque contiguo de ~1018 líneas que contiene todo el sistema de construcción del formulario HC: el catálogo de escalas (`ESCALAS_CATALOGO`), la plantilla de secciones (`plantillaHTML`), los constructores de sección de filiación, anamnesis y trauma, el sistema de pruebas funcionales, los helpers de motor de escalas y el renderizador de bloques de escala.

Estas funciones son LLAMADAS por `guardarHC` (que permanece en hc.html) y por `plantillaHTML` mismo. Todas usan `g()`, `e2()` de utils.js y llaman a funciones de secciones.js — todo funciona en scope global.

- [ ] **Step 1: Confirmar líneas exactas**

```powershell
Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Pattern '^function plantillaHTML|^function filtrarRegiones|^const ESCALAS_CATALOGO'
```

Esperado:
- `plantillaHTML` ~3009 (inicio del bloque)
- `ESCALAS_CATALOGO` ~3658 (dentro del bloque — se extrae junto)
- `filtrarRegiones` ~4027 (marca el FIN — no se extrae)

- [ ] **Step 2: Extraer el bloque y crear formulario.js**

```powershell
$lines = Get-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html"

$startF = ($lines | Select-String -Pattern '^function plantillaHTML').LineNumber - 1  # 0-based
$endF   = ($lines | Select-String -Pattern '^function filtrarRegiones').LineNumber - 2  # 0-based

Write-Host "Bloque formulario: líneas $($startF+1) a $($endF+1) (total: $($endF - $startF + 1))"

$bloque = $lines[$startF..$endF]
$header = @('// Construcción del formulario HC: catálogo de escalas, plantilla por categoría, secciones de anamnesis/trauma, pruebas funcionales', '')
($header + $bloque) | Set-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\src\hc\formulario.js" -Encoding UTF8
Write-Host "Líneas escritas: $($bloque.Count + $header.Count)"
```

Esperado: ~1020 líneas.

- [ ] **Step 3: Añadir `<script src="/src/hc/formulario.js">` a hc.html**

Usar el Edit tool para cambiar:
```html
<script src="/src/hc/secciones.js"></script>
<script>
```
A:
```html
<script src="/src/hc/secciones.js"></script>
<script src="/src/hc/formulario.js"></script>
<script>
```

Lee primero el encabezado de hc.html para confirmar el texto exacto antes de editar.

- [ ] **Step 4: Eliminar el bloque de hc.html**

```powershell
$content = Get-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Raw -Encoding UTF8

# Desde plantillaHTML hasta justo antes de filtrarRegiones
$pattern = '(?s)function plantillaHTML\(catId, pac\)\{.+?(?=function filtrarRegiones\()'
$newContent = [regex]::Replace($content, $pattern, '')

if ($newContent -eq $content) {
    Write-Host "WARN: regex no funcionó — usar Edit tool con texto exacto de primera y última línea del bloque"
} else {
    Set-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" $newContent -Encoding UTF8
    Write-Host "OK: bloque formulario eliminado"
}
```

Si el regex falla: usar el Read tool para obtener las líneas exactas de inicio (primera línea de `function plantillaHTML`) y fin (línea justo antes de `function filtrarRegiones`), luego usar el Edit tool con exact string matching.

- [ ] **Step 5: Verificar que las funciones no están duplicadas**

```powershell
@('plantillaHTML','secWrap','secFiliacion','secAnamnesis','secTrauma','ESCALAS_CATALOGO','_renderBloqueEscala') | ForEach-Object {
    $found = Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Pattern "$_"
    if ($found) {
        # Verificar que no es una definición (solo usages son OK)
        $def = Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Pattern "(function $_\(|const $_\s*=)"
        if ($def) { Write-Host "DUPLICADO DEFINICION: $_ en hc.html línea $($def.LineNumber)" }
        else { Write-Host "OK: $_ solo aparece como uso (no definición)" }
    } else { Write-Host "OK: $_ no está en hc.html" }
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

Esperado: sin errores. Warnings sobre chunk size son aceptables.

- [ ] **Step 8: Commit**

```powershell
cd D:\projectoshtmls\CENTYRGC\CENTYRGC
git add migrar/src/hc/formulario.js migrar/hc.html
git commit -m "refactor: extraer formulario.js desde hc.html (plantilla HC, anamnesis, ESCALAS_CATALOGO)"
```

---

### Task 2: Extraer `src/hc/config.js`

**Files:**
- Create: `migrar/src/hc/config.js`
- Modify: `migrar/hc.html`

Bloque de ~370 líneas al **final del script inline** (justo antes del `</script>`). Contiene:
- Consentimiento informado: `subirConsentimientoUI`, `verConsentimientoUI`, `eliminarConsentimientoUI`
- Plantigrafía: `_precargarPlantigrafia`, `_inicializarPlantigrafia`, `_subirPlantigrafia`, `_eliminarPlantigrafia`
- Panel de configuración: `renderConfig`, `cfgHandleFile`, `cfgCancelLogo`, `cfgSubirLogo`, `guardarNombreEmpresa`

Como estas funciones están al **final** del inline script, la eliminación debe hacerse cuidadosamente para que el `</script>` quede en el lugar correcto.

- [ ] **Step 1: Confirmar líneas exactas**

```powershell
Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Pattern '^async function subirConsentimientoUI|^function renderConfig|^async function guardarNombreEmpresa|^</script>'
```

Esperado:
- `subirConsentimientoUI` ~3468 (inicio del bloque — los números cambiaron porque Task 1 eliminó ~1018 líneas)
- `renderConfig` ~3598
- `guardarNombreEmpresa` ~3820
- `</script>` ~3838 (línea que cierra el inline script — marca el FIN, no se extrae)

- [ ] **Step 2: Extraer el bloque y crear config.js**

```powershell
$lines = Get-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html"

$startC = ($lines | Select-String -Pattern '^async function subirConsentimientoUI').LineNumber - 1  # 0-based
$endC   = ($lines | Select-String -Pattern '^</script>').LineNumber - 2  # línea justo antes de </script> (0-based)

Write-Host "Bloque config: líneas $($startC+1) a $($endC+1) (total: $($endC - $startC + 1))"

$bloque = $lines[$startC..$endC]
$header = @('// Consentimiento informado, plantigrafía y panel de configuración del sistema', '')
($header + $bloque) | Set-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\src\hc\config.js" -Encoding UTF8
Write-Host "Líneas escritas: $($bloque.Count + $header.Count)"
```

Esperado: ~372 líneas.

- [ ] **Step 3: Añadir `<script src="/src/hc/config.js">` a hc.html**

Usar el Edit tool para cambiar:
```html
<script src="/src/hc/formulario.js"></script>
<script>
```
A:
```html
<script src="/src/hc/formulario.js"></script>
<script src="/src/hc/config.js"></script>
<script>
```

- [ ] **Step 4: Eliminar el bloque de hc.html**

```powershell
$content = Get-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Raw -Encoding UTF8

# Desde subirConsentimientoUI hasta justo antes de </script>
# El bloque empieza con el comment block y luego la función
$pattern = '(?s)async function subirConsentimientoUI\(input, evalId\)\{.+?(?=\n</script>)'
$newContent = [regex]::Replace($content, $pattern, '')

if ($newContent -eq $content) {
    Write-Host "WARN: regex no funcionó — usar Edit tool con texto exacto"
} else {
    Set-Content "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" $newContent -Encoding UTF8
    Write-Host "OK: bloque config eliminado"
}
```

**IMPORTANTE:** Verificar que `</script>` sigue en hc.html después de la eliminación:
```powershell
Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Pattern '^</script>'
```

Si el regex eliminó también el `</script>`, hay que restaurarlo usando el Edit tool.

- [ ] **Step 5: Verificar que las funciones no están duplicadas**

```powershell
@('subirConsentimientoUI','verConsentimientoUI','eliminarConsentimientoUI','_precargarPlantigrafia','renderConfig','cfgSubirLogo','guardarNombreEmpresa') | ForEach-Object {
    $found = Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Pattern "function $_\("
    if ($found) { Write-Host "DUPLICADO: $_ en hc.html línea $($found.LineNumber)" }
    else { Write-Host "OK: $_ no está en hc.html" }
}
```

- [ ] **Step 6: Verificar que el inline script cierra correctamente**

```powershell
# El </script> debe existir exactamente una vez como línea propia
$sc = Select-String -Path "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html" -Pattern '^</script>'
Write-Host "Ocurrencias de </script>: $($sc.Count)"
# Y debe haber contenido justo antes (el último función del inline script)
$sc | ForEach-Object { Write-Host "  línea $($_.LineNumber): $($_.Line)" }
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
git add migrar/src/hc/config.js migrar/hc.html
git commit -m "refactor: extraer config.js desde hc.html (consentimiento, plantigrafia, panel config)"
```

---

## Criterios de éxito de Fase 5

- [ ] `migrar/src/hc/formulario.js` existe con `plantillaHTML`, `secWrap`, `secFiliacion`, `secAnamnesis`, `secTrauma`, `ESCALAS_CATALOGO`, `_renderBloqueEscala`
- [ ] `migrar/src/hc/config.js` existe con `subirConsentimientoUI`, `renderConfig`, `cfgSubirLogo`, `guardarNombreEmpresa`
- [ ] `migrar/hc.html` tiene los 2 nuevos `<script src>` en el orden correcto (antes del script principal)
- [ ] El inline `</script>` sigue presente exactamente una vez en hc.html
- [ ] Las funciones extraídas NO están duplicadas en hc.html
- [ ] `npm run build` sin errores tras cada tarea
- [ ] 2 commits separados

## Funciones NO extraídas en esta fase

Permanecen en hc.html para fases futuras (~2600 líneas restantes):
- Inicialización: `hcAplicarPaleta`, `cargarBrand`, `aplicarBrand`, timers, `iniciarApp`, `navTo`
- Búsqueda: `renderBusqHC`, `buscarHC`, `exportarDocumento`
- Visor HTML: `buildEvalHTML` (~365 líneas), `buildSesHTML`, helpers `_build*`
- Export HC: `renderExportHC`, `buscarPacExport`, `abrirSelectorExportPDF`, `exportarHCPaciente`
- Gestión pacientes: `renderPacs`, `abrirPac`, `abrirFrmPac`, `evalCard`, `sesCard`, `guardarSes`, `enviarEval`, `enviarSes`, revisiones, `renderPend`, `renderCats`, CRUD pacientes
- Región/ROM: `filtrarRegiones`, `agregarRegion`, `quitarRegion`, `mkRomParalelo`, `actualizarTablas`
- Guardado: `guardarHC` (~260 líneas)
- Modales UI: `abrirModalCategoria`, `calcularEdadAuto`, `iniciarPollingPendientes`

## Siguiente fase

Fase 6 cubrirá los bloques de visor HTML (`buildEvalHTML`, `buildSesHTML`) y gestión de pacientes.
