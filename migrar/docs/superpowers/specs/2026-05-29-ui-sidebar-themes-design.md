# UI Redesign: Sidebar + Temas — Spec

**Fecha:** 2026-05-29  
**Proyecto:** CENTYRGC (index.html)  
**Alcance:** Reorganización de navegación y sistema de temas dual

---

## 1. Objetivo

Reemplazar los topbars horizontales por rol (`#docenteTopbar`, `#estTopbarWrap`, topbar de recepción) con:
- **Desktop/tablet (≥768px):** sidebar fijo izquierdo colapsable (240px / 60px)
- **Móvil (<768px):** bottom navbar mejorado
- **Dos temas CSS** togglables en tiempo real por cualquier usuario

No se agregan, quitan ni renombran secciones — solo se reorganizan en la nueva estructura.

---

## 2. Layout

### Desktop (≥768px)
```
┌──────────────────────────────────────────────┐
│  HEADER (sticky, full width, 56px)            │
├─────────┬────────────────────────────────────┤
│         │                                    │
│ SIDEBAR │  CONTENT AREA                      │
│  240px  │  margin-left: 240px                │
│ (60px   │  (60px colapsado)                  │
│ colaps.)│                                    │
└─────────┴────────────────────────────────────┘
```

### Móvil (<768px)
```
┌─────────────────────┐
│  HEADER (sticky)    │
├─────────────────────┤
│  CONTENT AREA       │
│  padding-bottom:80px│
├─────────────────────┤
│  BOTTOM NAV (68px)  │
└─────────────────────┘
```

---

## 3. Sidebar (desktop)

### Estructura HTML
```html
<nav id="appSidebar" class="sidebar">
  <div class="sidebar-nav"><!-- items --></div>
  <div class="sidebar-footer">
    <button id="themeToggle">☀️/🌙</button>
    <button id="sidebarCollapseBtn">‹/›</button>
  </div>
</nav>
```

### Dimensiones y comportamiento
- Expandido: `width: 240px` — ícono (22px) + etiqueta
- Colapsado: `width: 60px` — solo ícono centrado + tooltip en hover
- Transición: `width 0.25s ease`
- Estado guardado en `localStorage` como `centyrgc-sidebar-collapsed`
- El `#appPage .content-main` recibe `margin-left: 240px` (o `60px`) con la misma transición

### Items por rol

**Admin** (separados en dos grupos):
```
Grupo principal:
  📋  Hojas ▸      → sección colapsable; cada hoja cargada dinámicamente
                     aparece como sub-item (igual que los botones de
                     #docenteHojasBtns actuales, pero en vertical)
  📅  Agenda       → mostrarAgenda()
  🏥  HC           → irAHC()
  📋  Casilleros   → abrirPanelAdmin('cas')

── separador ──

Grupo admin:
  👤  Alumnos      → abrirPanelAdmin('al')
  👥  Usuarios     → abrirPanelAdmin('us')
  📄  PDF          → abrirPanelAdmin('pdf')
  📊  Log          → abrirPanelAdmin('log')
  ⚙️  Config Hojas → abrirPanelAdmin('ho')
```

**Docente** (grupo único):
```
  📋  Hojas ▸      → sección colapsable con sub-items dinámicos
  📅  Agenda       → mostrarAgenda()
  🏥  HC           → irAHC()
  📋  Casilleros   → abrirPanelAdmin('cas')
```

**Estudiante** (grupo único):
```
  📋  Mis Notas    → mostrarSecEst('notas')
  📋  Casilleros   → mostrarSecEst('casilleros')
  📅  Agenda       → mostrarSecEst('agenda')
  🏥  HC           → irAHC()
```

**Recepción:** Sin sidebar (vista única, no requiere navegación).

---

## 4. Bottom Nav (móvil <768px)

### Admin / Docente
```
[ 📋 Notas ] [ 📅 Agenda ] [ 🏥 HC ] [ ⋯ Más ]
```
"Más" abre un bottom sheet/drawer con los items admin-only (solo admin):
- 👤 Alumnos · 👥 Usuarios · 📄 PDF · 📊 Log · ⚙️ Config

### Estudiante
```
[ 📋 Notas ] [ 📋 Casilleros ] [ 📅 Agenda ] [ 🏥 HC ]
```

### Toggle de tema en móvil
Ícono ☀️/🌙 se agrega al header (extremo derecho, junto a los botones existentes).

---

## 5. Sistema de Temas

### Implementación
- Atributo `data-theme` en el elemento `<html>`: `"dark"` (default) o `"light"`
- El tema dark es el default — coherente con el estilo actual de la app
- CSS variables definidas en dos bloques:
  ```css
  :root { /* variables dark — tema por defecto */ }
  [data-theme="light"] { /* overrides para tema claro */ }
  ```
- Toggle guardado en `localStorage` con clave `centyrgc-theme`
- Aplicado en `<head>` vía script inline (antes del render para evitar flash)

### Tema "Azul Rey" (dark)
| Variable | Valor |
|---|---|
| `--bg` | `#0f172a` |
| `--surf` | `#1a2744` |
| `--sidebar-bg` | `#1e2050` |
| `--header-bg` | `#0f172a` |
| `--tx` | `#e2e8f0` |
| `--tx2` | `#cbd5e1` |
| `--tx3` | `#94a3b8` |
| `--bd` | `#2d3180` |
| `--nav-active-bg` | `#2563eb` |
| `--nav-active-tx` | `#ffffff` |

### Tema "Claro" (light)
| Variable | Valor |
|---|---|
| `--bg` | `#f8faff` |
| `--surf` | `#ffffff` |
| `--sidebar-bg` | `#f0f4ff` |
| `--header-bg` | `#ffffff` |
| `--tx` | `#1e293b` |
| `--tx2` | `#334155` |
| `--tx3` | `#64748b` |
| `--bd` | `#dbeafe` |
| `--nav-active-bg` | `#dbeafe` |
| `--nav-active-tx` | `#1d4ed8` |

Transición global: `transition: background-color 0.2s, color 0.2s, border-color 0.2s`

---

## 6. Cambios en el HTML/CSS

### Eliminar
- `#docenteTopbar` (reemplazado por sidebar)
- `#estTopbarWrap` (reemplazado por sidebar)
- El div-topbar de `#viewRecepcion` (sin reemplazo, vista única)
- CSS de `.content-toolbar` y `.docente-inner` si quedan sin uso

### Agregar
- `<nav id="appSidebar">` — nuevo componente sidebar
- CSS para `.sidebar`, `.sidebar-nav`, `.sidebar-item`, `.sidebar-footer`
- CSS para `[data-theme="dark"]` y `[data-theme="light"]`
- Función JS `initSidebar(rol)` que renderiza los items correctos según el rol activo
- Función JS `toggleTheme()` y `applyTheme(theme)`
- Función JS `toggleSidebar()` para colapsar/expandir

### Mantener sin cambio
- `#adminSidebar` (es un panel de contenido, no navegación)
- `#adminBottomNav` y `#estBottomNav` (se mejoran visualmente, no se reescriben)
- Todas las funciones JS existentes (no se toca la lógica)
- `hc.html` (fuera del alcance de este spec)

---

## 7. Orden de implementación sugerido

1. Agregar variables CSS de temas + toggle de tema (sin tocar layout)
2. Construir `#appSidebar` en HTML + CSS base
3. Función `initSidebar(rol)` — renderiza items por rol
4. Ajustar `margin-left` del content area + transición
5. Ocultar `#docenteTopbar` / `#estTopbarWrap` / topbar recepción
6. Mejorar bottom navs (visual, tema)
7. Toggle de tema en header móvil
8. Pruebas por rol en desktop + tablet + móvil
