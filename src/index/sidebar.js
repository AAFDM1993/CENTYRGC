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
  const esDocente = session && session.rol === 'docente';
  let html = '';
  if (esAdmin || esDocente) {
    html += `
      <div class="mas-item" onclick="abrirPanelAdmin('cas');cerrarMasSheet()">
        <span class="mas-ico">🗄️</span>Casilleros
      </div>
      <div class="mas-separator"></div>`;
  }
  if (esAdmin) {
    html += `
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
