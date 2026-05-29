# UI Sidebar + Temas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar los topbars horizontales por rol con un sidebar fijo en desktop y mejorar los bottom navs en móvil, con sistema de dos temas (oscuro / claro) togglable en tiempo real.

**Architecture:** Se agregan CSS custom properties temáticas al `:root` de `index.html` con overrides en `[data-theme="dark"]`, se añade un `<nav id="appSidebar">` justo dentro de `#appPage`, y la lógica del sidebar vive en un nuevo `src/index/sidebar.js` que se carga antes que `alumnos.js`. Los topbars existentes se ocultan y finalmente se eliminan.

**Tech Stack:** HTML/CSS/JS vanilla (sin framework), Vite 5, Google Apps Script backend (sin cambios). No hay test runner — cada tarea incluye verificación manual en navegador.

---

## Archivos a modificar / crear

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `index.html` | Modificar | Anti-flash script, CSS vars temas, HTML sidebar, CSS sidebar + layout, bottom nav "Más" |
| `src/index/sidebar.js` | Crear | `initSidebar`, `toggleTheme`, `populateSbHojas`, collapse, active state |
| `src/index/alumnos.js` | Modificar | Llamar `initSidebar` y `initTheme` en `startApp()`, quitar show topbar |
| `src/index/vistas.js` | Modificar | Quitar lógica show/resize de `estTopbarWrap`, set active sidebar en `mostrarSecEst` |
| `src/index/notas.js` | Modificar | Llamar `populateSbHojas` en `loadHojas()` |

---

## Task 1: Anti-flash script + CSS variables de temas

**Archivos:**
- Modificar: `index.html` (dentro de `<head>`, lines 3-9 approx)

El anti-flash evita que la página cargue con el tema incorrecto. Las variables `--theme-*` nuevas coexisten con las existentes sin romperlas.

- [ ] **Paso 1.1: Agregar anti-flash script en `<head>` (antes del `<style>`)**

Abre `index.html`. Después de `<meta name="viewport"...>` (línea 5) y antes del `<title>` (línea 6), insertar:

```html
<script>
(function(){
  var t=localStorage.getItem('centyrgc-theme')||'dark';
  document.documentElement.setAttribute('data-theme',t);
})();
</script>
```

- [ ] **Paso 1.2: Agregar variables nuevas al `:root` existente**

En el `<style>` de `index.html`, al final del bloque `:root{...}` (línea 11), agregar las nuevas variables antes del `}` de cierre. El bloque `:root` actual termina con `--sh2:...}`. Agregar:

```css
/* Nuevas: sidebar y temas */
--header-bg:#1a1a3e;--sidebar-bg:#1e2050;
--nav-tx:#c8d2e8;--nav-hover:rgba(255,255,255,.07);
--nav-active-bg:#2563eb;--nav-active-tx:#ffffff;
--header-border:rgba(255,255,255,.08);
```

- [ ] **Paso 1.3: Agregar bloque `[data-theme="dark"]` (ya es el default, copia los valores actuales de header + dark)**

Inmediatamente después del cierre del bloque `:root{...}` agregar:

```css
[data-theme="light"]{
  --bg:#f8faff;--bg2:#eef2ff;--surf:#ffffff;--surf2:#f5f7ff;--surf3:#f0f4ff;
  --tx:#1e293b;--tx2:#334155;--tx3:#64748b;--tx4:#94a3b8;
  --bd:#c7d2fe;--bd2:#e0e7ff;
  --header-bg:#1d4ed8;--sidebar-bg:#eff6ff;
  --nav-tx:#1e3a8a;--nav-hover:#dbeafe;
  --nav-active-bg:#1d4ed8;--nav-active-tx:#ffffff;
  --header-border:rgba(29,78,216,.15);
}
```

- [ ] **Paso 1.4: Actualizar `header` CSS para usar variable**

Buscar en el `<style>`:
```css
header{background:#1a1a3e;border-bottom:1px solid rgba(255,255,255,.08);
```
Cambiar a:
```css
header{background:var(--header-bg);border-bottom:1px solid var(--header-border);
```

- [ ] **Paso 1.5: Verificar en navegador**

```
npm run dev
```
Abrir http://localhost:5173. Pegar en consola:
```js
document.documentElement.setAttribute('data-theme','light')
```
El header debe cambiar a azul real (#1d4ed8). Luego:
```js
document.documentElement.setAttribute('data-theme','dark')
```
Debe volver a navy oscuro.

- [ ] **Paso 1.6: Commit**
```bash
git add index.html
git commit -m "feat: CSS theme variables + anti-flash script (dark/light)"
```

---

## Task 2: Funciones JS de tema + botón en header

**Archivos:**
- Crear: `src/index/sidebar.js`
- Modificar: `index.html` (header HTML, líneas 662-670)

- [ ] **Paso 2.1: Crear `src/index/sidebar.js` con funciones de tema**

```js
// ── sidebar.js: sidebar de navegación + sistema de temas ──────────────────
// Depende de: core.js (g), session.js (session)

// ── TEMA ──────────────────────────────────────────────────────────────────

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('centyrgc-theme', theme);
  const isDark = theme === 'dark';
  const ico = g('sbThemeIco');
  const lbl = g('sbThemeLbl');
  const hdrIco = g('hdrThemeIco');
  if (ico) ico.textContent = isDark ? '🌙' : '☀️';
  if (lbl) lbl.textContent = isDark ? 'Tema oscuro' : 'Tema claro';
  if (hdrIco) hdrIco.textContent = isDark ? '🌙' : '☀️';
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(cur === 'dark' ? 'light' : 'dark');
}

function initTheme() {
  const t = localStorage.getItem('centyrgc-theme') || 'dark';
  applyTheme(t);
}
```

- [ ] **Paso 2.2: Agregar botón de tema al header en `index.html`**

Buscar en el HTML la línea que contiene `id="hdrBtnSalir"`:
```html
<button id="hdrBtnSalir" class="btn-logout" onclick="logout()">Salir</button>
```
Insertar ANTES de esa línea:
```html
<button id="hdrThemeBtn" class="btn-logout" onclick="toggleTheme()" title="Cambiar tema" style="border-color:var(--nav-active-bg);color:var(--nav-tx);min-width:36px;padding:5px 10px"><span id="hdrThemeIco">🌙</span></button>
```

- [ ] **Paso 2.3: Agregar `sidebar.js` al HTML y llamar `initTheme` en `window.onload`**

En `index.html`, `core.js` se carga en línea ~1499. Agregar `sidebar.js` DESPUÉS de `core.js` y ANTES de `session.js`:
```html
<script src="src/index/core.js"></script>
<script src="src/index/sidebar.js"></script>  <!-- ← agregar aquí -->
<script src="src/index/session.js"></script>
```

En `src/index/alumnos.js`, en la función `window.onload` (línea 8), agregar `initTheme()` al inicio:
```js
window.onload = function(){
  initTheme();   // ← agregar esta línea
  const legacy = sessionStorage.getItem('ft_session');
  // ... resto del código sin cambios ...
```

- [ ] **Paso 2.4: Verificar en navegador**

Recargar. El botón 🌙 debe aparecer en el header junto a "Salir". Hacer clic → header cambia a azul real. Recargar página → el tema claro debe persistir (anti-flash lo aplica antes del render). Clic de nuevo → vuelve a oscuro.

- [ ] **Paso 2.5: Commit**
```bash
git add src/index/sidebar.js index.html src/index/alumnos.js
git commit -m "feat: theme toggle button + applyTheme/toggleTheme/initTheme"
```

---

## Task 3: Sidebar HTML en `index.html`

**Archivos:**
- Modificar: `index.html` (dentro de `<div id="appPage">`)

- [ ] **Paso 3.1: Agregar `<nav id="appSidebar">` en `#appPage`**

Buscar la línea que abre `#appPage`:
```html
<div id="appPage" style="display:none">
  <header>
```
Después del cierre de `</header>` (que termina aproximadamente en línea 672), antes de `<div id="viewAdmin"...>`, insertar:

```html
<!-- Sidebar de navegación (desktop ≥768px) -->
<nav id="appSidebar" class="app-sidebar" style="display:none">
  <div class="sb-nav" id="sbNav"></div>
  <div class="sb-footer">
    <button class="sb-theme-btn" onclick="toggleTheme()" title="Cambiar tema">
      <span id="sbThemeIco">🌙</span>
      <span class="sb-label" id="sbThemeLbl">Tema oscuro</span>
    </button>
    <button class="sb-collapse-btn" id="sbCollapseBtn" onclick="toggleSidebarCollapse()" title="Colapsar sidebar">
      <span id="sbCollapseIco">‹</span>
    </button>
  </div>
</nav>
```

- [ ] **Paso 3.2: Verificar HTML parseado sin errores**

En el navegador abrir DevTools → Console. No debe haber errores de parsing. El sidebar no es visible aún (display:none).

---

## Task 4: CSS del sidebar

**Archivos:**
- Modificar: `index.html` (bloque `<style>`, agregar al final antes de `</style>`)

- [ ] **Paso 4.1: Agregar CSS del sidebar al final del bloque `<style>`**

Buscar el cierre `</style>` (justo antes de `<script src="https://cdnjs..."`). Insertar antes de `</style>`:

```css
/* ══ APP SIDEBAR ══════════════════════════════════════════════════════════ */
.app-sidebar{
  position:fixed;top:58px;left:0;
  width:240px;height:calc(100vh - 58px);
  background:var(--sidebar-bg);border-right:1px solid var(--bd);
  display:flex;flex-direction:column;z-index:150;
  transition:width .25s ease;overflow:hidden;
}
.app-sidebar.collapsed{width:60px}

/* Contenido principal se desplaza */
@media(min-width:768px){
  #appPage .content-main{margin-left:240px;transition:margin-left .25s ease}
  body.sidebar-collapsed #appPage .content-main{margin-left:60px}
}

/* En móvil el sidebar no existe */
@media(max-width:767px){.app-sidebar{display:none!important}}

/* Nav items */
.sb-nav{flex:1;overflow-y:auto;overflow-x:hidden;padding:8px 0}
.sb-section-lbl{
  font-size:10px;font-weight:700;color:var(--nav-tx);opacity:.6;
  text-transform:uppercase;letter-spacing:.8px;
  padding:14px 16px 4px;white-space:nowrap;overflow:hidden;
  transition:opacity .2s
}
.app-sidebar.collapsed .sb-section-lbl{opacity:0;height:0;padding:0}
.sb-separator{height:1px;background:var(--bd);margin:8px 12px}
.sb-item{
  display:flex;align-items:center;gap:10px;
  padding:10px 16px;
  color:var(--nav-tx);cursor:pointer;
  border:none;background:none;width:100%;text-align:left;
  font-size:13px;font-weight:600;font-family:'Plus Jakarta Sans',sans-serif;
  white-space:nowrap;transition:background .15s;position:relative
}
.sb-item:hover{background:var(--nav-hover)}
.sb-item.active{background:var(--nav-active-bg);color:var(--nav-active-tx)}
.sb-ico{font-size:18px;flex-shrink:0;width:22px;text-align:center;line-height:1}
.sb-lbl{overflow:hidden;transition:opacity .2s,max-width .25s}
.app-sidebar.collapsed .sb-lbl{opacity:0;max-width:0;pointer-events:none}
/* Tooltip en collapsed */
.app-sidebar.collapsed .sb-item:hover::after{
  content:attr(data-tip);
  position:absolute;left:68px;top:50%;transform:translateY(-50%);
  background:#1a1a3e;color:#fff;font-size:11px;font-weight:600;
  padding:4px 10px;border-radius:6px;white-space:nowrap;z-index:999;pointer-events:none;
  box-shadow:0 2px 8px rgba(0,0,0,.3)
}
/* Sub-items (hojas) */
.sb-sublist{overflow:hidden}
.sb-subitem{
  display:flex;align-items:center;gap:8px;
  padding:7px 16px 7px 48px;
  color:var(--nav-tx);opacity:.85;cursor:pointer;
  border:none;background:none;width:100%;text-align:left;
  font-size:12px;font-weight:600;font-family:'Plus Jakarta Sans',sans-serif;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  transition:background .15s
}
.sb-subitem:hover{background:var(--nav-hover)}
.sb-subitem.active{color:var(--nav-active-tx);background:var(--nav-active-bg);opacity:1}
.app-sidebar.collapsed .sb-sublist{display:none}
/* Footer del sidebar */
.sb-footer{
  border-top:1px solid var(--bd);padding:8px;
  display:flex;align-items:center;gap:6px;flex-shrink:0
}
.sb-theme-btn{
  flex:1;display:flex;align-items:center;gap:8px;
  padding:8px 10px;border:none;background:none;
  color:var(--nav-tx);cursor:pointer;border-radius:8px;
  font-size:12px;white-space:nowrap;overflow:hidden;
  font-family:'Plus Jakarta Sans',sans-serif;transition:background .15s
}
.sb-theme-btn:hover{background:var(--nav-hover)}
.sb-collapse-btn{
  width:32px;height:32px;flex-shrink:0;
  border:1px solid var(--bd);background:none;
  color:var(--nav-tx);border-radius:8px;cursor:pointer;
  font-size:16px;display:flex;align-items:center;justify-content:center;
  transition:background .15s
}
.sb-collapse-btn:hover{background:var(--nav-hover)}
.app-sidebar.collapsed .sb-theme-btn .sb-label{display:none}
/* ══ BOTTOM SHEET "MÁS" (móvil admin) ═══════════════════════════════════ */
#masSheet{
  position:fixed;inset:0;z-index:600;display:none
}
#masSheet.show{display:block}
#masSheetOv{position:absolute;inset:0;background:rgba(10,22,40,.55);backdrop-filter:blur(2px)}
#masSheetPanel{
  position:absolute;bottom:0;left:0;right:0;
  background:var(--surf);border-radius:20px 20px 0 0;
  padding:16px 16px max(env(safe-area-inset-bottom),16px);
  box-shadow:0 -8px 32px rgba(10,22,40,.3)
}
.mas-item{
  display:flex;align-items:center;gap:12px;
  padding:12px 14px;border-radius:12px;
  border:none;background:none;width:100%;text-align:left;
  color:var(--tx);font-size:13px;font-weight:600;
  font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;transition:background .15s
}
.mas-item:hover,.mas-item:active{background:var(--nav-hover)}
.mas-item .mas-ico{font-size:20px;width:26px;text-align:center;flex-shrink:0}
.mas-separator{height:1px;background:var(--bd);margin:6px 0}
```

- [ ] **Paso 4.2: Verificar CSS sin errores**

En DevTools → Console, no debe haber errores CSS. El sidebar sigue invisible (display:none en el elemento).

---

## Task 5: Funciones JS del sidebar

**Archivos:**
- Modificar: `src/index/sidebar.js`

- [ ] **Paso 5.1: Agregar todas las funciones del sidebar a `sidebar.js`**

Abrir `src/index/sidebar.js` y agregar después de las funciones de tema:

```js
// ── SIDEBAR ────────────────────────────────────────────────────────────────

let _sbRol = null;

function initSidebar(rol) {
  _sbRol = rol;
  const sidebar = g('appSidebar');
  const nav = g('sbNav');
  if (!sidebar || !nav) return;
  if (rol === 'recepcion') { sidebar.style.display = 'none'; return; }
  sidebar.style.display = 'flex';
  nav.innerHTML = '';
  _renderSbItems(rol);
  initSidebarCollapse();
  // Actualizar ícono de tema
  const t = localStorage.getItem('centyrgc-theme') || 'dark';
  applyTheme(t);
}

function _renderSbItems(rol) {
  const nav = g('sbNav');
  const items = _getSbItems(rol);
  items.forEach(item => {
    if (item.type === 'sep') {
      nav.insertAdjacentHTML('beforeend', '<div class="sb-separator"></div>');
    } else if (item.type === 'lbl') {
      nav.insertAdjacentHTML('beforeend',
        `<div class="sb-section-lbl">${item.text}</div>`);
    } else if (item.type === 'group') {
      const btn = document.createElement('button');
      btn.className = 'sb-item';
      btn.id = item.id;
      btn.setAttribute('data-tip', item.label);
      btn.innerHTML = `<span class="sb-ico">${item.ico}</span><span class="sb-lbl">${item.label} <span id="${item.id}-arrow" style="font-size:10px;opacity:.6">▾</span></span>`;
      btn.onclick = () => _toggleSbGroup(item.id + '-sub');
      nav.appendChild(btn);
      const sub = document.createElement('div');
      sub.id = item.id + '-sub';
      sub.className = 'sb-sublist';
      nav.appendChild(sub);
    } else {
      const btn = document.createElement('button');
      btn.className = 'sb-item';
      btn.id = item.id;
      btn.setAttribute('data-tip', item.label);
      btn.innerHTML = `<span class="sb-ico">${item.ico}</span><span class="sb-lbl">${item.label}</span>`;
      btn.onclick = item.action;
      nav.appendChild(btn);
    }
  });
}

function _getSbItems(rol) {
  const shared = [
    { type:'group', id:'sbHojas', ico:'📋', label:'Hojas' },
    { type:'item', id:'sbAgenda', ico:'📅', label:'Agenda',
      action: () => { mostrarAgenda(); setSbActive('sbAgenda'); } },
    { type:'item', id:'sbHC', ico:'🏥', label:'HC',
      action: () => irAHC() },
    { type:'item', id:'sbCas', ico:'🗄️', label:'Casilleros',
      action: () => { abrirPanelAdmin('cas'); setSbActive('sbCas'); } },
  ];
  if (rol === 'admin') return [
    ...shared,
    { type:'sep' },
    { type:'lbl', text:'Admin' },
    { type:'item', id:'sbAl',  ico:'👤', label:'Alumnos',
      action: () => { abrirPanelAdmin('al');  setSbActive('sbAl'); } },
    { type:'item', id:'sbUs',  ico:'👥', label:'Usuarios',
      action: () => { abrirPanelAdmin('us');  setSbActive('sbUs'); } },
    { type:'item', id:'sbPdf', ico:'📄', label:'PDF',
      action: () => { abrirPanelAdmin('pdf'); setSbActive('sbPdf'); } },
    { type:'item', id:'sbLog', ico:'📊', label:'Log',
      action: () => { abrirPanelAdmin('log'); setSbActive('sbLog'); } },
    { type:'item', id:'sbHo',  ico:'⚙️', label:'Config Hojas',
      action: () => { abrirPanelAdmin('ho');  setSbActive('sbHo'); } },
  ];
  if (rol === 'docente') return shared;
  if (rol === 'estudiante') return [
    { type:'item', id:'sbENotas', ico:'📋', label:'Mis Notas',
      action: () => { mostrarSecEst('notas');      setSbActive('sbENotas'); } },
    { type:'item', id:'sbECas',   ico:'🗄️', label:'Casilleros',
      action: () => { mostrarSecEst('casilleros'); setSbActive('sbECas'); } },
    { type:'item', id:'sbEAgenda',ico:'📅', label:'Agenda',
      action: () => { mostrarSecEst('agenda');     setSbActive('sbEAgenda'); } },
    { type:'item', id:'sbEHC',    ico:'🏥', label:'HC',
      action: () => irAHC() },
  ];
  return [];
}

function setSbActive(id) {
  document.querySelectorAll('#sbNav .sb-item.active, #sbNav .sb-subitem.active')
    .forEach(el => el.classList.remove('active'));
  const el = g(id);
  if (el) el.classList.add('active');
}

function _toggleSbGroup(subId) {
  const sub = g(subId);
  if (!sub) return;
  const open = sub.style.display !== 'none' && sub.innerHTML !== '';
  sub.style.display = open ? 'none' : 'block';
  const arrowId = subId.replace('-sub', '-arrow');
  const arrow = g(arrowId);
  if (arrow) arrow.textContent = open ? '▸' : '▾';
}

function populateSbHojas(hojas) {
  const sub = g('sbHojas-sub');
  if (!sub) return;
  if (!hojas || !hojas.length) {
    sub.innerHTML = '<div style="padding:6px 16px 6px 48px;font-size:12px;color:var(--tx4)">Sin hojas</div>';
    return;
  }
  sub.innerHTML = '';
  hojas.forEach(h => {
    const btn = document.createElement('button');
    btn.className = 'sb-subitem';
    btn.id = 'sbhoja-' + h.nombre.replace(/\s/g,'_');
    btn.title = h.nombre;
    btn.textContent = h.nombre.length > 22 ? h.nombre.substring(0, 20) + '…' : h.nombre;
    btn.onclick = () => { abrirHoja(h.nombre); setSbHojaActive(btn.id); };
    sub.appendChild(btn);
  });
  sub.style.display = 'block';
  const arrow = g('sbHojas-arrow');
  if (arrow) arrow.textContent = '▾';
}

function setSbHojaActive(id) {
  document.querySelectorAll('#sbNav .sb-item.active, #sbNav .sb-subitem.active')
    .forEach(el => el.classList.remove('active'));
  const el = g(id);
  if (el) el.classList.add('active');
  const grpBtn = g('sbHojas');
  if (grpBtn) grpBtn.classList.add('active');
}

// ── COLAPSO DEL SIDEBAR ────────────────────────────────────────────────────

function toggleSidebarCollapse() {
  const sidebar = g('appSidebar');
  if (!sidebar) return;
  const isCollapsed = sidebar.classList.toggle('collapsed');
  document.body.classList.toggle('sidebar-collapsed', isCollapsed);
  const ico = g('sbCollapseIco');
  if (ico) ico.textContent = isCollapsed ? '›' : '‹';
  localStorage.setItem('centyrgc-sidebar-collapsed', isCollapsed ? '1' : '0');
}

function initSidebarCollapse() {
  const collapsed = localStorage.getItem('centyrgc-sidebar-collapsed') === '1';
  const sidebar = g('appSidebar');
  if (!sidebar) return;
  sidebar.classList.toggle('collapsed', collapsed);
  document.body.classList.toggle('sidebar-collapsed', collapsed);
  const ico = g('sbCollapseIco');
  if (ico) ico.textContent = collapsed ? '›' : '‹';
}

// ── BOTTOM SHEET "MÁS" (admin móvil) ───────────────────────────────────────

function abrirMasSheet() {
  const sheet = g('masSheet');
  if (!sheet) return;
  const panel = g('masSheetPanel');
  if (!panel) return;
  const esAdmin = session && session.rol === 'admin';
  let html = '';
  if (esAdmin) {
    html += `
      <div class="mas-item" onclick="abrirPanelAdmin('cas');cerrarMasSheet()">
        <span class="mas-ico">🗄️</span>Casilleros
      </div>
      <div class="mas-separator"></div>
      <div class="mas-item" onclick="abrirPanelAdmin('al');cerrarMasSheet()">
        <span class="mas-ico">👤</span>Alumnos
      </div>
      <div class="mas-item" onclick="abrirPanelAdmin('us');cerrarMasSheet()">
        <span class="mas-ico">👥</span>Usuarios
      </div>
      <div class="mas-item" onclick="abrirPanelAdmin('pdf');cerrarMasSheet()">
        <span class="mas-ico">📄</span>PDF
      </div>
      <div class="mas-item" onclick="abrirPanelAdmin('log');cerrarMasSheet()">
        <span class="mas-ico">📊</span>Log
      </div>
      <div class="mas-item" onclick="abrirPanelAdmin('ho');cerrarMasSheet()">
        <span class="mas-ico">⚙️</span>Config Hojas
      </div>
      <div class="mas-separator"></div>`;
  }
  html += `
    <div class="mas-item" onclick="abrirPassModal();cerrarMasSheet()">
      <span class="mas-ico">🔒</span>Cambiar contraseña
    </div>
    <div class="mas-item" onclick="logout();cerrarMasSheet()" style="color:var(--red)">
      <span class="mas-ico">🚪</span>Salir
    </div>`;
  panel.innerHTML = html;
  sheet.classList.add('show');
}

function cerrarMasSheet() {
  const sheet = g('masSheet');
  if (sheet) sheet.classList.remove('show');
}
```

- [ ] **Paso 5.2: Verificar que no hay errores de sintaxis**

En el navegador, abrir DevTools → Console. No debe haber errores JS al cargar la página (aunque las funciones aún no estén conectadas).

- [ ] **Paso 5.3: Commit**
```bash
git add src/index/sidebar.js
git commit -m "feat: sidebar JS — initSidebar, theme, collapse, populateSbHojas, masSheet"
```

---

## Task 6: Conectar sidebar al flujo de login

**Archivos:**
- Modificar: `src/index/alumnos.js` (función `startApp`, línea 52)
- Modificar: `src/index/notas.js` (función `loadHojas`, línea 9)
- Modificar: `src/index/vistas.js` (función `iniciarVistaEstudiante`, línea 8)

- [ ] **Paso 6.1: Llamar `initSidebar()` en `startApp()` en `alumnos.js`**

En `alumnos.js`, función `startApp()` (línea 52), al final de la función, antes del cierre `}`:

Buscar:
```js
  } else {
    g('viewAdmin').style.display='block';g('viewEstudiante').style.display='none';iniciarVistaAdmin();
  }
}
```
Reemplazar todo el bloque `if/else if/else` dentro de `startApp` con:
```js
  if(session.rol==='estudiante'){
    g('viewAdmin').style.display='none';
    g('viewEstudiante').style.display='block';
    iniciarVistaEstudiante();
  } else if(session.rol==='recepcion'){
    g('viewAdmin').style.display='none';
    g('viewEstudiante').style.display='none';
    iniciarVistaRecepcion();
  } else {
    g('viewAdmin').style.display='block';
    g('viewEstudiante').style.display='none';
    iniciarVistaAdmin();
  }
  initSidebar(session.rol);
```

- [ ] **Paso 6.2: Llamar `populateSbHojas` en `loadHojas()` en `notas.js`**

En `notas.js`, función `loadHojas()` (línea 9), buscar:
```js
    renderDocenteHojasBtns(hojasFiltradas);
```
Agregar la línea después:
```js
    renderDocenteHojasBtns(hojasFiltradas);
    populateSbHojas(hojasFiltradas);   // ← agregar
```

- [ ] **Paso 6.3: Actualizar `iniciarVistaEstudiante` para manejar responsive con sidebar**

En `vistas.js`, función `iniciarVistaEstudiante()` (línea 8), buscar y reemplazar el bloque de resize con sidebar awareness:

```js
// Antes (líneas 19-27 aprox):
  if(window.innerWidth<=480){
    if(bn) bn.style.display='flex';
    if(tw) tw.style.display='none';
  } else {
    if(bn) bn.style.display='none';
    if(tw) tw.style.display='block';
  }
```
Reemplazar con:
```js
  // Sidebar gestiona la navegación en desktop; bottom nav en móvil
  if(window.innerWidth<768){
    if(bn) bn.style.display='flex';
  } else {
    if(bn) bn.style.display='none';
  }
  // estTopbarWrap se gestiona en Task 9 (ocultar); por ahora solo la lógica responsive
  if(tw) tw.style.display='none';
```

- [ ] **Paso 6.4: Actualizar el `resize` listener en `alumnos.js`**

En `alumnos.js`, el `window.addEventListener('resize', ...)` (líneas 18-28), reemplazar con:
```js
window.addEventListener('resize', function(){
  if (!session || session.rol !== 'estudiante') return;
  var bn = g('estBottomNav');
  if (bn) bn.style.display = window.innerWidth < 768 ? 'flex' : 'none';
});
```

- [ ] **Paso 6.5: Verificar en navegador con login**

Ingresar con rol admin → el sidebar debe aparecer a la izquierda con los items correctos. Sección "Hojas" debe mostrar las hojas dinámicas al desplegarse.

Ingresar con rol estudiante → sidebar con Mis Notas / Casilleros / Agenda / HC.

En móvil (DevTools → responsive 375px) → sidebar debe desaparecer.

- [ ] **Paso 6.6: Commit**
```bash
git add src/index/alumnos.js src/index/notas.js src/index/vistas.js
git commit -m "feat: wire sidebar to login flow — initSidebar, populateSbHojas, responsive"
```

---

## Task 7: Agregar bottom sheet "Más" al HTML

**Archivos:**
- Modificar: `index.html` (agregar HTML del sheet, modificar `#adminBottomNav`)

- [ ] **Paso 7.1: Agregar HTML del bottom sheet `#masSheet` en `index.html`**

Buscar la línea `<!-- Bottom Navigation admin/docente -->` (cerca de línea 1310).
Insertar ANTES de ese comentario:

```html
<!-- Bottom Sheet "Más" (admin/docente móvil) -->
<div id="masSheet">
  <div id="masSheetOv" onclick="cerrarMasSheet()"></div>
  <div id="masSheetPanel"></div>
</div>
```

- [ ] **Paso 7.2: Reemplazar el botón "Clave" y "Salir" del `#adminBottomNav` por "Más"**

Buscar en `#adminBottomNav`:
```html
    <button onclick="abrirPassModal()" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;background:none;border:none;color:var(--n400);cursor:pointer;font-size:10px;font-weight:700;-webkit-tap-highlight-color:transparent">
      <span style="font-size:26px;line-height:1">&#128274;</span><span>Clave</span>
    </button>
    <button onclick="logout()" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;background:none;border:none;color:var(--n400);cursor:pointer;font-size:10px;font-weight:700;-webkit-tap-highlight-color:transparent">
      <span style="font-size:26px;line-height:1">&#128682;</span><span>Salir</span>
    </button>
```
Reemplazar esos dos botones con:
```html
    <button onclick="abrirMasSheet()" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;background:none;border:none;color:var(--n400);cursor:pointer;font-size:10px;font-weight:700;-webkit-tap-highlight-color:transparent">
      <span style="font-size:26px;line-height:1">⋯</span><span>Más</span>
    </button>
```

- [ ] **Paso 7.3: Corregir CSS breakpoints de bottom navs (crítico — zona muerta 480-767px)**

El sidebar se oculta en `<768px`. Los bottom navs deben aparecer exactamente cuando el sidebar desaparece. Los breakpoints actuales crean una zona sin navegación.

En el `<style>` de `index.html`, buscar y cambiar:
```css
@media(max-width:600px){
  body.rol-admin #adminBottomNav,
  body.rol-docente #adminBottomNav { display:flex!important; }
  body.rol-admin .content-main,
  body.rol-docente .content-main { padding-bottom:80px; }
}
```
Por:
```css
@media(max-width:767px){
  body.rol-admin #adminBottomNav,
  body.rol-docente #adminBottomNav { display:flex!important; }
  body.rol-admin .content-main,
  body.rol-docente .content-main { padding-bottom:80px; }
}
```

También buscar la regla del `#estBottomNav` en `@media(max-width:480px)`:
```css
@media(max-width:480px){
  #estBottomNav{display:flex!important}
```
Y cambiarla a `max-width:767px`. Además, añadir la regla de padding para estudiante:
```css
@media(max-width:767px){
  #estBottomNav{display:flex!important}
  body.rol-estudiante .content-main { padding-bottom:80px; }
}
```
(Borrar la línea `#estBottomNav{display:flex!important}` del bloque `@media(max-width:480px)` original.)

- [ ] **Paso 7.4: Aplicar variables de tema a los bottom navs**

En `#adminBottomNav` y `#estBottomNav`, el `style` inline tiene `background:var(--n900)` y `border-top:1px solid var(--n700)`. Cambiarlos a:
- `background:var(--sidebar-bg)` 
- `border-top:1px solid var(--bd)`

Buscar (hay dos ocurrencias, una en cada nav):
```
background:var(--n900);border-top:1px solid var(--n700)
```
Reemplazar por:
```
background:var(--sidebar-bg);border-top:1px solid var(--bd)
```

- [ ] **Paso 7.6: Verificar en móvil**

En DevTools → 375px, ingresar como admin. El bottom nav debe mostrar: Notas · Agenda · HC · ⋯. Tocar "⋯" → debe aparecer el sheet con las opciones. Tocar overlay → se cierra.

- [ ] **Paso 7.7: Commit**
```bash
git add index.html
git commit -m "feat: bottom sheet Más + theme vars en bottom navs"
```

---

## Task 8: Ocultar topbars antiguos

**Archivos:**
- Modificar: `src/index/alumnos.js` (quitar show `docenteTopbar`)
- Modificar: `src/index/vistas.js` (quitar show `estTopbarWrap`)

El objetivo en esta tarea es OCULTAR (no eliminar) los topbars para verificar que el sidebar los reemplaza sin perder funcionalidad. La eliminación del HTML se hace en Task 9 solo después de verificar.

- [ ] **Paso 8.1: Quitar el `docenteTopbar.style.display='block'` en `alumnos.js`**

En `alumnos.js`, función `iniciarVistaAdmin()` (línea 84), buscar:
```js
  if(g('docenteTopbar'))g('docenteTopbar').style.display='block';
```
Cambiar a:
```js
  if(g('docenteTopbar'))g('docenteTopbar').style.display='none';
```

- [ ] **Paso 8.2: Verificar que el sidebar funciona correctamente para admin/docente**

Con el topbar oculto, el sidebar debe ser la única navegación visible en desktop. Probar:
- Clic en "Agenda" → debe abrir la vista de agenda
- Clic en una hoja del sub-grupo → debe abrir el editor
- Clic en "Casilleros" (admin) → debe abrir el panel de casilleros
- El ítem activo debe resaltarse visualmente

- [ ] **Paso 8.3: Commit**
```bash
git add src/index/alumnos.js src/index/vistas.js
git commit -m "feat: ocultar topbars antiguos — navegación migrada al sidebar"
```

---

## Task 9: Eliminar HTML de topbars y limpiar CSS

**Archivos:**
- Modificar: `index.html`

Solo hacer esta tarea después de verificar que el sidebar funciona correctamente en todos los roles.

- [ ] **Paso 9.1: Eliminar `#docenteTopbar` del HTML**

En `index.html`, buscar y eliminar el bloque completo:
```html
    <!-- Topbar Admin + Docente (barra unificada) -->
    <div id="docenteTopbar" style="display:none;...">
      ...
    </div>
```
(Aproximadamente desde línea 959 hasta 984, el `</div>` de cierre.)

- [ ] **Paso 9.2: Eliminar `#estTopbarWrap` del HTML**

Buscar y eliminar:
```html
  <div id="estTopbarWrap" style="...">
    ...
  </div>
```
(Aproximadamente líneas 1065-1084.)

- [ ] **Paso 9.3: Eliminar el div-topbar de `#viewRecepcion`**

En `#viewRecepcion`, eliminar solo el div interno de la barra superior (el que contiene "📅 Calendario de Reservas"):
```html
  <div style="background:var(--n900);border-bottom:1px solid var(--n800);padding:0 16px;position:sticky;top:58px;z-index:100">
    <div style="display:flex;align-items:center;gap:6px;min-height:50px">
      <span style="...">📅 Calendario de Reservas</span>
    </div>
  </div>
```

- [ ] **Paso 9.4: Eliminar CSS de topbars sin uso**

En el `<style>` de `index.html`, buscar y eliminar las reglas que ya no aplican:
- `.docente-inner{...}` (línea ~448)
- `.content-toolbar{...}` (línea ~121)
- Los `@media` que referencian `#docenteTopbar` y `#estTopbarWrap`

- [ ] **Paso 9.5: Verificar todos los roles**

Probar login con cada rol:
- **Admin desktop**: sidebar con dos grupos visible, hojas cargadas, tema toggle funcional, colapso del sidebar
- **Admin móvil (375px)**: bottom nav Notas/Agenda/HC/Más, sheet abre/cierra, HC y logout en sheet
- **Docente desktop**: sidebar con 4 items, hojas cargadas
- **Docente móvil**: bottom nav igual que admin pero sin items de admin en el sheet
- **Estudiante desktop**: sidebar con Mis Notas/Casilleros/Agenda/HC
- **Estudiante móvil**: bottom nav Notas/Casilleros/Agenda/HC
- **Recepción**: sin sidebar, vista única con header

- [ ] **Paso 9.6: Commit final**
```bash
git add index.html src/index/alumnos.js
git commit -m "feat: eliminar topbars obsoletos — sidebar adaptativo completo"
```

---

## Task 10: Ajustes finales y theme polish

**Archivos:**
- Modificar: `index.html` (ajustes CSS menores)
- Modificar: `src/index/sidebar.js` (si hay bugs)

- [ ] **Paso 10.1: Ajustar `content-main` top padding**

El sidebar arranca en `top: 58px` (bajo el header). El content-main actualmente tiene `padding: 20px 24px`. Verificar que no hay solapamiento entre el header y el contenido en desktop. Si el contenido queda muy pegado arriba, ajustar en el `<style>`:

```css
@media(min-width:768px){
  #appPage .content-main { padding-top: 20px; }
}
```

- [ ] **Paso 10.2: Ajustar transición de tema en body**

En el `<style>` de `index.html`, agregar después del bloque `:root`:
```css
body,header,.app-sidebar,.card,input,select,.btn,
#adminBottomNav,#estBottomNav{
  transition:background-color .2s,color .2s,border-color .2s
}
```

- [ ] **Paso 10.3: Verificar tema claro completo**

Activar tema claro (clic en ☀️). Verificar:
- Fondo de página → `#f8faff` (azul muy pálido)
- Sidebar → `#eff6ff` (azul pastel)
- Header → azul real `#1d4ed8`
- Item activo en sidebar → fondo `#1d4ed8`, texto blanco
- Cards de contenido → fondo blanco con borde azul pálido

- [ ] **Paso 10.4: Commit final de pulido**
```bash
git add index.html src/index/sidebar.js
git commit -m "feat: theme transitions polish + content-main spacing"
```

---

## Resumen de archivos modificados

| Archivo | Cambios |
|---|---|
| `index.html` | Anti-flash script, CSS vars temas, HTML sidebar, CSS sidebar completo, bottom sheet Más, botón tema en header, eliminar topbars HTML/CSS |
| `src/index/sidebar.js` | Nuevo archivo: initSidebar, toggleTheme, populateSbHojas, collapse, masSheet |
| `src/index/alumnos.js` | initTheme en onload, initSidebar en startApp, ocultar docenteTopbar, fix resize |
| `src/index/notas.js` | populateSbHojas call en loadHojas |
| `src/index/vistas.js` | Quitar estTopbarWrap show, fix responsive estudiante |
