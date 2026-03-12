/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  centyr-admin.js  v4.0                                           ║
 * ║  Constructor de Cursos — Modelo EV + SS base + SS extra          ║
 * ║  ── Dependencias: centyr-core.js ──                              ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 *  Estructura de un curso:
 *  {
 *    curso,           ← nombre libre (ej. "MyT II", "Traumatología")
 *    capacidad,       ← N° pacientes por alumno
 *    sesionesBase,    ← N° SS base (SS1…SSn)
 *    pesoEV,          ← peso % de la Evaluación Inicial
 *    pesoSS,          ← peso % del promedio de SS base (pesoEV+pesoSS=100)
 *    tieneExtra,      ← boolean — activa columnas extra (Eval. Campaña)
 *    sesionesExtra,   ← N° de columnas extra disponibles
 *    porcentajeExtra, ← Prom(SS extra) × X% se suma como bono
 *    fechaGuardado
 *  }
 *
 *  Fórmula nota del paciente:
 *    Base = (EV × pesoEV%) + (PromSS × pesoSS%)
 *    Bono = Prom(SS_extra) × porcentajeExtra%
 *    Nota paciente = min(20, Base + Bono)
 *
 *  Nota final del alumno = Promedio de notas de todos sus pacientes
 */

;(function () {
    'use strict';

    if (!CENTYR.db.estructuras_cursos) CENTYR.db.estructuras_cursos = [];

    // ═══════════════════════════════════════════════
    //  TABS DEL PANEL ADMIN
    // ═══════════════════════════════════════════════
    function adminTab(tabId) {
        ['tab-usuarios','tab-notas-cfg','tab-exportar','tab-cursos'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = id === tabId ? 'block' : 'none';
        });
        const labels = {
            'tab-usuarios':  'btn-tab-usuarios',
            'tab-notas-cfg': 'btn-tab-notas-cfg',
            'tab-exportar':  'btn-tab-exportar',
            'tab-cursos':    'btn-tab-cursos'
        };
        Object.values(labels).forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) { btn.style.background = '#eee'; btn.style.color = '#555'; }
        });
        const activeBtn = document.getElementById(labels[tabId]);
        if (activeBtn) { activeBtn.style.background = 'var(--admin)'; activeBtn.style.color = 'white'; }

        if (tabId === 'tab-notas-cfg') {
            const sel = document.getElementById('cfg-alumno-sel');
            const alumnos = CENTYR.db.usuarios.filter(u => u.rol === 'alumno');
            sel.innerHTML = '<option value="">-- Selecciona un alumno --</option>';
            alumnos.forEach(a => sel.innerHTML += `<option value="${a.usuario}">${a.nombre_completo} (${a.codigo || 'Sin código'})</option>`);
        }
        if (tabId === 'tab-cursos') {
            renderCursosGuardados();
            _renderSugerencias();
        }
    }

    // ═══════════════════════════════════════════════
    //  NOMBRE DE CURSO — INPUT LIBRE con sugerencias
    // ═══════════════════════════════════════════════

    function _renderSugerencias() {
        const div   = document.getElementById('curso-sugerencias');
        if (!div) return;
        const lista = CENTYR.db.estructuras_cursos || [];
        if (!lista.length) { div.style.display = 'none'; return; }
        div.style.display = 'flex';
        div.innerHTML = lista.map(e =>
            `<span onclick="cargarEstructuraCurso('${e.curso}')"
                   title="Cargar estructura de ${e.curso}"
                   style="background:#EEF4FF;color:var(--admin);border:1.5px solid var(--admin);
                          border-radius:20px;padding:3px 12px;font-size:0.75rem;font-weight:600;
                          cursor:pointer;transition:all 0.2s;">${e.curso}</span>`
        ).join('');
    }

    function cursoNombreChange() {
        const nombre = (document.getElementById('curso-nombre-input')?.value || '').trim();
        const wrap   = document.getElementById('curso-grupos-wrap');
        if (!wrap) return;
        if (nombre.length >= 2) {
            wrap.style.display = 'block';
            const est = (CENTYR.db.estructuras_cursos || []).find(e =>
                e.curso.toLowerCase() === nombre.toLowerCase());
            if (est) {
                _setCursoConfig(est);
                mostrarNotificacion(`📂 Se cargó la estructura guardada de "${est.curso}"`);
            }
            cursoConfigChange();
        } else {
            wrap.style.display = 'none';
        }
    }

    function nuevoCurso() {
        const inp = document.getElementById('curso-nombre-input');
        if (inp) inp.value = '';
        const s = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
        s('curso-capacidad',     8);
        s('curso-sesiones-base', 10);
        s('curso-peso-ev',       20);
        s('curso-peso-ss',       80);
        s('curso-sesiones-extra', 5);
        s('curso-pct-extra',     20);
        const chk = document.getElementById('curso-tiene-extra');
        if (chk) chk.checked = true;
        toggleExtraSection(true);
        const wrap = document.getElementById('curso-grupos-wrap');
        if (wrap) wrap.style.display = 'none';
        const preview = document.getElementById('curso-preview');
        if (preview) preview.innerHTML = '<p style="color:#999;text-align:center;padding:16px;">Escribe el nombre del curso para ver la vista previa.</p>';
        mostrarNotificacion('✨ Formulario listo para nuevo curso');
    }

    // Aliases de compatibilidad con HTML previo
    function cursoSelChange()       { cursoNombreChange(); }
    function cursoCapacidadChange() { cursoConfigChange(); }
    function agregarGrupoCurso()    { cursoConfigChange(); }
    function eliminarGrupoCurso()   { cursoConfigChange(); }
    function actualizarGrupoCurso() { cursoConfigChange(); }
    function renderGruposCurso()    { cursoConfigChange(); }

    // ═══════════════════════════════════════════════
    //  LEER / ESCRIBIR CONFIGURACIÓN DEL FORMULARIO
    // ═══════════════════════════════════════════════
    function _getCursoConfig() {
        return {
            curso:           (document.getElementById('curso-nombre-input')?.value || '').trim(),
            capacidad:       parseInt(document.getElementById('curso-capacidad')?.value)       || 8,
            sesionesBase:    parseInt(document.getElementById('curso-sesiones-base')?.value)   || 10,
            pesoEV:          parseInt(document.getElementById('curso-peso-ev')?.value)         || 20,
            pesoSS:          parseInt(document.getElementById('curso-peso-ss')?.value)         || 80,
            tieneExtra:      document.getElementById('curso-tiene-extra')?.checked             ?? true,
            sesionesExtra:   parseInt(document.getElementById('curso-sesiones-extra')?.value)  || 5,
            porcentajeExtra: parseInt(document.getElementById('curso-pct-extra')?.value)       || 20,
        };
    }

    function _setCursoConfig(est) {
        const s = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
        const inp = document.getElementById('curso-nombre-input');
        if (inp && est.curso) inp.value = est.curso;
        s('curso-capacidad',     est.capacidad       || 8);
        s('curso-sesiones-base', est.sesionesBase    || 10);
        s('curso-peso-ev',       est.pesoEV          || 20);
        s('curso-peso-ss',       est.pesoSS          || 80);
        s('curso-sesiones-extra',est.sesionesExtra   || 5);
        s('curso-pct-extra',     est.porcentajeExtra || 20);
        const chk = document.getElementById('curso-tiene-extra');
        if (chk) chk.checked = est.tieneExtra !== false;
        toggleExtraSection(est.tieneExtra !== false);
        const wrap = document.getElementById('curso-grupos-wrap');
        if (wrap) wrap.style.display = 'block';
    }

    function toggleExtraSection(activo) {
        const sec = document.getElementById('curso-extra-seccion');
        if (sec) sec.style.display = activo ? 'block' : 'none';
        cursoConfigChange();
    }

    // ═══════════════════════════════════════════════
    //  RECALCULAR BARRA + FÓRMULA + PREVIEW
    // ═══════════════════════════════════════════════
    function cursoConfigChange() {
        const cfg = _getCursoConfig();
        _actualizarBarraPesos(cfg);
        _actualizarFormula(cfg);
        _actualizarHintsExtra(cfg);
        renderPreviewCurso();
    }

    function actualizarBarraPct() { cursoConfigChange(); }

    function _actualizarBarraPesos(cfg) {
        const total = cfg.pesoEV + cfg.pesoSS;
        const barEV = document.getElementById('curso-pct-bar-ev');
        const barSS = document.getElementById('curso-pct-bar-ss');
        const lbl   = document.getElementById('curso-pct-total');
        const aviso = document.getElementById('curso-pct-aviso');
        const lblEV = document.getElementById('curso-lbl-ev');
        const lblSS = document.getElementById('curso-lbl-ss');
        if (!lbl) return;
        if (barEV) barEV.style.width = Math.min(cfg.pesoEV, 100) + '%';
        if (barSS) barSS.style.width = Math.min(cfg.pesoSS, 100 - Math.min(cfg.pesoEV, 100)) + '%';
        lbl.textContent = total + '%';
        lbl.style.color = total === 100 ? '#27ae60' : '#e74c3c';
        if (aviso) {
            aviso.textContent = total === 100 ? '✅ Suma 100%'
                : total > 100 ? `⚠️ Excede en ${total - 100}%` : `⚠️ Faltan ${100 - total}%`;
            aviso.style.color = total === 100 ? '#27ae60' : '#e74c3c';
        }
        if (lblEV) lblEV.textContent = `EV: ${cfg.pesoEV}%`;
        if (lblSS) lblSS.textContent = `SS: ${cfg.pesoSS}%`;
    }

    function _actualizarFormula(cfg) {
        const el = document.getElementById('curso-formula-resumen');
        if (!el) return;
        const bonusTxt = cfg.tieneExtra
            ? `<br><span style="color:#D97706;">📣 Bono = Prom(${cfg.sesionesExtra} EV Campaña) × ${cfg.porcentajeExtra}%</span>`
            : '';
        const maxBonus = cfg.tieneExtra ? (20 * cfg.porcentajeExtra / 100).toFixed(1) : null;
        const nombre   = cfg.curso || '<em>nombre del curso</em>';
        el.innerHTML = `
            <strong>📐 ${nombre} — Nota final =</strong>
            <span style="color:#0288D1;"> EV × ${cfg.pesoEV}%</span> +
            <span style="color:#27ae60;"> Prom(${cfg.sesionesBase} SS) × ${cfg.pesoSS}%</span>
            ${bonusTxt}
            <br><small style="color:#888;">Escala 0–20 · ${cfg.capacidad} pacientes · ${cfg.sesionesBase} sesiones base
            ${cfg.tieneExtra ? ` + ${cfg.sesionesExtra} EV Campaña (bono máx +${maxBonus} pts)` : ''}</small>`;
    }

    function _actualizarHintsExtra(cfg) {
        const s = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        s('lbl-pext',     cfg.porcentajeExtra);
        s('lbl-next',     cfg.sesionesExtra);
        s('lbl-bonusmax', (20 * cfg.porcentajeExtra / 100).toFixed(1));
    }

    // ═══════════════════════════════════════════════
    //  VISTA PREVIA — fiel a la imagen de planilla
    // ═══════════════════════════════════════════════
    function renderPreviewCurso() {
        const preview = document.getElementById('curso-preview');
        if (!preview) return;
        const cfg = _getCursoConfig();
        if (!cfg.curso) {
            preview.innerHTML = '<p style="color:#999;text-align:center;padding:16px;">Escribe el nombre del curso para ver la vista previa.</p>';
            return;
        }

        const TH = (txt, bg, extra='') =>
            `<th style="background:${bg};color:white;padding:5px 4px;text-align:center;font-size:0.65rem;font-weight:700;white-space:nowrap;border:1px solid rgba(255,255,255,0.2);${extra}">${txt}</th>`;
        const TD = (txt, extra='') =>
            `<td style="border:1px solid #e0e6ed;padding:4px 3px;text-align:center;font-size:0.72rem;${extra}">${txt}</td>`;

        // Fila de grupos de columnas
        let groupRow = `<tr>`;
        groupRow += `<th colspan="2" style="background:#1B2A4A;color:white;padding:5px;font-size:0.65rem;border:1px solid rgba(255,255,255,0.2);">${cfg.curso} — ${cfg.capacidad} pac</th>`;
        groupRow += `<th style="background:#0288D1;color:white;padding:5px;font-size:0.65rem;border:1px solid rgba(255,255,255,0.2);" rowspan="2">EV</th>`;
        groupRow += `<th colspan="${cfg.sesionesBase}" style="background:#27ae60;color:white;padding:5px;text-align:center;font-size:0.65rem;border:1px solid rgba(255,255,255,0.2);">
                        ATENCIONES (${cfg.sesionesBase} SS · ${cfg.pesoSS}%)
                     </th>`;
        if (cfg.tieneExtra)
            groupRow += `<th colspan="${cfg.sesionesExtra}" style="background:#D97706;color:white;padding:5px;text-align:center;font-size:0.65rem;border:1px solid rgba(255,255,255,0.2);">
                            EV CAMPAÑA (+${cfg.porcentajeExtra}%)
                         </th>`;
        groupRow += `<th colspan="2" style="background:#6C3FC5;color:white;padding:5px;text-align:center;font-size:0.65rem;border:1px solid rgba(255,255,255,0.2);">RESULTADO</th>`;
        groupRow += `</tr>`;

        // Fila de columnas individuales
        let colRow = `<tr>`;
        colRow += TH('N°', '#1B2A4A') + TH('APELLIDOS Y NOMBRES', '#1B2A4A', 'min-width:130px;');
        for (let s=1; s<=cfg.sesionesBase; s++) colRow += TH(`${s}SS`, s%2===0?'#27ae60':'#2ECC71');
        if (cfg.tieneExtra)
            for (let e=1; e<=cfg.sesionesExtra; e++) colRow += TH(`EV${e+3}`, '#D97706');
        colRow += TH(`EXTRA<br>+${cfg.porcentajeExtra}%`, '#9C27B0');
        colRow += TH('PROM.<br>FINAL', '#6C3FC5');
        colRow += `</tr>`;

        // Filas de pacientes (preview, máx 5)
        const shown = Math.min(cfg.capacidad, 5);
        let rows = '';
        for (let i=1; i<=shown; i++) {
            let tds = TD(i) + TD(`Paciente ${i}`, 'text-align:left;padding:4px 8px;');
            tds += TD('—', 'color:#0288D1;');
            for (let s=1; s<=cfg.sesionesBase; s++) tds += TD('—', 'color:#27ae60;');
            if (cfg.tieneExtra) for (let e=1; e<=cfg.sesionesExtra; e++) tds += TD('—', 'color:#D97706;');
            tds += TD('—', 'background:#F3E8FF;color:#9C27B0;font-weight:700;');
            tds += TD('—/20', 'background:#EEF4FF;color:#6C3FC5;font-weight:700;');
            rows += `<tr>${tds}</tr>`;
        }
        if (cfg.capacidad > shown)
            rows += `<tr><td colspan="100" style="text-align:center;color:#aaa;padding:5px;font-size:0.72rem;">… y ${cfg.capacidad-shown} pacientes más</td></tr>`;

        // Fila de Evaluaciones Campaña
        if (cfg.tieneExtra) {
            let evRow = `<tr style="background:#FFF3E0;">`;
            evRow += TD('EV', 'font-weight:700;color:#e67e22;font-size:0.68rem;');
            evRow += TD('EVALUACIONES CAMPAÑA', 'font-weight:700;color:#e67e22;font-size:0.68rem;text-align:left;padding:4px 8px;');
            evRow += TD('EV', 'color:#e67e22;font-weight:700;');
            for (let s=1; s<=cfg.sesionesBase; s++) evRow += TD(`EV${s+3}`, 'color:#e67e22;font-size:0.68rem;');
            for (let e=0; e<cfg.sesionesExtra; e++) evRow += TD('—');
            evRow += TD('—'); evRow += TD('—'); evRow += `</tr>`;
            rows += evRow;
        }

        // Panel lateral con leyenda
        const maxBonus = cfg.tieneExtra ? (20 * cfg.porcentajeExtra / 100).toFixed(1) : '—';
        const lateral = `
        <div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div style="border:1.5px solid #e0e6ed;border-radius:10px;padding:12px;background:white;">
                <div style="font-weight:700;color:var(--primary);margin-bottom:8px;font-size:0.82rem;">📊 Estructura</div>
                <div style="font-size:0.78rem;display:flex;flex-direction:column;gap:5px;">
                    <div>📋 <span style="color:#0288D1;font-weight:700;">EV inicial:</span> ${cfg.pesoEV}%</div>
                    <div>🏃 <span style="color:#27ae60;font-weight:700;">${cfg.sesionesBase} SS base:</span> ${cfg.pesoSS}%</div>
                    ${cfg.tieneExtra ? `<div>📣 <span style="color:#D97706;font-weight:700;">${cfg.sesionesExtra} EV Campaña:</span> bono +${cfg.porcentajeExtra}%</div>` : ''}
                    <div style="margin-top:5px;padding-top:5px;border-top:1px solid #eee;">👥 <strong>${cfg.capacidad}</strong> pacientes por alumno</div>
                </div>
            </div>
            <div style="border:1.5px solid #e0e6ed;border-radius:10px;padding:12px;background:#F0FFF4;">
                <div style="font-weight:700;color:#065F46;margin-bottom:8px;font-size:0.82rem;">📐 Fórmula</div>
                <div style="font-size:0.78rem;display:flex;flex-direction:column;gap:3px;">
                    <div>Base = <span style="color:#0288D1;">EV × ${cfg.pesoEV}%</span></div>
                    <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ <span style="color:#27ae60;">PromSS × ${cfg.pesoSS}%</span></div>
                    ${cfg.tieneExtra ? `<div style="color:#D97706;">Bono = PromCampaña × ${cfg.porcentajeExtra}%</div>
                    <div style="color:#D97706;font-size:0.72rem;">&nbsp;&nbsp;↳ máx bono: +${maxBonus} pts</div>` : ''}
                    <div style="margin-top:5px;padding-top:5px;border-top:1px dashed #a7f3d0;font-weight:700;color:#065F46;">
                        Nota = min(20, Base${cfg.tieneExtra ? ' + Bono' : ''})
                    </div>
                </div>
            </div>
        </div>`;

        preview.innerHTML = `
        <div style="overflow-x:auto;border:1.5px solid #e0e6ed;border-radius:10px;">
            <table style="border-collapse:collapse;width:100%;min-width:500px;">
                <thead>${groupRow}${colRow}</thead>
                <tbody>${rows}</tbody>
            </table>
        </div>${lateral}`;
    }

    // ═══════════════════════════════════════════════
    //  GUARDAR ESTRUCTURA
    // ═══════════════════════════════════════════════
    async function guardarEstructuraCurso() {
        const cfg = _getCursoConfig();

        if (!cfg.curso) {
            alert('⚠️ Escribe el nombre del curso antes de guardar.');
            document.getElementById('curso-nombre-input')?.focus();
            return;
        }
        if (cfg.pesoEV + cfg.pesoSS !== 100) {
            alert(`⚠️ EV (${cfg.pesoEV}%) + SS (${cfg.pesoSS}%) = ${cfg.pesoEV + cfg.pesoSS}%. Deben sumar exactamente 100%.`);
            return;
        }
        if (cfg.capacidad < 1 || cfg.sesionesBase < 1) {
            alert('⚠️ El número de pacientes y sesiones base debe ser ≥ 1.');
            return;
        }

        const estructura = {
            curso:           cfg.curso,
            capacidad:       cfg.capacidad,
            sesionesBase:    cfg.sesionesBase,
            pesoEV:          cfg.pesoEV,
            pesoSS:          cfg.pesoSS,
            tieneExtra:      cfg.tieneExtra,
            sesionesExtra:   cfg.sesionesExtra,
            porcentajeExtra: cfg.porcentajeExtra,
            fechaGuardado:   new Date().toLocaleDateString('es-PE'),
            // grupo legacy para compatibilidad con otros módulos
            grupos:   [{ id: 'g0', nombre: cfg.curso, cantidad: String(cfg.capacidad), peso: '100' }],
            pacientes: Array.from({ length: cfg.capacidad }, (_, i) => `Paciente ${i + 1}`)
        };

        // Guardar en memoria
        const idx = (CENTYR.db.estructuras_cursos || []).findIndex(e => e.curso === cfg.curso);
        if (idx >= 0) CENTYR.db.estructuras_cursos[idx] = estructura;
        else          CENTYR.db.estructuras_cursos.push(estructura);

        // Enviar a Sheets
        showLoad(true, 'Guardando estructura…');
        try {
            await fetch(CENTYR.CONFIG.webAppUrl, {
                method: 'POST', headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({
                    action: 'save_estructura_curso',
                    ...estructura
                })
            });
        } catch (e) { /* funciona offline */ }
        showLoad(false);

        renderCursosGuardados();
        _renderSugerencias();
        mostrarNotificacion(
            `✅ "${cfg.curso}" guardado — ${cfg.capacidad} pac · ${cfg.sesionesBase} SS · EV ${cfg.pesoEV}% + SS ${cfg.pesoSS}%` +
            (cfg.tieneExtra ? ` + ${cfg.sesionesExtra} EV Campaña bono +${cfg.porcentajeExtra}%` : '')
        );
    }

    // ═══════════════════════════════════════════════
    //  LISTA DE ESTRUCTURAS GUARDADAS
    // ═══════════════════════════════════════════════
    function renderCursosGuardados() {
        const div   = document.getElementById('cursos-guardados-list');
        if (!div) return;
        const lista = CENTYR.db.estructuras_cursos || [];

        if (!lista.length) {
            div.innerHTML = `<div style="color:#999;font-size:0.85rem;text-align:center;padding:18px;background:#f8f9fa;border-radius:8px;">
                <div style="font-size:1.4rem;margin-bottom:6px;">📭</div>
                Sin estructuras guardadas aún.<br>
                <small>Completa los pasos ①–⑤ y pulsa 💾 GUARDAR ESTRUCTURA.</small>
            </div>`;
            return;
        }

        div.innerHTML = lista.map(e => {
            const nSS  = e.sesionesBase    || '?';
            const pEV  = e.pesoEV          || '?';
            const pSS  = e.pesoSS          || '?';
            const nExt = e.sesionesExtra   || 0;
            const pExt = e.porcentajeExtra || 0;
            const maxB = e.tieneExtra ? (20 * pExt / 100).toFixed(1) : null;

            return `
            <div style="border:1.5px solid #e0e6ed;border-radius:10px;padding:12px 14px;margin-bottom:8px;background:white;box-shadow:0 1px 4px #0001;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:6px;">
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:700;color:var(--primary);font-size:0.97rem;">🏫 ${e.curso}</div>
                        <div style="color:var(--gray);font-size:0.74rem;margin-top:2px;">
                            👥 ${e.capacidad} pac · 📋 EV ${pEV}% + 🏃 ${nSS} SS ${pSS}%
                            ${e.tieneExtra ? ` · 📣 ${nExt} EV Campaña (+${pExt}%, máx +${maxB} pts)` : ''}
                            ${e.fechaGuardado ? ' · ' + e.fechaGuardado : ''}
                        </div>
                    </div>
                    <div style="display:flex;gap:5px;flex-wrap:wrap;flex-shrink:0;">
                        <button onclick="cargarEstructuraCurso('${e.curso}')"
                                style="padding:5px 10px;background:var(--docente);color:white;border:none;border-radius:6px;cursor:pointer;font-size:0.75rem;font-weight:600;">✏️ Editar</button>
                        <button onclick="abrirIngresoCurso('${e.curso}')"
                                style="padding:5px 10px;background:var(--accent);color:white;border:none;border-radius:6px;cursor:pointer;font-size:0.75rem;font-weight:600;">📝 Notas</button>
                        <button onclick="duplicarEstructuraCurso('${e.curso}')"
                                title="Duplicar esta estructura"
                                style="padding:5px 10px;background:#FFF8E7;color:#D97706;border:1.5px solid #F59E0B;border-radius:6px;cursor:pointer;font-size:0.75rem;font-weight:600;">⧉ Copiar</button>
                        <button onclick="eliminarEstructuraCurso('${e.curso}')"
                                style="padding:5px 10px;background:#fadbd8;color:#c0392b;border:none;border-radius:6px;cursor:pointer;font-size:0.75rem;font-weight:600;">🗑️</button>
                    </div>
                </div>
                <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:5px;">
                    <span style="background:#EEF4FF;color:#0288D1;border-radius:12px;padding:2px 10px;font-size:0.72rem;font-weight:600;">📋 EV · ${pEV}%</span>
                    <span style="background:#F0FFF4;color:#27ae60;border-radius:12px;padding:2px 10px;font-size:0.72rem;font-weight:600;">🏃 ${nSS} SS · ${pSS}%</span>
                    ${e.tieneExtra ? `<span style="background:#FFF8E7;color:#D97706;border-radius:12px;padding:2px 10px;font-size:0.72rem;font-weight:600;">📣 ${nExt} EV Campaña · bono +${pExt}%</span>` : ''}
                    <span style="background:#f0f4ff;color:var(--primary);border-radius:12px;padding:2px 10px;font-size:0.72rem;font-weight:600;">👥 ${e.capacidad} pacientes</span>
                </div>
            </div>`;
        }).join('');
    }

    function cargarEstructuraCurso(curso) {
        const est = (CENTYR.db.estructuras_cursos || []).find(e => e.curso === curso);
        if (!est) return;
        _setCursoConfig(est);
        cursoConfigChange();
        document.getElementById('tab-cursos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        mostrarNotificacion(`📂 "${curso}" cargado para edición`);
    }

    function duplicarEstructuraCurso(curso) {
        const est = (CENTYR.db.estructuras_cursos || []).find(e => e.curso === curso);
        if (!est) return;
        const nuevoNombre = prompt(`Nombre para la copia de "${curso}":`, curso + ' (copia)');
        if (!nuevoNombre || !nuevoNombre.trim()) return;
        _setCursoConfig({ ...est, curso: nuevoNombre.trim() });
        cursoConfigChange();
        mostrarNotificacion(`⧉ Duplicado como "${nuevoNombre.trim()}" — pulsa 💾 para guardar`);
    }

    function eliminarEstructuraCurso(curso) {
        if (!confirm(`¿Eliminar la estructura de "${curso}"?\nEsta acción no se puede deshacer.`)) return;
        CENTYR.db.estructuras_cursos = (CENTYR.db.estructuras_cursos || []).filter(e => e.curso !== curso);
        renderCursosGuardados();
        _renderSugerencias();
        mostrarNotificacion(`🗑️ Estructura de "${curso}" eliminada`);
    }

    // ═══════════════════════════════════════════════
    //  MODAL INGRESO DE NOTAS
    // ═══════════════════════════════════════════════
    async function abrirIngresoCurso(curso, alumnoPresel) {
        const est = (CENTYR.db.estructuras_cursos || []).find(e => e.curso === curso);
        if (!est) { alert('⚠️ No existe estructura para: ' + curso); return; }

        const alumnos   = CENTYR.db.usuarios.filter(u => u.rol === 'alumno');
        const opAlumnos = alumnos.map(a =>
            `<option value="${a.usuario}" ${alumnoPresel===a.usuario?'selected':''}>${a.nombre_completo} (${a.codigo||'—'})</option>`
        ).join('');

        document.getElementById('modal-cursos-titulo').textContent = `📝 Calificaciones — ${curso}`;
        document.getElementById('modal-cursos-body').innerHTML = `
        <div style="background:#F0F4FF;border-radius:10px;padding:12px 16px;margin-bottom:14px;border-left:4px solid var(--primary);">
            <div style="font-weight:700;color:var(--primary);margin-bottom:8px;font-size:0.88rem;">
                🏫 ${curso} · ${est.capacidad} pac · ${est.sesionesBase||'?'} SS base ·
                EV ${est.pesoEV||'?'}% + SS ${est.pesoSS||'?'}%
                ${est.tieneExtra ? `· 📣 ${est.sesionesExtra} EV Campaña (+${est.porcentajeExtra}%)` : ''}
            </div>
            <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;">
                <div style="flex:1;min-width:180px;">
                    <label style="font-size:0.78rem;color:var(--gray);display:block;margin-bottom:3px;">Seleccionar alumno:</label>
                    <select id="ingreso-alumno-sel" onchange="cargarPanelNotasAlumno('${curso}')"
                            style="margin-bottom:0;border:1.5px solid var(--primary);font-weight:600;">
                        <option value="">-- Elige un alumno --</option>${opAlumnos}
                    </select>
                </div>
                <div style="flex:1;min-width:160px;">
                    <label style="font-size:0.78rem;color:var(--gray);display:block;margin-bottom:3px;">Filtrar por apellido:</label>
                    <input type="text" placeholder="Escribe apellido…" id="ingreso-buscar-alumno"
                           oninput="filtrarSelectAlumnoIngreso('${curso}',this.value)"
                           style="margin-bottom:0;border:1.5px solid var(--docente);">
                </div>
            </div>
        </div>
        <div id="ingreso-notas-area">
            <div style="text-align:center;color:#aaa;padding:40px 0;">Selecciona un alumno para calificar.</div>
        </div>`;
        document.getElementById('modalCursos').style.display = 'block';

        if (alumnoPresel) {
            const sel = document.getElementById('ingreso-alumno-sel');
            if (sel) { sel.value = alumnoPresel; await cargarPanelNotasAlumno(curso); }
        }
    }

    function filtrarSelectAlumnoIngreso(curso, q) {
        const sel   = document.getElementById('ingreso-alumno-sel');
        const todos = CENTYR.db.usuarios.filter(u => u.rol === 'alumno');
        const filt  = q.trim() ? todos.filter(a => a.nombre_completo.toLowerCase().includes(q.trim().toLowerCase())) : todos;
        sel.innerHTML = '<option value="">-- Elige un alumno --</option>' +
            filt.map(a => `<option value="${a.usuario}">${a.nombre_completo} (${a.codigo||'—'})</option>`).join('');
    }

    // ═══════════════════════════════════════════════
    //  PANEL DE NOTAS POR ALUMNO
    // ═══════════════════════════════════════════════
    async function cargarPanelNotasAlumno(curso) {
        const alumnoUsuario = document.getElementById('ingreso-alumno-sel')?.value;
        const area          = document.getElementById('ingreso-notas-area');
        if (!alumnoUsuario) { area.innerHTML = '<div style="text-align:center;color:#aaa;padding:30px 0;">Selecciona un alumno.</div>'; return; }

        const est       = (CENTYR.db.estructuras_cursos || []).find(e => e.curso === curso);
        const alumnoObj = CENTYR.db.usuarios.find(u => u.usuario === alumnoUsuario);
        if (!est || !alumnoObj) return;

        const nombre    = alumnoObj.nombre_completo;
        const keyAlumno = `${alumnoUsuario}::${curso}`;
        if (!CENTYR.db.notas_cursos) CENTYR.db.notas_cursos = {};

        showLoad(true, 'Cargando calificaciones…');
        try {
            const res  = await fetch(`${CENTYR.CONFIG.webAppUrl}?action=get_notas_alumno_curso&alumno=${encodeURIComponent(alumnoUsuario)}&curso=${encodeURIComponent(curso)}`);
            const data = await res.json();
            if (data.status === 'success' && data.pacientes?.length)
                CENTYR.db.notas_cursos[keyAlumno] = data.pacientes;
        } catch (e) { /* local */ }
        showLoad(false);

        const nSS    = est.sesionesBase    || 10;
        const pesoEV = est.pesoEV          || 20;
        const pesoSS = est.pesoSS          || 80;
        const nExt   = est.tieneExtra ? (est.sesionesExtra || 5) : 0;
        const pExt   = est.porcentajeExtra || 20;

        // Pacientes reales de este alumno en este curso
        const dniVistos = new Set();
        const pacientesAlumno = [];
        CENTYR.db.pacientes.forEach(p => {
            const pc = p.curso || p.categoria || '';
            if (p.atendido_por === nombre && pc === curso && !dniVistos.has(String(p.dni || ''))) {
                dniVistos.add(String(p.dni || ''));
                pacientesAlumno.push({ nombre: p.paciente, dni: String(p.dni || '') });
            }
        });

        // Sesiones aprobadas por paciente para auto-rellenar SS
        const pacMapAuto = {};
        CENTYR.db.pacientes
            .filter(p => p.atendido_por === nombre && (p.curso || p.categoria || '') === curso)
            .sort((a, b) => new Date(a.fecha || 0) - new Date(b.fecha || 0))
            .forEach(p => {
                const k = String(p.dni || p.paciente || '').trim();
                if (!pacMapAuto[k]) pacMapAuto[k] = { nombre: String(p.paciente || ''), dni: String(p.dni || ''), sesiones: [] };
                if (p.estado_aprobacion === 'aprobado')
                    pacMapAuto[k].sesiones.push(parseFloat(p.nota_aprobacion) || 0);
            });
        const pacsAutoList = Object.values(pacMapAuto);

        // Crear/completar lista de pacientes
        if (!CENTYR.db.notas_cursos[keyAlumno] || !CENTYR.db.notas_cursos[keyAlumno].length) {
            CENTYR.db.notas_cursos[keyAlumno] = Array.from({ length: est.capacidad }, (_, k) => {
                const real = pacsAutoList[k] || null;
                return {
                    paciente:  real?.nombre || `Paciente ${k + 1}`,
                    dni:       real?.dni    || '',
                    nota_ev:   '',
                    notas_ss:  Array.from({ length: nSS  }, (_, i) => real ? (String(real.sesiones[i] || '')) : ''),
                    notas_ext: Array(nExt).fill(''),
                    notas:     {}
                };
            });
        } else {
            CENTYR.db.notas_cursos[keyAlumno].forEach(pac => {
                if (!pac.notas_ss)  pac.notas_ss  = Array(nSS).fill('');
                if (!pac.notas_ext) pac.notas_ext = Array(nExt).fill('');
                while (pac.notas_ss.length  < nSS)  pac.notas_ss.push('');
                while (pac.notas_ext.length < nExt) pac.notas_ext.push('');
                if (pac.nota_ev === undefined) pac.nota_ev = '';
            });
        }

        const pacs = CENTYR.db.notas_cursos[keyAlumno];
        const faltantes = est.capacidad - pacientesAlumno.length;

        let html = '';
        if (faltantes > 0)
            html += `<div style="background:#FEF3C7;border:1px solid #F59E0B;border-radius:8px;padding:9px 14px;margin-bottom:10px;font-size:0.82rem;color:#92400E;">
                ⚠️ <strong>${nombre}</strong> tiene <strong>${pacientesAlumno.length}</strong> pac. registrado(s) en ${curso}. Requeridos: <strong>${est.capacidad}</strong>.</div>`;

        html += `<div style="background:#1B2A4A;border-radius:10px;padding:10px 16px;margin-bottom:12px;color:white;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
            <div>
                <div style="font-weight:700;font-size:0.95rem;">👨‍🎓 ${nombre} · <span style="opacity:0.75;font-size:0.82rem;">${alumnoObj.codigo || '—'}</span></div>
                <div style="font-size:0.74rem;opacity:0.8;margin-top:2px;">📋 EV ${pesoEV}% + 🏃 SS (${nSS}) ${pesoSS}%${nExt > 0 ? ` + 📣 EV Campaña (${nExt}) bono +${pExt}%` : ''}</div>
            </div>
            <div id="alumno-nota-final-display" style="font-size:0.88rem;font-weight:700;"></div>
        </div>`;

        const TH = (txt, bg, ext='') =>
            `<th style="background:${bg};color:white;padding:5px 3px;text-align:center;font-size:0.65rem;font-weight:700;white-space:nowrap;border:1px solid rgba(255,255,255,0.15);${ext}">${txt}</th>`;
        const TD = (inner, ext='') =>
            `<td style="border:1px solid #eef0f4;padding:3px 2px;text-align:center;${ext}">${inner}</td>`;
        const INP = (id, val, color, cbk) =>
            `<input type="number" id="${id}" value="${val}" min="0" max="20" step="0.5"
             oninput="${cbk}"
             style="width:44px;padding:3px 2px;text-align:center;font-weight:700;font-size:0.82rem;
                    border:1.5px solid ${color};border-radius:5px;margin-bottom:0;
                    background:${val !== '' ? color + '18' : 'white'};">`;

        // Encabezado de grupos
        let hG = `<tr>`;
        hG += `<th colspan="2" style="background:#1B2A4A;color:white;padding:4px;font-size:0.65rem;border:1px solid rgba(255,255,255,0.2);">PACIENTE</th>`;
        hG += `<th style="background:#0288D1;color:white;padding:4px;font-size:0.65rem;border:1px solid rgba(255,255,255,0.2);" rowspan="2">EV</th>`;
        hG += `<th colspan="${nSS}" style="background:#27ae60;color:white;padding:4px;text-align:center;font-size:0.65rem;border:1px solid rgba(255,255,255,0.2);">ATENCIONES VI (${nSS} sesiones · ${pesoSS}%)</th>`;
        if (nExt > 0)
            hG += `<th colspan="${nExt}" style="background:#D97706;color:white;padding:4px;text-align:center;font-size:0.65rem;border:1px solid rgba(255,255,255,0.2);">EV CAMPAÑA (+${pExt}%)</th>`;
        hG += `<th style="background:#9C27B0;color:white;padding:4px;font-size:0.65rem;border:1px solid rgba(255,255,255,0.2);" rowspan="2">EXTRA<br>+${pExt}%</th>`;
        hG += `<th style="background:#6C3FC5;color:white;padding:4px;font-size:0.65rem;border:1px solid rgba(255,255,255,0.2);" rowspan="2">PROM.<br>FINAL</th>`;
        hG += `</tr>`;

        let hC = `<tr>`;
        hC += TH('N°', '#1B2A4A') + TH('NOMBRE DEL PACIENTE', '#1B2A4A', 'min-width:120px;');
        for (let s=1; s<=nSS; s++) hC += TH(`${s}SS`, s%2===0?'#27ae60':'#2ECC71');
        if (nExt > 0) for (let e=1; e<=nExt; e++) hC += TH(`EV${e+3}`, '#D97706');
        hC += `</tr>`;

        html += `<div style="overflow-x:auto;margin-bottom:12px;border:1.5px solid #e0e6ed;border-radius:10px;">
        <table style="border-collapse:collapse;width:100%;min-width:600px;">
        <thead>${hG}${hC}</thead><tbody>`;

        pacs.forEach((pac, pi) => {
            const evVal    = pac.nota_ev   || '';
            const ssNotas  = (pac.notas_ss  || Array(nSS).fill('')).slice(0, nSS);
            const extNotas = (pac.notas_ext || Array(nExt).fill('')).slice(0, nExt);

            html += `<tr>`;
            html += TD(pi + 1, 'font-weight:700;color:var(--primary);');
            html += `<td style="border:1px solid #eef0f4;padding:2px 4px;">
                <div style="display:flex;flex-direction:column;gap:2px;">
                    <input type="text" id="pac-nombre-${pi}" value="${pac.paciente || ''}"
                           style="margin-bottom:0;padding:3px 5px;font-size:0.78rem;border:1.5px solid #e0e6ed;border-radius:5px;width:100%;box-sizing:border-box;"
                           placeholder="Nombre…">
                    <input type="text" id="pac-dni-${pi}" value="${pac.dni || ''}"
                           style="margin-bottom:0;padding:2px 5px;font-size:0.7rem;border:1.5px solid #e0e6ed;border-radius:4px;width:100%;box-sizing:border-box;color:#666;"
                           placeholder="DNI…">
                </div>
            </td>`;
            html += TD(INP(`ev-${pi}`, evVal, '#0288D1', `recalcularFilaNueva(${pi},'${curso}')`));
            for (let s=0; s<nSS; s++) {
                const v = ssNotas[s] || '';
                html += TD(INP(`ss-${pi}-${s}`, v, s%2===0?'#27ae60':'#2ECC71', `recalcularFilaNueva(${pi},'${curso}')`));
            }
            for (let e=0; e<nExt; e++) {
                const v = extNotas[e] || '';
                html += TD(INP(`ext-${pi}-${e}`, v, '#D97706', `recalcularFilaNueva(${pi},'${curso}')`));
            }
            html += TD(`<span id="extra-pct-${pi}" style="font-size:0.78rem;color:#9C27B0;font-weight:700;">—</span>`, 'background:#F3E8FF;');
            html += TD(`<span id="nota-final-${pi}" style="font-weight:700;color:#6C3FC5;font-size:0.85rem;">—</span>`, 'background:#EEF4FF;');
            html += `</tr>`;
        });

        // Fila Evaluaciones Campaña
        if (nExt > 0) {
            html += `<tr style="background:#FFF3E0;">`;
            html += `<td style="border:1px solid #eef0f4;font-weight:700;color:#e67e22;font-size:0.68rem;padding:4px;text-align:center;">EV</td>`;
            html += `<td style="border:1px solid #eef0f4;font-weight:700;color:#e67e22;font-size:0.72rem;padding:6px 8px;">EVALUACIONES CAMPAÑA</td>`;
            html += TD(INP('ev-camp-0', '', '#e67e22', 'recalcularPromedioCurso()'));
            for (let s=1; s<=nSS; s++) html += TD(INP(`ev-camp-${s}`, '', '#e67e22', 'recalcularPromedioCurso()'));
            for (let e=0; e<nExt; e++) html += TD('—');
            html += TD('—'); html += TD('—');
            html += `</tr>`;
        }

        html += `</tbody></table></div>`;
        html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:4px;padding-top:8px;border-top:1px solid #e0e6ed;">
            <button onclick="guardarNotasAlumnoEnCurso('${curso}','${alumnoUsuario}')"
                    style="padding:13px;background:var(--admin);color:white;border:none;border-radius:10px;cursor:pointer;font-weight:700;">
                💾 GUARDAR NOTAS
            </button>
            <button onclick="exportarNotasCurso('${curso}')"
                    style="padding:13px;background:var(--accent);color:white;border:none;border-radius:10px;cursor:pointer;font-weight:700;">
                📥 EXPORTAR CSV
            </button>
        </div>`;

        area.innerHTML = html;
        pacs.forEach((_, pi) => recalcularFilaNueva(pi, curso));
    }

    function selPacienteIngreso(pi) {
        const sel = document.getElementById(`pac-sel-${pi}`);
        if (!sel || !sel.value) return;
        const [nom, dni] = sel.value.split('|');
        const n = document.getElementById(`pac-nombre-${pi}`);
        const d = document.getElementById(`pac-dni-${pi}`);
        if (n) n.value = nom || '';
        if (d) d.value = dni || '';
    }

    async function guardarNotasAlumnoEnCurso(curso, alumnoUsuario) {
        const est       = (CENTYR.db.estructuras_cursos || []).find(e => e.curso === curso);
        const keyAlumno = `${alumnoUsuario}::${curso}`;
        if (!est || !CENTYR.db.notas_cursos?.[keyAlumno]) return;

        const alumnoObj = CENTYR.db.usuarios.find(u => u.usuario === alumnoUsuario);
        const pacs      = CENTYR.db.notas_cursos[keyAlumno];
        const nSS       = est.sesionesBase || 10;
        const nExt      = est.tieneExtra ? (est.sesionesExtra || 0) : 0;
        const gId       = est.grupos[0]?.id || 'g0';

        pacs.forEach((pac, pi) => {
            pac.paciente  = document.getElementById(`pac-nombre-${pi}`)?.value || pac.paciente;
            pac.dni       = document.getElementById(`pac-dni-${pi}`)?.value    || pac.dni || '';
            const evEl    = document.getElementById(`ev-${pi}`);
            pac.nota_ev   = evEl ? evEl.value : (pac.nota_ev || '');
            pac.notas_ss  = [];
            for (let s=0; s<nSS; s++) { const el = document.getElementById(`ss-${pi}-${s}`); pac.notas_ss.push(el ? el.value : ''); }
            pac.notas_ext = [];
            for (let e=0; e<nExt; e++) { const el = document.getElementById(`ext-${pi}-${e}`); pac.notas_ext.push(el ? el.value : ''); }
            pac.notas = { [gId]: pac.notas_ss.filter(v => v !== '').slice(0, 1) };
        });

        showLoad(true, 'Guardando…');
        try {
            await fetch(CENTYR.CONFIG.webAppUrl, {
                method: 'POST', headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({
                    action: 'save_notas_alumno_curso',
                    alumno_usuario: alumnoUsuario,
                    alumno_nombre:  alumnoObj?.nombre_completo || '',
                    alumno_codigo:  alumnoObj?.codigo          || '',
                    curso, grupos: est.grupos, pacientes: pacs,
                    sesionesBase: nSS, sesionesExtra: nExt,
                    porcentajeExtra: est.porcentajeExtra || 0,
                    pesoEV: est.pesoEV || 20, pesoSS: est.pesoSS || 80
                })
            });
        } catch (e) { /* local */ }
        showLoad(false);
        mostrarNotificacion(`✅ Notas de ${alumnoObj?.nombre_completo || alumnoUsuario} guardadas`);
    }

    // ═══════════════════════════════════════════════
    //  RECÁLCULO EN TIEMPO REAL
    // ═══════════════════════════════════════════════
    function recalcularFilaNueva(pi, curso) {
        const est = (CENTYR.db.estructuras_cursos || []).find(e => e.curso === curso);
        if (!est) return;
        const nSS = est.sesionesBase || 10;
        const pesoEV = est.pesoEV    || 20;
        const pesoSS = est.pesoSS    || 80;
        const nExt   = est.tieneExtra ? (est.sesionesExtra || 0) : 0;
        const pExt   = est.porcentajeExtra || 0;

        const evEl  = document.getElementById(`ev-${pi}`);
        const evVal = evEl && evEl.value !== '' ? parseFloat(evEl.value) : null;

        const ssVals = [];
        for (let s=0; s<nSS; s++) { const el = document.getElementById(`ss-${pi}-${s}`); if (el && el.value !== '') ssVals.push(parseFloat(el.value)||0); }
        const promSS = ssVals.length ? ssVals.reduce((a,v)=>a+v,0)/ssVals.length : null;

        const extVals = [];
        for (let e=0; e<nExt; e++) { const el = document.getElementById(`ext-${pi}-${e}`); if (el && el.value !== '') extVals.push(parseFloat(el.value)||0); }
        const promExt = extVals.length ? extVals.reduce((a,v)=>a+v,0)/extVals.length : null;

        let base=0, pesoUsado=0;
        if (evVal  !== null) { base += evVal  * pesoEV / 100; pesoUsado += pesoEV; }
        if (promSS !== null) { base += promSS * pesoSS / 100; pesoUsado += pesoSS; }
        const bono    = promExt !== null && nExt > 0 ? promExt * pExt / 100 : 0;
        const notaPac = pesoUsado > 0 ? Math.min(20, base + bono) : null;

        // Columna EXTRA %
        const extraEl = document.getElementById(`extra-pct-${pi}`);
        if (extraEl) {
            if (promExt !== null && nExt > 0) { extraEl.textContent = `+${bono.toFixed(2)}`; extraEl.style.color = '#9C27B0'; }
            else { extraEl.textContent = '—'; extraEl.style.color = '#aaa'; }
        }

        const finalEl = document.getElementById(`nota-final-${pi}`);
        if (finalEl) {
            if (notaPac !== null) {
                const col = notaPac <= 10 ? '#E53935' : notaPac <= 13 ? '#F59E0B' : notaPac <= 16 ? '#2ECC71' : '#0288D1';
                finalEl.textContent = notaPac.toFixed(2); finalEl.style.color = col;
            } else { finalEl.textContent = '—'; finalEl.style.color = '#888'; }
        }
        recalcularNotaFinalAlumno(curso);
    }

    function recalcularFila(pi, curso)           { recalcularFilaNueva(pi, curso); }
    function recalcularPromedioGrupo(gi, curso)  { recalcularNotaFinalAlumno(curso); }
    function recalcularPromedioCurso()           { /* placeholder */ }

    function recalcularNotaFinalAlumno(curso) {
        const keyAlumno = Object.keys(CENTYR.db.notas_cursos || {}).find(k => k.endsWith('::' + curso));
        const est       = (CENTYR.db.estructuras_cursos || []).find(e => e.curso === curso);
        if (!est || !keyAlumno) return;
        const pacs = CENTYR.db.notas_cursos[keyAlumno] || [];
        const nSS  = est.sesionesBase || 10;
        const pesoEV = est.pesoEV     || 20;
        const pesoSS = est.pesoSS     || 80;
        const nExt   = est.tieneExtra ? (est.sesionesExtra || 0) : 0;
        const pExt   = est.porcentajeExtra || 0;
        const notas  = [];
        pacs.forEach((_, pi) => {
            const evEl  = document.getElementById(`ev-${pi}`);
            const evVal = evEl && evEl.value !== '' ? parseFloat(evEl.value) : null;
            const ssVals = []; for (let s=0; s<nSS; s++) { const el=document.getElementById(`ss-${pi}-${s}`); if(el&&el.value!=='') ssVals.push(parseFloat(el.value)||0); }
            const promSS = ssVals.length ? ssVals.reduce((a,v)=>a+v,0)/ssVals.length : null;
            const extVals=[]; for (let e=0; e<nExt; e++) { const el=document.getElementById(`ext-${pi}-${e}`); if(el&&el.value!=='') extVals.push(parseFloat(el.value)||0); }
            const promExt = extVals.length ? extVals.reduce((a,v)=>a+v,0)/extVals.length : null;
            let base=0, pesoUsado=0;
            if (evVal!==null) { base+=evVal*pesoEV/100; pesoUsado+=pesoEV; }
            if (promSS!==null){ base+=promSS*pesoSS/100; pesoUsado+=pesoSS; }
            const bono = promExt!==null&&nExt>0 ? promExt*pExt/100 : 0;
            if (pesoUsado > 0) notas.push(Math.min(20, base+bono));
        });
        const prom = notas.length ? notas.reduce((a,v)=>a+v,0)/notas.length : null;
        const nfEl = document.getElementById('alumno-nota-final-display');
        if (nfEl) {
            if (prom !== null) {
                const col = prom<=10?'#E53935':prom<=13?'#F59E0B':prom<=16?'#2ECC71':'#0288D1';
                nfEl.innerHTML = `<span style="color:${col};">📊 Promedio del alumno: <strong>${prom.toFixed(2)}/20</strong></span>`;
            } else nfEl.textContent = '';
        }
    }

    // ═══════════════════════════════════════════════
    //  GUARDAR / EXPORTAR NOTAS
    // ═══════════════════════════════════════════════
    async function guardarNotasCurso(curso) {
        const alumnoUsuario = document.getElementById('ingreso-alumno-sel')?.value;
        if (alumnoUsuario) await guardarNotasAlumnoEnCurso(curso, alumnoUsuario);
        else mostrarNotificacion('⚠️ Selecciona un alumno antes de guardar.');
    }

    async function exportarNotasCurso(curso) {
        await guardarNotasCurso(curso);
        const est = (CENTYR.db.estructuras_cursos || []).find(e => e.curso === curso);
        if (!est) { alert('⚠️ Sin estructura para exportar'); return; }
        const keyAlumno = Object.keys(CENTYR.db.notas_cursos || {}).find(k => k.endsWith('::' + curso));
        const pacs = keyAlumno ? CENTYR.db.notas_cursos[keyAlumno] : [];
        const nSS = est.sesionesBase || 10;
        const nExt = est.tieneExtra ? (est.sesionesExtra || 0) : 0;
        const pExt = est.porcentajeExtra || 0;

        const header = ['N°', 'Paciente', 'DNI', 'EV'];
        for (let s=1; s<=nSS; s++)  header.push(`${s}SS`);
        for (let e=1; e<=nExt; e++) header.push(`EV${e+3}`);
        header.push(`EXTRA +${pExt}%`, 'PROMEDIO FINAL');

        const sel = document.getElementById('ingreso-alumno-sel');
        const alumnoTxt = sel ? sel.options[sel.selectedIndex]?.text : '';
        const rows = [[`NOTAS — ${curso}`, ''], [`Alumno: ${alumnoTxt}`, ''], [''], header];

        pacs.forEach((pac, pi) => {
            const row = [pi+1, pac.paciente||'', pac.dni||'', pac.nota_ev||''];
            (pac.notas_ss||[]).forEach(v => row.push(v));
            (pac.notas_ext||[]).forEach(v => row.push(v));
            row.push(document.getElementById(`extra-pct-${pi}`)?.textContent || '');
            row.push(document.getElementById(`nota-final-${pi}`)?.textContent || '');
            rows.push(row);
        });

        showLoad(true, 'Exportando…');
        try {
            await fetch(CENTYR.CONFIG.webAppUrl, {
                method: 'POST', headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'save_notas_curso', curso, rows })
            });
        } catch (e) { /* continúa */ }
        showLoad(false);
        descargarCSV(`CENTYR_Notas_${curso.replace(/ /g,'_')}_${new Date().toISOString().slice(0,10)}.csv`, rows);
        mostrarNotificacion(`📤 Notas de "${curso}" exportadas`);
    }

    function calcularNotasFinalCurso() {
        const cfg = _getCursoConfig();
        if (!cfg.curso) { alert('⚠️ Escribe el nombre del curso'); return; }
        abrirIngresoCurso(cfg.curso, null);
    }

    // ═══════════════════════════════════════════════
    //  RESUMEN DE NOTAS POR ALUMNO
    // ═══════════════════════════════════════════════
    function calcularPromedioPonderado(notas) {
        const validas = notas.filter(n => !isNaN(parseFloat(n.calificacion)));
        if (!validas.length) return null;
        return (validas.reduce((s,n) => s + parseFloat(n.calificacion), 0) / validas.length).toFixed(2);
    }

    function cargarResumenNotas() {
        const alumnoUsuario = document.getElementById('cfg-alumno-sel').value;
        const div = document.getElementById('cfg-notas-resumen');
        if (!alumnoUsuario) { div.innerHTML = ''; return; }
        const alumnoObj = CENTYR.db.usuarios.find(u => u.usuario === alumnoUsuario);
        if (!alumnoObj) return;
        const notasAlumno = (CENTYR.db.notas_docentes || []).filter(n => n.alumno_nombre === alumnoObj.nombre_completo);
        if (!notasAlumno.length) { div.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">Sin notas registradas para este alumno.</p>'; return; }
        const porPaciente = {};
        notasAlumno.forEach(n => {
            const k = n.paciente_dni || n.paciente_nombre;
            if (!porPaciente[k]) porPaciente[k] = { nombre: n.paciente_nombre, notas: [] };
            porPaciente[k].notas.push(n);
        });
        const pg = calcularPromedioPonderado(notasAlumno);
        const cg = !pg?'#888':pg<=10?'#c0392b':pg<=13?'#d35400':pg<=16?'#1e8449':'#1a5276';
        let html = `<div style="background:var(--primary);color:white;padding:14px 16px;border-radius:8px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
            <div><div style="font-weight:bold;font-size:1rem;">${alumnoObj.nombre_completo}</div><div style="font-size:0.8rem;opacity:0.8;">${alumnoObj.codigo||''} · ${notasAlumno.length} nota(s)</div></div>
            <div style="text-align:center;"><div style="font-size:1.8rem;font-weight:bold;color:${cg};background:white;border-radius:8px;padding:4px 14px;">${pg||'—'}</div><div style="font-size:0.75rem;opacity:0.8;">Promedio</div></div>
        </div>`;
        Object.values(porPaciente).forEach(pac => {
            const pp = calcularPromedioPonderado(pac.notas);
            const cp = !pp?'#888':pp<=10?'#c0392b':pp<=13?'#d35400':pp<=16?'#1e8449':'#1a5276';
            html += `<div style="border:1px solid #eee;border-radius:8px;margin-bottom:10px;overflow:hidden;">
                <div style="background:#f0f4ff;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;">
                    <strong style="color:var(--primary);">🏥 ${pac.nombre}</strong>
                    <span style="background:${cp};color:white;padding:3px 12px;border-radius:12px;font-weight:bold;">${pp||'—'}/20</span>
                </div>
                <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                    <tr style="background:#f8f9fa;"><th style="padding:8px;text-align:left;">Categoría</th><th style="padding:8px;text-align:center;">Nota</th><th style="padding:8px;text-align:left;">Docente</th><th style="padding:8px;text-align:left;">Fecha</th></tr>`;
            pac.notas.forEach(n => {
                const nc=parseFloat(n.calificacion);
                const c=nc<=10?'#fadbd8':nc<=13?'#fef9e7':nc<=16?'#d5f5e3':'#d6eaf8';
                html += `<tr style="border-bottom:1px solid #f0f2f5;"><td style="padding:8px;">${n.categoria}</td><td style="padding:8px;text-align:center;background:${c};font-weight:bold;">${n.calificacion}/20</td><td style="padding:8px;color:#555;">${n.docente||'—'}</td><td style="padding:8px;color:#888;">${n.fecha}</td></tr>`;
            });
            html += `</table></div>`;
        });
        div.innerHTML = html;
    }

    // ═══════════════════════════════════════════════
    //  CSV
    // ═══════════════════════════════════════════════
    function descargarCSV(filename, rows) {
        const csv  = rows.map(r => r.map(c => `"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        mostrarNotificacion('📥 CSV descargado — ábrelo con Excel');
    }

    function exportarResumenGeneral() {
        const pac = CENTYR.db.pacientes;
        const porAlumno = {};
        pac.forEach(p => {
            const n = p.atendido_por || 'Sin nombre';
            if (!porAlumno[n]) porAlumno[n] = { ev:0, ss:0, aprobadas:0, pendientes:0 };
            if (p.tipo_atencion === 'evaluacion') porAlumno[n].ev++; else porAlumno[n].ss++;
            if (p.estado_aprobacion === 'aprobado') porAlumno[n].aprobadas++; else porAlumno[n].pendientes++;
        });
        const rows = [
            ['RESUMEN GENERAL — CENTYR','',''],
            ['Generado:', new Date().toLocaleDateString('es-PE'),''],[''],
            ['Total Registros', pac.length],
            ['Evaluaciones', pac.filter(p=>p.tipo_atencion==='evaluacion').length],
            ['Sesiones',     pac.filter(p=>p.tipo_atencion==='sesion').length],
            ['Aprobadas',    pac.filter(p=>p.estado_aprobacion==='aprobado').length],
            ['Pendientes',   pac.filter(p=>p.estado_aprobacion==='pendiente').length], [''],
            ['Alumno','Evaluaciones','Sesiones','Aprobadas','Pendientes'],
            ...Object.entries(porAlumno).map(([n,d]) => [n, d.ev, d.ss, d.aprobadas, d.pendientes])
        ];
        descargarCSV(`CENTYR_Resumen_${new Date().toISOString().slice(0,10)}.csv`, rows);
    }

    function exportarNotasPorAlumno() {
        const notas = CENTYR.db.notas_docentes || [];
        if (!notas.length) { alert('⚠️ No hay notas registradas.'); return; }
        const porAlumno = {};
        notas.forEach(n => { if(!porAlumno[n.alumno_nombre]) porAlumno[n.alumno_nombre]={codigo:n.alumno_codigo,notas:[]}; porAlumno[n.alumno_nombre].notas.push(n); });
        const rows = [['NOTAS POR ALUMNO — CENTYR',''],['Generado:',new Date().toLocaleDateString('es-PE')],[''],['Alumno','Código','Paciente','Categoría','Nota','Promedio','Fecha','Docente']];
        Object.entries(porAlumno).forEach(([nombre,data]) => {
            const prom = calcularPromedioPonderado(data.notas);
            data.notas.forEach((n,i) => rows.push([i===0?nombre:'',i===0?data.codigo:'',n.paciente_nombre,n.categoria,n.calificacion,i===0?(prom||''):'',n.fecha,n.docente]));
            rows.push(['','','','','','Promedio:',prom||'—','']); rows.push(['']);
        });
        descargarCSV(`CENTYR_NotasPorAlumno_${new Date().toISOString().slice(0,10)}.csv`, rows);
    }

    function exportarNotasPorPaciente() {
        const notas = CENTYR.db.notas_docentes || [];
        if (!notas.length) { alert('⚠️ No hay notas registradas.'); return; }
        const porPaciente = {};
        notas.forEach(n => { const k=n.paciente_dni||n.paciente_nombre; if(!porPaciente[k]) porPaciente[k]={nombre:n.paciente_nombre,dni:n.paciente_dni,notas:[]}; porPaciente[k].notas.push(n); });
        const rows = [['NOTAS POR PACIENTE — CENTYR',''],['Generado:',new Date().toLocaleDateString('es-PE')],[''],['Paciente','DNI','Alumno','Categoría','Nota','Promedio','Fecha','Docente']];
        Object.values(porPaciente).forEach(pac => {
            const prom = calcularPromedioPonderado(pac.notas);
            pac.notas.forEach((n,i) => rows.push([i===0?pac.nombre:'',i===0?pac.dni:'',n.alumno_nombre,n.categoria,n.calificacion,i===0?(prom||''):'',n.fecha,n.docente]));
            rows.push(['','','','','','Promedio:',prom||'—','']); rows.push(['']);
        });
        descargarCSV(`CENTYR_NotasPorPaciente_${new Date().toISOString().slice(0,10)}.csv`, rows);
    }

    // ─── Registro ─────────────────────────────────
    const _fns = {
        adminTab, nuevoCurso,
        cursoNombreChange, cursoSelChange, cursoCapacidadChange,
        agregarGrupoCurso, eliminarGrupoCurso, actualizarGrupoCurso,
        renderGruposCurso, actualizarBarraPct, cursoConfigChange, toggleExtraSection,
        renderPreviewCurso, guardarEstructuraCurso, renderCursosGuardados,
        cargarEstructuraCurso, duplicarEstructuraCurso, eliminarEstructuraCurso,
        abrirIngresoCurso, filtrarSelectAlumnoIngreso, cargarPanelNotasAlumno,
        selPacienteIngreso, guardarNotasAlumnoEnCurso,
        recalcularFila, recalcularFilaNueva, recalcularNotaFinalAlumno,
        recalcularPromedioGrupo, recalcularPromedioCurso,
        guardarNotasCurso, exportarNotasCurso, calcularNotasFinalCurso,
        calcularPromedioPonderado, cargarResumenNotas,
        descargarCSV, exportarResumenGeneral, exportarNotasPorAlumno, exportarNotasPorPaciente
    };
    Object.assign(CENTYR.fn, _fns);
    Object.assign(window,    _fns);

    // ─── Tests ─────────────────────────────────────
    CENTYR.test['admin'] = function () {
        console.group('🧪 centyr-admin v4 tests');
        let pass = 0, fail = 0;
        const assert = (desc, cond) => { if(cond){console.log(`  ✅ ${desc}`);pass++;}else{console.error(`  ❌ ${desc}`);fail++;} };

        assert('adminTab registrado',               typeof CENTYR.fn.adminTab               === 'function');
        assert('nuevoCurso registrado',             typeof CENTYR.fn.nuevoCurso             === 'function');
        assert('cursoNombreChange registrado',      typeof CENTYR.fn.cursoNombreChange      === 'function');
        assert('guardarEstructuraCurso registrado', typeof CENTYR.fn.guardarEstructuraCurso === 'function');
        assert('duplicarEstructuraCurso registrado',typeof CENTYR.fn.duplicarEstructuraCurso === 'function');
        assert('abrirIngresoCurso registrado',      typeof CENTYR.fn.abrirIngresoCurso      === 'function');
        assert('recalcularFilaNueva registrado',    typeof CENTYR.fn.recalcularFilaNueva    === 'function');
        assert('exportarNotasCurso registrado',     typeof CENTYR.fn.exportarNotasCurso     === 'function');

        // Test de fórmula: EV=14, SS=[12,14], Ext=[15,15], pesoEV=20, pesoSS=80, pExt=20
        // Base = 14*0.2 + 13*0.8 = 2.8+10.4 = 13.2
        // Bono = 15*0.2 = 3.0   → Total = 16.2
        const pSS  = (12+14)/2;
        const pExt = (15+15)/2;
        const base = 14*20/100 + pSS*80/100;
        const bono = pExt*20/100;
        const nota = Math.min(20, base+bono);
        assert('fórmula EV+SS+Bono = 16.2', Math.abs(nota - 16.2) < 0.01);
        assert('bono máx con 20% = 4 pts',  Math.abs(20*0.2 - 4) < 0.01);
        assert('nota no supera 20',          Math.min(20, 22) === 20);

        console.groupEnd();
        console.log(`  Resultado: ${pass} ✅  ${fail} ❌`);
        return { pass, fail };
    };

    console.log('✅ centyr-admin.js v4.0 cargado — Constructor con nombre libre');
})();
