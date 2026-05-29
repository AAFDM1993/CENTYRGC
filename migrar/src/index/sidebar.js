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
