# Migración index.html a Vite — Design Spec

**Fecha:** 2026-05-27  
**Estado:** Aprobado

---

## Goal

Migrar el inline script de ~4545 líneas de `migrar/index.html` a archivos JS modulares bajo `migrar/src/index/`, siguiendo el mismo patrón global-scope plain-script que se usó en la migración de hc.html. Al finalizar, el inline script quedará vacío y toda la lógica vivirá en archivos versionados e independientes.

---

## Contexto

`migrar/index.html` es la página de gestión académica (alumnos, notas, agenda, exportaciones). Actualmente carga solo `xlsx.full.min.js` y contiene ~4545 líneas de JavaScript inline. La migración sigue el modelo de hc.html: extracción gradual, archivo por archivo, con Vite como build tool.

El archivo original (fuera de `migrar/`) en `index.html` permanece intacto durante toda la migración.

---

## Architecture

### Patrón de carga

Mismo patrón que `migrar/hc.html`:
- Plain `<script src="...">` sin `type="module"`
- Scope global — funciones y variables accesibles entre scripts
- Referencias entre scripts dentro de cuerpos de funciones (no en top-level), lo que garantiza orden seguro
- Vite entry point ya configurado en `vite.config.js`

### Por qué NO se carga `shared/utils.js`

`shared/utils.js` declara `const g`, `const esc` y `function toast`. El inline script de index.html también declara `const g`, `const esc` (implementación diferente) y `function toast` (implementación diferente con DOM distinto). Los `const` no se pueden redeclarar entre scripts — causaría `SyntaxError`. En vez de modificar los shared files (que hc.html usa en producción), se crea `src/index/core.js` con las versiones específicas de index.

### Load order final de index.html

```
xlsx.full.min.js                     ← ya existe, no se toca
src/index/core.js                    ← utilidades base (g, esc, toast, GAS_URL, etc.)
src/index/api.js                     ← capa API (apiGet, apiPost, cache)
src/index/session.js                 ← gestión de sesión
src/index/alumnos.js                 ← gestión de alumnos
src/index/notas.js                   ← editor de notas / renderAlBlock
src/index/exportar.js                ← exportación / PDF
src/index/config-index.js            ← configuración del sistema
src/index/log.js                     ← sistema de log
src/index/agenda.js                  ← calendario / agenda (bloque más grande)
src/index/admin.js                   ← panel de administración
src/index/vistas.js                  ← vistas recepción y alumno
src/index/casilleros.js              ← sistema de casilleros / lockers
<inline script>                      ← vacío al finalizar
```

---

## Archivos — Contenido Detallado

### `src/index/core.js` (~120 líneas)

Utilidades base específicas de index.html:

| Nombre | Descripción |
|--------|-------------|
| `const GAS_URL` | URL del Google Apps Script de index |
| `const g` | `id => document.getElementById(id)` (idéntica a utils.js) |
| `const esc` | Escapa `\`, `'`, `"` → incluye `&quot;` (diferente de utils.js) |
| `const esc2` | Escapa `"` y `'` para atributos HTML |
| `function toast(t, m, tp)` | Toast con DOM de index (`#toast`, `#ttt`, `#ttm`) |
| `function confirmDialog(msg)` | Modal confirm personalizado |
| `const delay` | `ms => new Promise(r => setTimeout(r, ms))` |

### `src/index/api.js` (~100 líneas)

Capa de comunicación con GAS:

| Nombre | Descripción |
|--------|-------------|
| `_cache`, `_pending` | Cache en memoria con TTL configurable |
| `function apiGet(fn, params)` | GET con cache, usa `GAS_URL` |
| `function apiPost(fn, data)` | POST, usa `GAS_URL`, llama `saveSession` |
| `function checkConnectivity()` | Ping de conectividad |

Depende de: `core.js` (para `GAS_URL`), `session.js` (para `saveSession`).

### `src/index/session.js` (~80 líneas)

Estado de sesión del usuario:

| Nombre | Descripción |
|--------|-------------|
| `const SESSION_KEY` | `'ft_session_v2'` |
| `let session` | Estado de sesión actual (null inicial) |
| `let alumnos` | Lista de alumnos cargados |
| `let saveTimers` | Timers de auto-guardado |
| `let drawerIdx` | Índice del drawer activo (-1 = ninguno) |
| `let hojaActiva`, `let hojaData` | Hoja de notas activa y sus datos |
| `let cursos` | Cursos desde localStorage |
| `function saveSession(s)` | Persiste sesión en localStorage |
| `function loadSession()` | Carga sesión desde localStorage |
| `function clearSession()` | Limpia sesión y vars de estado |

### `src/index/alumnos.js`

Gestión de alumnos: render de lista, búsqueda, alta/baja, vista de drawer de alumno.

### `src/index/notas.js`

Editor de notas y `renderAlBlock` — renderizado del bloque de calificaciones por alumno.

### `src/index/exportar.js`

Exportación a Excel (via xlsx.js), PDF, y descarga de reportes.

### `src/index/config-index.js`

Sistema de configuración: claves de configuración, render del panel config, guardado.

> Nota: se llama `config-index.js` (no `config.js`) para evitar conflicto de nombre con `src/hc/config.js` en el bundle de Vite.

### `src/index/log.js`

Sistema de log de actividad: render, filtros, guardado de entradas.

### `src/index/agenda.js`

Calendario y agenda: el bloque más grande (~1500 líneas). Incluye render del calendario mensual, gestión de turnos, modales de turno, aviso de última hora.

### `src/index/admin.js`

Panel de administración: orchestrator que conecta todos los panels, drawers, y acciones admin.

### `src/index/vistas.js`

Vistas de recepción y alumno (pantallas alternativas a la vista admin).

### `src/index/casilleros.js`

Sistema de casilleros / lockers: asignación, liberación, vista de estado.

---

## Plan de Fases

| Fase | Archivos | Líneas est. |
|------|----------|------------|
| 1 | core.js + api.js + session.js | ~300 |
| 2 | alumnos.js | ~400 |
| 3 | notas.js | ~600 |
| 4 | exportar.js + config-index.js + log.js | ~600 |
| 5 | agenda.js | ~1500 |
| 6 | admin.js + vistas.js + casilleros.js | ~900 |
| 7 | inline script → vacío | — |

---

## Estrategia de Extracción (por fase)

Para cada archivo a extraer:

1. **Identificar boundaries** — número de línea de inicio y fin del bloque en el inline script
2. **Crear el archivo JS** en `migrar/src/index/` con el bloque extraído
3. **Agregar `<script src>`** en index.html antes del inline script (en orden)
4. **Eliminar** esas líneas del inline script
5. **Verificar build** — `npm run build` sin errores
6. **Verificar funcionalidad** en `npm run dev`
7. **Commit**

El inline script puede contener referencias temporales a funciones que se moverán en fases posteriores — esto es seguro porque las funciones solo se llaman durante interacción del usuario, no en parse time.

---

## Decisiones de Compatibilidad

| Función | index.html versión | shared/utils.js versión | Resolución |
|---------|-------------------|------------------------|------------|
| `g(id)` | `s => document.getElementById(s)` | `id => document.getElementById(id)` | Idéntica. `core.js` la define; no se carga utils.js |
| `esc(s)` | Escapa `\`, `'`, `"` (agrega `&quot;`) | Escapa `\`, `'` (sin `&quot;`) | Diferente. `core.js` usa versión de index |
| `esc2(s)` | Escapa `"` y `'` | `e2` en utils.js: escapa `&`, `<`, `>` | Completamente diferente. `core.js` mantiene `esc2` de index |
| `toast(t,m,tp)` | Usa `#toast`, `#ttt`, `#ttm` | Usa `#hcToast`, crea divs nuevos | Diferente. `core.js` usa versión de index |
| `apiGet/apiPost` | Usa `GAS_URL`, llama `saveSession` | Usa `HC_URL`, llama `saveSess` | Diferente. `api.js` de index tiene su propia implementación |
| `SESSION_KEY` | `'ft_session_v2'` | `'hc_session_v1'` | Diferente. `session.js` de index define la suya |

---

## Invariantes de Seguridad

Los mismos que se mantuvieron en hc.html:
- `const GAS_URL` va en `core.js`, NO en el inline script
- `let session = null` va en `session.js`, NO en el inline script
- No usar `innerHTML` con data sin escapar — siempre `esc()` o `esc2()` según contexto
- `migrar/dist/` y `migrar/node_modules/` no se commitean (protegidos por .gitignore)

---

## Archivos Afectados

**Creados:**
- `migrar/src/index/core.js`
- `migrar/src/index/api.js`
- `migrar/src/index/session.js`
- `migrar/src/index/alumnos.js`
- `migrar/src/index/notas.js`
- `migrar/src/index/exportar.js`
- `migrar/src/index/config-index.js`
- `migrar/src/index/log.js`
- `migrar/src/index/agenda.js`
- `migrar/src/index/admin.js`
- `migrar/src/index/vistas.js`
- `migrar/src/index/casilleros.js`

**Modificados:**
- `migrar/index.html` — se agregan `<script src>` y se elimina contenido del inline script gradualmente

**No modificados:**
- `migrar/src/shared/utils.js` — sin cambios
- `migrar/src/hc/*.js` — sin cambios
- `migrar/hc.html` — sin cambios
- `index.html` (raíz del proyecto) — sin cambios
